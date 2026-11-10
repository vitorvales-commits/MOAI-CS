// Pipeline único do Vitorio 2 (30/10/2026), todo determinístico: normaliza e corrige, extrai entidades, classifica a intenção, executa o
// manipulador (dados) ou a busca extrativa (processos, manual, dicionário), herda contexto, pede esclarecimento e compõe a resposta.
// Encadeamento: dado, depois conhecimento, depois conversa social, depois "não sei" honesto. Sem IA e sem chamada externa.
import { VITORIO_INTENCAO_MARGEM, VITORIO_INTENCAO_MINIMA, VITORIO_SOCIAL_MINIMA } from '../constants.ts';
import { buscar, indexar, normalizar, type DocVitorio, type Indice } from './busca.ts';
import { classificar, type Classificador } from './classificador.ts';
import { corrigirTermos, extrair, parseTitulo, type Dicionario } from './entidades.ts';
import type { FonteDados } from './fonte.ts';
import { MANIPULADORES, type Ctx, type Parcial } from './manipuladores.ts';
import { extrairPeriodo, mesDe, VOCABULARIO_PERIODO } from './periodo.ts';
import { capacidades, EXEMPLOS, HEAD_CS, NAO_SEI, RECUSA, RECUSA_PERFIL } from './persona.ts';
import { blocosDeProcesso } from './processo.ts';
import { escolher, preencher, semente } from './redacao.ts';
import { SINONIMOS } from './sinonimos.ts';
import type { Entidade, Entidades, Fonte, Intencao, Opcao, Perfil, Resposta, TipoEntidade, Turno } from './tipos.ts';

export type Entrada = { texto: string; contexto: Turno[]; preenchimento?: { tipo: TipoEntidade; id: string; rotulo: string } };
export type Servicos = {
  dic: Dicionario; cl: Classificador; docs: DocVitorio[]; indiceDocs: Indice; vocabulario: Set<string>; f: FonteDados;
  ctx: { perfil: Perfil; isGestor: boolean; csNome: string | null; nome: string; hoje: string };
  apelidos: Record<string, string>; // nome do CS -> apelido no título dos conselhos
};

export function indexarDocs(docs: DocVitorio[]): Indice { return indexar(docs, SINONIMOS); }

const FAMILIAS_CONHECIMENTO = new Set(['plataforma', 'processo']);
const ACOES_ABRIR = /^(abre|abrir|abra|leva|levar|me leva|mostra|mostrar|me mostra|quero ver|ver)( isso| la| ai| a pagina| todos| tudo| esse| essa)*$/;
const ELIPSE = /^(e |e o |e a |e os |e as |e de |e da |e do |e no |e na |tambem |mesma coisa|mesmo para|e se )/;
const SO_ELIPSE_ENT = (mascarado: string) => /^(e )?(o |a |de |da |do |no |na )?(zcs|zperiodo|zconselho|zindicador|zmembro)( zperiodo| zcs)?$/.test(mascarado);
// Perguntas de "o que é", "como faço", "onde vejo", "qual o prazo": procuram conhecimento (manual, dicionário, processos), não um número.
const SINAL_CONHECIMENTO = /^(o que (e|sao|significa|quer dizer|conta como)|como (e|sao) (calculad|feit|medid)|como calcula|qual (a )?regra|de onde (vem|sai|vêm)|qual o prazo|quando vence|quando (levo|tomo|recebo|ganho|perco)|o que o cs|quanto tempo|por que nao consigo|quem pode|como (eu )?(faco|fazer|envio|preencho|registro|cadastro|aplico|edito|publico|vinculo|trato|sincronizo|defino|copio|libero|reabro|restauro|anulo|crio|troco|mudo|salvo|marco|adiciono|removo|confirmo|corrijo|vejo)|onde (vejo|fica|ficam|esta|estao|acho|preencho|envio|clico|encontro)|como funciona|como funcionam|me explica|explica)/;
const PALAVRAS_SEM_CONTEUDO = new Set(['como', 'esta', 'estao', 'o', 'a', 'os', 'as', 'de', 'do', 'da', 'um', 'uma', 'e', 'em', 'no', 'na', 'qual', 'quais', 'quem', 'quando', 'onde', 'que', 'quanto', 'quantos', 'quantas', 'sao', 'por', 'para', '']);
const VERBO: Record<TipoEntidade, string> = { cs: 'De qual CS?', conselho: 'De qual conselho?', membro: 'De qual membro?', indicador: 'De qual indicador?', produto: 'De qual produto?', advertencia: 'De qual tipo?' };
const LIMIAR_CONHECIMENTO = { resposta: 0.55, minimo: 0.42, margem: 0.12, margemAlta: 0.03, altaConfianca: 0.7, cobertura: 0.7 };

const nomeConselho = (titulo: string) => { const t = parseTitulo(titulo); return t ? t.contato + ' (' + t.nivel + ')' : titulo; };
const apelidoDe = (sv: Servicos) => (sv.ctx.csNome ? sv.apelidos[sv.ctx.csNome] || sv.ctx.csNome : '');

async function opcoesDe(tipo: TipoEntidade, sv: Servicos): Promise<Opcao[]> {
  const mk = (e: { id: string; rotulo: string }): Opcao => ({ rotulo: e.rotulo, preencher: { tipo, id: e.id, rotulo: e.rotulo } });
  if (tipo === 'cs') { const m = mesDe(sv.ctx.hoje); return (await sv.f.roster(m.mes, m.ano)).slice(0, 5).map((x) => mk({ id: x.nome, rotulo: x.nome })); }
  if (tipo === 'indicador') return ['cases', 'matchmakings', 'rounds', 'upsell', 'churn'].map((k) => sv.dic.entradas.find((e) => e.tipo === 'indicador' && e.id === k)).filter(Boolean).map((e) => mk(e!));
  if (tipo === 'conselho') {
    const meu = sv.ctx.isGestor ? null : apelidoDe(sv);
    return sv.dic.entradas.filter((e) => e.tipo === 'conselho' && (meu === null || parseTitulo(e.rotulo)?.cs === meu)).slice(0, 5).map((e) => mk({ id: e.id, rotulo: nomeConselho(e.rotulo) }));
  }
  return [];
}
// O CS comum só recebe, nas opções de desambiguação, o que é dele (conselhos da própria carteira e membros desses conselhos).
function filtrarVisivel(tipo: TipoEntidade, opcoes: Entidade[], sv: Servicos): Entidade[] {
  if (sv.ctx.isGestor) return opcoes;
  const ap = apelidoDe(sv);
  const meus = new Set(sv.dic.entradas.filter((e) => e.tipo === 'conselho' && parseTitulo(e.rotulo)?.cs === ap).map((e) => e.id));
  if (tipo === 'conselho') return opcoes.filter((o) => meus.has(o.id));
  if (tipo === 'membro') return opcoes.filter((o) => (sv.dic.entradas.find((e) => e.tipo === 'membro' && e.id === o.id)?.grupos || []).some((g) => meus.has(g)));
  return opcoes;
}

const base = (entidades: Entidades): Resposta => ({ resultado: 'nada', intencao: null, confianca: 0, texto: '', blocos: [], sugestoes: [], entidades });
const fonteVazia = (periodo: string): Fonte => ({ origem: 'Consulta aos dados do dash', periodo, regra: 'Nenhum registro encontrado para esta pergunta.' });

function mesclar(novas: Entidades, antigas: Entidades): Entidades {
  const out: Entidades = { ...novas, ambiguas: novas.ambiguas };
  (['cs', 'conselho', 'membro', 'indicador', 'produto'] as const).forEach((t) => { if (!out[t] && antigas[t]) (out as any)[t] = antigas[t]; });
  if (!out.periodo && antigas.periodo) out.periodo = antigas.periodo;
  if (out.eu === undefined || out.eu === false) out.eu = antigas.eu;
  return out;
}

export async function responder(entrada: Entrada, sv: Servicos): Promise<Resposta> {
  const { ctx } = sv, hoje = ctx.hoje;
  const original = normalizar(entrada.texto).slice(0, 200);
  const sem = semente(original);
  const ultimo = entrada.contexto[entrada.contexto.length - 1] || null;
  const norm = corrigirTermos(original, new Set([...sv.vocabulario, ...sv.dic.vocabulario, ...VOCABULARIO_PERIODO]));

  // 1. ação sobre a resposta anterior: "abre isso", "me leva lá", "mostra todos"
  if (ultimo && ACOES_ABRIR.test(norm) && ultimo.destino) {
    return { ...base(ultimo.entidades), resultado: 'resposta', intencao: 'acao.abrir', confianca: 1, texto: 'Abrindo: ' + ultimo.destino.rotulo + '.', destino: ultimo.destino, fonte: fonteVazia('resposta anterior') };
  }

  // 2. entidades e máscara
  const { entidades: bruto, mascarado } = extrair(norm, sv.dic, hoje);
  let entidades: Entidades = bruto;
  if (entrada.preenchimento) {
    const p = entrada.preenchimento;
    (entidades as any)[p.tipo] = { tipo: p.tipo, id: p.id, rotulo: p.rotulo };
    entidades.ambiguas = entidades.ambiguas.filter((a) => a.tipo !== p.tipo);
  }

  // 3. intenção, com herança de contexto para perguntas elípticas ("e da Kadydja?", "e no mês passado?", "quem são eles?")
  const cls = classificar(sv.cl, mascarado, entidades);
  let intencao = cls.intencao;
  let confianca = cls.confianca;
  const sinalConhecimento = SINAL_CONHECIMENTO.test(norm) && !cls.exato;
  // pergunta feita só de interrogativas e artigos ("como esta o") não tem o que classificar
  if (norm.split(' ').every((w) => PALAVRAS_SEM_CONTEUDO.has(w))) return naoSei(entidades, null, 0, sem, sv);
  const forte = (confianca >= VITORIO_INTENCAO_MINIMA && cls.margem >= VITORIO_INTENCAO_MARGEM) || confianca >= VITORIO_INTENCAO_MINIMA + 0.25;
  const anterior = ultimo && ultimo.intencao ? sv.cl.intencoes.get(ultimo.intencao) || null : null;
  let elipse = false;
  console.error("DBG", { anterior: anterior && anterior.id, sinalConhecimento, norm });
  if (anterior && !sinalConhecimento) {
    const curta = mascarado.split(' ').length <= 4;
    if (ELIPSE.test(norm) || SO_ELIPSE_ENT(mascarado) || /\b(eles|elas|esses|essas|deles|delas)\b/.test(norm) || (!forte && curta)) {
      // "e o nps?" troca a intenção; "e da Kadydja?" e "e no mês passado?" mantêm a anterior e trocam só a entidade
      const pronome = new RegExp("\b(eles|elas|esses|essas|deles|delas)\b").test(norm);
      const trocaIntencao = !!(intencao && intencao.id !== anterior.id && forte && !SO_ELIPSE_ENT(mascarado) && !pronome);
      if (!trocaIntencao) { intencao = anterior; confianca = Math.max(confianca, 0.9); }
      entidades = mesclar(entidades, ultimo!.entidades);
      elipse = true;
    }
  }

  // 4. conversa social (limiar próprio; perguntas de conhecimento nunca viram conversa)
  if (intencao && intencao.familia === 'social' && confianca >= VITORIO_SOCIAL_MINIMA && !sinalConhecimento) return social(intencao, sem, sv, entidades, confianca);

  // 5. perguntas de conhecimento: manual, dicionário, navegação, processos
  if (sinalConhecimento || (intencao && FAMILIAS_CONHECIMENTO.has(intencao.familia))) {
    const c = conhecimento(semPeriodo(norm, hoje), intencao && FAMILIAS_CONHECIMENTO.has(intencao.familia) ? intencao : null, entidades, sv);
    if (c) return c;
    if (sinalConhecimento) return naoSei(entidades, null, confianca, sem, sv);
  }

  // 6. dados
  if (intencao && !FAMILIAS_CONHECIMENTO.has(intencao.familia) && intencao.familia !== 'social' && (confianca >= VITORIO_INTENCAO_MINIMA || elipse)) {
    return dado(intencao, entidades, sem, sv, norm, confianca);
  }

  // 7. conhecimento como último recurso de busca, depois conversa de limiar mais baixo, depois "não sei"
  const c2 = conhecimento(semPeriodo(norm, hoje), null, entidades, sv);
  if (c2) return c2;
  if (intencao && intencao.familia === 'social' && confianca >= VITORIO_SOCIAL_MINIMA * 0.8) return social(intencao, sem, sv, entidades, confianca);
  return naoSei(entidades, intencao, confianca, sem, sv);
}

// A data da pergunta (ontem, em agosto) não faz parte do que se procura nos documentos.
function semPeriodo(norm: string, hoje: string): string {
  const p = extrairPeriodo(norm, hoje);
  return p ? (' ' + norm + ' ').replace(' ' + p.texto + ' ', ' ').trim() : norm;
}

function naoSei(entidades: Entidades, i: Intencao | null, confianca: number, sem: number, sv: Servicos): Resposta {
  return { ...base(entidades), resultado: 'nada', intencao: i ? i.id : null, confianca, texto: preencher(escolher(NAO_SEI, sem), { head: HEAD_CS }), sugestoes: EXEMPLOS[sv.ctx.perfil] };
}

function social(i: Intencao, sem: number, sv: Servicos, entidades: Entidades, confianca: number): Resposta {
  const p = sv.ctx.perfil;
  const texto = preencher(escolher(i.modelos, sem), { nome: sv.ctx.nome, capacidades: capacidades(p) });
  const sugestoes = i.id === 'social.capacidades' || i.id === 'social.ajuda' ? EXEMPLOS[p] : i.continuacoes;
  return { ...base(entidades), resultado: 'social', intencao: i.id, confianca, texto, sugestoes: sugestoes.slice(0, 3) };
}

// Falta entidade obrigatória sem valor padrão? Devolve o tipo a perguntar.
function precisa(i: Intencao, e: Entidades, sv: Servicos): TipoEntidade | null {
  const eu = !!sv.ctx.csNome && (i.padrao?.cs === 'eu' || e.eu);
  for (const t of i.obrigatorias) {
    if ((e as any)[t]) continue;
    if (t === 'cs' && eu) continue;
    return t;
  }
  // gestor sem perfil de CS que pede algo "dele" precisa dizer qual CS (a menos que a pergunta já nomeie um conselho ou fale do time)
  const escopoTime = ['relatorio.pendentes', 'gtd.atrasadas', 'nps.valor'];
  if (i.padrao?.cs === 'eu' && !e.cs && !e.conselho && !sv.ctx.csNome && !i.obrigatorias.length && !escopoTime.includes(i.id) && !(i.familia === 'indicadores' || i.familia === 'churn' || i.familia === 'causa')) return 'cs';
  return null;
}

async function dado(i: Intencao, e: Entidades, sem: number, sv: Servicos, norm: string, confianca: number): Promise<Resposta> {
  const ctx: Ctx = { ...sv.ctx, q: norm };
  const r0: Resposta = { ...base(e), intencao: i.id, confianca, sugestoes: i.continuacoes.slice(0, 3) };
  if (!i.perfis.includes(ctx.isGestor ? 'gestor' : 'cs')) return { ...r0, resultado: 'recusa', texto: RECUSA_PERFIL, sugestoes: EXEMPLOS.cs };
  const amb = e.ambiguas.find((a) => i.obrigatorias.includes(a.tipo) || (i.opcionais || []).includes(a.tipo) || a.tipo === 'conselho' || a.tipo === 'membro' || a.tipo === 'cs');
  if (amb) {
    const op = filtrarVisivel(amb.tipo, amb.opcoes, sv);
    if (op.length > 1) return { ...r0, resultado: 'ambigua', texto: 'Você quer dizer ' + op.slice(0, 5).map((o) => o.rotulo).join(' ou ') + '?', esclarecer: { pergunta: 'Qual deles?', faltando: amb.tipo, opcoes: op.slice(0, 5).map((o) => ({ rotulo: o.rotulo, preencher: { tipo: amb.tipo, id: o.id, rotulo: o.rotulo } })) } };
    if (op.length === 1) (e as any)[amb.tipo] = op[0];
  }
  const falta = precisa(i, e, sv);
  if (falta) return { ...r0, resultado: 'ambigua', texto: VERBO[falta], esclarecer: { pergunta: VERBO[falta], faltando: falta, opcoes: await opcoesDe(falta, sv) } };
  let p: Parcial;
  try { p = await MANIPULADORES[i.manipulador](ctx, e, sv.f, i); } catch (err) {
    console.error('[vitorio]', i.id, err);
    return { ...r0, resultado: 'nada', texto: 'Não consegui consultar esse dado agora. Tente de novo em instantes.', sugestoes: [] };
  }
  if (p.recusa) return { ...r0, resultado: 'recusa', texto: escolher(RECUSA, sem), sugestoes: EXEMPLOS.cs.slice(0, 2) };
  if (p.faltando) return { ...r0, resultado: 'ambigua', texto: VERBO[p.faltando], esclarecer: { pergunta: VERBO[p.faltando], faltando: p.faltando, opcoes: await opcoesDe(p.faltando, sv) } };
  const periodo = (e.periodo && e.periodo.rotulo) || 'situação atual';
  if (p.semDado) return { ...r0, resultado: 'resposta', texto: p.semDado, blocos: p.blocos || [], fonte: p.fonte || fonteVazia(periodo), destino: p.destino };
  const texto = p.texto || preencher(escolher(i.modelos, sem), p.vars || {});
  return { ...r0, resultado: 'resposta', texto, blocos: p.blocos || [], fonte: p.fonte || fonteVazia(periodo), destino: p.destino, sugestoes: (p.sugestoes || i.continuacoes).slice(0, 3) };
}

// Busca extrativa sobre processos, manual, dicionário, glossário e navegação. A intenção só dá um empurrão na ordem; quem decide é a pontuação.
const BONUS: Record<string, Partial<Record<DocVitorio['colecao'], number>>> = {
  'plataforma.como_fazer': { manual: 0.25, processos: 0.05 }, 'plataforma.onde': { navegacao: 0.3 }, 'plataforma.significado': { glossario: 0.25 },
  'plataforma.permissao': { manual: 0.2, glossario: 0.1 }, 'processo.direto': { faq: 0.1, pops: 0.1, fluxos: 0.05, processos: 0.05 },
};
function conhecimento(norm: string, i: Intencao | null, e: Entidades, sv: Servicos): Resposta | null {
  const ondeNav = /^onde /.test(norm);
  const r = buscar(sv.indiceDocs, norm) as any;
  const rank: { doc: DocVitorio; score: number }[] = (r.ranking || []).map((x: any) => ({
    doc: x.doc,
    score: x.score + ((i && BONUS[i.id]?.[x.doc.colecao as DocVitorio['colecao']]) || 0) + (x.doc.colecao === 'navegacao' ? (ondeNav ? 0.4 : -0.2) : 0),
  })).sort((a: any, b: any) => b.score - a.score);
  if (!rank.length) return null;
  const L = LIMIAR_CONHECIMENTO, s1 = rank[0].score, s2 = rank[1] ? rank[1].score : 0;
  // a pergunta tem palavras que o corpus não conhece: melhor admitir do que responder com o vizinho mais próximo
  if (s1 < L.minimo || ((r.cobertura ?? 1) < L.cobertura && s1 < 0.9)) return null;
  const b: Resposta = { ...base(e), intencao: i ? i.id : 'conhecimento', confianca: s1 };
  if (s1 >= L.resposta && s1 - s2 >= (s1 >= L.altaConfianca ? L.margemAlta : L.margem)) return processoOuNavegacao(rank[0].doc, r.realce, e, b);
  const opcoes = rank.filter((x) => x.score >= L.minimo).slice(0, 3);
  return { ...b, resultado: 'ambigua', texto: 'Encontrei mais de um caminho. Qual destes?', blocos: opcoes.map((x) => ({ tipo: 'trecho' as const, texto: x.doc.titulo + '. ' + (x.doc.corpo || '').slice(0, 110), origem: x.doc.origem, data: x.doc.data })), destino: opcoes[0].doc.destino ? { rotulo: opcoes[0].doc.verbo, url: opcoes[0].doc.destino } : undefined, chave: null, sugestoes: opcoes.map((x) => x.doc.titulo).slice(0, 3) };
}
function processoOuNavegacao(doc: DocVitorio, realce: string[], e: Entidades, b: Resposta): Resposta {
  const destino = doc.destino ? { rotulo: doc.verbo, url: doc.destino } : undefined;
  if (doc.colecao === 'navegacao') {
    return { ...b, resultado: 'resposta', texto: doc.titulo + ': ' + doc.corpo.replace(/\. Grupo .*$/, '.'), destino, chave: doc.chave, fonte: { origem: 'Navegação do dash', periodo: 'situação atual', regra: 'Mapa das páginas e abas que o seu perfil enxerga.' } };
  }
  const deProcesso = ['faq', 'processos', 'pops', 'fluxos', 'modelos'].includes(doc.colecao);
  const manual = doc.colecao === 'manual';
  const { blocos, extra } = blocosDeProcesso(doc, realce, e);
  const intro = deProcesso ? 'Segundo o processo "' + doc.titulo + '":' : doc.titulo + ':';
  return {
    ...b, resultado: 'resposta', texto: [intro, extra].filter(Boolean).join(' '),
    blocos: manual ? [{ tipo: 'trecho', texto: doc.corpo, origem: doc.origem, data: null }] : blocos,
    fonte: { origem: doc.origem + (doc.data ? ', publicado em ' + doc.data : ''), periodo: 'documento vigente', regra: deProcesso ? 'Trecho original do documento de processos publicado, sem reescrita.' : 'Texto escrito a partir do código do dash.' },
    destino, chave: doc.chave, sugestoes: [],
  };
}
