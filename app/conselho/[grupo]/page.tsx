// Server Component protegido — só checa requireMoaiUser() (domínio @moaiclubedelideres.com),
// sem restrição de gestor: drill-down de conselho é uma tela normal do time de CS, não uma visão
// de gestão. O group_id vem da URL (mesma chave usada em todo o resto do sistema, ex.
// "new_group") e é passado pro client só pra montar a URL da API; a autorização de verdade é
// sempre checada de novo em /api/conselho/[grupo].
import { redirect } from 'next/navigation';
import { requireMoaiUser, AuthError } from '@/lib/auth';
import { CONSELHO_STYLE, CONSELHO_HTML, conselhoScript } from '../../conselho-html';

export const dynamic = 'force-dynamic';

export default async function ConselhoPage({ params }: { params: { grupo: string } }) {
  try {
    await requireMoaiUser();
  } catch (e) {
    if (e instanceof AuthError) redirect('/login');
    throw e;
  }

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@700;800&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: CONSELHO_STYLE }} />
      <div dangerouslySetInnerHTML={{ __html: CONSELHO_HTML }} />
      <script dangerouslySetInnerHTML={{ __html: conselhoScript(params.grupo) }} />
    </>
  );
}
