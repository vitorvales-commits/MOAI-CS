// Server Component protegido — chama requireMoaiUser() (que já checa domínio e is_gestor() no
// banco) antes de renderizar qualquer coisa. Gestor não é uma permissão que se descobre tentando
// acessar a URL: quem não for gestor é redirecionado pro "/" aqui no servidor, o mesmo servidor
// que decide em /api/gestor/visao-geral — o link na topbar (app/dashboard-html.ts) é só
// conveniência visual, nunca o controle de acesso de verdade.
import { redirect } from 'next/navigation';
import { requireMoaiUser, AuthError } from '@/lib/auth';
import { GESTOR_STYLE, GESTOR_HTML, GESTOR_SCRIPT } from '../gestor-html';

export const dynamic = 'force-dynamic';

export default async function GestorPage() {
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
      <style dangerouslySetInnerHTML={{ __html: GESTOR_STYLE }} />
      <div dangerouslySetInnerHTML={{ __html: GESTOR_HTML }} />
      <script dangerouslySetInnerHTML={{ __html: GESTOR_SCRIPT }} />
    </>
  );
}
