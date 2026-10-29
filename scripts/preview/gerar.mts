// Pré visualização local da página do gestor com API simulada (29/10/2026). Não toca em autenticação nem em banco:
// monta o mesmo HTML que app/gestor/page.tsx entrega, injeta um fetch falso com dados de exemplo e grava arquivos
// estáticos em preview-out/ para abrir no navegador ou capturar com Edge sem login. Nunca roda no Vercel.
// Uso: npx tsx scripts/preview/gerar.mts   (cenários: dados, vazio, erro; abas: visaoGeral, churn, conselhos)
import { mkdirSync, writeFileSync } from 'node:fs';
import { montarDock, DOCK_SCRIPT, FONTES_LINK } from '../../lib/ui/tema.ts';
import { GESTOR_STYLE, GESTOR_HTML, GESTOR_SCRIPT } from '../../app/gestor-html.ts';
import { fixturesPorCenario } from './fixtures.ts';

type Cenario = 'dados' | 'vazio' | 'erro';
const ABAS: Record<string, string> = { visaoGeral: 'area', churn: 'churn', conselhos: 'conselhos' };
const ALVO: Record<string, string> = { visaoGeral: 'filaCorpo', churn: 'blocoRisco', conselhos: 'h-rel-gestor' };

function pagina(cenario: Cenario, aba: string): string {
  const dock = montarDock('gestor', ABAS[aba], {}, { inicial: 'G' });
  const html = GESTOR_HTML.replace('<!--DOCK-->', dock);
  const respostas = JSON.stringify(fixturesPorCenario(cenario));
  // Rotas sem fixture respondem 404: o bloco correspondente mostra o próprio estado de erro, sem derrubar a página.
  const stub = `(function(){var R=${respostas};var orig=window.fetch;window.fetch=function(u,o){var p=String(u).split('?')[0];
    if(R[p]===undefined){return Promise.resolve(new Response(JSON.stringify({error:'Sem fixture na pré visualização'}),{status:404,headers:{'Content-Type':'application/json'}}));}
    var r=R[p];if(r&&r.__status){return Promise.resolve(new Response(JSON.stringify({error:r.error}),{status:r.__status,headers:{'Content-Type':'application/json'}}));}
    return Promise.resolve(new Response(JSON.stringify(r),{status:200,headers:{'Content-Type':'application/json'}}));};})();`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pré visualização</title>${FONTES_LINK}<style>${GESTOR_STYLE}</style></head><body>${html}<script>${stub}</script><script>${DOCK_SCRIPT}</script><script>history.replaceState(null,'','?aba=${aba}');</script><script>${GESTOR_SCRIPT}</script><script>setTimeout(function(){var e=document.getElementById('${ALVO[aba]}');if(e)e.scrollIntoView();},1500);</script></body></html>`;
}

mkdirSync('preview-out', { recursive: true });
for (const cenario of ['dados', 'vazio', 'erro'] as Cenario[]) {
  for (const aba of Object.keys(ABAS)) writeFileSync(`preview-out/${aba}-${cenario}.html`, pagina(cenario, aba));
}
// Envelope para a largura de celular: o iframe tem 390 pixels, independente do tamanho mínimo da janela do navegador.
for (const cenario of ['dados', 'vazio', 'erro']) {
  for (const aba of Object.keys(ABAS)) {
    writeFileSync(`preview-out/${aba}-${cenario}-celular.html`, `<!doctype html><body style="margin:0;background:#ddd"><iframe src="${aba}-${cenario}.html" style="width:390px;height:2400px;border:0;background:#fff"></iframe></body>`);
  }
}
console.log('preview-out/ gerado');
