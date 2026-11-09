// Roda com: npx tsx tests/visitas-item-teste.test.ts
// Item de teste da escrita no Monday (visitas_churn.item_teste, 06/11/2026): fica fora de totais, filtros,
// CSV e relatório; a tela de visitas mostra só o item fixo da fila (VISITA_ITEM_TESTE_FILA_ID), mesmo que
// exista outro item de teste no banco (o "TESTE" antigo, 13104116386); CS nunca recebe a linha; zero visitas
// reais mostra a orientação no lugar da tabela. A função de visitas_resultado e a validação ficam na migração
// 20261103a (leitura estática); a sync-monday é checada no código-fonte, porque roda no Deno.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GESTOR_SCRIPT } from '../app/gestor-html.ts';
import { carregarItemTeste, carregarVisitas, csvVisitas } from '../lib/visitas-dados.ts';
import { VISITA_ITEM_TESTE_FILA_ID } from '../lib/constants.ts';
import type { VisitaLinha } from '../lib/visitas.ts';

const ITEM_FIXO = 13441800409;
const ITEM_ANTIGO = 13104116386;

// ---- supabase falso ----
// visitas_churn: os eq() viram filtro de verdade sobre as linhas, e a consulta é awaitable como no cliente real.
function fakeVisitasChurn(linhas: any[], chamadas: string[] = [], erro: { message: string } | null = null) {
  const consulta = (filtros: Array<[string, unknown]>): any => ({
    select(c: string) { chamadas.push('select:' + c); return consulta(filtros); },
    eq(col: string, val: unknown) { chamadas.push(`eq:${col}=${val}`); return consulta([...filtros, [col, val]]); },
    then(ok: (v: any) => unknown, ko?: (e: unknown) => unknown) {
      if (erro) return Promise.resolve({ data: null, error: erro }).then(ok, ko);
      const data = linhas.filter((r) => filtros.every(([c, v]) => String(r[c]) === String(v)));
      return Promise.resolve({ data, error: null }).then(ok, ko);
    },
  });
  return { chamadas, from(t: string) { chamadas.push('from:' + t); return consulta([]); } } as any;
}
// RPC visitas_resultado: devolve as linhas que o SQL devolveria (o SQL já exclui o item de teste)
function fakeRpc(linhas: any[]) {
  return { rpc: async () => ({ data: linhas, error: null }) } as any;
}

const linhaTabela = (id: number, item_teste: boolean, extra: Record<string, unknown> = {}) => ({
  id, membro_nome: item_teste ? 'teste' : 'Membro X', item_teste, monday_updated_at: '2026-11-06T10:00:00Z',
  proximo_acompanhamento: null, observacoes: null, ...extra,
});
const DOIS_ITENS_TESTE = [
  linhaTabela(ITEM_FIXO, true, { monday_updated_at: '2026-11-02T14:01:35Z' }),
  linhaTabela(ITEM_ANTIGO, true, { membro_nome: 'TESTE', monday_updated_at: '2026-09-22T13:58:49Z', etapa: 'pedido' }),
];

async function principal() {
// ---- 1. leitura do item de teste ----
{
  // CS (não gestor): nem consulta o banco
  const chamadas: string[] = [];
  const r = await carregarItemTeste(fakeVisitasChurn(DOIS_ITENS_TESTE, chamadas), false);
  assert.equal(r, null);
  assert.deepEqual(chamadas, [], 'CS não deve consultar visitas_churn');
}
{
  // gestor com DOIS itens de teste no banco: a rota devolve só o fixo, nunca o "TESTE" antigo
  const chamadas: string[] = [];
  const r = await carregarItemTeste(fakeVisitasChurn(DOIS_ITENS_TESTE, chamadas), true);
  assert.ok(r, 'o item fixo existe');
  assert.equal(r!.id, ITEM_FIXO);
  assert.notEqual(r!.id, ITEM_ANTIGO, 'o item antigo não aparece na tela');
  assert.deepEqual(r, { id: ITEM_FIXO, mondayUpdatedAt: '2026-11-02T14:01:35Z', proximoAcompanhamento: null, observacoes: null });
  assert.ok(chamadas.includes('from:visitas_churn'));
  assert.ok(chamadas.includes(`eq:id=${ITEM_FIXO}`), 'a leitura filtra pelo ID fixo');
  assert.ok(chamadas.includes('eq:item_teste=true'), 'e exige item_teste');
}
{
  // o ID fixo vem da constante, não de um número espalhado pelo código
  assert.equal(VISITA_ITEM_TESTE_FILA_ID, ITEM_FIXO);
  // só o item antigo no banco (sem o fixo): nulo, a tela não mostra nenhuma linha de teste
  const r = await carregarItemTeste(fakeVisitasChurn([DOIS_ITENS_TESTE[1]]), true);
  assert.equal(r, null, 'sem o item fixo, nada aparece na tela');
}
{
  // item fixo ainda não sincronizado: nulo
  assert.equal(await carregarItemTeste(fakeVisitasChurn([]), true), null);
}
{
  // item fixo existe mas sem item_teste verdadeiro (regra quebrada): não aparece
  const r = await carregarItemTeste(fakeVisitasChurn([linhaTabela(ITEM_FIXO, false)]), true);
  assert.equal(r, null);
}
{
  // erro de banco: a função lança, e a rota é quem devolve nulo e registra no log
  await assert.rejects(carregarItemTeste(fakeVisitasChurn([], [], { message: 'falhou' }), true), /falhou/);
}

// ---- 2. visitas reais: zero libera o estado vazio; nenhum item de teste entra em c3 ----
const linhaReal = (over: Partial<VisitaLinha>): VisitaLinha => ({
  id: 1, membro_nome: 'Membro X', membro_id: 10, group_id: 'g1', cs_responsavel: 'Ana', visitantes: null,
  etapa: 'visita', produto: 'Executivo', local: 'Online', acao_principal: 'Plano de Ação', termometro: 'Muito em risco',
  causa_raiz: null, etapa_origem: 'CS', duracao: '30 a 60 min', expansao: 'Nenhuma', mrr_em_risco: 1000,
  data_pedido: '2026-10-01', data_visita: '2026-10-05', data_desfecho: null, fim_fidelidade: '2027-01-01',
  proximo_acompanhamento: null, encerrada: false, retencao_imediata: null, situacao_hoje: 'ativo',
  dentro_fidelidade: false, dias_ate_visita: 4, dias_ate_novo_risco: null, evitavel: null, identificavel_antes: null,
  retido_30: 'em_aberto', retido_90: 'em_aberto', retido_180: 'em_aberto', iev: null, ...over,
} as VisitaLinha);
{
  // com os dois itens de teste no banco, o SQL (visitas_resultado) devolve só as visitas reais: a RPC simulada
  // não traz nenhum dos dois, então c3, o total e o estado vazio ficam como sem visitas
  const { janela, payload } = await carregarVisitas(fakeRpc([]), '2026-10');
  assert.equal(janela.length, 0);
  assert.equal(payload.visitasReais, 0, 'zero visitas reais libera o estado vazio');
  assert.equal(payload.c3.total, 0);
  assert.deepEqual(payload.c3.linhas, [], 'nenhum item de teste em c3');
}
{
  const rows = [linhaReal({ id: 1 }), linhaReal({ id: 2, membro_nome: 'Membro Y' })];
  const { janela, payload } = await carregarVisitas(fakeRpc(rows), '2026-10');
  assert.equal(payload.visitasReais, 2);
  assert.equal(payload.c3.total, 2);
  assert.ok(!payload.c3.linhas.some((l: any) => /teste/i.test(String(l.membro))), 'c3 não recebe item de teste');
  assert.ok(!payload.c3.linhas.some((l: any) => l.id === ITEM_ANTIGO || l.id === ITEM_FIXO), 'c3 não recebe os IDs de teste');
  // CSV é montado da janela: nenhuma linha de teste
  const csv = csvVisitas(janela);
  assert.ok(!csv.includes('Item de teste da escrita'));
  assert.ok(!csv.includes('TESTE'), 'CSV sem o item antigo');
  assert.ok(!csv.includes(String(ITEM_ANTIGO)));
}

// ---- 3. tela: funções reais do script embutido, executadas com entradas controladas ----
function extrairFuncao(script: string, nome: string): string {
  const inicio = script.indexOf(`function ${nome}(`);
  assert.ok(inicio >= 0, `função ${nome} não encontrada no script do gestor`);
  let i = script.indexOf('{', inicio);
  let prof = 0;
  for (; i < script.length; i++) {
    if (script[i] === '{') prof++;
    else if (script[i] === '}') { prof--; if (prof === 0) break; }
  }
  return script.slice(inicio, i + 1);
}
function extrairVar(script: string, nome: string): string {
  const m = script.match(new RegExp(`^var ${nome} = .*;$`, 'm'));
  assert.ok(m, `variável ${nome} não encontrada`);
  return m[0];
}
const NOMES = ['churnEsc_', 'churnDataBR_', 'churnMoeda_', 'churnNum_', 'churnPct_', 'churnTabela_', 'visitasBotaoEditar_', 'visitasListaHtml_'];
const fonte = [extrairVar(GESTOR_SCRIPT, 'VISITAS_CABECALHO_'), extrairVar(GESTOR_SCRIPT, 'VISITAS_SEM_VISITAS_'), ...NOMES.map((n) => extrairFuncao(GESTOR_SCRIPT, n))].join('\n');
const { visitasListaHtml_ } = new Function(fonte + '\nreturn { visitasListaHtml_ };')() as { visitasListaHtml_: (v: any) => string };

const payloadBase = (over: Record<string, unknown>) => ({
  ref: '2026-10', c3: { total: 0, linhas: [] as any[] }, visitasReais: 0, itemTeste: null, ...over,
});
const linhaTela = (id: number, membro: string) => ({
  id, membro, cs: 'Ana', etapa: 'visita', dataPedido: '2026-10-01', dataVisita: '2026-10-05', diasAteVisita: 4, mrr: 1000,
  acaoPrincipal: 'Plano', causaRaiz: null, termometro: 'Muito em risco', retido90: 'em_aberto', iev: null,
  link: `https://moai-global.monday.com/boards/18432210313/pulses/${id}`, mondayUpdatedAt: '2026-11-01T10:00:00Z',
});
const ITEM_TESTE = { id: ITEM_FIXO, mondayUpdatedAt: '2026-11-06T10:00:00Z', proximoAcompanhamento: null, observacoes: null };
const MSG_VAZIO = 'Nenhuma visita registrada no Monday ainda. Quando a primeira for criada no board Visita Churns, ela aparece aqui em até 5 minutos e pode ser editada pelo botão Editar.';

// Estado vazio, sem linha de teste (CS, ou gestor sem o item fixo): orientação, sem tabela
{
  const h = visitasListaHtml_(payloadBase({}));
  assert.ok(h.includes(MSG_VAZIO), 'mensagem de orientação');
  assert.ok(!h.includes('<table'), 'sem tabela vazia no lugar da orientação');
  assert.ok(!h.includes('Item de teste'));
}
// Estado vazio com a linha de teste (gestor): a linha aparece abaixo da mensagem, com o botão Editar
{
  const h = visitasListaHtml_(payloadBase({ itemTeste: ITEM_TESTE }));
  assert.ok(h.indexOf(MSG_VAZIO) >= 0 && h.indexOf('Item de teste da escrita no Monday') > h.indexOf(MSG_VAZIO), 'linha de teste abaixo da mensagem');
  assert.ok(h.includes('<tr class="linha-teste">'));
  assert.ok(h.includes(`data-visita-editar="${ITEM_FIXO}"`), 'botão Editar do item fixo');
  assert.equal((h.match(/<tbody>/g) || []).length, 1);
  assert.equal((h.match(/<tr class="linha-teste">/g) || []).length, 1);
  assert.ok(!h.includes(String(ITEM_ANTIGO)), 'o item antigo não aparece na tela');
  assert.ok(!h.includes('TESTE<'), 'nem pelo nome antigo');
}
// Com visitas reais: a linha de teste vai no fim, e totais e nota contam só as visitas reais
{
  const h = visitasListaHtml_(payloadBase({
    c3: { total: 2, linhas: [linhaTela(1, 'Membro X'), linhaTela(2, 'Membro Y')] }, visitasReais: 2, itemTeste: ITEM_TESTE,
  }));
  assert.ok(!h.includes(MSG_VAZIO));
  assert.ok(h.includes('2 visitas no período'), 'a nota não conta o item de teste');
  assert.ok(h.indexOf('data-visita-editar="2"') < h.indexOf('linha-teste'), 'linha de teste no fim da tabela');
  assert.equal((h.match(/<tr class="linha-teste">/g) || []).length, 1);
  assert.equal((h.match(/<tr>/g) || []).length, 3, 'cabeçalho e duas linhas de visita, sem linha extra');
}
// Sem linha de teste para CS: a tela não exibe o rótulo em nenhum caso
{
  const h = visitasListaHtml_(payloadBase({ c3: { total: 1, linhas: [linhaTela(1, 'Membro X')] }, visitasReais: 1, itemTeste: null }));
  assert.ok(!h.includes('Item de teste'));
  assert.ok(!h.includes('linha-teste'));
}
// Item fixo sem monday_updated_at: botão desabilitado, como nas visitas
{
  const h = visitasListaHtml_(payloadBase({ itemTeste: { ...ITEM_TESTE, mondayUpdatedAt: null } }));
  assert.ok(h.includes('<button type="button" class="btn sm" disabled>Aguardando a próxima sincronização</button>'));
}
// O script usa o item de teste para abrir o editor, sem depender de c3
{
  assert.ok(GESTOR_SCRIPT.includes("t && String(t.id) === String(id)"), 'visitaLinha_ reconhece o item de teste');
}

// ---- 4. regras que vivem no SQL, no código da sincronização e na constante (leitura estática) ----
{
  const mig = readFileSync('supabase/migrations/20261103a_visitas_monday_updated_at.sql', 'utf8');
  const minus = mig.toLowerCase();
  const resultado = mig.slice(minus.indexOf('function public.visitas_resultado'), minus.indexOf('function sincronia.validar_edicao'));
  assert.ok(/from\s+(public\.)?visitas_churn\s+v\s+cross join hoje h\s+where\s+not\s+v\.item_teste/.test(resultado), 'visitas_resultado exclui o item de teste');
  const validar = mig.slice(minus.indexOf('function sincronia.validar_edicao'));
  assert.ok(validar.includes('O item de teste é restrito a gestor') || validar.includes('O item de teste da fila é exclusivo do gestor'), 'validar_edicao recusa o item de teste para CS');
  assert.ok(mig.includes('monday_updated_at timestamptz'));
  assert.ok(mig.includes('item_teste boolean not null default false'));
}
{
  const sync = readFileSync('supabase/functions/sync-monday/index.ts', 'utf8');
  assert.ok(!/filter\(\(it\)\s*=>\s*normalizarTexto\(it\.name \|\| ''\) !== 'teste'\)/.test(sync), 'o item de teste não é mais descartado');
  assert.ok(sync.includes("item_teste: normalizarTexto(it.name || '') === 'teste'"), 'item_teste marcado pelo nome (todos os itens)');
  assert.ok(sync.includes('monday_updated_at: it.updated_at ?? null'), 'monday_updated_at continua gravado');
}
{
  const dados = readFileSync('lib/visitas-dados.ts', 'utf8');
  assert.ok(dados.includes(".eq('id', VISITA_ITEM_TESTE_FILA_ID)"), 'a leitura usa o ID fixo');
  assert.ok(!dados.includes('.limit(1)'), 'sem limit(1): o ID fixo é a única escolha');
  const constantes = readFileSync('lib/constants.ts', 'utf8');
  assert.ok(constantes.includes('export const VISITA_ITEM_TESTE_FILA_ID = 13441800409;'));
}

}

principal().then(() => console.log('ok: item de teste fixo, leitura por papel, estado vazio e regras de sincronização'));
