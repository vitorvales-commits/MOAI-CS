// Página do CS na visão do gestor. Server Component protegido: chama requireMoaiUser() (que já checa
// domínio e is_gestor() no banco) antes de renderizar qualquer coisa, igual a app/gestor/page.tsx.
// Quem não for gestor volta para "/" aqui no servidor. O nome vem da URL só para montar a chamada à
// API; a autorização de verdade é checada de novo em /api/gestor/cs/[nome] (403 para os demais).
import { redirect } from 'next/navigation';
import { requireMoaiUser, AuthError } from '@/lib/auth';
import { GESTOR_CS_STYLE, GESTOR_CS_HTML, gestorCSScript } from '../../../gestor-cs-html';
import { AGENDA_CSS, agendaConfigJson } from '../../../../lib/agenda-ui';

export const dynamic = 'force-dynamic';

function decodificar(nome: string): string {
  try { return decodeURIComponent(nome); } catch { return nome; }
}

export default async function GestorCSPage({ params }: { params: { nome: string } }) {
  let isGestor = false;
  try {
    ({ isGestor } = await requireMoaiUser());
  } catch (e) {
    if (e instanceof AuthError) redirect('/login');
    throw e;
  }
  if (!isGestor) {
    redirect('/?erro=acesso_restrito');
  }

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@700;800&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: GESTOR_CS_STYLE }} />
      <style dangerouslySetInnerHTML={{ __html: AGENDA_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: GESTOR_CS_HTML }} />
      <script dangerouslySetInnerHTML={{ __html: 'window.AGENDA_CFG = ' + agendaConfigJson() + ';' }} />
      <script src="/agenda-cs.js" />
      <script dangerouslySetInnerHTML={{ __html: gestorCSScript(decodificar(params.nome)) }} />
      <script dangerouslySetInnerHTML={{ __html: "window.addEventListener('load', function () { agendaMontar('agendaCs', { csNome: " + JSON.stringify(decodificar(params.nome)).replace(/</g, '\\u003c') + " }); });" }} />
    </>
  );
}
