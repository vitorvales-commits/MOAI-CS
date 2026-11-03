// Roda com: npx tsx tests/paginar.test.ts
// Regressão de 03/11/2026: o PostgREST corta respostas em 1000 linhas sem erro e as metas de novembro sumiam da home.
import assert from 'node:assert/strict';
import { rpcPaginado, selectPaginado } from '../lib/supabase/paginar.ts';

// Cliente falso: rpc(...).range(de, ate) devolve a fatia, como o PostgREST, mas nunca mais que 1000 linhas.
function clienteCom(total: number, falhaNaPagina?: number) {
  const linhas = Array.from({ length: total }, (_, i) => ({ i }));
  const chamadas: number[] = [];
  const sb = {
    rpc: (_nome: string, _args: unknown) => ({
      range: async (de: number, ate: number) => {
        chamadas.push(de);
        if (falhaNaPagina !== undefined && chamadas.length === falhaNaPagina) return { data: null, error: { message: 'boom' } };
        return { data: linhas.slice(de, Math.min(ate + 1, de + 1000)), error: null };
      },
    }),
  };
  return { sb: sb as any, chamadas, linhas };
}

async function main() {
  // 2352 linhas (caso real): 3 páginas, todas, na ordem.
  const a = clienteCom(2352);
  const r = await rpcPaginado(a.sb, 'metas_resolvidas_periodo', {});
  assert.equal(r.length, 2352);
  assert.deepEqual(r, a.linhas);
  assert.deepEqual(a.chamadas, [0, 1000, 2000]);

  // Múltiplo exato do tamanho da página: termina na página vazia, sem laço infinito.
  const b = clienteCom(2000);
  assert.equal((await rpcPaginado(b.sb, 'f', {})).length, 2000);
  assert.deepEqual(b.chamadas, [0, 1000, 2000]);

  // Vazio e menos de uma página.
  assert.equal((await rpcPaginado(clienteCom(0).sb, 'f', {})).length, 0);
  assert.equal((await rpcPaginado(clienteCom(10).sb, 'f', {})).length, 10);

  // Limite de páginas atingido vira erro explícito, nunca truncamento silencioso.
  await assert.rejects(() => rpcPaginado(clienteCom(5000).sb, 'minha_funcao', {}, { maxPaginas: 3 }), /Limite de 3 páginas.*minha_funcao/);

  // Erro do Supabase carrega o nome da função.
  await assert.rejects(() => rpcPaginado(clienteCom(2500, 2).sb, 'minha_funcao', {}), /minha_funcao: boom/);

  // selectPaginado segue a mesma regra.
  const c = clienteCom(2352);
  const s = await selectPaginado(() => c.sb.rpc('x', {}), { nome: 'tabela_x' });
  assert.equal(s.length, 2352);
  await assert.rejects(() => selectPaginado(() => clienteCom(5000).sb.rpc('x', {}), { nome: 'tabela_x', maxPaginas: 2 }), /tabela_x/);

  console.log('paginar.test.ts ok');
}
main();
