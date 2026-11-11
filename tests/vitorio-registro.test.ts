// Roda com: npx tsx tests/vitorio-registro.test.ts
// Registro de consultas: consultaId só quando o registro deu certo; escolha vai em p_chave; mais de cinco
// candidatos mantém "Nenhum desses"; resposta de carteira traz group_id e CS para os links.
import assert from 'node:assert/strict';
import { argsRegistro, registrarConsulta, type Rpc } from '../lib/vitorio/registro.ts';
import { responderTexto, type DadosPipeline } from '../lib/vitorio/pipeline.ts';

const silencio = console.error;
console.error = () => {};

(async () => {

const UUID = '3f2b8a1e-6c4d-4e5f-9a0b-1c2d3e4f5a6b';

// 1. rpc devolve o uuid: consultaId é esse uuid, e o nome do rpc é o da função v2.
{
  let nomeChamado = '';
  const rpc: Rpc = async (nome) => { nomeChamado = nome; return { data: UUID, error: null }; };
  const r = await registrarConsulta(rpc, { p_perfil: 'gestor' });
  assert.equal(r.consultaId, UUID);
  assert.equal(nomeChamado, 'vitorio_registrar_consulta_v2');
}

// 2. erro genérico: sem consultaId.
{
  const rpc: Rpc = async () => ({ data: null, error: { code: 'XX000', message: 'falhou' } });
  assert.equal((await registrarConsulta(rpc, {})).consultaId, null);
}

// 3. limite de 30 por hora (54000): sem consultaId.
{
  const rpc: Rpc = async () => ({ data: null, error: { code: '54000', message: 'limite de consultas por hora atingido' } });
  assert.equal((await registrarConsulta(rpc, {})).consultaId, null);
}

// 4. rpc lança exceção: sem consultaId, sem derrubar a resposta.
{
  const rpc: Rpc = async () => { throw new Error('rede'); };
  assert.equal((await registrarConsulta(rpc, {})).consultaId, null);
}

// 5. escolha vai em p_chave; sem escolha, p_chave é nulo.
const base = { perfil: 'cs', texto: 'quem cuida do lima', resultado: 'ambigua' as const, intencao: 'carteira', entidades: {}, gravarPessoa: false };
assert.equal(argsRegistro({ ...base, escolhido: 'g2' }).p_chave, 'g2');
assert.equal(argsRegistro({ ...base, escolhido: null }).p_chave, null);

// Dados com seis conselhos que compartilham "lima": a lista de candidatos passa de cinco.
const titulos: Record<string, string> = {};
for (let i = 1; i <= 6; i++) titulos[`g${i}`] = `Executivo | Pessoa${i} Lima (Ana)`;
const dados: DadosPipeline = {
  hojeIso: '2026-11-11',
  periodos: [],
  ativosHoje: ['Ana'],
  vigencias: [{ group_id: 'g1', cs_id: 1, inicio: '-infinity', fim: null }],
  csPorId: { 1: 'Ana' },
  conselhos: titulos,
  conselhosLista: Object.entries(titulos).map(([group_id, titulo]) => ({ group_id, titulo })),
  csLista: [{ id: 1, nome_curto: 'Ana', apelidos: [] }],
};

// 6. mais de cinco candidatos: pede mais do nome e mantém "Nenhum desses".
const muitos = responderTexto('quem cuida do lima', dados);
assert.equal(muitos.status, 'esclarecimento');
if (muitos.status === 'esclarecimento') {
  assert.match(muitos.pergunta, /Digite mais do nome/);
  assert.ok(muitos.opcoes.some((o) => o.valor === 'nenhum' && o.label === 'Nenhum desses'));
}

// 7. resposta de carteira traz group_id e nome do CS responsável (para os links da tela).
const resp = responderTexto('quem cuida da pessoa1 lima em 05/11', dados);
assert.equal(resp.status, 'resposta');
if (resp.status === 'resposta') {
  assert.equal(resp.resposta.groupId, 'g1');
  assert.equal(resp.resposta.csNome, 'Ana');
}

console.error = silencio;
console.log('ok vitorio-registro');
})().catch((e) => { console.error = silencio; console.error(e); process.exit(1); });
