// Página de processos da área de CS (13/10/2026). Aberta a todo usuário do domínio; o modo de edição
// só aparece para gestor, e quem decide de verdade é o servidor (/api/processos recusa escrita de quem
// não é gestor, e processos_publicar reconfere is_gestor() no banco).
//
// 21/10/2026: a página entra na navegação v3. Recebe o mesmo dock das outras telas, montado no
// servidor com a mesma regra de app/route.ts (gestor sem perfil de CS recebe o dock de gestão; quem tem
// perfil de CS recebe o dock do CS, com o item Gestor só para quem is_gestor() aprovou), e com o
// atalho Processos ativo. Substitui o logo e o "Voltar ao painel" da casca antiga.
import { redirect } from 'next/navigation';
import { requireMoaiUser, AuthError } from '@/lib/auth';
import { PROCESSOS_CSS, PROCESSOS_HTML } from '@/lib/processos-ui';
import { TEMA_CSS, ICONES_SVG, DOCK_SCRIPT, montarDock } from '@/lib/ui/tema';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Processos de CS · MOAI' };

// Troque ao alterar public/processos.js, para o navegador não usar a cópia antiga em cache.
const VERSAO_SCRIPT = '20261013b';

export default async function ProcessosPage() {
  let isGestor = false;
  let csNome: string | null = null;
  let email = '';
  try {
    ({ isGestor, csNome, email } = await requireMoaiUser());
  } catch (e) {
    if (e instanceof AuthError) redirect('/login');
    throw e;
  }
  const inicial = email ? email.charAt(0) : '?';
  const dock = isGestor && !csNome
    ? montarDock('gestor', 'processos', {}, { inicial, semFerramentas: true })
    : montarDock('cs', 'processos', {}, { inicial, tambemGestor: isGestor, semFerramentas: true });
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: TEMA_CSS + PROCESSOS_CSS }} />
      <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: ICONES_SVG + dock + PROCESSOS_HTML }} />
      <script dangerouslySetInnerHTML={{ __html: DOCK_SCRIPT }} />
      <script dangerouslySetInnerHTML={{ __html: 'window.PROCESSOS_CFG = ' + JSON.stringify({ podeEditar: isGestor }) + ';' }} />
      <script src={'/processos.js?v=' + VERSAO_SCRIPT} />
    </>
  );
}
