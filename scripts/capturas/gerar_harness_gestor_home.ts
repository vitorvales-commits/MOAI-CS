// Gera a página da home do gestor com a visão Semana atual (PR 2b) para captura visual. Usa o HTML, CSS e scripts reais
// de GESTOR_HTML, GESTOR_STYLE e GESTOR_SCRIPT. Dados: fixtures do fechamento (scripts/capturas/fixtures_metas_semanais.ts),
// com resumoSemanaTime calculado pela função real. Itens da fila de ritmo: o que a regra de gerar_itens_ritmo_semanal
// produz para a semana de 02/11 (limiar 0,70), ordenados pelo maior déficit. Dados de exemplo, nunca gravados.
// Uso (a partir da raiz): HARNESS_OUT=<pasta> npx tsx scripts/capturas/gerar_harness_gestor_home.ts
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { GESTOR_HTML, GESTOR_STYLE, GESTOR_SCRIPT } from '../../app/gestor-html.ts';
import { METAS_SEMANAIS_CSS, METAS_SEMANAIS_UI_SCRIPT } from '../../lib/ui/metas-semanais-ui.ts';
import { resumoSemanaTime } from '../../lib/metas-semanais-visao.ts';
import { montarDock, DOCK_SCRIPT } from '../../lib/ui/tema.ts';
import { mesNovembro, HOJE } from './fixtures_metas_semanais.ts';

const saida = process.env.HARNESS_OUT;
if (!saida) throw new Error('Defina HARNESS_OUT com a pasta de saída.');
mkdirSync(saida, { recursive: true });

const cs = [mesNovembro('George'), mesNovembro('Vilker')];
const metas = {
  mes: '2026-11-01', hoje: HOJE, modo: 'quem_era_cs',
  cs: cs.map((c) => ({ cs: c.cs, fotoUrl: null, mes: c.mes, indicadores: c.indicadores })),
  resumoTime: resumoSemanaTime(cs, HOJE),
};

// Fila de ritmo da semana de 02/11, como gerar_itens_ritmo_semanal grava (um item por CS, ordenado pelo déficit).
const acoes = {
  urgencias: { dado: null, erro: null }, relatorios: { dado: null, erro: null }, insights: { dado: null, erro: null },
  ritmoSemanal: {
    erro: null, limiar: 0.7,
    dado: [
      { id: '00000000-0000-4000-8000-000000000002', cs_nome: 'Vilker', semana_inicio: '2026-11-02', semana_fim: '2026-11-08', deficit_total: 11,
        indicadores: [
          { indicador: 'cases', base: 2, meta_efetiva: 2, realizado: 0, deficit: 2 },
          { indicador: 'indicacoes', base: 2, meta_efetiva: 2, realizado: 0, deficit: 2 },
          { indicador: 'matchmakings', base: 6, meta_efetiva: 6, realizado: 1, deficit: 5 },
          { indicador: 'matchmakings_resultado', base: 3, meta_efetiva: 3, realizado: 1, deficit: 2 },
        ] },
      { id: '00000000-0000-4000-8000-000000000001', cs_nome: 'George', semana_inicio: '2026-11-02', semana_fim: '2026-11-08', deficit_total: 6,
        indicadores: [
          { indicador: 'cases', base: 3, meta_efetiva: 3, realizado: 0, deficit: 3 },
          { indicador: 'matchmakings_resultado', base: 4, meta_efetiva: 4, realizado: 1, deficit: 3 },
        ] },
    ],
  },
};

const mock = `(function(){
  var respostas = { '/api/gestor/metas-semanais': ${JSON.stringify(metas)}, '/api/gestor/visao-geral/acoes': ${JSON.stringify(acoes)} };
  window.fetch = function (url) {
    var caminho = String(url).split('?')[0];
    var ok = Object.prototype.hasOwnProperty.call(respostas, caminho);
    var corpo = ok ? respostas[caminho] : { error: 'captura de exemplo: sem dados para este endpoint' };
    return Promise.resolve(new Response(JSON.stringify(corpo), { status: ok ? 200 : 404, headers: { 'Content-Type': 'application/json' } }));
  };
})();`;

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Captura home gestor, semana atual (exemplo)</title>
<style>${GESTOR_STYLE}${METAS_SEMANAIS_CSS}</style></head><body>${GESTOR_HTML.replace('<!--DOCK-->', montarDock('gestor', 'area', {}, { inicial: 'G' }))}
<script>${mock}</script>
<script>${METAS_SEMANAIS_UI_SCRIPT}</script>
<script>${DOCK_SCRIPT}</script>
<script>${GESTOR_SCRIPT}</script>
<script>window.addEventListener('load', function () { mesAtual = 'Novembro'; anoAtual = 2026; desenhaVisaoHome_(); });</script>
</body></html>`;

writeFileSync(join(saida, 'gestor-home-semana.html'), html);
console.log('gerado', join(saida, 'gestor-home-semana.html'));
