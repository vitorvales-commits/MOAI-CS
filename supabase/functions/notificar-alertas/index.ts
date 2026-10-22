// ============================================================================
// MOAI CS Dashboard: notificar-alertas (Supabase Edge Function)
//
// Chamada a cada 15 minutos pelo pg_cron, com o mesmo cabeçalho X-Sync-Secret de sync-monday. Faz duas coisas:
//   1. avalia os alertas de NPS (avaliar_alertas_nps), que grava em alertas_nps;
//   2. envia um email por encontro para quem tem cs_config.recebe_alerta_nps, depois da janela de agrupamento.
// Sem RESEND_API_KEY ou sem remetente, os alertas continuam sendo gravados e o envio fica desligado: a função
// registra isso em sync_log e responde 200. A chave fica só em secret da função e nunca é logada.
// Secrets: RESEND_API_KEY, ALERTAS_REMETENTE (domínio verificado no Resend), SITE_URL (base do botão do email).
// ============================================================================
import { montarEmail, separarParaEnvio, type AlertaParaEnviar } from './logica.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SYNC_FUNCTION_SECRET = Deno.env.get('SYNC_FUNCTION_SECRET')!;

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });
}

async function sb(caminho: string, init: RequestInit = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!r.ok) throw new Error(`Supabase HTTP ${r.status}: ${await r.text()}`);
  return r;
}

async function rpc(nome: string, args: Record<string, unknown> = {}): Promise<any> {
  return (await sb(`rpc/${nome}`, { method: 'POST', body: JSON.stringify(args) })).json();
}

async function logSync(status: 'sucesso' | 'erro', itens?: number, erro?: string) {
  await sb('sync_log', {
    method: 'POST',
    body: JSON.stringify([{ board: 'alertas_nps', status, itens_sincronizados: itens ?? null, erro: erro ?? null, finished_at: new Date().toISOString() }]),
  });
}

Deno.serve(async (req) => {
  if (req.headers.get('x-sync-secret') !== SYNC_FUNCTION_SECRET) {
    return resposta({ error: 'unauthorized' }, 401);
  }
  try {
    const avaliados: any[] = await rpc('avaliar_alertas_nps', { p_simular: false });
    const novos = avaliados.filter((a) => a.acao === 'novo').length;

    const chave = Deno.env.get('RESEND_API_KEY');
    const remetente = Deno.env.get('ALERTAS_REMETENTE');
    if (!chave || !remetente) {
      await logSync('sucesso', novos, 'envio desligado: RESEND_API_KEY ou ALERTAS_REMETENTE ausente');
      return resposta({ status: 'envio_desligado', alertas_novos: novos });
    }

    const destinatarios: { email: string }[] = (await (await sb('cs_config?select=email&recebe_alerta_nps=eq.true&email=not.is.null')).json());
    const para = destinatarios.map((d) => d.email).filter(Boolean);
    if (!para.length) {
      await logSync('erro', novos, 'nenhum destinatário com recebe_alerta_nps');
      return resposta({ status: 'sem_destinatario', alertas_novos: novos });
    }

    // Janela de agrupamento (60 min) e validade do envio (7 dias) são os defaults da função SQL, espelho de lib/constants.ts.
    const prontos: AlertaParaEnviar[] = await rpc('alertas_nps_para_enviar');
    const { enviar, baixar } = separarParaEnvio(prontos);
    const siteUrl = Deno.env.get('SITE_URL') || 'https://moai-cs-dashboard.vercel.app';

    let enviados = 0;
    if (baixar.length) await rpc('marcar_alertas_notificados', { p_ids: baixar });
    for (const alertas of enviar.values()) {
      const email = montarEmail(alertas, siteUrl);
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: remetente, to: para, subject: email.assunto, html: email.html, text: email.texto }),
      });
      if (!r.ok) throw new Error(`Resend HTTP ${r.status}`);
      // Marca logo após cada envio: uma falha no meio não repete os emails já enviados.
      await rpc('marcar_alertas_notificados', { p_ids: email.ids });
      enviados++;
    }
    await logSync('sucesso', enviados);
    return resposta({ status: 'ok', alertas_novos: novos, emails_enviados: enviados, baixados_sem_envio: baixar.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logSync('erro', 0, msg).catch(() => {});
    return resposta({ error: msg }, 500);
  }
});
