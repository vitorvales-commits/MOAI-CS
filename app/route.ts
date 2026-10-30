// Serve o dashboard como HTML puro na raiz do app — equivalente ao doGet() do Code.gs
// original (HtmlService.createHtmlOutputFromFile('index')). Ver app/dashboard-html.ts pro
// conteúdo (CSS + JS adaptados do doc "Index" do projeto MOAI).
//
// O dock é montado aqui, no servidor, a partir do perfil real (requireMoaiUser): gestor sem perfil de CS
// recebe o dock de gestão; quem tem perfil de CS recebe o dock do CS, e o item Gestor só existe para quem
// is_gestor() aprovou. O middleware já barra quem não tem sessão; sem ela, o redirect para o login vale aqui também.
import { NextResponse } from 'next/server';
import { DASHBOARD_HTML } from './dashboard-html';
import { requireMoaiUser, AuthError } from '@/lib/auth';
import { montarDock, perfilDock } from '@/lib/ui/tema';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  let isGestor = false, csNome: string | null = null, email = '';
  try {
    ({ isGestor, csNome, email } = await requireMoaiUser());
  } catch (e) {
    // 401: sem sessão, vai para o login. 403 (sem vínculo): a página abre e mostra o estado orientador do perfil.
    if (e instanceof AuthError && e.status === 401) return NextResponse.redirect(new URL('/login', req.url));
    if (!(e instanceof AuthError)) throw e;
  }
  const inicial = email ? email.charAt(0) : '?';
  const dock = perfilDock(isGestor, csNome) === 'gestor'
    ? montarDock('gestor', 'inicio', {}, { inicial })
    : montarDock('cs', 'inicio', {}, { inicial, tambemGestor: isGestor });
  return new NextResponse(DASHBOARD_HTML.replace('<!--DOCK-->', dock), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Reforça o header já definido em next.config.mjs direto nesta resposta — o documento
      // HTML nunca deve ficar em cache (nem no navegador, nem em nenhum CDN no meio do caminho),
      // porque ele embute o JavaScript que decide o que buscar em seguida.
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  });
}
