// Página do CS na visão do gestor. Server Component protegido: chama requireMoaiUser() (que já checa
// domínio e is_gestor() no banco) antes de renderizar qualquer coisa, igual a app/gestor/page.tsx.
// Quem não for gestor volta para "/" aqui no servidor. O nome vem da URL só para montar a chamada à
// API; a autorização de verdade é checada de novo em /api/gestor/cs/[nome] (403 para os demais).
import { redirect } from 'next/navigation';
import { requireMoaiUser, AuthError } from '@/lib/auth';
import { GESTOR_CS_STYLE, GESTOR_CS_HTML, gestorCSScript } from '../../../gestor-cs-html';
import { montarDock, DOCK_SCRIPT, FONTES_LINK } from '@/lib/ui/tema';
import { AGENDA_CSS, agendaConfigJson } from '../../../../lib/agenda-ui';

export const dynamic = 'force-dynamic';

function decodificar(nome: string): string {
  try { return decodeURIComponent(nome); } catch { return nome; }
}

export default async function GestorCSPage({ params }: { params: { nome: string } }) {
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

  const nome = decodificar(params.nome);
  const dock = montarDock('gestor', 'time', {}, { inicial: email ? email.charAt(0) : 'G', rotuloAtivo: 'Time · ' + nome });
  const html = GESTOR_CS_HTML.replace('<!--DOCK-->', dock);

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: FONTES_LINK }} />
      <style dangerouslySetInnerHTML={{ __html: GESTOR_CS_STYLE }} />
      <style dangerouslySetInnerHTML={{ __html: AGENDA_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <script dangerouslySetInnerHTML={{ __html: DOCK_SCRIPT }} />
      <script dangerouslySetInnerHTML={{ __html: 'window.AGENDA_CFG = ' + agendaConfigJson() + ';' }} />
      {/* Script síncrono mantido de propósito (aviso no-sync-scripts liberado só neste arquivo no .eslintrc.json): o script abaixo monta a agenda no evento load e depende de agenda-cs.js já executado. next/script afterInteractive pode rodar depois do load, e beforeInteractive só vale no layout raiz, o que carregaria o arquivo em todas as páginas. Sem como provar equivalência sem sessão de gestor, não troquei. */}
      <script src="/agenda-cs.js" />
      <script dangerouslySetInnerHTML={{ __html: gestorCSScript(decodificar(params.nome)) }} />
      <script dangerouslySetInnerHTML={{ __html: "window.addEventListener('load', function () { agendaMontar('agendaCs', { csNome: " + JSON.stringify(decodificar(params.nome)).replace(/</g, '\\u003c') + " }); });" }} />
    </>
  );
}
