// Gera uma página local com a aba "Metas e destaques" do gestor, com o modo Semanal ativo, para captura visual.
// Usa o mesmo HTML, CSS e scripts que a página real (GESTOR_STYLE, GESTOR_HTML, DOCK_SCRIPT e GESTOR_SCRIPT), na mesma
// ordem em que app/gestor/page.tsx os carrega. Os dados são de EXEMPLO, nunca de produção: os endpoints são substituídos
// por um mock de fetch. Uso (a partir da raiz do repositório):
//   HARNESS_OUT=<caminho>/captura.html npx tsx scripts/capturas/gerar_harness_metas_semanais.ts
// Capturas no Edge headless: a janela tem largura mínima de 496 px, então a captura de celular usa um iframe de 390 px.
import { writeFileSync } from 'node:fs';
import { GESTOR_STYLE, GESTOR_HTML, GESTOR_SCRIPT } from '../../app/gestor-html.ts';
import { montarDock, DOCK_SCRIPT } from '../../lib/ui/tema.ts';

const HOJE = '2026-11-11';
const ABA = process.env.ABA || 'metasDestaques';
type Estado = 'fechada' | 'corrente' | 'futura';
const semanas: { parcelaInicio: string; parcelaFim: string; diasUteis: number; estado: Estado }[] = [
  { parcelaInicio: '2026-11-02', parcelaFim: '2026-11-08', diasUteis: 4, estado: 'fechada' },
  { parcelaInicio: '2026-11-09', parcelaFim: '2026-11-15', diasUteis: 5, estado: 'corrente' },
  { parcelaInicio: '2026-11-16', parcelaFim: '2026-11-22', diasUteis: 4, estado: 'futura' },
  { parcelaInicio: '2026-11-23', parcelaFim: '2026-11-29', diasUteis: 5, estado: 'futura' },
  { parcelaInicio: '2026-11-30', parcelaFim: '2026-11-30', diasUteis: 1, estado: 'futura' },
];
const bases = [11, 13, 20, 6, 3];
const parcelasDe = (cs: string, valorCases: number[]) => semanas.map((s, i) => {
  const fechada = s.estado === 'fechada';
  return {
    inicio: s.parcelaInicio, fim: s.parcelaFim, parcelaInicio: s.parcelaInicio, parcelaFim: s.parcelaFim,
    diasUteis: s.diasUteis, estado: s.estado, fechada,
    base: bases[i] + (cs === 'Vilker' ? 0 : 0),
    manual: i === 2, deficitRecebido: i === 0 ? 0 : i === 1 ? 8 : null,
    metaEfetiva: i === 0 ? 11 : i === 1 ? 21 : null,
    realizado: fechada ? valorCases[i] : null,
    deficitTransferido: fechada ? 8 : null, excedeMeta: false,
  };
});
const indicador = (nome: string, metaMensal: number | null, cs: string) => ({
  indicador: nome, metaMensal, mensalRealizado: 2, excedeMeta: false, semDataTotal: 0,
  parcelas: metaMensal === null ? [] : parcelasDe(cs, [3, 2, 0, 0, 0]),
});
const fixtureSemanal = {
  mes: '2026-11-01', modo: 'quem_era_cs', hoje: HOJE,
  cs: [
    { cs: 'Rodrigo', fotoUrl: null, mes: '2026-11-01', indicadores: [indicador('cases', 50, 'Rodrigo'), indicador('matchmakings_resultado', null, 'Rodrigo')] },
    { cs: 'Vilker', fotoUrl: null, mes: '2026-11-01', indicadores: [indicador('cases', 40, 'Vilker')] },
    { cs: 'Amanda', fotoUrl: null, mes: '2026-11-01', indicadores: [indicador('cases', 30, 'Amanda')] },
  ],
};
const fixtureFeriados = { feriados: [
  { data: '2026-11-02', nome: 'Finados', abrangencia: 'nacional' },
  { data: '2026-11-15', nome: 'Proclamação da República', abrangencia: 'nacional' },
  { data: '2026-11-20', nome: 'Consciência Negra', abrangencia: 'nacional' },
] };

const mock = `
(function () {
  var respostas = {
    '/api/gestor/metas-semanais': ${JSON.stringify(fixtureSemanal)},
    '/api/gestor/feriados': ${JSON.stringify(fixtureFeriados)}
  };
  window.fetch = function (url) {
    var caminho = String(url).split('?')[0];
    var corpo = respostas[caminho] || { error: 'captura de exemplo: sem dados para este endpoint' };
    return Promise.resolve(new Response(JSON.stringify(corpo), { status: respostas[caminho] ? 200 : 404, headers: { 'Content-Type': 'application/json' } }));
  };
})();
`;

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Captura metas semanais (exemplo)</title>
<style>${GESTOR_STYLE}
.tab-panel{display:none !important;} #tab-${ABA}{display:block !important;}
</style></head><body>${GESTOR_HTML.replace('<!--DOCK-->', montarDock('gestor', 'area', {}, { inicial: 'G' }))}
<script>${mock}</script>
<script>${DOCK_SCRIPT}</script>
<script>${GESTOR_SCRIPT}</script>
<script>
  window.addEventListener('load', function () {
    abrirAba('${ABA}');
    if ('${ABA}' === 'metasDestaques') setTimeout(function () { document.getElementById('btnModoSemanal').click(); }, 1200);
  });
</script>
</body></html>`;

const saida = process.env.HARNESS_OUT;
if (!saida) throw new Error('Defina HARNESS_OUT com o caminho do HTML de saída.');
writeFileSync(saida, html);
console.log('harness gerado em', saida);
