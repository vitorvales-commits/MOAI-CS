// Validação retroativa do modelo de sugestão de metas e sugestão para um mês alvo, com a chave de serviço.
//   npx tsx scripts/validar-metas.mts [mesAlvo AAAA-MM-01]
import { clienteScripts } from '../lib/scripts-cliente.mts';
import { criarContexto, sugerirMetas, validarRetroativo, somarMeses } from '../lib/metas-sugestao-dados.ts';
import { hojeSP } from '../lib/gtd-prazos.ts';

const sb = clienteScripts();
const { data: catalogo } = await sb.from('indicadores_catalogo').select('chave, rotulo, direcao, fonte, agregacao_time').order('chave');
const t0 = Date.now();
const ctx = await criarContexto(sb);
const corrente = hojeSP().slice(0, 7) + '-01';
const meses = [3, 2, 1].map((n) => somarMeses(corrente, -n));
const v = await validarRetroativo(ctx, meses, catalogo as any);
console.log('Meses validados:', meses.join(', '), `(${Math.round((Date.now() - t0) / 1000)} s, ${ctx.cache.size} relatórios de CS por mês)`);
console.table(v.porIndicador.map((x) => ({ indicador: x.rotulo, n: x.n, 'erro médio %': x.erroMedio === null ? null : Math.round(x.erroMedio * 100), 'metas batidas': `${x.metasBatidas}/${x.n}`, bloqueado: x.bloqueado })));
const alvo = process.argv[2];
if (alvo) {
  const r = await sugerirMetas(ctx, alvo, catalogo as any);
  for (const i of r.indicadores) {
    if (i.semModelo) { console.log(`\n${i.rotulo}: ${i.semModelo}`); continue; }
    console.log(`\n${i.rotulo}: time ${i.time?.sugerido ?? 'sem sugestão'} (vigente ${i.vigente.time ?? 'sem'})`);
    for (const [cs, s] of Object.entries(i.porCS)) console.log(`  ${cs}: ${s.sugerido ?? 'sem'} | ${s.explicacao}`);
  }
}
