// Serve o dashboard como HTML puro na raiz do app — equivalente ao doGet() do Code.gs
// original (HtmlService.createHtmlOutputFromFile('index')). Ver app/dashboard-html.ts pro
// conteúdo (CSS + JS adaptados do doc "Index" do projeto MOAI).
import { NextResponse } from 'next/server';
import { DASHBOARD_HTML } from './dashboard-html';

export const dynamic = 'force-dynamic';

export async function GET() {
  return new NextResponse(DASHBOARD_HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Reforça o header já definido em next.config.mjs direto nesta resposta — o documento
      // HTML nunca deve ficar em cache (nem no navegador, nem em nenhum CDN no meio do caminho),
      // porque ele embute o JavaScript que decide o que buscar em seguida.
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  });
}
