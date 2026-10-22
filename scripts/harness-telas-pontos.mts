// Sobe as telas novas (pontos, fila do gestor, relatório do conselho, email de NPS) com a API simulada, para capturar
// sem login nem banco. Uso: npx tsx scripts/harness-telas-pontos.mts <porta>
//   /pontos  /fila  /relatorio  /home  /email        Os dados são fictícios e servem só para conferir o desenho.
import http from 'node:http';
import { montarDock, DOCK_SCRIPT, FONTES_LINK } from '../lib/ui/tema.ts';
import { GESTOR_STYLE, GESTOR_HTML, GESTOR_SCRIPT } from '../app/gestor-html.ts';
import { GESTOR_CS_STYLE, GESTOR_CS_HTML, gestorCSScript } from '../app/gestor-cs-html.ts';
import { CONSELHO_STYLE, CONSELHO_HTML, conselhoScript } from '../app/conselho-html.ts';
import { DASHBOARD_HTML } from '../app/dashboard-html.ts';
import { montarEmail } from '../supabase/functions/notificar-alertas/logica.ts';
import { textoAlertaNps } from '../lib/alertas-nps.ts';
import { focoDoDia } from '../lib/home-regras.ts';

const porta = Number(process.argv[2] || 4598);
const agora = Date.now();
const iso = (diasAtras: number) => new Date(agora - diasAtras * 864e5).toISOString();

// ---- relatório do conselho ----
const encontros = [
  { groupId: 'g1', conselho: 'C-Level | JP (Rodrigo)', cs: 'Rodrigo', dataEncontro: iso(9), prazo: iso(1), estado: 'atrasado', diasRestantes: -1, relatorioId: null, enviadoEm: null, avaliacao: null,
    faltas: [{ membroId: 1, nome: 'Gustavo Lívio Dayahn | Dayahn Advocacia', tipo: 'falta', categoria: null, justificativa: null }, { membroId: 2, nome: 'Kadydja Albuquerque | Conversa', tipo: 'falta', categoria: null, justificativa: null }, { membroId: 3, nome: 'Karoline Almeida | Via Motors', tipo: 'desistencia', categoria: null, justificativa: null }],
    faltasSemJustificativa: 2, presencaPendente: 2 },
  { groupId: 'g1', conselho: 'C-Level | JP (Rodrigo)', cs: 'Rodrigo', dataEncontro: iso(40), prazo: iso(32), estado: 'enviado_no_prazo', diasRestantes: -32, relatorioId: 'r1', enviadoEm: iso(38), avaliacao: 'Muito bom', faltas: [], faltasSemJustificativa: 0, presencaPendente: 0 },
];
const relatorios = {
  conselho: 'C-Level | JP (Rodrigo)', encontros, souGestor: false, souResponsavel: true,
  relatorios: [{ id: 'r1', groupId: 'g1', dataEncontro: iso(40), csNome: 'Rodrigo', avaliacao: 'Muito bom', avanco: 'Fechamos o plano de expansão para o segundo semestre.', membroAtencaoId: 5, membroAtencaoNome: 'Paula Moreira | Qualifica Alimentos', membroAtencaoMotivo: 'Está sem retorno há duas semanas.', combinado: 'Trazer os números de caixa.', enviadoEm: iso(38), enviadoPor: 'rodrigo@moaiclubedelideres.com', atualizadoEm: iso(38), faltas: [] }],
  faltasPorMembro: [{ membroId: 1, nome: 'Gustavo Lívio Dayahn | Dayahn Advocacia', faltas: 3, categoriaMaisFrequente: 'Viagem', ultimaFalta: iso(9) }, { membroId: 2, nome: 'Kadydja Albuquerque | Conversa', faltas: 1, categoriaMaisFrequente: 'Esquecimento', ultimaFalta: iso(9) }],
  presentes: { [encontros[0].dataEncontro]: [{ id: 5, nome: 'Paula Moreira | Qualifica Alimentos' }, { id: 6, nome: 'Renata Cortopassi | Studio Cortopassi' }] },
};

// ---- fila do gestor ----
const acoes = {
  urgencias: { dado: { report: { pendentes: [], emDia: [], comAtraso: [], semanaInicio: '2026-10-19', semanaFim: '2026-10-25', prazo: '2026-10-23', reportsSemMapeamento: 0 }, gtd: { totalAtrasadas: 0, totalAVencer: 0, porCS: [], rotulosNaoMapeados: [] } }, erro: null },
  insights: { dado: { visiveis: [], restantes: [] }, erro: null },
  alertasNps: { erro: null, dado: [
    { id: 'a1', groupId: 'g2', mes: 'Setembro 2026', criterio: 'detrator', respondente: 'Juliana', valor: 2, referencia: 6, amostra: null, comentario: 'O encontro perdeu o foco.', texto: textoAlertaNps({ criterio: 'detrator', respondente: 'Juliana', valor: 2, referencia: 6, amostra: null }, 'Fast Track | Julio Faccioli (Vitor)', 'Vitor') },
    { id: 'a2', groupId: 'g2', mes: 'Setembro 2026', criterio: 'nps_encontro', respondente: null, valor: 63.6, referencia: 70, amostra: 11, comentario: null, texto: textoAlertaNps({ criterio: 'nps_encontro', respondente: null, valor: 63.6, referencia: 70, amostra: 11 }, 'Fast Track | Julio Faccioli (Vitor)', 'Vitor') },
  ] },
  relatorios: { erro: null, dado: { porCS: [{ cs: 'Rodrigo', pendentes: 1, atrasados: 2, maiorAtrasoDias: 9 }, { cs: 'Iasmin', pendentes: 2, atrasados: 0, maiorAtrasoDias: 0 }] } },
  carimbos: { gtdSnapshot: null, ultimoReportCriadoEm: null },
};

// ---- bloco de pontos ----
const pontos = { advertencias: { erro: null, dado: {
  pontuacaoAtiva: 5, totalHistorico: 20, desde: iso(60), proximoVencimento: new Date(agora + 9 * 864e5).toISOString(), qtdPorTipo: {}, tipos: [{ id: 't1', nome: 'Descumprimento de processo', pontos: 10, validadeMeses: 1, validadeRegra: 'meses', codigo: null, ativo: true }],
  registros: [
    { id: 'p1', csNome: 'Rodrigo', tipoNome: 'Report semanal atrasado', pontos: 5, validadeMeses: 1, validoAte: new Date(agora + 9 * 864e5).toISOString(), origem: 'sistema', anuladaEm: null, anuladaPor: null, motivoAnulacao: null, observacao: 'Report da semana de 19/10/2026 sem envio até sexta 19h.', aplicadoPor: 'sistema', aplicadoEm: iso(1), ativa: true },
    { id: 'p2', csNome: 'Rodrigo', tipoNome: 'Descumprimento de processo', pontos: 10, validadeMeses: 1, validoAte: iso(20), origem: 'manual', anuladaEm: null, anuladaPor: null, motivoAnulacao: null, observacao: null, aplicadoPor: 'vitorvales@moaiclubedelideres.com', aplicadoEm: iso(50), ativa: false },
    { id: 'p3', csNome: 'Rodrigo', tipoNome: 'Report semanal atrasado', pontos: 5, validadeMeses: 1, validoAte: new Date(agora + 3 * 864e5).toISOString(), origem: 'sistema', anuladaEm: iso(2), anuladaPor: 'luanasampaio@moaiclubedelideres.com', motivoAnulacao: 'Feriado local confirmado pela gestão.', observacao: null, aplicadoPor: 'sistema', aplicadoEm: iso(6), ativa: false },
  ] } }, health: { dado: null } };

// ---- email ----
const base = { group_id: 'g2', mes: 'Setembro 2026', conselho: 'Fast Track | Julio Faccioli (Vitor)', cs_responsavel: 'Vitor', expirado: false, amostra: null, detalhe: null };
const email = montarEmail([
  { ...base, id: 'a1', criterio: 'detrator', respondente_nome: 'Juliana', valor: 2, referencia: 6, detalhe: { nota: 2, comentario: 'O encontro perdeu o foco.' } },
  { ...base, id: 'a2', criterio: 'nps_encontro', respondente_nome: null, valor: 63.6, referencia: 70, amostra: 11 },
], 'https://exemplo.moai.test');

const foco = focoDoDia({ conselhos: [], reportDiasAtePrazo: null, metas: [], proximo: null, relatorios: [{ groupId: 'g1', conselho: 'JP', dataEncontro: encontros[0].dataEncontro, estado: 'atrasado', diasRestantes: -1 }] });

const cabeca = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + FONTES_LINK;
const paginas: Record<string, () => string> = {
  '/pontos': () => cabeca + '<style>' + GESTOR_CS_STYLE + '</style>' + GESTOR_CS_HTML.replace('<!--DOCK-->', montarDock('gestor', 'time', {}, { inicial: 'V' })) + '<script>' + DOCK_SCRIPT + '</script><script>' + gestorCSScript('Rodrigo') + '</script>'
    + '<script>setTimeout(function(){document.querySelector("[data-aba=base]").click();document.getElementById("secAdvertencias").scrollIntoView();renderAdvertenciasCS(' + JSON.stringify(pontos) + ');},500);</script>',
  '/fila': () => cabeca + '<style>' + GESTOR_STYLE + '</style>' + GESTOR_HTML.replace('<!--DOCK-->', montarDock('gestor', 'visao', {}, { inicial: 'V' })) + '<script>' + DOCK_SCRIPT + '</script><script>' + GESTOR_SCRIPT + '</script>'
    + '<script>setTimeout(function(){ACOES_=' + JSON.stringify(acoes) + ';filaFiltro_="todas";renderFilaAcao_();document.getElementById("filaCorpo").scrollIntoView();},900);</script>',
  '/relatorio': () => cabeca + '<style>' + CONSELHO_STYLE + '</style>' + CONSELHO_HTML.replace('<!--DOCK-->', montarDock('cs', 'meus-conselhos', {}, { inicial: 'R' })) + '<script>' + DOCK_SCRIPT + '</script><script>' + conselhoScript('g1') + '</script>'
    + '<script>setTimeout(function(){document.getElementById("relatorios").scrollIntoView();if(location.search.indexOf("abrir")>-1){document.querySelector("[data-rc-abrir]").click();}},900);</script>',
  '/home': () => '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + DASHBOARD_HTML.replace('<!--DOCK-->', montarDock('cs', 'inicio', {}, { inicial: 'R' }))
    .replace('</body>', '<script>setTimeout(function(){document.querySelectorAll(".screen").forEach(function(s){s.style.display="none"});var s=document.getElementById("screenInicio");s.style.display="block";renderInFoco_({erro:null,dado:{focoHoje:' + JSON.stringify({ ...foco, numeros: [], anel: null }) + '}});},1200);</script></body>'),
  '/email': () => email.html,
};
http.createServer((req, res) => {
  const u = new URL(req.url || '/', 'http://x');
  const json = (o: unknown, s = 200) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (u.pathname.startsWith('/api/conselho/') && u.pathname.endsWith('/relatorios')) return json(relatorios);
  if (u.pathname.startsWith('/api/')) return json({ error: 'Simulado: sem dados nesta captura.' }, 500);
  const p = paginas[u.pathname];
  if (!p) { res.writeHead(404); return res.end('sem tela'); }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(p());
}).listen(porta, () => console.log('harness em http://localhost:' + porta));
