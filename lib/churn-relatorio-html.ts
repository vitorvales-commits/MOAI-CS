// Relatório de churn imprimível (onda 1, 30/09/2026). Página HTML autônoma servida por
// app/gestor/churn/relatorio/route.ts, pensada para "Imprimir > Salvar como PDF" no navegador:
// CSS de impressão A4, gráficos em SVG (não cortam na quebra de página), cabeçalho com período e
// filtros, gráfico mensal e semanal, tabela de motivos, análise salva pelo gestor e rodapé com a
// data de emissão.
//
// Anonimizado por padrão (decisão padrão A): sem nome de membro, sem empresa, e os trechos
// literais passam por anonimizar() com TODOS os nomes e empresas conhecidos em churn_detalhes,
// não só os do recorte. A análise salva também passa pela anonimização nesse modo, porque o
// gestor pode ter digitado um nome ao editar. A versão identificada só existe atrás do
// interruptor, e a rota já é restrita a gestor.
import type { Recorte, SerieChurn, ItemChurn, AnaliseChurn, ResumoComunidade, RecordeIndicador } from './churn';
import {
  escHtml as esc, graficoChurnSVG, tabelaMotivosHTML, descreverRecorte, rotuloMesLongo, infoMotivo,
  anonimizar, amostraCorHTML, MESES_JANELA_MENSAL, recorteParaQuery, referenciaDoGrafico,
} from './churn';

export interface DadosRelatorioChurn {
  recorte: Recorte;
  serieMensal: SerieChurn;
  serieSemanal: SerieChurn;
  itens: ItemChurn[];
  termos: string[];
  analise: AnaliseChurn | null;
  comunidade: ResumoComunidade;
  recordeChurn: RecordeIndicador;
  analiseDesatualizada: boolean;
  identificado: boolean;
  emitidoPor: string;
}

function paragrafos(texto: string): string {
  return texto.split(/\n{2,}|\r?\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('');
}

function dataBR(iso: string) {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

function emissaoTexto() {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'long', timeStyle: 'short' }).format(new Date());
}

export function gerarRelatorioChurnHtml(d: DadosRelatorioChurn): string {
  const r = d.recorte;
  const anon = !d.identificado;
  const limpar = (s: string | null | undefined) => (anon ? anonimizar(s, d.termos) : String(s ?? ''));
  const queryBase = recorteParaQuery(r);
  const linkModo = `/gestor/churn/relatorio?${queryBase}${anon ? '&identificado=1' : ''}`;
  const notas = d.itens.map((i) => i.nota_retorno).filter((n): n is number => n !== null && n !== undefined).map(Number);
  const mediaNota = notas.length ? (notas.reduce((s, v) => s + v, 0) / notas.length).toFixed(1).replace('.', ',') : null;
  const totalRecorte = r.granularidade === 'semana' ? d.serieSemanal.total : d.serieMensal.total;

  const avisoSemAnalise = !d.analise?.textoGestor
    ? `<div class="aviso aviso-forte"><strong>Nenhuma análise salva para este recorte.</strong> O relatório abaixo traz os números, mas a análise escrita ainda não existe. <a href="/gestor#churn">Voltar ao painel para gerar e salvar a análise</a>.</div>`
    : '';
  const avisoDesatualizada = d.analise?.textoGestor && d.analiseDesatualizada
    ? `<div class="aviso">Entraram ou saíram churns deste recorte depois que a análise foi salva. Os números abaixo estão atualizados; a análise escrita pode não refletir os casos mais recentes.</div>`
    : '';
  const statusAnalise = d.analise?.textoGestor
    ? (d.analise.status === 'publicada' ? 'Análise publicada' : 'Análise salva, ainda não publicada')
    : 'Sem análise salva';

  const blocoAnalise = d.analise?.textoGestor
    ? `<div class="analise">${paragrafos(limpar(d.analise.textoGestor))}</div>
       <p class="meta">Salva por ${esc(d.analise.editadoPor || 'gestor')}${d.analise.editadoEm ? ` em ${esc(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(d.analise.editadoEm)))}` : ''}.</p>`
    : `<p class="vazio">Nenhuma análise salva para este recorte.</p>`;

  let blocoCasos = '';
  if (anon) {
    const vozes = d.itens.filter((i) => (i.explicacao || i.expectativa_nao_atendida || '').trim()).slice(-12).reverse();
    blocoCasos = `<section class="secao quebra-ok"><h2>Vozes dos membros</h2>
      <p class="sub">Trechos literais das respostas de saída, sem identificação do membro ou da empresa. Mostrando ${vozes.length} dos ${d.itens.length} churns do recorte.</p>
      ${vozes.length ? vozes.map((i) => `<blockquote><span class="tag">${esc(infoMotivo(i.motivo_principal).rotulo)}</span>${esc(limpar(i.explicacao || i.expectativa_nao_atendida))}</blockquote>`).join('') : '<p class="vazio">Nenhum texto livre respondido neste recorte.</p>'}
    </section>`;
  } else {
    blocoCasos = `<section class="secao quebra-ok"><h2>Churns do recorte, versão identificada</h2>
      <p class="sub">Uso interno da gestão. Não compartilhe esta versão fora da liderança.</p>
      <table class="tabela"><thead><tr><th>Data</th><th>Membro</th><th>Empresa</th><th>CS</th><th>Produto</th><th>Motivo</th><th class="num">Nota</th></tr></thead><tbody>
      ${d.itens.map((i) => `<tr><td>${dataBR(i.data_referencia)}</td><td>${esc(i.membro_nome)}</td><td>${esc(i.empresa)}</td><td>${esc(i.quem_e_seu_cs)}</td><td>${esc(i.produto)}</td><td>${esc(infoMotivo(i.motivo_principal).rotulo)}</td><td class="num">${i.nota_retorno ?? ''}</td></tr>`
        + ((i.explicacao || i.expectativa_nao_atendida) ? `<tr class="texto"><td></td><td colspan="6">${esc(i.explicacao || '')}${i.expectativa_nao_atendida ? `<br><em>Expectativa não atendida:</em> ${esc(i.expectativa_nao_atendida)}` : ''}</td></tr>` : '')).join('')}
      </tbody></table></section>`;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relatório de churn · ${esc(rotuloMesLongo(r.referencia))}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Bricolage+Grotesque:wght@700;800&display=swap" rel="stylesheet">
<style>
:root{--cinza-fundo:#F5F5F5;--preto-tinta:#1A1A1A;--branco:#FFFFFF;--cinza-texto:#5D5D5D;--cinza-apoio:#9F9F9F;--cinza-linha:#C6C4C4;--cinza-borda:#D8D5D5;--cinza-superficie:#E9E9E9;--vermelho:#C0433D;--dourado:#C89A2E;}
*{box-sizing:border-box;}
body{margin:0;background:var(--cinza-fundo);color:var(--preto-tinta);font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;}
h1,h2{font-family:'Bricolage Grotesque',sans-serif;letter-spacing:-0.01em;}
.pagina{max-width:900px;margin:0 auto;padding:24px 16px 60px;}
.barra{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-bottom:20px;}
.barra a,.barra button{font-family:'Inter',sans-serif;font-size:13px;font-weight:600;padding:9px 16px;border-radius:999px;border:1px solid var(--cinza-borda);background:var(--branco);color:var(--preto-tinta);text-decoration:none;cursor:pointer;}
.barra button.primario{background:var(--preto-tinta);color:var(--branco);border-color:var(--preto-tinta);}
.modo{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:var(--cinza-texto);}
.modo .estado{padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;}
.estado.anon{background:rgba(61,139,95,0.12);color:#3D8B5F;}
.estado.ident{background:rgba(192,67,61,0.12);color:var(--vermelho);}
.folha{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:20px;padding:36px 36px 28px;}
.cabecalho{border-bottom:2px solid var(--dourado);padding-bottom:18px;margin-bottom:22px;}
.eyebrow{font-size:11px;letter-spacing:0.14em;font-weight:700;color:var(--dourado);}
h1{font-size:28px;margin:6px 0 8px;}
.cabecalho p{margin:0;font-size:13px;color:var(--cinza-texto);line-height:1.6;}
.kpis{display:flex;gap:14px;flex-wrap:wrap;margin:0 0 8px;}
.kpi{flex:1;min-width:150px;border:1px solid var(--cinza-borda);border-radius:14px;padding:14px 16px;}
.kpi b{display:block;font-family:'Bricolage Grotesque',sans-serif;font-size:26px;}
.kpi span{font-size:11.5px;color:var(--cinza-texto);}
.secao{margin-top:28px;break-inside:avoid;page-break-inside:avoid;}
.secao.quebra-ok{break-inside:auto;page-break-inside:auto;}
h2{font-size:18px;margin:0 0 4px;}
.sub{font-size:12.5px;color:var(--cinza-texto);margin:0 0 12px;line-height:1.55;}
.legenda{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:11.5px;color:var(--cinza-texto);margin:8px 0 12px;}
.legenda span.item{display:inline-flex;align-items:center;gap:6px;}
table{width:100%;border-collapse:collapse;font-size:12.5px;}
th{text-align:left;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:var(--cinza-apoio);font-weight:600;padding:8px 10px;border-bottom:1px solid var(--cinza-linha);}
td{padding:8px 10px;border-bottom:1px solid var(--cinza-superficie);vertical-align:top;}
.num{text-align:right;}
tr.churn-total td{font-weight:700;border-bottom:none;}
tr.texto td{font-size:11.5px;color:var(--cinza-texto);border-bottom:1px solid var(--cinza-linha);}
.tabela-wrap{overflow-x:auto;}
.grafico-wrap{overflow-x:auto;}
.analise p{font-size:13.5px;line-height:1.7;margin:0 0 12px;text-align:justify;}
.meta{font-size:11px;color:var(--cinza-apoio);}
.vazio{font-size:13px;color:var(--cinza-apoio);}
blockquote{margin:0 0 10px;padding:10px 14px;border-left:3px solid var(--dourado);background:var(--cinza-fundo);border-radius:0 10px 10px 0;font-size:12.5px;line-height:1.6;break-inside:avoid;page-break-inside:avoid;}
.tag{display:inline-block;font-size:10px;font-weight:700;color:var(--cinza-texto);background:var(--cinza-superficie);border-radius:999px;padding:2px 8px;margin-right:8px;}
.aviso{border:1px solid rgba(200,154,46,0.5);background:rgba(200,154,46,0.08);border-radius:12px;padding:12px 14px;font-size:12.5px;line-height:1.55;margin-bottom:16px;}
.aviso-forte{border-color:rgba(192,67,61,0.45);background:rgba(192,67,61,0.06);}
.aviso a{color:var(--preto-tinta);font-weight:700;}
.rodape{margin-top:32px;padding-top:12px;border-top:1px solid var(--cinza-linha);font-size:10.5px;color:var(--cinza-apoio);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;}
@media (max-width:640px){.grafico-wrap svg{min-width:560px;} .folha{padding:22px 16px;border-radius:16px;} h1{font-size:22px;} .kpi b{font-size:22px;}}
@page{size:A4;margin:14mm;}
@media print{
  body{background:var(--branco);}
  .pagina{max-width:none;padding:0;}
  .no-print{display:none !important;}
  .folha{border:none;padding:0;border-radius:0;}
  .aviso a{text-decoration:none;}
  svg{max-width:100%;min-width:0 !important;}
  .grafico-wrap{overflow:visible;}
}
</style>
</head>
<body>
<div class="pagina">
  <div class="barra no-print">
    <a href="/gestor#churn">Voltar ao painel</a>
    <span class="modo">Modo: <span class="estado ${anon ? 'anon' : 'ident'}">${anon ? 'Anonimizado' : 'Identificado'}</span>
      <a href="${esc(linkModo)}">${anon ? 'Emitir versão identificada' : 'Voltar ao modo anonimizado'}</a></span>
    <button class="primario" type="button" onclick="window.print()">Imprimir ou salvar em PDF</button>
  </div>
  ${avisoSemAnalise}
  ${avisoDesatualizada}
  <div class="folha">
    <header class="cabecalho">
      <div class="eyebrow">MOAI · CUSTOMER SUCCESS · RELATÓRIO DE CHURN</div>
      <h1>Por que os membros saíram</h1>
      <p>Recorte: ${esc(descreverRecorte(r))}.</p>
      <p>Mês de referência: ${esc(rotuloMesLongo(r.referencia))}. ${esc(statusAnalise)}. Versão ${anon ? 'anonimizada' : 'identificada, de uso interno da gestão'}.</p>
    </header>

    <div class="kpis">
      <div class="kpi"><b>${totalRecorte}</b><span>Churns no recorte da análise</span></div>
      <div class="kpi"><b>${d.serieSemanal.total}</b><span>Churns em ${esc(rotuloMesLongo(r.referencia))}</span></div>
      <div class="kpi"><b>${mediaNota ?? 'Sem dado'}</b><span>Nota média para voltar à MOAI (${notas.length} respostas)</span></div>
    </div>

    <section class="secao">
      <h2>Comunidade, fora da conta principal</h2>
      <p class="sub">A Comunidade não tem CS. Entram aqui os churns cujo produto ou cujo campo Quem é o seu CS é Comunidade. ${r.incluirComunidade ? 'Neste relatório a Comunidade está somada ao gráfico principal.' : 'Neste relatório a Comunidade não está somada ao gráfico principal.'}</p>
      <div class="kpis">
        <div class="kpi"><b>${d.comunidade.total}</b><span>Churns da Comunidade em ${r.granularidade === 'semana' ? esc(rotuloMesLongo(r.referencia)) : `${MESES_JANELA_MENSAL} meses`}</span></div>
        <div class="kpi"><b>${String(d.comunidade.pct).replace('.', ',')}%</b><span>Do total de ${d.comunidade.totalRecorte} churns do período</span></div>
      </div>
      ${d.comunidade.porMotivo.length ? `<div class="tabela-wrap"><table><thead><tr><th>Motivo</th><th class="num">Churns</th><th class="num">Participação</th></tr></thead><tbody>${d.comunidade.porMotivo.map((m) => `<tr><td><span style="display:inline-flex;align-items:center;gap:8px;">${amostraCorHTML(m.cor)}${esc(m.rotulo)}</span></td><td class="num">${m.qtd}</td><td class="num">${String(m.pct).replace('.', ',')}%</td></tr>`).join('')}</tbody></table></div>` : '<p class="vazio">Nenhum churn da Comunidade neste recorte.</p>'}
    </section>

    <section class="secao">
      <h2>Churn por mês</h2>
      <p class="sub">Últimos ${MESES_JANELA_MENSAL} meses até ${esc(rotuloMesLongo(r.referencia))}, por motivo declarado no formulário de saída.</p>
      <div class="grafico-wrap">${graficoChurnSVG(d.serieMensal, 'relMes', referenciaDoGrafico(d.recordeChurn, 'mes'))}</div>
      <div class="legenda">${d.serieMensal.porMotivo.map((m) => `<span class="item">${amostraCorHTML(m.cor)}${esc(m.rotulo)}</span>`).join('')}</div>
      <div class="tabela-wrap">${tabelaMotivosHTML(d.serieMensal) || '<p class="vazio">Sem churn no período.</p>'}</div>
    </section>

    <section class="secao">
      <h2>Churn por semana em ${esc(rotuloMesLongo(r.referencia))}</h2>
      <p class="sub">Semana 1 vai do dia 1 ao 7, semana 2 do 8 ao 14, semana 3 do 15 ao 21, semana 4 do 22 ao 28 e semana 5 do dia 29 em diante.</p>
      <div class="grafico-wrap">${graficoChurnSVG(d.serieSemanal, 'relSem', referenciaDoGrafico(d.recordeChurn, 'semana'))}</div>
      <div class="legenda">${d.serieSemanal.porMotivo.map((m) => `<span class="item">${amostraCorHTML(m.cor)}${esc(m.rotulo)}</span>`).join('')}</div>
      <div class="tabela-wrap">${tabelaMotivosHTML(d.serieSemanal) || '<p class="vazio">Sem churn no mês.</p>'}</div>
    </section>

    <section class="secao quebra-ok">
      <h2>Análise do churn</h2>
      ${blocoAnalise}
    </section>

    ${blocoCasos}

    <footer class="rodape">
      <span>Emitido em ${esc(emissaoTexto())} por ${esc(d.emitidoPor)}.</span>
      <span>Data de referência do churn: data informada no Monday ou, na falta dela, o dia de criação do item.</span>
    </footer>
  </div>
</div>
</body>
</html>`;
}
