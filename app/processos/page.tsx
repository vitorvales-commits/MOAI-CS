// Página de processos da área de CS (13/10/2026). Aberta a todo usuário do domínio; o modo de edição
// só aparece para gestor, e quem decide de verdade é o servidor (/api/processos recusa escrita de quem
// não é gestor, e processos_publicar reconfere is_gestor() no banco).
import { redirect } from 'next/navigation';
import { requireMoaiUser, AuthError } from '@/lib/auth';
import { PROCESSOS_CSS, PROCESSOS_HTML } from '@/lib/processos-ui';
import { perfilDock } from '@/lib/ui/tema';
import { montarVitorio } from '@/lib/vitorio/montagem';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Processos de CS · MOAI' };

// Troque ao alterar public/processos.js, para o navegador não usar a cópia antiga em cache.
const VERSAO_SCRIPT = '20261030b';

// ?item=colecao:id (links do Vitorio) abre o documento direto no item.
export default async function ProcessosPage({ searchParams }: { searchParams?: { item?: string } }) {
  let isGestor = false;
  let csNome: string | null = null;
  try {
    ({ isGestor, csNome } = await requireMoaiUser());
  } catch (e) {
    if (e instanceof AuthError) redirect('/login');
    throw e;
  }
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@700;800&family=IBM+Plex+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: PROCESSOS_CSS }} />
      <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: PROCESSOS_HTML }} />
      <script dangerouslySetInnerHTML={{ __html: 'window.PROCESSOS_CFG = ' + JSON.stringify({ podeEditar: isGestor, item: (searchParams?.item || '').slice(0, 200) }) + ';' }} />
      <script src={'/processos.js?v=' + VERSAO_SCRIPT} />
      <div dangerouslySetInnerHTML={{ __html: montarVitorio(perfilDock(isGestor, csNome)) }} />
    </>
  );
}
