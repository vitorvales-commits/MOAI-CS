// HTML do relatório imprimível de churn e voz do membro (churn, onda 2, 08/10/2026). Sem IA e sem
// análise salva: só os números que a aba mostra, na mesma ordem (a1, b1, b2, b4, b5, c1). Anonimizado
// sempre: nenhum trecho de texto de membro, nenhum nome de membro e nenhum nome de respondente do NPS.
import { descreverRecorte, graficoChurnSVG, tabelaMotivosHTML, type Recorte, type TelaChurn } from './churn.ts';

export type EntradaRelatorio = {
  recorte: Recorte;
  telaMensal: TelaChurn;
  voz: any; // retorno de carregarVozMembro (sem trechos)
  visitas: any; // payload de carregarVisitas
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

  const a1 = `
    <section>
      <h2>Situação do mês</h2>
      <div class="cartoes">
        <div class="cartao"><span class="valor">${esc(telaMensal.totalMes)}</span><span class="rotulo">Churns da carteira no mês</span></div>
        <div class="cartao"><span class="valor">${esc(cartoes.pedidosEmAberto.quantidade)}</span><span class="rotulo">Pedidos em aberto, MRR R$ ${esc(numeroTexto(Math.round(cartoes.pedidosEmAberto.mrr * 100) / 100))}</span></div>
        <div class="cartao"><span class="valor">${esc(pctTexto(cartoes.retencao90.pct))}</span><span class="rotulo">Reversão sustentada em 90 dias (${esc(cartoes.retencao90.base)} visitas maturadas)</span></div>
        <div class="cartao"><span class="valor">${esc(pctTexto(voz.cartao4.atual.pct))}</span><span class="rotulo">Membros travados no desafio no mês</span></div>
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
      <h2>O que os membros estão falando</h2>
      <p class="rodape">${esc(voz.b2.rodape)}</p>
      <ul>${voz.b2.insights.map((t: string) => `<li>${esc(t)}</li>`).join('')}</ul>
      ${tabela(['Tema', 'Textos', 'Período anterior', 'Variação'],
        voz.b2.ranking.map((l: any) => [esc(l.rotulo), esc(l.textos), esc(l.anterior), esc(l.delta > 0 ? `+${l.delta}` : l.delta)]))}
    </section>`;

  const b4 = `
    <section>
      <h2>Por que as notas são baixas</h2>
      ${tabela(['Dimensão', 'Respostas', 'Notas baixas', 'Percentual', 'Período anterior'],
        voz.b4.dimensoes.map((d: any) => [esc(d.rotulo), esc(d.respostas), esc(d.baixas), esc(pctTexto(d.percentual)), esc(pctTexto(d.percentualAnterior))]))}
      <h3>Conselhos com mais notas baixas</h3>
      ${tabela(['Conselho', 'CS', 'Respostas', 'Notas baixas', 'Percentual', 'Dimensão que mais pesa', 'Tema das sugestões'],
        voz.b4.conselhos.map((c: any) => [esc(c.conselho), esc(c.cs || '-'), esc(c.respostas), esc(c.baixas), esc(pctTexto(c.percentual)), esc(c.dimensaoMaisPesa), esc(c.temaSugestoes || '-')]))}
      <p class="rodape">${esc(voz.b4.justificativas.frase)}</p>
    </section>`;

  const b5 = `
    <section>
      <h2>Por que não evoluem no desafio</h2>
      ${tabela(['Conselho', 'CS', 'Respostas', 'Travados', 'Presença', 'Ganhos na ata', 'Qualidade das trocas'],
        voz.b5.tabela.map((c: any) => [esc(c.conselho), esc(c.cs || '-'), esc(c.respostas), esc(pctTexto(c.percentualTravados)), esc(pctTexto(c.presencaPercentual)), esc(pctTexto(c.ganhosPercentual)), esc(numeroTexto(c.qualidadeMedia))]))}
      <p class="rodape">${esc(voz.b5.aviso)}</p>
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
<title>Relatório de churn e voz do membro</title>
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
  <h1>Relatório de churn e voz do membro</h1>
  <p>Mês de referência: ${esc(ref)}. Recorte: ${esc(descreverRecorte(recorte))}.</p>
  <p>Emitido por ${esc(e.emitidoPor)} em ${esc(e.emitidoEm)}. Anonimizado: nenhum nome de membro ou de respondente aparece.</p>
</header>
${a1}
${b1}
${b2}
${b4}
${b5}
${c1}
<p class="rodape-pagina">Relatório gerado a partir das leituras determinísticas da aba Churn e voz do membro. Sem análise de inteligência artificial.</p>
</body>
</html>`;
}
