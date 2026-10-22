// Funções puras da notificação de alertas de NPS (22/10/2026). Sem nenhuma API do Deno, para o teste rodar
// no Node (tests/notificar-alertas.test.ts) e para o email poder ser renderizado em captura de tela.
// Um email por encontro, com todos os critérios novos. Nenhum CPF entra no corpo.

export type AlertaParaEnviar = {
  id: string; group_id: string; mes: string; criterio: 'detrator' | 'nota_cs_baixa' | 'nps_encontro' | 'media_encontro';
  respondente_nome: string | null; valor: number | string; referencia: number | string; amostra: number | null;
  detalhe: { nota?: number | string; comentario?: string | null } | null;
  conselho: string | null; cs_responsavel: string | null; expirado: boolean;
};

export type EmailAlerta = { assunto: string; html: string; texto: string; ids: string[] };

const fmt = (n: number | string) => String(Number(n)).replace('.', ',');
export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Alerta expirado (mais antigo que a validade de envio) é baixado sem email. Devolve os grupos por encontro.
export function separarParaEnvio(alertas: AlertaParaEnviar[]): { enviar: Map<string, AlertaParaEnviar[]>; baixar: string[] } {
  const enviar = new Map<string, AlertaParaEnviar[]>();
  const baixar: string[] = [];
  for (const a of alertas) {
    if (a.expirado) { baixar.push(a.id); continue; }
    const chave = a.group_id + '|' + a.mes;
    enviar.set(chave, [...(enviar.get(chave) || []), a]);
  }
  return { enviar, baixar };
}

// Janela de agrupamento: o encontro só sai quando o primeiro alerta não notificado tem a idade da janela.
// A mesma regra roda no SQL (alertas_nps_para_enviar); fica aqui para o teste e para a leitura.
export function janelaVencida(primeiroCriadoEm: Date, agora: Date, janelaMin: number): boolean {
  return agora.getTime() - primeiroCriadoEm.getTime() >= janelaMin * 60_000;
}

const ROTULO_CRITERIO: Record<AlertaParaEnviar['criterio'], string> = {
  detrator: 'Resposta detratora',
  nota_cs_baixa: 'Nota baixa para o CS',
  nps_encontro: 'NPS do conselheiro no encontro',
  media_encontro: 'Média do conselheiro no encontro',
};

function linhaCriterio(a: AlertaParaEnviar): string {
  switch (a.criterio) {
    case 'detrator': return `${a.respondente_nome} deu nota ${fmt(a.valor)} ao conselheiro (detrator é nota até ${fmt(a.referencia)}).`;
    case 'nota_cs_baixa': return `${a.respondente_nome} deu nota ${fmt(a.valor)} ao CS (o corte é ${fmt(a.referencia)}).`;
    case 'nps_encontro': return `NPS ${fmt(a.valor)} com ${a.amostra} respostas (mínimo ${fmt(a.referencia)}).`;
    case 'media_encontro': return `Média ${fmt(a.valor)} com ${a.amostra} respostas (mínimo ${fmt(a.referencia)}).`;
  }
}

export function montarEmail(alertas: AlertaParaEnviar[], siteUrl: string): EmailAlerta {
  const primeiro = alertas[0];
  const conselho = primeiro.conselho || 'Conselho sem título';
  const cs = primeiro.cs_responsavel || 'não identificado';
  const link = siteUrl.replace(/\/$/, '') + '/conselho/' + encodeURIComponent(primeiro.group_id);
  const assunto = `NPS em atenção: ${conselho} (${primeiro.mes})`;

  const resumo = alertas.length === 1
    ? `O encontro de ${primeiro.mes} do conselho ${conselho} disparou 1 alerta de NPS.`
    : `O encontro de ${primeiro.mes} do conselho ${conselho} disparou ${alertas.length} alertas de NPS.`;

  const itens = alertas.map((a) => {
    const comentario = a.detalhe?.comentario ? `<div style="color:#5D5D5D;font-size:13px;margin-top:4px;">Comentário: ${esc(a.detalhe.comentario)}</div>` : '';
    return `<tr><td style="padding:12px 0;border-top:1px solid #ECEAEA;"><div style="font-size:12px;color:#878585;text-transform:uppercase;letter-spacing:.04em;">${esc(ROTULO_CRITERIO[a.criterio])}</div>`
      + `<div style="font-size:15px;margin-top:2px;">${esc(linhaCriterio(a))}</div>${comentario}</td></tr>`;
  }).join('');

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(assunto)}</title></head>`
    + `<body style="margin:0;background:#F3F2F0;font-family:Helvetica,Arial,sans-serif;color:#1A1A1A;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F2F0;padding:24px 12px;"><tr><td align="center">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:14px;padding:24px;">`
    + `<tr><td><div style="font-size:12px;color:#C0433D;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">NPS em atenção</div>`
    + `<h1 style="font-size:20px;line-height:1.3;margin:6px 0 8px;">${esc(conselho)}</h1>`
    + `<div style="font-size:15px;line-height:1.5;">${esc(resumo)}</div>`
    + `<div style="font-size:13px;color:#5D5D5D;margin-top:6px;">CS responsável: <b>${esc(cs)}</b></div></td></tr>`
    + `<tr><td style="padding-top:14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itens}</table></td></tr>`
    + `<tr><td style="padding-top:20px;"><a href="${esc(link)}" style="display:inline-block;background:#1A1A1A;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:700;padding:12px 18px;border-radius:9px;">Abrir o conselho</a></td></tr>`
    + `<tr><td style="padding-top:18px;font-size:12px;color:#878585;">Este aviso chega uma vez por encontro. Marque como tratado na fila de ação do dashboard.</td></tr>`
    + `</table></td></tr></table></body></html>`;

  const texto = [assunto, '', resumo, `CS responsável: ${cs}`, '', ...alertas.map((a) => `${ROTULO_CRITERIO[a.criterio]}: ${linhaCriterio(a)}${a.detalhe?.comentario ? ' Comentário: ' + a.detalhe.comentario : ''}`), '', `Abrir o conselho: ${link}`].join('\n');
  return { assunto, html, texto, ids: alertas.map((a) => a.id) };
}
