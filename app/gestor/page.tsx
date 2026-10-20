// Server Component protegido — chama requireMoaiUser() (que já checa domínio e is_gestor() no
// banco) antes de renderizar qualquer coisa. Gestor não é uma permissão que se descobre tentando
// acessar a URL: quem não for gestor é redirecionado pro "/" aqui no servidor, o mesmo servidor
// que decide em /api/gestor/visao-geral — o item Gestor do dock (lib/ui/tema.ts) é só conveniência
// visual, nunca o controle de acesso de verdade.
import { redirect } from 'next/navigation';
import { requireMoaiUser, AuthError } from '@/lib/auth';
import { montarDock, DOCK_SCRIPT, FONTES_LINK } from '@/lib/ui/tema';
import { GESTOR_STYLE, GESTOR_HTML, GESTOR_SCRIPT } from '../gestor-html';

export const dynamic = 'force-dynamic';

// Aba pedida na URL (?aba=) e o item do dock que ela marca. O script da página abre a mesma aba no navegador.
const DOCK_DA_ABA: Record<string, string> = {
  visaoGeral: 'area', controlePerfis: 'perfis', metasDestaques: 'metas', churn: 'churn', nps: 'nps', pulso: 'pulso', voz: 'voz',
};

export default async function GestorPage({ searchParams }: { searchParams?: { aba?: string } }) {
  let isGestor = false;
  let email: string | null = null;
  try {
    ({ isGestor, email } = await requireMoaiUser());
  } catch (e) {
    if (e instanceof AuthError) redirect('/login');
    throw e;
  }
  if (!isGestor) {
    redirect('/?erro=acesso_restrito');
  }

  const ativo = DOCK_DA_ABA[searchParams?.aba || ''] || 'area';
  const dock = montarDock('gestor', ativo, {}, { inicial: email ? email.charAt(0) : 'G' });
  const html = GESTOR_HTML.replace('<!--DOCK-->', dock);

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: FONTES_LINK }} />
      <style dangerouslySetInnerHTML={{ __html: GESTOR_STYLE }} />
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <script dangerouslySetInnerHTML={{ __html: DOCK_SCRIPT }} />
      <script dangerouslySetInnerHTML={{ __html: GESTOR_SCRIPT }} />
    </>
  );
}
