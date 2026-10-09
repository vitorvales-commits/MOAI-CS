// Voz do membro (churn, onda 2, 08/10/2026). Leitura determinística do que os membros dizem na saída
// e no NPS: temas por expressão regular, contagens, notas e desafio. Nenhum texto passa por IA.
//
// Funções puras, sem acesso a banco nem rede, para rodar com node --experimental-strip-types
// (tests/voz-membro.test.ts). A rota app/api/gestor/membro/voz/route.ts monta as linhas já filtradas
// por SQL e a janela, e anonimiza os trechos antes de devolver.
import { classificarTemasCom, semAcento, TEMA_OUTROS } from './voz.ts';
import { AMOSTRA_MINIMA, NOTA_BAIXA_ESCALA_10, NOTA_BAIXA_ESCALA_5 } from './constants.ts';

export type FonteVoz = 'saida' | 'nps_sugestao' | 'nps_cs';
export type TextoVoz = { fonte: FonteVoz; mes: string; texto: string | null; nota?: number | null };

export const TEMAS_MEMBRO: { chave: string; rotulo: string; termos: RegExp }[] = [
  { chave: 'negocios', rotulo: 'Geração de negócios e conexões', termos: /\b(negocio\w*|cliente\w*|venda\w*|vender|indicac\w*|conex\w*|contato\w*|parceri\w*|contrato\w*|networking|matchmaking|oportunidade\w*|fechament\w*|fechar)\b/g },
  { chave: 'tempo', rotulo: 'Tempo e agenda', termos: /\b(tempo|agenda|horario\w*|rotina|correria|demanda\w*|priorid\w*|prioriz\w*|dispriorizei|comparecer|viage\w*|durante o dia|quinzenal|frequencia)\b/g },
  { chave: 'distancia', rotulo: 'Distância e deslocamento', termos: /\b(brasilia|goiania|mudanca|mudei|mudando|exterior|outro pais|deslocamento|distancia|presencia\w*|online|remoto)\b/g },
  { chave: 'financeiro', rotulo: 'Preço e financeiro', termos: /\b(financeir\w*|mensalidade\w*|valor alto|valor da mensalidade|custo\w*|caro|preco\w*|pagar|pagamento\w*|orcament\w*|economia|gasto\w*|taxa\w*)\b/g },
  { chave: 'cs', rotulo: 'Atuação ou troca de CS', termos: /\b(cs|css|atendimento|acompanhamento|proativ\w*|suporte|empati\w*|atencios\w*|prestativ\w*)\b/g },
  { chave: 'conselho', rotulo: 'Formato e qualidade do conselho', termos: /\b(conselho\w*|conselheiro\w*|dinamica\w*|metodologia|desafio\w*|maturidade|nive\w*|segmento\w*|desabafo|rotatividade|convidado\w*|empresas participantes|numero de empresas|novos membros)\b/g },
  { chave: 'eventos', rotulo: 'Eventos e comunidade', termos: /\b(evento\w*|comunidade|workshop\w*|rodada\w*|encontro\w*|palestra\w*)\b/g },
  // Tecnologia e formulários (revisão out/2026, N2): internet, wifi e cadastro saíram de "Local e estrutura".
  { chave: 'tecnologia', rotulo: 'Tecnologia e formulários', termos: /\b(internet|wifi|wi fi|rede|cadastro\w*|formulario\w*|site|cpf|app|link)\b/g },
  { chave: 'estrutura', rotulo: 'Local e estrutura', termos: /\b(local|sala|espaco|ar condicionado|barulho|comida|lanche|cafe|almoco|ventilac\w*|cadeira\w*|caneta\w*|estacionamento|confort\w*|apertad\w*)\b/g },
  { chave: 'expectativa', rotulo: 'Promessa e expectativa da venda', termos: /\b(prometid\w*|prometer|promessa\w*|foi falado|foi vendido|vendido|proposto|esperava\w*|esperavamos)\b/g },
  { chave: 'comunicacao', rotulo: 'Comunicação e informação', termos: /\b(comunicac\w*|informac\w*|transparenc\w*|onboarding|perdid\w*|alinhamento)\b/g },
  // Os dois abaixo vieram da leitura das respostas reais do formulário de saída (08/10/2026): boa parte
  // de quem sai explica a saída por vida pessoal ou por mudança na própria empresa, e sem eles esses
  // textos caíam em Outros.
  { chave: 'pessoal', rotulo: 'Momento pessoal e família', termos: /\b(pessoa\w*|familia\w*|familiar\w*|saude|gravidez|gestacao|nascimento|filho\w*|bebe|casamento|luto|faleciment\w*|especializac\w*|estudo\w*)\b/g },
  { chave: 'empresa', rotulo: 'Mudança na empresa do membro', termos: /\b(reestrutur\w*|socio\w*|sociedade|societari\w*|operac\w*|falencia|liquidac\w*|reorganiz\w*|corte\w*|reducao de custo\w*|mudanca de atuacao|vendi a empresa|sai da empresa|saida da empresa)\b/g },
];

// Respostas que não dizem nada: "não", "ok", "tudo ótimo" etc. Aplicadas ao texto sem acento, em
// minúsculas e sem espaços nas pontas, e só quando o texto tem até 45 caracteres.
const NAO_RESPOSTA = /^(n|na|nao|nada|nenhum[a]?|nenhuma sugestao|sem sugest\w*|sem mais|n\/?a|ok|top|show|otimo|excelente|tudo (certo|otimo|perfeito|bem|ok)|ta (otimo|certo|legal|indo muito bem)|esta (otimo|otima|tudo bem|muito bom|muito boa)|foi (bom|otimo|excelente)|nada a acrescentar|nao tenho\b.*|nao sei\b.*|nao saberia\b.*|manter\b.*)[.! ]*$/;

function normalizado(texto: string | null | undefined): string {
  return semAcento(texto || '').trim();
}

// Texto preenchido pelo CS e não pelo membro (ex.: "CS deve que responder", "PREENCHIDO PELO CS")
export function ehPreenchidoPeloCs(texto: string | null | undefined): boolean {
  const t = normalizado(texto);
  return /(cs deve|preenchido pelo cs)/.test(t);
}

// Sem conteúdo: menos de 6 letras ou números, ou resposta curta que só diz que não tem nada a dizer
export function ehNaoResposta(texto: string | null | undefined): boolean {
  const t = normalizado(texto);
  if (!t) return true;
  if ((t.match(/[a-z0-9]/g) || []).length < 6) return true;
  return t.length <= 45 && NAO_RESPOSTA.test(t);
}

export function classificarTemasMembro(texto: string) {
  return classificarTemasCom(texto, TEMAS_MEMBRO);
}

// ---- b2: temas da voz do membro ----

export type LinhaTema = {
  chave: string;
  rotulo: string;
  textos: number; // textos distintos com este tema na janela
  anterior: number; // mesmo número na janela anterior de mesmo tamanho
  delta: number;
  porFonte: { saida: number; nps: number };
};

export type ResumoTemas = {
  ranking: LinhaTema[];
  textosAnalisados: number;
  descartadosVazios: number;
  preenchidosPeloCs: number;
  insights: string[];
};

// Conta uma janela: textos válidos, descartados e preenchidos pelo CS, e os temas de cada texto.
// Cada resposta conta uma vez por tema (até 08/10/2026 respostas de texto idêntico, como duas pessoas
// escrevendo "falta de tempo", contavam uma vez só e o tema aparecia menor do que era).
function contarJanela(textos: TextoVoz[]) {
  let analisados = 0;
  let descartados = 0;
  let preenchidos = 0;
  const porTema = new Map<string, { rotulo: string; distintos: Set<string>; saida: Set<string>; nps: Set<string> }>();
  let indice = 0;
  for (const t of textos) {
    indice++;
    if (t.texto === null || t.texto === undefined) continue;
    if (t.fonte === 'saida' && ehPreenchidoPeloCs(t.texto)) { preenchidos++; continue; }
    if (ehNaoResposta(t.texto)) { descartados++; continue; }
    analisados++;
    const chaveTexto = String(indice);
    for (const tema of classificarTemasMembro(t.texto)) {
      if (tema.chave === TEMA_OUTROS.chave) continue;
      if (!porTema.has(tema.chave)) porTema.set(tema.chave, { rotulo: tema.rotulo, distintos: new Set(), saida: new Set(), nps: new Set() });
      const e = porTema.get(tema.chave)!;
      e.distintos.add(chaveTexto);
      (t.fonte === 'saida' ? e.saida : e.nps).add(chaveTexto);
    }
  }
  return { analisados, descartados, preenchidos, porTema };
}

// Ranking dos temas, o mais citado primeiro. Insights por regra fixa (ver a especificação do bloco b2):
// o mais citado; o que mais cresceu se somar pelo menos 3 textos; o mais citado só na saída.
export function montarTemas(atual: TextoVoz[], anterior: TextoVoz[]): ResumoTemas {
  const a = contarJanela(atual);
  const b = contarJanela(anterior);
  const ranking: LinhaTema[] = Array.from(a.porTema.entries()).map(([chave, e]) => {
    const antes = b.porTema.get(chave)?.distintos.size || 0;
    return {
      chave,
      rotulo: e.rotulo,
      textos: e.distintos.size,
      anterior: antes,
      delta: e.distintos.size - antes,
      porFonte: { saida: e.saida.size, nps: e.nps.size },
    };
  }).sort((x, y) => y.textos - x.textos || x.rotulo.localeCompare(y.rotulo, 'pt-BR'));

  const insights: string[] = [];
  const topo = ranking[0];
  if (topo) insights.push(`O tema mais citado é ${topo.rotulo}, em ${topo.textos} textos.`);
  const cresceu = ranking.filter((l) => l.delta >= 3).sort((x, y) => y.delta - x.delta)[0];
  if (cresceu) insights.push(`${cresceu.rotulo} cresceu ${cresceu.delta} textos em relação ao período anterior.`);
  const soSaida = ranking.filter((l) => l.porFonte.saida > 0).sort((x, y) => y.porFonte.saida - x.porFonte.saida)[0];
  if (soSaida) insights.push(`Entre quem saiu, o que mais aparece é ${soSaida.rotulo}.`);

  return {
    ranking,
    textosAnalisados: a.analisados,
    descartadosVazios: a.descartados,
    preenchidosPeloCs: a.preenchidos,
    insights,
  };
}

// ---- b4 e b5: notas e desafio ----

export type RespostaNps = {
  group_id: string | null;
  nome_grupo: string | null;
  cs: string | null;
  nota_conselheiro: number | null;
  nota_cs_hoje: number | null;
  nota_qualidade_trocas: number | null;
  nota_evolucao_desafios: number | null;
  continuidade_desafios: string | null;
  sugestao_texto: string | null;
  avalia_cs_texto: string | null;
};

// escala é a do formulário. Para comparar as quatro na mesma régua, a tela usa nota10: notas de 1 a 5
// são multiplicadas por 2 (5 vira 10, 3 vira 6). Faixas: baixa (o mesmo corte de nota baixa), média e alta.
const DIMENSOES = [
  { chave: 'conselheiro', rotulo: 'Conselheiro (0 a 10)', curto: 'Conselheiro', escala: 10, campo: 'nota_conselheiro' as const, baixa: (n: number) => n <= NOTA_BAIXA_ESCALA_10 },
  { chave: 'cs_hoje', rotulo: 'CS hoje (0 a 10)', curto: 'CS', escala: 10, campo: 'nota_cs_hoje' as const, baixa: (n: number) => n <= NOTA_BAIXA_ESCALA_10 },
  { chave: 'trocas', rotulo: 'Qualidade das trocas (1 a 5)', curto: 'Trocas', escala: 5, campo: 'nota_qualidade_trocas' as const, baixa: (n: number) => n <= NOTA_BAIXA_ESCALA_5 },
  { chave: 'evolucao', rotulo: 'Evolução no desafio (1 a 5)', curto: 'Evolução', escala: 5, campo: 'nota_evolucao_desafios' as const, baixa: (n: number) => n <= NOTA_BAIXA_ESCALA_5 },
];
type Dimensao = (typeof DIMENSOES)[number];
export const DIMENSOES_NOTA = DIMENSOES.map((d) => ({ chave: d.chave, rotulo: d.rotulo, curto: d.curto, escala: d.escala }));

function nota10(d: Dimensao, n: number): number {
  return d.escala === 5 ? n * 2 : n;
}
function faixaDe(d: Dimensao, n: number): 'baixa' | 'media' | 'alta' {
  if (d.baixa(n)) return 'baixa';
  return d.escala === 5 ? (n >= 5 ? 'alta' : 'media') : (n >= 9 ? 'alta' : 'media');
}
// Notas válidas de uma dimensão, sem primeiro conselho na evolução
function notasValidas(linhas: RespostaNps[], d: Dimensao): number[] {
  const out: number[] = [];
  for (const r of linhas) {
    if (d.chave === 'evolucao' && ehPrimeiroConselho(r)) continue;
    const n = r[d.campo];
    if (n !== null && n !== undefined) out.push(Number(n));
  }
  return out;
}
function media10(d: Dimensao, notas: number[]): number | null {
  if (notas.length < AMOSTRA_MINIMA) return null;
  return Math.round((notas.reduce((s, n) => s + nota10(d, n), 0) / notas.length) * 10) / 10;
}

// "Este é o meu primeiro conselho" não conta como travamento nem como nota baixa de evolução
export function ehPrimeiroConselho(r: RespostaNps): boolean {
  return normalizado(r.continuidade_desafios).startsWith('este e o meu primeiro');
}

// Travado: "Em partes..." ou "Não vejo..."
export function ehTravado(r: RespostaNps): boolean {
  const t = normalizado(r.continuidade_desafios);
  return t.startsWith('em partes') || t.startsWith('nao vejo');
}

// Continuidade preenchida e fora do primeiro conselho: base do percentual de travados
function temContinuidadeValida(r: RespostaNps): boolean {
  return !!normalizado(r.continuidade_desafios) && !ehPrimeiroConselho(r);
}

function dimensoesBaixas(r: RespostaNps): string[] {
  return DIMENSOES.filter((d) => {
    if (d.chave === 'evolucao' && ehPrimeiroConselho(r)) return false;
    const n = r[d.campo];
    return n !== null && n !== undefined && d.baixa(Number(n));
  }).map((d) => d.chave);
}

function temNota(r: RespostaNps): boolean {
  return DIMENSOES.some((d) => r[d.campo] !== null && r[d.campo] !== undefined);
}

export type LinhaDimensao = {
  chave: string; rotulo: string; curto: string; escala: number;
  respostas: number; baixas: number; percentual: number | null; percentualAnterior: number | null; variacao: number | null;
  media: number | null; mediaAnterior: number | null; variacaoMedia: number | null;
  faixas: { baixa: number; media: number; alta: number };
};

// Por dimensão, na janela e na anterior. Percentual só com AMOSTRA_MINIMA respostas válidas.
export function resumoNotas(atual: RespostaNps[], anterior: RespostaNps[]): LinhaDimensao[] {
  const medir = (linhas: RespostaNps[], d: (typeof DIMENSOES)[number]) => {
    const validas = linhas.filter((r) => {
      if (d.chave === 'evolucao' && ehPrimeiroConselho(r)) return false;
      const n = r[d.campo];
      return n !== null && n !== undefined;
    });
    const baixas = validas.filter((r) => d.baixa(Number(r[d.campo]))).length;
    return { respostas: validas.length, baixas };
  };
  return DIMENSOES.map((d) => {
    const x = medir(atual, d);
    const y = medir(anterior, d);
    const pct = x.respostas >= AMOSTRA_MINIMA ? Math.round((x.baixas / x.respostas) * 1000) / 10 : null;
    const pctAnt = y.respostas >= AMOSTRA_MINIMA ? Math.round((y.baixas / y.respostas) * 1000) / 10 : null;
    const notasAtual = notasValidas(atual, d);
    const media = media10(d, notasAtual);
    const mediaAnterior = media10(d, notasValidas(anterior, d));
    const faixas = { baixa: 0, media: 0, alta: 0 };
    notasAtual.forEach((n) => { faixas[faixaDe(d, n)]++; });
    return {
      chave: d.chave,
      rotulo: d.rotulo,
      curto: d.curto,
      escala: d.escala,
      respostas: x.respostas,
      baixas: x.baixas,
      percentual: pct,
      percentualAnterior: pctAnt,
      variacao: pct !== null && pctAnt !== null ? Math.round((pct - pctAnt) * 10) / 10 : null,
      media,
      mediaAnterior,
      variacaoMedia: media !== null && mediaAnterior !== null ? Math.round((media - mediaAnterior) * 10) / 10 : null,
      faixas,
    };
  });
}

export type LinhaConselhoNotas = {
  groupId: string;
  conselho: string;
  cs: string | null;
  respostas: number;
  baixas: number;
  percentual: number;
  dimensaoMaisPesa: string;
  temaSugestoes: string | null;
  fraseConversa: string | null;
  medias: Record<string, number | null>;
  mediaGeral: number | null;
};

// Conselhos com mais notas baixas (só os que têm AMOSTRA_MINIMA respostas), por percentual desc.
// Frase fixa quando a taxa chega a 30 por cento.
export function conselhosComNotasBaixas(linhas: RespostaNps[]): LinhaConselhoNotas[] {
  const grupos = new Map<string, RespostaNps[]>();
  for (const r of linhas) {
    if (!r.group_id || !temNota(r)) continue;
    if (!grupos.has(r.group_id)) grupos.set(r.group_id, []);
    grupos.get(r.group_id)!.push(r);
  }
  const out: LinhaConselhoNotas[] = [];
  for (const [groupId, rs] of grupos) {
    if (rs.length < AMOSTRA_MINIMA) continue;
    const comBaixa = rs.filter((r) => dimensoesBaixas(r).length > 0);
    const percentual = Math.round((comBaixa.length / rs.length) * 1000) / 10;
    const contagemDim = new Map<string, number>();
    comBaixa.forEach((r) => dimensoesBaixas(r).forEach((d) => contagemDim.set(d, (contagemDim.get(d) || 0) + 1)));
    const dimTop = Array.from(contagemDim.entries()).sort((x, y) => y[1] - x[1])[0];
    const rotuloDim = dimTop ? DIMENSOES.find((d) => d.chave === dimTop[0])!.rotulo : '—';
    const textoBaixas = comBaixa.map((r) => r.sugestao_texto).filter((t): t is string => !!t && !ehNaoResposta(t));
    const temas = classificarTemasDe(textoBaixas);
    const base = rs[0];
    const medias: Record<string, number | null> = {};
    DIMENSOES.forEach((d) => { medias[d.chave] = media10(d, notasValidas(rs, d)); });
    const valoresMedias = Object.values(medias).filter((v): v is number => v !== null);
    out.push({
      groupId,
      conselho: base.nome_grupo || groupId,
      cs: base.cs,
      respostas: rs.length,
      baixas: comBaixa.length,
      percentual,
      dimensaoMaisPesa: rotuloDim,
      temaSugestoes: temas,
      fraseConversa: percentual >= 30 && base.cs ? `Conversar com ${base.cs} sobre ${base.nome_grupo || groupId}` : null,
      medias,
      mediaGeral: valoresMedias.length ? Math.round((valoresMedias.reduce((a, b) => a + b, 0) / valoresMedias.length) * 10) / 10 : null,
    });
  }
  return out.sort((x, y) => y.percentual - x.percentual || x.conselho.localeCompare(y.conselho, 'pt-BR'));
}

// Tema mais citado em um conjunto de textos (rótulo ou null)
function classificarTemasDe(textos: string[]): string | null {
  const cont = new Map<string, { rotulo: string; n: number }>();
  for (const t of textos) for (const tema of classificarTemasMembro(t)) {
    if (tema.chave === TEMA_OUTROS.chave) continue;
    const e = cont.get(tema.chave) || { rotulo: tema.rotulo, n: 0 };
    e.n++;
    cont.set(tema.chave, e);
  }
  const top = Array.from(cont.values()).sort((x, y) => y.n - x.n || x.rotulo.localeCompare(y.rotulo, 'pt-BR'))[0];
  return top ? top.rotulo : null;
}

// "O que dizem os que deram nota baixa": temas das sugestões e das avaliações de CS só das respostas com
// alguma nota baixa, e a contagem das que não trazem justificativa escrita.
export function justificativasNotaBaixa(linhas: RespostaNps[]) {
  const comBaixa = linhas.filter((r) => dimensoesBaixas(r).length > 0);
  const sugestoes = comBaixa.map((r) => r.sugestao_texto).filter((t): t is string => !!t && !ehNaoResposta(t));
  const avaliacoesCs = comBaixa.map((r) => r.avalia_cs_texto).filter((t): t is string => !!t && !ehNaoResposta(t));
  const semJustificativa = comBaixa.filter((r) => ehNaoResposta(r.sugestao_texto) && ehNaoResposta(r.avalia_cs_texto)).length;
  return {
    total: comBaixa.length,
    temaSugestoes: classificarTemasDe(sugestoes),
    temaAvaliacoesCs: classificarTemasDe(avaliacoesCs),
    frase: `${semJustificativa} de ${comBaixa.length} respostas com nota baixa não trazem justificativa escrita.`,
  };
}

// ---- b5: desafio ----

export type LinhaDesafio = {
  groupId: string;
  conselho: string;
  cs: string | null;
  respostas: number;
  travados: number;
  percentualTravados: number;
  presencaPercentual: number | null;
  ganhosPercentual: number | null;
  qualidadeMedia: number | null;
  temaTravados: string | null;
  fraseRevisao: string | null;
};

export type ExtrasConselho = Map<string, { presencaPercentual: number | null; ganhosPercentual: number | null }>;

// Percentual de travados por conselho, com presença e ganhos da ata do mês de referência (vindos da rota).
export function tabelaDesafio(linhas: RespostaNps[], extras: ExtrasConselho): LinhaDesafio[] {
  const grupos = new Map<string, RespostaNps[]>();
  for (const r of linhas) {
    if (!r.group_id || !temContinuidadeValida(r)) continue;
    if (!grupos.has(r.group_id)) grupos.set(r.group_id, []);
    grupos.get(r.group_id)!.push(r);
  }
  const out: LinhaDesafio[] = [];
  for (const [groupId, rs] of grupos) {
    if (rs.length < AMOSTRA_MINIMA) continue;
    const travados = rs.filter(ehTravado);
    const notas = rs.map((r) => r.nota_qualidade_trocas).filter((n): n is number => n !== null && n !== undefined);
    const ex = extras.get(groupId);
    const pctTravados = Math.round((travados.length / rs.length) * 1000) / 10;
    out.push({
      groupId,
      conselho: rs[0].nome_grupo || groupId,
      cs: rs[0].cs,
      respostas: rs.length,
      travados: travados.length,
      percentualTravados: pctTravados,
      presencaPercentual: ex?.presencaPercentual ?? null,
      ganhosPercentual: ex?.ganhosPercentual ?? null,
      qualidadeMedia: notas.length ? Math.round((notas.reduce((s, n) => s + n, 0) / notas.length) * 10) / 10 : null,
      temaTravados: classificarTemasDe(travados.map((r) => r.sugestao_texto || '').filter((t) => !ehNaoResposta(t))),
      // A ação depende de onde o conselho cai: com presença abaixo de 70 por cento o primeiro passo é
      // trazer as pessoas de volta; com presença boa, o problema está na condução do desafio.
      fraseRevisao: pctTravados >= 40 && rs[0].cs
        ? (ex?.presencaPercentual !== null && ex?.presencaPercentual !== undefined && ex.presencaPercentual < 70
          ? `Recuperar a presença no conselho com ${rs[0].cs}`
          : `Revisar a condução dos desafios com ${rs[0].cs}`)
        : null,
    });
  }
  return out.sort((x, y) => y.percentualTravados - x.percentualTravados || x.conselho.localeCompare(y.conselho, 'pt-BR'));
}

// Distribuição da resposta de continuidade, sem primeiro conselho e sem nulo (base do percentual de travados)
export function distribuicaoContinuidade(linhas: RespostaNps[]) {
  const validas = linhas.filter(temContinuidadeValida);
  const partes = validas.filter((r) => normalizado(r.continuidade_desafios).startsWith('em partes')).length;
  const naoVejo = validas.filter((r) => normalizado(r.continuidade_desafios).startsWith('nao vejo')).length;
  const base = validas.length;
  const pct = (n: number) => (base >= AMOSTRA_MINIMA ? Math.round((n / base) * 1000) / 10 : null);
  return { base, sim: base - partes - naoVejo, partes, naoVejo, pctTravados: pct(partes + naoVejo) };
}

// Frases por regra, só quando cada lado tem pelo menos dois conselhos com dado. Abaixo disso não sai frase.
export function frasesDesafio(tabela: LinhaDesafio[]): string[] {
  const out: string[] = [];
  const media = (xs: number[]) => String(Math.round((xs.reduce((s, n) => s + n, 0) / xs.length) * 10) / 10).replace('.', ',');
  const comPresenca = tabela.filter((l) => l.presencaPercentual !== null);
  const presBaixa = comPresenca.filter((l) => (l.presencaPercentual as number) < 70);
  const presAlta = comPresenca.filter((l) => (l.presencaPercentual as number) >= 70);
  if (presBaixa.length >= 2 && presAlta.length >= 2) {
    out.push(`Nos conselhos com presença abaixo de 70 por cento, ${media(presBaixa.map((l) => l.percentualTravados))} por cento se dizem travados; nos demais, ${media(presAlta.map((l) => l.percentualTravados))} por cento.`);
  }
  const comGanho = tabela.filter((l) => l.ganhosPercentual !== null);
  const ganhoBaixo = comGanho.filter((l) => (l.ganhosPercentual as number) < 50);
  const ganhoAlto = comGanho.filter((l) => (l.ganhosPercentual as number) >= 50);
  if (ganhoBaixo.length >= 2 && ganhoAlto.length >= 2) {
    out.push(`Nos conselhos com ganho registrado abaixo de 50 por cento, ${media(ganhoBaixo.map((l) => l.percentualTravados))} por cento se dizem travados; nos demais, ${media(ganhoAlto.map((l) => l.percentualTravados))} por cento.`);
  }
  return out;
}


// ---- formulário de saída: perguntas abertas e disposição para voltar (08/10/2026) ----

// As três perguntas abertas do formulário de saída (board de churn 10008640053). Cada uma responde uma
// coisa diferente e por isso é lida separada: por que saiu, o que esperava e não recebeu, o que sugere.
export const PERGUNTAS_SAIDA = [
  { chave: 'motivo', rotulo: 'Por que saiu', pergunta: 'Explique melhor o motivo da sua saída', campo: 'explicacao' as const },
  { chave: 'expectativa', rotulo: 'O que esperava e não recebeu', pergunta: 'Você tinha alguma expectativa que não foi atendida?', campo: 'expectativa_nao_atendida' as const },
  { chave: 'sugestao', rotulo: 'O que sugere melhorar', pergunta: 'Como podemos melhorar nossa rede?', campo: 'sugestao_melhoria' as const },
];

// Disposição para voltar, pergunta de 0 a 10 do formulário de saída. Mesma régua do NPS: 9 e 10
// voltariam, 7 e 8 talvez, 0 a 6 não.
export type FaixaRetorno = 'voltaria' | 'talvez' | 'nao';
export const NOTA_RETORNO_VOLTARIA = 9;
export const NOTA_RETORNO_TALVEZ = 7;
export function faixaRetorno(nota: number | null | undefined): FaixaRetorno | null {
  if (nota === null || nota === undefined || !Number.isFinite(Number(nota))) return null;
  const n = Number(nota);
  if (n >= NOTA_RETORNO_VOLTARIA) return 'voltaria';
  if (n >= NOTA_RETORNO_TALVEZ) return 'talvez';
  return 'nao';
}

export type SaidaRetorno = { motivo: string; nota: number | null; preenchidoPeloCs: boolean };
export type ResumoRetorno = {
  base: number;
  media: number | null;
  distribuicao: number[]; // índice 0 a 10, quantas respostas deram cada nota
  faixas: { voltaria: number; talvez: number; nao: number };
  pctVoltaria: number | null;
  semNota: number;
  preenchidosPeloCs: number;
  porMotivo: { motivo: string; base: number; voltaria: number; talvez: number; nao: number; pctVoltaria: number | null; media: number | null }[];
};

// Resumo da disposição para voltar. Formulário preenchido pelo CS fica fora: a nota não é do membro.
export function resumoRetorno(linhas: SaidaRetorno[]): ResumoRetorno {
  const pct = (parte: number, base: number) => (base >= AMOSTRA_MINIMA ? Math.round((parte / base) * 1000) / 10 : null);
  const media = (ns: number[]) => (ns.length ? Math.round((ns.reduce((a, b) => a + b, 0) / ns.length) * 10) / 10 : null);
  const distribuicao = Array.from({ length: 11 }, () => 0);
  const faixas = { voltaria: 0, talvez: 0, nao: 0 };
  const notas: number[] = [];
  let semNota = 0;
  let preenchidos = 0;
  const motivos = new Map<string, number[]>();
  for (const l of linhas) {
    if (l.preenchidoPeloCs) { preenchidos++; continue; }
    const f = faixaRetorno(l.nota);
    if (!f) { semNota++; continue; }
    const n = Math.round(Number(l.nota));
    distribuicao[Math.max(0, Math.min(10, n))]++;
    faixas[f]++;
    notas.push(Number(l.nota));
    if (!motivos.has(l.motivo)) motivos.set(l.motivo, []);
    motivos.get(l.motivo)!.push(Number(l.nota));
  }
  const porMotivo = Array.from(motivos.entries()).map(([motivo, ns]) => {
    const voltaria = ns.filter((n) => faixaRetorno(n) === 'voltaria').length;
    const talvez = ns.filter((n) => faixaRetorno(n) === 'talvez').length;
    return { motivo, base: ns.length, voltaria, talvez, nao: ns.length - voltaria - talvez, pctVoltaria: pct(voltaria, ns.length), media: media(ns) };
  }).sort((x, y) => (y.pctVoltaria ?? -1) - (x.pctVoltaria ?? -1) || y.base - x.base);
  return {
    base: notas.length,
    media: media(notas),
    distribuicao,
    faixas,
    pctVoltaria: pct(faixas.voltaria, notas.length),
    semNota,
    preenchidosPeloCs: preenchidos,
    porMotivo,
  };
}

// Frases por regra sobre a disposição para voltar, só com amostra mínima por motivo.
export function frasesRetorno(r: ResumoRetorno, rotuloMotivo: (chave: string) => string): string[] {
  const out: string[] = [];
  if (r.base >= AMOSTRA_MINIMA) {
    out.push(`${r.faixas.voltaria} de ${r.base} ex membros deram 9 ou 10 para voltar à MOAI, e mais ${r.faixas.talvez} deram 7 ou 8.`);
  }
  const comAmostra = r.porMotivo.filter((m) => m.pctVoltaria !== null);
  const topo = comAmostra[0];
  const fundo = comAmostra[comAmostra.length - 1];
  if (topo && fundo && topo.motivo !== fundo.motivo) {
    // rótulo sem minúscula forçada: motivos como Ausência de Brasília têm nome próprio
    out.push(`O motivo de saída com mais gente disposta a voltar é ${rotuloMotivo(topo.motivo)} (${String(topo.pctVoltaria).replace('.', ',')} por cento deram 9 ou 10); o com menos é ${rotuloMotivo(fundo.motivo)} (${String(fundo.pctVoltaria).replace('.', ',')} por cento).`);
  }
  return out;
}
