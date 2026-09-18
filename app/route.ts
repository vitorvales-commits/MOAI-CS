// Serve o dashboard como HTML puro na raiz do app — equivalente ao doGet() do Code.gs
// original (HtmlService.createHtmlOutputFromFile('index')). Ver app/dashboard-html.ts pro
// conteúdo (CSS + JS adaptados do doc "Index" do projeto MOAI).
import { NextResponse } from 'next/server';
import { DASHBOARD_HTML } from './dashboard-html';

export const dynamic = 'force-dynamic';

export async function GET() {
  return new NextResponse(DASHBOARD_HTML, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
