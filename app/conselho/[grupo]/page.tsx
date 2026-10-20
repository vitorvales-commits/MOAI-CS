// Server Component protegido — só checa requireMoaiUser() (domínio @moaiclubedelideres.com),
// sem restrição de gestor: drill-down de conselho é uma tela normal do time de CS, não uma visão
// de gestão. O group_id vem da URL (mesma chave usada em todo o resto do sistema, ex.
// "new_group") e é passado pro client só pra montar a URL da API; a autorização de verdade é
// sempre checada de novo em /api/conselho/[grupo].
import { redirect } from 'next/navigation';
import { requireMoaiUser, AuthError } from '@/lib/auth';
import { montarDock, DOCK_SCRIPT, FONTES_LINK } from '@/lib/ui/tema';
import { CONSELHO_STYLE, CONSELHO_HTML, conselhoScript } from '../../conselho-html';

export const dynamic = 'force-dynamic';

export default async function ConselhoPage({ params }: { params: { grupo: string } }) {
  let isGestor = false, csNome: string | null = null, email = '';
  try {
    ({ isGestor, csNome, email } = await requireMoaiUser());
  } catch (e) {
    if (e instanceof AuthError) redirect('/login');
    throw e;
  }

  // Dock do perfil real: gestor sem perfil de CS vê o de gestão; quem tem perfil de CS vê o do CS.
  const inicial = email ? email.charAt(0) : '?';
  const dock = isGestor && !csNome
    ? montarDock('gestor', 'conselhos', {}, { inicial })
    : montarDock('cs', 'meus-conselhos', {}, { inicial, tambemGestor: isGestor });
  const html = CONSELHO_HTML.replace('<!--DOCK-->', dock);

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: FONTES_LINK }} />
      <style dangerouslySetInnerHTML={{ __html: CONSELHO_STYLE }} />
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <script dangerouslySetInnerHTML={{ __html: DOCK_SCRIPT }} />
      <script dangerouslySetInnerHTML={{ __html: conselhoScript(params.grupo) }} />
    </>
  );
}
