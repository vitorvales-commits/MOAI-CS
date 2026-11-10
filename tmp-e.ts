import { extrair } from './lib/vitorio/entidades.ts';
import { normalizar } from './lib/vitorio/busca.ts';
import { classificar } from './lib/vitorio/classificador.ts';
import { servicos } from './tests/fixtures/vitorio-servicos.ts';
const sv = servicos({ perfil: 'gestor' });
for (const q of process.argv.slice(2)) {
  const n = normalizar(q); const { entidades, mascarado } = extrair(n, sv.dic, '2026-10-30');
  const c = classificar(sv.cl, mascarado, entidades);
  console.log(q, '=>', mascarado, '|', JSON.stringify({ cs: entidades.cs?.id, ind: entidades.indicador?.id, con: entidades.conselho?.id }), '|', c.ranking.map((r) => r.id + ' ' + r.score.toFixed(2)).join(' ; '));
}
