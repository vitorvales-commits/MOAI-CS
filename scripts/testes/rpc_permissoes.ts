// Teste de permissões das funções administrativas (RPC): o perfil CS deve ser negado e o gestor, aceito.
// Roda contra o projeto do .env.local, com a chave de serviço apenas para montar o cenário (dois usuários de teste,
// criados e removidos no fim):
//   SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/testes/rpc_permissoes.ts
// Para cobrir uma função nova, acrescente uma linha em FUNCOES. Os argumentos devem ter o tipo certo (o CS precisa
// chegar até a guarda) e ser inofensivos: com o gestor a função de fato executa, então use valores que a validação
// interna recusa ou que não encontram nada. Se o gestor precisar de argumentos diferentes, use o terceiro item.
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type Args = Record<string, unknown>;
const INEXISTENTE = 'inexistente@invalido.test';
const ID_ZERO = '00000000-0000-0000-0000-000000000000';

// nome da função, argumentos, argumentos do gestor (opcional, calculados depois do cenário pronto)
const FUNCOES: [string, Args, ((e: Estado) => Args)?][] = [
  ['adicionar_gestor', { p_email: null }],
  ['remover_gestor', { p_email: INEXISTENTE }],
  ['vincular_cs', { p_nome: null, p_nome_completo: null, p_apelido_conselho: null, p_monday_user_id: null }],
  ['vincular_cs_usuario', { p_email: null, p_nome: null }],
  ['desvincular_cs_usuario', { p_email: INEXISTENTE }],
  ['set_cs_ativo', { p_nome: '__inexistente__', p_ativo: true }],
  ['reabrir_fechamento_mensal', { p_ano: 1900, p_mes: 1 }],
  ['salvar_fechamento_mensal', { p_ano: 1900, p_mes: 1, p_linhas: [], p_dia_corte: 1 }],
  ['definir_metas_lote', { p_mes: null, p_itens: null }],
  ['copiar_metas_mes', { p_de: '2026-01-01', p_para: '2026-01-01' }],
  ['definir_alerta_nps_config', { p_limiar_detrator: null, p_limiar_nota_cs: null, p_nps_minimo: null, p_media_minima: null, p_amostra_minima: null }],
  ['definir_advertencia_soma_health', { p_ligado: null }],
  ['criar_advertencia_tipo', { p_nome: null, p_pontos: null, p_validade_meses: null }],
  ['editar_advertencia_tipo', { p_id: ID_ZERO, p_nome: null, p_pontos: null, p_validade_meses: null, p_ativo: null }],
  ['aplicar_advertencia', { p_cs_nome: null, p_tipo_id: ID_ZERO, p_observacao: null }],
  ['anular_advertencia', { p_id: ID_ZERO, p_motivo: null }],
  ['excluir_advertencia_aplicada', { p_id: ID_ZERO }],
  ['definir_recorde_manual', { p_indicador: null, p_escopo: null, p_cs: null, p_valor: null, p_mes: null, p_obs: null }],
  ['configurar_home_indicadores', { p_itens: null }],
  // null viraria false e gravaria na configuração: o gestor reenvia o valor que já existe
  ['set_revelar_indicadores_equipe', { p_valor: false }, (e) => ({ p_valor: e.revelarAtual })],
  ['processos_publicar', { p_titulo: null, p_moldura: null, p_dados: null, p_descricao: null, p_versao_base: null }],
  ['processos_restaurar', { p_versao: -1, p_versao_base: null }],
  ['saude_dados', {}],
];

type Estado = { revelarAtual: boolean };

function lerEnv(): Record<string, string> {
  const doArquivo = Object.fromEntries(
    readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
  );
  return { ...doArquivo, ...process.env } as Record<string, string>;
}

async function main() {
  const env = lerEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const servico = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !servico) throw new Error('Defina NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY.');

  const adm = createClient(url, servico, { auth: { persistSession: false } });
  const sufixo = randomUUID().slice(0, 8);
  const senha = `T-${randomUUID()}`;
  const emailCs = `teste.cs.${sufixo}@moaiclubedelideres.com`;
  const emailGestor = `teste.gestor.${sufixo}@moaiclubedelideres.com`;
  const criados: string[] = [];

  try {
    for (const email of [emailCs, emailGestor]) {
      const { data, error } = await adm.auth.admin.createUser({ email, password: senha, email_confirm: true });
      if (error) throw new Error(`createUser ${email}: ${error.message}`);
      criados.push(data.user.id);
    }
    const { data: cfg } = await adm.from('cs_config').select('nome').limit(1).single();
    await adm.from('gestores').insert({ email: emailGestor, nome: 'Teste de permissões' }).throwOnError();
    await adm.from('cs_usuarios').insert({ email: emailCs, nome: cfg?.nome }).throwOnError();
    const { data: conf } = await adm.from('configuracoes_globais').select('revelar_indicadores_equipe').eq('id', true).single();
    const estado: Estado = { revelarAtual: !!conf?.revelar_indicadores_equipe };

    const entrar = async (email: string): Promise<SupabaseClient> => {
      const c = createClient(url, anon, { auth: { persistSession: false } });
      const { error } = await c.auth.signInWithPassword({ email, password: senha });
      if (error) throw new Error(`login ${email}: ${error.message}`);
      return c;
    };
    const cs = await entrar(emailCs);
    const gestor = await entrar(emailGestor);

    let falhas = 0;
    for (const [nome, args, argsGestor] of FUNCOES) {
      const rCs = await cs.rpc(nome, args);
      const rGestor = await gestor.rpc(nome, argsGestor ? argsGestor(estado) : args);
      const csNegado = rCs.error?.code === '42501';
      // aceito = chegou na lógica da função: sem erro, ou erro de validação, nunca de permissão nem de assinatura
      const gestorAceito = !rGestor.error || !['42501', 'PGRST202', 'PGRST301'].includes(rGestor.error.code);
      const ok = csNegado && gestorAceito;
      if (!ok) falhas++;
      console.log(`${ok ? 'ok    ' : 'FALHOU'} ${nome}  cs=${csNegado ? 'negado' : `ACEITO (${rCs.error?.code ?? 'sem erro'})`}  gestor=${gestorAceito ? 'aceito' : `NEGADO (${rGestor.error?.code}: ${rGestor.error?.message})`}`);
    }
    console.log(`\n${FUNCOES.length - falhas} de ${FUNCOES.length} funções com o comportamento esperado.`);
    process.exitCode = falhas ? 1 : 0;
  } finally {
    await adm.from('gestores').delete().eq('email', emailGestor);
    await adm.from('cs_usuarios').delete().eq('email', emailCs);
    for (const id of criados) await adm.auth.admin.deleteUser(id);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
