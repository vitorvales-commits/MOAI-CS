import { buscar, normalizar } from './lib/vitorio/busca.ts';
import { servicos } from './tests/fixtures/vitorio-servicos.ts';
const sv = servicos({ perfil: 'cs' });
for (const q of process.argv.slice(2)) {
  const r: any = buscar(sv.indiceDocs, normalizar(q));
  console.log(q, '=>', r.ranking.map((x: any) => x.doc.chave + ' ' + x.score.toFixed(2)).join(' | '));
}
