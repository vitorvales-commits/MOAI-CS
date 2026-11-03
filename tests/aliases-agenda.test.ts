// Roda com: npx tsx tests/aliases-agenda.test.ts
import assert from 'node:assert/strict';
import { montarPendentesAgenda, listarAliasesAgendaPendentes, confirmarAliasAgendaConselho } from '../lib/aliases-agenda.ts';

// Só pendentes, por impacto em eventos; resolvidos nunca aparecem; candidato traz o título do grupo.
const p = montarPendentesAgenda({
  nomesAgenda: ['A', 'A', 'B', 'B', 'B', 'C', null, 'D'],
  nomesResolvidos: ['A'],
  candidatos: [{ conselheiro_nome: 'B', group_id: 'g1' }, { conselheiro_nome: 'B', group_id: 'g2' }],
  titulos: new Map([['g1', 'Executivo | B (X)']]),
});
assert.deepEqual(p.map((x) => [x.nome, x.eventos]), [['B', 3], ['C', 1], ['D', 1]]);
assert.deepEqual(p[0].candidatos, [{ groupId: 'g1', titulo: 'Executivo | B (X)' }, { groupId: 'g2', titulo: null }]);
assert.deepEqual(p[1].candidatos, []);

// Cliente falso mínimo.
const tabela = (data: any[] | null, error: any = null) => {
  const q: any = { select: () => q, eq: () => q, in: () => q, order: () => q, range: async (de: number) => ({ data: de === 0 ? data : [], error }), then: (f: any) => f({ data, error }) };
  return q;
};
const sbCom = (view: any, aliases: any) => ({ from: (t: string) => t === 'agenda_conselhos_items' ? tabela([{ conselheiro_nome: 'X' }]) : t === 'v_agenda_conselho_grupo' ? view : t === 'agenda_conselho_aliases' ? aliases : tabela([]) }) as any;

async function main() {
// Relação ausente (PGRST205) não é erro: indisponível e vazio. Outro erro sobe.
const ausente = { code: 'PGRST205', message: 'x' };
assert.deepEqual(await listarAliasesAgendaPendentes(sbCom(tabela(null, ausente), tabela(null, ausente))), { disponivel: false, pendentes: [] });
await assert.rejects(() => listarAliasesAgendaPendentes(sbCom(tabela(null, { code: '42501', message: 'negado' }), tabela([]))), /negado/);
const ok = await listarAliasesAgendaPendentes(sbCom(tabela([]), tabela([])));
assert.equal(ok.disponivel, true);
assert.deepEqual(ok.pendentes.map((x) => x.nome), ['X']);

// A confirmação passa pela RPC com os nomes certos e propaga o erro.
let chamada: any;
await confirmarAliasAgendaConselho({ rpc: async (n: string, a: any) => { chamada = [n, a]; return { error: null }; } } as any, 'Fulano', 'g1');
assert.deepEqual(chamada, ['confirmar_alias_agenda_conselho', { p_conselheiro_nome: 'Fulano', p_group_id: 'g1' }]);
await assert.rejects(() => confirmarAliasAgendaConselho({ rpc: async () => ({ error: { message: 'not authorized' } }) } as any, 'F', 'g'), /not authorized/);
console.log('aliases-agenda.test.ts ok');
}
main();
