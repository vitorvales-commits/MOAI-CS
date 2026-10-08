// HTML do relatório imprimível de churn (onda 2, 08/10/2026). Sem IA e sem análise salva: só os números
// que a aba Churn mostra, na mesma ordem. Desde a separação das abas (08/10/2026) usa apenas o formulário
// de saída e as visitas; o NPS dos conselhos tem aba própria e não entra aqui. Anonimizado sempre:
// nenhum trecho de texto de membro e nenhum nome de membro, nem na reconquista (só contagens).
import { descreverRecorte, graficoChurnSVG, tabelaMotivosHTML, type Recorte, type TelaChurn } from './churn.ts';

export type EntradaRelatorio = {
  recorte: Recorte;
  telaMensal: TelaChurn;
  voz: any; // retorno de carregarSaidaMembro (os trechos não são usados)
  visitas: any; // payload de carregarVisitas
  reconquista: any; // resumo de carregarReconquista (só contagens)
  emitidoPor: string;
  emitidoEm: string;
};

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);
}
function pctTexto(v: number | null | undefined): string {
  return v === null || v === undefined ? 'amostra pequena' : `${String(v).replace('.', ',')}%`;
}
function numeroTexto(v: number | null | undefined): string {
  return v === null || v === undefined ? '-' : String(v).replace('.', ',');
}
function tabela(cabecalho: string[], linhas: string[][]): string {
  if (linhas.length === 0) return '<p class="vazio">Sem dados neste período.</p>';
  return '<table><thead><tr>' + cabecalho.map((c) => `<th>${esc(c)}</th>`).join('') + '</tr></thead><tbody>' +
    linhas.map((l) => '<tr>' + l.map((c) => `<td>${c}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
}

export function gerarRelatorioChurnHtml(e: EntradaRelatorio): string {
  const { recorte, telaMensal, voz, visitas } = e;
  const ref = telaMensal.referencia;
  const f = visitas.c1.funil;
  const cartoes = visitas.cartoes;

  const ret = voz.retorno;
  const rec = e.reconquista;
  const a1 = `
    <section>
      <h2>Situação do mês</h2>
      <div class="cartoes">
        <div class="cartao"><span class="valor">${esc(telaMensal.totalMes)}</span><span class="rotulo">Churns da carteira no mês</span></div>
        <div class="cartao"><span class="valor">${esc(ret.mes.voltaria)} de ${esc(ret.mes.base)}</span><span class="rotulo">Saídas do mês que voltariam (nota 9 ou 10)</span></div>
        <div class="cartao"><span class="valor">${esc(rec.abertos)}</span><span class="rotulo">Reconquistas em aberto, ${esc(rec.vencidos)} com contato vencido</span></div>
        <div class="cartao"><span class="valor">${esc(cartoes.pedidosEmAberto.quantidade)}</span><span class="rotulo">Pedidos de churn em aberto, MRR R$ ${esc(numeroTexto(Math.round(cartoes.pedidosEmAberto.mrr * 100) / 100))}</span></div>
      </div>
    </section>`;

  const b1 = `
    <section>
      <h2>Por que estão saindo</h2>
      ${graficoChurnSVG(telaMensal.serie, 'relatorioChurn', null)}
      ${tabelaMotivosHTML(telaMensal.serie)}
    </section>`;

  const b2 = `
    <section>
      <h2>O que dizem ao sair</h2>
      ${voz.b2.perguntas.map((p: any) => `
        <h3>${esc(p.rotulo)}</h3>
        <ul>${p.insights.map((t: string) => `<li>${esc(t)}</li>`).join('')}</ul>
        ${tabela(['Tema', 'Respostas', 'Período anterior', 'Variação'],
          p.ranking.slice(0, 6).map((l: any) => [esc(l.rotulo), esc(l.textos), esc(l.anterior), esc(l.delta > 0 ? `+${l.delta}` : l.delta)]))}
        <p class="rodape">${esc(p.rodape)}</p>`).join('')}
    </section>`;

  const b3 = `
    <section>
      <h2>Quem voltaria</h2>
      <ul>${ret.frases.map((t: string) => `<li>${esc(t)}</li>`).join('')}</ul>
      ${tabela(['Motivo da saída', 'Respostas', 'Voltariam (9 e 10)', 'Talvez (7 e 8)', 'Não (0 a 6)', 'Percentual que voltaria'],
        ret.historico.porMotivo.map((m: any) => [esc(m.rotulo), esc(m.base), esc(m.voltaria), esc(m.talvez), esc(m.nao), esc(pctTexto(m.pctVoltaria))]))}
      <h3>Rastreio de reconquista</h3>
      ${tabela(['Situação', 'Ex membros'], [
        ['A contatar', esc(rec.porStatus.a_contatar)], ['Contatado', esc(rec.porStatus.contatado)], ['Em conversa', esc(rec.porStatus.em_conversa)],
        ['Voltou', esc(rec.porStatus.voltou)], ['Sem interesse', esc(rec.porStatus.sem_interesse)], ['Contato vencido', esc(rec.vencidos)],
      ])}
    </section>`;

  const c1 = `
    <section>
      <h2>Visitas de reversão</h2>
      ${tabela(['Indicador', 'Valor'], [
        ['Pedidos', esc(f.pedidos)], ['Visitados', esc(f.visitados)], ['Em acompanhamento', esc(f.emAcompanhamento)],
        ['Revertidos', esc(f.revertidos)], ['Perdidos', esc(f.perdidos)], ['Cobertura', esc(pctTexto(f.cobertura))],
        ['Retenção em 90 dias', esc(pctTexto(f.retencao90.pct))], ['MRR em risco (R$)', esc(numeroTexto(f.mrrEmRisco))],
        ['MRR preservado em 90 dias (R$)', esc(numeroTexto(f.mrrPreservado))],
      ])}
      <h3>Eficácia por ação principal</h3>
      ${tabela(['Ação principal', 'Visitas', 'Revertidos', 'Retenção em 90 dias'],
        visitas.c1.eficaciaAcao.map((l: any) => [esc(l.chave), esc(l.visitas), esc(l.revertidos), esc(pctTexto(l.retencao90))]))}
      <h3>Eficácia por causa raiz</h3>
      ${tabela(['Causa raiz', 'Visitas', 'Revertidos', 'Retenção em 90 dias'],
        visitas.c1.eficaciaCausa.map((l: any) => [esc(l.chave), esc(l.visitas), esc(l.revertidos), esc(pctTexto(l.retencao90))]))}
    </section>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relatório de churn</title>
<style>
  body { font-family: Inter, Arial, sans-serif; color: #1d1d1b; margin: 32px; font-size: 13px; line-height: 1.45; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 24px 0 8px; border-bottom: 1px solid #d9d9d9; padding-bottom: 4px; }
  h3 { font-size: 14px; margin: 16px 0 6px; }
  .cabecalho { border-bottom: 2px solid #1d1d1b; padding-bottom: 8px; margin-bottom: 8px; }
  .cabecalho p { margin: 2px 0; color: #555; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; }
  th, td { text-align: left; padding: 5px 6px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
  th { font-size: 12px; background: #f4f4f2; }
  .cartoes { display: flex; gap: 12px; flex-wrap: wrap; }
  .cartao { flex: 1 1 160px; border: 1px solid #d9d9d9; border-radius: 6px; padding: 10px; }
  .cartao .valor { display: block; font-size: 20px; font-weight: 700; }
  .cartao .rotulo { color: #555; font-size: 12px; }
  .rodape, .vazio { color: #555; font-size: 12px; }
  .rodape-pagina { margin-top: 24px; color: #777; font-size: 11px; border-top: 1px solid #d9d9d9; padding-top: 6px; }
  svg { max-width: 100%; height: auto; }
  @media print { body { margin: 14mm; } section { break-inside: avoid; } }
</style>
</head>
<body>
<header class="cabecalho">
  <h1>Relatório de churn</h1>
  <p>Mês de referência: ${esc(ref)}. Recorte: ${esc(descreverRecorte(recorte))}.</p>
  <p>Emitido por ${esc(e.emitidoPor)} em ${esc(e.emitidoEm)}. Anonimizado: nenhum nome de membro ou de respondente aparece.</p>
</header>
${a1}
${b1}
${b2}
${b3}
${c1}
<p class="rodape-pagina">Relatório gerado a partir das leituras determinísticas da aba Churn, só com o formulário de saída e as visitas de reversão. Sem análise de inteligência artificial.</p>
</body>
</html>`;
}
