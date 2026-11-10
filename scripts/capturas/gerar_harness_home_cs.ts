// Gera páginas locais com a seção de metas da home do CS (renderInMetas_ / desenhaInMetas_, PR 2a) para captura visual.
// Usa o HTML, CSS e scripts reais de DASHBOARD_HTML. Os fixtures saem das funções reais (linhasSemanaAtual e
// semanasFechadasDoMes) a partir dos números de metas_semanais_fechamento:
//   - semana de 02/11 a 08/11: valores fechados em produção (lidos em 10/11/2026), inclusive George e Vilker.
//   - semana de 09/11 a 15/11 (corrente, hoje 11/11): base, déficit herdado e efetiva são derivados do fechamento
//     de 02/11 (efetiva da semana seguinte = base + déficit recebido). O realizado ao vivo é de exemplo.
//   - outubro (mês fechado): valores fechados em produção.
// Dados de exemplo, nunca gravados. Uso (a partir da raiz do repositório):
//   HARNESS_OUT=<pasta> npx tsx scripts/capturas/gerar_harness_home_cs.ts
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DASHBOARD_HTML } from '../../app/dashboard-html.ts';


import { GESTOR_CS_STYLE, GESTOR_CS_HTML, gestorCSScript } from '../../app/gestor-cs-html.ts';
import { METAS_SEMANAIS_CSS, METAS_SEMANAIS_UI_SCRIPT } from '../../lib/ui/metas-semanais-ui.ts';

import { fixtureSemanal, metasGeral } from './fixtures_metas_semanais.ts';

const saida = process.env.HARNESS_OUT;
if (!saida) throw new Error('Defina HARNESS_OUT com a pasta de saída.');
mkdirSync(saida, { recursive: true });

const estilos = [...DASHBOARD_HTML.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
const scripts = [...DASHBOARD_HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);

// Todos os scripts da home, na ordem da página. Erros de carga (fetch mockado com 404) não afetam a seção de metas.
const mock = `(function(){ window.fetch = function(){ return Promise.resolve(new Response('{"error":"captura de exemplo"}', { status: 404, headers: { 'Content-Type': 'application/json' } })); }; })();`;

function paginaHtml(cs: string, visao: string, mesAtual: boolean): string {
  const dado = { semanal: fixtureSemanal(cs, mesAtual), metas: metasGeral(cs) };
  const driver = `window.addEventListener('load', function () {
    currentMes = '${mesAtual ? 'NOVEMBRO' : 'OUTUBRO'}'; currentAno = 2026;
    inMetasIni_ = { dado: ${JSON.stringify(dado)} };
    desenhaInMetas_();
  });`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Captura home CS metas (exemplo)</title><style>${estilos}
body{background:#F4F2F2;margin:0} .wrap{padding:16px;max-width:900px}
</style></head><body><div class="wrap"><div class="gh-w" id="caixa"><div id="inMetas"></div></div></div>
<script>${mock}</script>
${scripts.map((s) => `<script>${s}</script>`).join('\n')}
<script>${driver}</script>
</body></html>`;
}

const variantes: { nome: string; cs: string; visao: string; mesAtual: boolean }[] = [
  { nome: 'george-semana', cs: 'George', visao: 'semana', mesAtual: true },
  { nome: 'vilker-semana', cs: 'Vilker', visao: 'semana', mesAtual: true },
  { nome: 'george-geral', cs: 'George', visao: 'geral', mesAtual: true },
  { nome: 'george-outubro-semanas', cs: 'George', visao: 'semanas', mesAtual: false },
];
for (const v of variantes) {
  writeFileSync(join(saida, `${v.nome}.html`), paginaHtml(v.cs, v.visao, v.mesAtual));
  console.log('gerado', join(saida, `${v.nome}.html`));
}

// Página do CS na visão do gestor: só a aba de indicadores, com a seção de metas semanais desenhada pelo fixture.
function paginaGestor(cs: string, mesAtual: boolean): string {
  const dado = fixtureSemanal(cs, mesAtual);
  const driver = `window.addEventListener('load', function () { renderSemanalCS({ semanal: ${JSON.stringify(dado)} }); });`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Captura gestor CS metas (exemplo)</title><style>${GESTOR_CS_STYLE}${METAS_SEMANAIS_CSS}
.aba{display:none !important} #aba-indicadores{display:block !important} body{background:#F4F2F2}
</style></head><body>${GESTOR_CS_HTML.replace('<!--DOCK-->', '')}
<script>${mock}</script>
<script>${METAS_SEMANAIS_UI_SCRIPT}</script>
<script>${gestorCSScript(cs)}</script>
<script>${driver}</script>
</body></html>`;
}
writeFileSync(join(saida, 'gestor-george-semana.html'), paginaGestor('George', true));
writeFileSync(join(saida, 'gestor-george-outubro-semanas.html'), paginaGestor('George', false));
console.log('gerado gestor-george-semana.html e gestor-george-outubro-semanas.html');
