// Manipuladores das intenções de dado do Vitorio 2 (30/10/2026). Cada um recebe o contexto, as entidades e a fonte de dados
// (interface FonteDados) e devolve variáveis para os modelos de frase, blocos de apresentação e a fonte da resposta.
// Permissões: o CS comum só vê o que é dele e o que o dash já mostra a ele; o que é da visão do gestor vira recusa, sem valor.
import { STATUS_PAGAMENTO_PAGANTE, STATUS_PAGAMENTO_PERMUTA, MESES_ORDEM } from '../constants.ts';
import { fraseEstadoRelatorio } from '../relatorio-conselho.ts';
import { parseTitulo } from './entidades.ts';
import type { FonteDados, ConselhoLite, RelatorioCSLite, CSLite } from './fonte.ts';
import { HEAD_CS, capacidades, EXEMPLOS } from './persona.ts';
import { dataBr, mesAnterior, mesesDoPeriodo, periodoPadrao, somarDias } from './periodo.ts';
import { dataLonga, iso2br, juntar, numeroBr, plural } from './redacao.ts';
import type { Bloco, Entidades, Fonte, Intencao, Perfil, TipoEntidade } from './tipos.ts';

export type Ctx = { perfil: Perfil; isGestor: boolean; csNome: string | null; nome: string; hoje: string; q: string };
export type Parcial = {
  vars?: Record<string, string | number>; texto?: string; blocos?: Bloco[]; fonte?: Fonte; destino?: { rotulo: string; url: string };
  recusa?: boolean; faltando?: TipoEntidade; semDado?: string; sugestoes?: string[];
};
type Manip = (c: Ctx, e: Entidades, f: FonteDados, i: Intencao) => Promise<Parcial>;

const MAX_LISTA = 5;
export const rotuloConselho = (titulo: string) => { const t = parseTitulo(titulo); return t ? t.contato + ' (' + t.nivel + ')' : titulo; };
const csDoTitulo = (titulo: string) => parseTitulo(titulo)?.cs || null;
const lista = (itens: { titulo: string; sub?: string; foto?: string | null }[], verTodos?: { rotulo: string; url: string }): Bloco => ({ tipo: 'lista', itens: itens.slice(0, MAX_LISTA), total: itens.length, verTodos: itens.length > MAX_LISTA ? verTodos : undefined });
const fotoCS = (nome: string) => '/cs-foto/' + encodeURIComponent(nome);

async function fonteDe(f: FonteDados, origem: string, periodo: string, regra: string): Promise<Fonte> {
  return { origem, periodo, regra, sincronizadoEm: await f.sincronizadoEm().catch(() => null) };
}
const recusa = (): Parcial => ({ recusa: true });
const apelidoDe = (roster: CSLite[], nome: string) => (roster.find((c) => c.nome === nome)?.apelido || nome);

// CS alvo: o citado, ou o próprio usuário quando a intenção permite e há um perfil de CS.
function alvoCS(c: Ctx, e: Entidades, i: Intencao): string | null {
  if (e.cs) return e.cs.id;
  if ((i.padrao?.cs === 'eu' || e.eu) && c.csNome) return c.csNome;
  return null;
}
const podeVer = (c: Ctx, cs: string | null) => c.isGestor || (!!cs && cs === c.csNome);
// Conselho é do CS quando o título traz o apelido dele entre parênteses.
async function donoDoConselho(f: FonteDados, c: Ctx, cons: ConselhoLite, mes: string, ano: number): Promise<{ cs: string | null; meu: boolean }> {
  const ap = csDoTitulo(cons.titulo);
  const roster = await f.roster(mes, ano);
  const cs = ap ? (roster.find((r) => (r.apelido || r.nome) === ap || r.nome === ap)?.nome || ap) : null;
  return { cs, meu: c.isGestor || (!!cs && cs === c.csNome) };
}
const mesAno = (e: Entidades, hoje: string) => { const p = e.periodo || periodoPadrao('mes_atual', hoje); return mesesDoPeriodo(p)[0]; };
const rotuloPeriodo = (e: Entidades, hoje: string) => (e.periodo || periodoPadrao('mes_atual', hoje)).rotulo;

// ---- indicadores ----
const CHAVE_REPORT: Record<string, string> = { cases: 'casesSucesso', matchmakings: 'matchmakings', rounds: 'rounds', indicacoes: 'indicacoes', upsell: 'upsell', downsell: 'downsell', churn: 'churn', revenue_churn: 'revenueChurn', health_base: 'healthDaBase', critico: 'criticos' };
const ROTULO: Record<string, string> = { cases: 'Cases de Sucesso', matchmakings: 'Matchmakings', rounds: 'Rounds', indicacoes: 'Indicações', upsell: 'Upsell', downsell: 'Downsell', churn: 'Churn', revenue_churn: 'Revenue Churn', health_base: 'Health da Base', critico: 'Membros críticos', carteira: 'Carteira', presenca: 'Presença nos conselhos' };
const fmt = (v: number | null, un?: string) => (v === null || v === undefined ? 'sem dado' : un === 'R$' ? 'R$ ' + numeroBr(v) : un === '%' ? numeroBr(v, 1) + '%' : numeroBr(v, Number.isInteger(v) ? 0 : 1));
const fora = (meta: number | null, v: number | null, tipo: 'min' | 'max') => meta !== null && meta !== undefined && v !== null && (tipo === 'min' ? v < meta : v > meta);

function valorIndicador(r: RelatorioCSLite, chave: string): { valor: number | null; meta: number | null; tipo: 'min' | 'max'; un?: string; suportado: boolean } {
  if (chave === 'carteira') return { valor: r.conselhos.filter((x) => !x.congelado).length, meta: null, tipo: 'min', suportado: true };
  if (chave === 'presenca') {
    const p = r.conselhos.reduce((s, x) => s + (x.presente || 0), 0), t = r.conselhos.reduce((s, x) => s + (x.registros || 0), 0);
    return { valor: t ? Math.round((p / t) * 100) : null, meta: null, tipo: 'min', un: '%', suportado: true };
  }
  const k = CHAVE_REPORT[chave];
  const ind = k ? r.indicadores[k] : undefined;
  if (!ind) return { valor: null, meta: null, tipo: 'min', suportado: false };
  return { valor: ind.alcancado, meta: ind.meta, tipo: ind.tipoMeta, un: ind.unidade === 'R$' ? 'R$' : ind.unidade === '%' ? '%' : undefined, suportado: true };
}
// "do time", "tivemos": escopo do time; gestor sem perfil de CS que não cita um CS também fala do time
const ehTime = (c: Ctx, e: Entidades) => !e.cs && !e.eu && (/(time|equipe|area|todos|geral|tivemos|temos|fizemos)/.test(c.q) || (c.isGestor && !c.csNome));

const indicadoresValor: Manip = async (c, e, f, i) => {
  const chave = e.indicador!.id;
  const { mes, ano } = mesAno(e, c.hoje);
  const periodo = rotuloPeriodo(e, c.hoje);
  if (ehTime(c, e)) {
    if (!c.isGestor && !(await f.revelarEquipe())) return recusa();
    const roster = await f.roster(mes, ano);
    const rels = await Promise.all(roster.map((r) => f.relatorioCS(r.nome, mes, ano).then((x) => valorIndicador(x, chave)).catch(() => null)));
    const ok = rels.filter((x): x is NonNullable<typeof x> => !!x && x.suportado && x.valor !== null);
    if (!ok.length) return { semDado: 'Não tenho esse indicador por pergunta para o time. Ele aparece na Visão da área.', destino: { rotulo: 'Ir para a Visão da área', url: '/gestor?aba=visaoGeral' } };
    const soma = ok.reduce((s, x) => s + (x.valor as number), 0);
    const valor = chave === 'health_base' ? soma / ok.length : soma;
    const prev = mesAnterior({ mes, ano });
    const rp = await Promise.all(roster.map((r) => f.relatorioCS(r.nome, prev.mes, prev.ano).then((x) => valorIndicador(x, chave)).catch(() => null)));
    const okp = rp.filter((x): x is NonNullable<typeof x> => !!x && x.suportado && x.valor !== null);
    const somap = okp.reduce((s, x) => s + (x.valor as number), 0);
    const comps = okp.length ? [{ rotulo: 'Mês anterior (' + prev.mes.toLowerCase() + ')', valor: fmt(chave === 'health_base' ? somap / okp.length : somap, ok[0].un), tom: 'neutro' as const }] : [];
    return {
      vars: { quem: 'o time', indicador: ROTULO[chave] || chave, valor: fmt(valor, ok[0].un), periodo },
      blocos: [{ tipo: 'numero', rotulo: (ROTULO[chave] || chave) + ', time', valor: fmt(valor, ok[0].un), comparacoes: comps }],
      fonte: await fonteDe(f, 'Boards do Monday sincronizados, relatório de cada CS do roster', periodo, chave === 'health_base' ? 'Média do Health da Base dos CS do roster.' : 'Soma do indicador de cada CS do roster no período.'),
      destino: { rotulo: 'Ir para a Visão da área', url: '/gestor?aba=visaoGeral' },
    };
  }
  const cs = alvoCS(c, e, i);
  if (!cs) return { faltando: 'cs' };
  if (!podeVer(c, cs)) return recusa();
  const meses = e.periodo?.tipo === 'trimestre' ? e.periodo.meses : [{ mes, ano }];
  const rels = await Promise.all(meses.map((m) => f.relatorioCS(cs, m.mes, m.ano)));
  const vs = rels.map((r) => valorIndicador(r, chave));
  if (!vs[0].suportado) return { semDado: ROTULO[chave] ? 'Não calculo ' + ROTULO[chave] + ' por pergunta. Ele aparece nas páginas de indicadores.' : 'Não conheço esse indicador.', destino: { rotulo: 'Ir para Meus indicadores', url: c.perfil === 'gestor' ? '/gestor?aba=metasDestaques' : '/?aba=indicadores' } };
  const soma = vs.reduce((s, x) => s + (x.valor ?? 0), 0);
  const valor = chave === 'health_base' ? (vs[0].valor ?? null) : (vs.some((x) => x.valor !== null) ? soma : null);
  const comps = [];
  const meta = vs[0].meta !== null && vs.length === 1 ? vs[0].meta : null;
  if (meta !== null) comps.push({ rotulo: 'Meta', valor: fmt(meta, vs[0].un), tom: (fora(meta, valor, vs[0].tipo) ? 'ruim' : 'bom') as 'ruim' | 'bom' });
  if (vs.length === 1) {
    const prev = mesAnterior({ mes, ano });
    const rp = await f.relatorioCS(cs, prev.mes, prev.ano).then((x) => valorIndicador(x, chave)).catch(() => null);
    if (rp && rp.valor !== null) comps.push({ rotulo: 'Mês anterior (' + prev.mes.toLowerCase() + ')', valor: fmt(rp.valor, vs[0].un), tom: 'neutro' as const });
  }
  return {
    vars: { quem: cs, indicador: ROTULO[chave] || chave, valor: fmt(valor, vs[0].un), periodo },
    blocos: [{ tipo: 'numero', rotulo: (ROTULO[chave] || chave) + ', ' + cs, valor: fmt(valor, vs[0].un), comparacoes: comps, foraDoAlvo: fora(meta, valor, vs[0].tipo) }],
    fonte: await fonteDe(f, 'Relatório do CS (boards do Monday e metas definidas no dash)', periodo, regraDoIndicador(chave)),
    destino: { rotulo: 'Ir para Meus indicadores', url: c.perfil === 'gestor' ? '/gestor/cs/' + encodeURIComponent(cs) : '/?aba=indicadores' },
  };
};
function regraDoIndicador(chave: string): string {
  const mapa: Record<string, string> = {
    cases: 'Cases registrados no mês cujo responsável é o CS.', matchmakings: 'Matchmakings do mês registrados com o usuário do Monday do CS.', rounds: 'Rounds do mês com status Realizado.',
    indicacoes: 'Soma das indicações informadas nos reports semanais do mês.', upsell: 'Upsells do período com status Finalizado.', downsell: 'Downsells do período com status Finalizado.',
    churn: 'Saídas do mês de membros da carteira, conforme o board de Churn.', revenue_churn: 'Soma do preço do produto dos membros que saíram no mês.',
    health_base: 'Percentual de críticos do report mais recente mais os pontos de advertência ativos.', critico: 'Críticos informados no report mais recente do período.', carteira: 'Conselhos ativos do CS.', presenca: 'Presentes sobre registros de presença do mês.',
  };
  return mapa[chave] || 'Regra no dicionário de dados do dash.';
}

const metasFora: Manip = async (c, e, f, i) => {
  const cs = alvoCS(c, e, i);
  if (!cs) return { faltando: 'cs' };
  if (!podeVer(c, cs)) return recusa();
  const { mes, ano } = mesAno(e, c.hoje), periodo = rotuloPeriodo(e, c.hoje);
  const r = await f.relatorioCS(cs, mes, ano);
  const com = Object.keys(CHAVE_REPORT).map((ch) => ({ ch, ...valorIndicador(r, ch) })).filter((x) => x.suportado && x.meta !== null);
  if (!com.length) return { semDado: 'Não há metas cadastradas para ' + cs + ' em ' + periodo + '.', destino: { rotulo: 'Ir para Metas e destaques', url: '/gestor?aba=metasDestaques' } };
  const fo = com.filter((x) => x.valor !== null && fora(x.meta, x.valor, x.tipo)), ok = com.filter((x) => x.valor !== null && !fora(x.meta, x.valor, x.tipo));
  const txt = fo.length ? plural(fo.length, 'meta fora do alvo', 'metas fora do alvo') + ': ' + juntar(fo.map((x) => ROTULO[x.ch] + ' (' + fmt(x.valor, x.un) + ' contra ' + fmt(x.meta, x.un) + ')')) + '. ' + (ok.length ? 'No alvo: ' + juntar(ok.map((x) => ROTULO[x.ch])) + '.' : '') : 'Todas as ' + com.length + ' metas com dado estão no alvo.';
  return {
    vars: { quem: cs, periodo, fora: txt },
    blocos: [lista(fo.map((x) => ({ titulo: ROTULO[x.ch], sub: fmt(x.valor, x.un) + ' contra meta ' + fmt(x.meta, x.un) })))],
    fonte: await fonteDe(f, 'Relatório do CS e matriz de metas do mês', periodo, 'Mínimo: fora do alvo quando o realizado fica abaixo da meta. Máximo (churn, downsell, críticos, Health): fora quando passa da meta.'),
    destino: { rotulo: 'Ir para Meus indicadores', url: c.perfil === 'gestor' ? '/gestor/cs/' + encodeURIComponent(cs) : '/?aba=indicadores' },
  };
};

const ranking: Manip = async (c, e, f) => {
  if (!c.isGestor) return recusa();
  const chave = e.indicador!.id, { mes, ano } = mesAno(e, c.hoje), periodo = rotuloPeriodo(e, c.hoje);
  const roster = await f.roster(mes, ano);
  const vs = (await Promise.all(roster.map((r) => f.relatorioCS(r.nome, mes, ano).then((x) => ({ cs: r.nome, ...valorIndicador(x, chave) })).catch(() => null))))
    .filter((x): x is NonNullable<typeof x> => !!x && x.suportado && x.valor !== null);
  if (!vs.length) return { semDado: 'Não tenho dado de ' + (ROTULO[chave] || chave) + ' por CS em ' + periodo + '.' };
  const menorMelhor = vs[0].tipo === 'max';
  vs.sort((a, b) => (menorMelhor ? (a.valor as number) - (b.valor as number) : (b.valor as number) - (a.valor as number)));
  return {
    vars: { indicador: ROTULO[chave] || chave, periodo, itens: juntar(vs.map((x) => x.cs + ' ' + fmt(x.valor, x.un))) },
    blocos: [lista(vs.map((x) => ({ titulo: x.cs, sub: fmt(x.valor, x.un), foto: fotoCS(x.cs) })), { rotulo: 'Ver o Mapa do time', url: '/gestor?aba=visaoGeral#mapa-time' })],
    fonte: await fonteDe(f, 'Relatório de cada CS do roster', periodo, 'Ordem do melhor para o pior pelo valor do indicador (' + (menorMelhor ? 'menor é melhor' : 'maior é melhor') + ').'),
    destino: { rotulo: 'Ir para o Mapa do time', url: '/gestor?aba=visaoGeral#mapa-time' },
  };
};

// ---- time ----
const roster: Manip = async (c, e, f) => {
  const { mes, ano } = mesAno(e, c.hoje), periodo = rotuloPeriodo(e, c.hoje);
  const r = await f.roster(mes, ano);
  if (!r.length) return { semDado: 'Não há registro de quem era CS em ' + periodo + '.' };
  return {
    vars: { periodo, n: plural(r.length, 'pessoa', 'pessoas'), nomes: juntar(r.map((x) => x.nome)) },
    blocos: [lista(r.map((x) => ({ titulo: x.nome, sub: x.nomeCompleto || undefined, foto: fotoCS(x.nome) })))],
    fonte: await fonteDe(f, 'Roster de CS (cs_config no mês corrente, cs_periodos nos meses fechados)', periodo, 'Mês corrente: CS ativos hoje. Mês fechado: quem era CS naquele mês.'),
    destino: c.isGestor ? { rotulo: 'Ir para o Mapa do time', url: '/gestor?aba=visaoGeral#mapa-time' } : undefined,
  };
};
const csDoConselho: Manip = async (c, e, f) => {
  const cons = (await f.conselhos()).find((g) => g.groupId === e.conselho!.id);
  if (!cons) return { semDado: 'Não encontrei esse conselho.' };
  const ap = csDoTitulo(cons.titulo);
  if (!ap) return { semDado: 'O título do conselho ' + rotuloConselho(cons.titulo) + ' não traz o CS responsável.' };
  return {
    vars: { conselho: rotuloConselho(cons.titulo), cs: ap },
    fonte: await fonteDe(f, 'Título do grupo no board de Conselhos (conselhos_grupos)', 'situação atual', 'O CS responsável é o apelido entre parênteses no título do grupo.'),
    destino: c.isGestor ? { rotulo: 'Abrir o conselho', url: '/conselho/' + encodeURIComponent(cons.groupId) } : undefined,
  };
};
const conselhosDoCS: Manip = async (c, e, f, i) => {
  const cs = alvoCS(c, e, i);
  if (!cs) return { faltando: 'cs' };
  if (!podeVer(c, cs)) return recusa();
  const { mes, ano } = mesAno(e, c.hoje);
  const ap = apelidoDe(await f.roster(mes, ano), cs);
  const mine = (await f.conselhos()).filter((g) => csDoTitulo(g.titulo) === ap);
  if (!mine.length) return { semDado: 'Não encontrei conselhos com ' + ap + ' no título.' };
  return {
    vars: { cs, n: plural(mine.length, 'conselho', 'conselhos'), nomes: juntar(mine.map((g) => rotuloConselho(g.titulo))) },
    blocos: [lista(mine.map((g) => ({ titulo: rotuloConselho(g.titulo), sub: g.congelado ? 'Congelado' : undefined })), { rotulo: 'Ver meus conselhos', url: c.perfil === 'gestor' ? '/gestor?aba=conselhos' : '/?aba=conselhos' })],
    fonte: await fonteDe(f, 'Board de Conselhos do Monday (conselhos_grupos)', 'situação atual', 'Grupos cujo título traz o apelido do CS entre parênteses.'),
    destino: { rotulo: 'Ir para Meus conselhos', url: c.perfil === 'gestor' ? '/gestor?aba=conselhos' : '/?aba=conselhos' },
  };
};
const head: Manip = async (c, e, f) => ({ vars: { nome: HEAD_CS }, fonte: await fonteDe(f, 'Estrutura da área de CS', 'situação atual', 'Informação fixa do produto.') });
const gestores: Manip = async (c, e, f) => {
  const g = await f.gestores();
  return { vars: { nomes: juntar(g.map((x) => x.nome || x.email.split('@')[0])) }, fonte: await fonteDe(f, 'Tabela gestores', 'situação atual', 'Quem está na lista de gestores tem acesso à visão de gestão.') };
};

// ---- carteira ----
const membrosDoConselho: Manip = async (c, e, f) => {
  const cons = (await f.conselhos()).find((g) => g.groupId === e.conselho!.id);
  if (!cons) return { semDado: 'Não encontrei esse conselho.' };
  const { mes, ano } = mesAno(e, c.hoje);
  if (!(await donoDoConselho(f, c, cons, mes, ano)).meu) return recusa();
  const m = await f.membros(cons.groupId);
  return {
    vars: { conselho: rotuloConselho(cons.titulo), n: plural(m.length, 'membro', 'membros'), nomes: juntar(m.map((x) => x.nome)) },
    blocos: [lista(m.map((x) => ({ titulo: x.nome, sub: x.statusPagamento || undefined })), { rotulo: 'Ver o conselho', url: '/conselho/' + encodeURIComponent(cons.groupId) })],
    fonte: await fonteDe(f, 'Board de Conselhos do Monday (conselhos_membros)', 'situação atual', 'Membros listados no grupo do conselho.'),
    destino: { rotulo: 'Abrir o conselho', url: '/conselho/' + encodeURIComponent(cons.groupId) },
  };
};
const conselhoDoMembro: Manip = async (c, e, f) => {
  const gs = await f.conselhosDoMembro(e.membro!.id);
  if (!gs.length) return { semDado: 'Não encontrei ' + e.membro!.rotulo + ' em nenhum conselho.' };
  const { mes, ano } = mesAno(e, c.hoje);
  const donos = await Promise.all(gs.map((g) => donoDoConselho(f, c, g, mes, ano)));
  const visiveis = gs.filter((_, k) => donos[k].meu);
  if (!visiveis.length) return recusa();
  return {
    vars: { membro: e.membro!.rotulo, conselhos: juntar(visiveis.map((g) => 'o conselho ' + rotuloConselho(g.titulo))) },
    blocos: [lista(visiveis.map((g) => ({ titulo: rotuloConselho(g.titulo), sub: 'CS ' + (csDoTitulo(g.titulo) || 'sem CS no título') })))],
    fonte: await fonteDe(f, 'Board de Conselhos do Monday (conselhos_membros)', 'situação atual', 'Grupos em que o nome do membro consta.'),
    destino: { rotulo: 'Abrir o conselho', url: '/conselho/' + encodeURIComponent(visiveis[0].groupId) },
  };
};
async function conselhosDoAlvo(f: FonteDados, cs: string, hoje: string) {
  const { mes, ano } = mesAno({ ambiguas: [] }, hoje);
  const ap = apelidoDe(await f.roster(mes, ano), cs);
  return (await f.conselhos()).filter((g) => csDoTitulo(g.titulo) === ap);
}
const resumoCS: Manip = async (c, e, f, i) => {
  const cs = alvoCS(c, e, i);
  if (!cs) return { faltando: 'cs' };
  if (!podeVer(c, cs)) return recusa();
  const mine = await conselhosDoAlvo(f, cs, c.hoje);
  const ativos = mine.filter((g) => !g.congelado);
  const n = await f.contagemMembros(ativos.map((g) => g.groupId));
  return {
    vars: { cs, conselhos: plural(ativos.length, 'conselho ativo', 'conselhos ativos') + (mine.length > ativos.length ? ' (mais ' + (mine.length - ativos.length) + ' congelado' + (mine.length - ativos.length > 1 ? 's' : '') + ')' : ''), membros: plural(n, 'membro', 'membros') },
    blocos: [{ tipo: 'numero', rotulo: 'Membros na carteira de ' + cs, valor: numeroBr(n), comparacoes: [{ rotulo: 'Conselhos ativos', valor: numeroBr(ativos.length), tom: 'neutro' }] }],
    fonte: await fonteDe(f, 'Board de Conselhos do Monday (conselhos_grupos e conselhos_membros)', 'situação atual', 'Conselhos com o apelido do CS no título, sem congelados; membros somados de todos os grupos ativos.'),
    destino: { rotulo: 'Ir para Meus conselhos', url: c.perfil === 'gestor' ? '/gestor?aba=conselhos' : '/?aba=conselhos' },
  };
};
const pagantes: Manip = async (c, e, f, i) => {
  let grupos: ConselhoLite[], escopo: string;
  if (e.conselho) {
    const cons = (await f.conselhos()).find((g) => g.groupId === e.conselho!.id);
    if (!cons) return { semDado: 'Não encontrei esse conselho.' };
    const { mes, ano } = mesAno(e, c.hoje);
    if (!(await donoDoConselho(f, c, cons, mes, ano)).meu) return recusa();
    grupos = [cons]; escopo = 'o conselho ' + rotuloConselho(cons.titulo);
  } else {
    const cs = alvoCS(c, e, i);
    if (!cs) return { faltando: 'cs' };
    if (!podeVer(c, cs)) return recusa();
    grupos = (await conselhosDoAlvo(f, cs, c.hoje)).filter((g) => !g.congelado); escopo = 'a carteira de ' + cs;
  }
  const todos = (await Promise.all(grupos.map((g) => f.membros(g.groupId)))).flat();
  const nPag = todos.filter((m) => m.statusPagamento && STATUS_PAGAMENTO_PAGANTE.includes(m.statusPagamento) && m.statusPagamento !== 'Inadimplente').length;
  const nInad = todos.filter((m) => m.statusPagamento === 'Inadimplente').length;
  const nPerm = todos.filter((m) => m.statusPagamento && STATUS_PAGAMENTO_PERMUTA.includes(m.statusPagamento)).length;
  return {
    vars: { escopo, pagantes: plural(nPag, 'pagante', 'pagantes'), permutas: plural(nPerm, 'em permuta', 'em permuta'), inadimplentes: plural(nInad, 'inadimplente', 'inadimplentes') },
    blocos: [{ tipo: 'numero', rotulo: 'Pagantes, ' + escopo, valor: numeroBr(nPag), comparacoes: [{ rotulo: 'Em permuta', valor: numeroBr(nPerm) }, { rotulo: 'Inadimplentes', valor: numeroBr(nInad), tom: nInad ? 'ruim' : 'neutro' }, { rotulo: 'Total de membros', valor: numeroBr(todos.length) }] }],
    fonte: await fonteDe(f, 'Board de Conselhos do Monday (status de pagamento em conselhos_membros)', 'situação atual', 'Pagantes: Pagante Padrão, Pagante com desconto e Parceria Estratégica. Permuta: Clube de Permuta e Permuta de Conselho. Conselheiros e sócios de conselheiros não entram nessas contas.'),
  };
};
const statusConselho: Manip = async (c, e, f) => {
  const cons = (await f.conselhos()).find((g) => g.groupId === e.conselho!.id);
  if (!cons) return { semDado: 'Não encontrei esse conselho.' };
  const { mes, ano } = mesAno(e, c.hoje), periodo = rotuloPeriodo(e, c.hoje);
  const d = await donoDoConselho(f, c, cons, mes, ano);
  if (!d.meu) return recusa();
  if (cons.congelado) return { vars: { conselho: rotuloConselho(cons.titulo), periodo, status: 'congelado' }, fonte: await fonteDe(f, 'Board de Conselhos do Monday', periodo, 'Grupo marcado como congelado.') };
  const r = d.cs ? await f.relatorioCS(d.cs, mes, ano) : null;
  const x = r?.conselhos.find((k) => k.groupId === cons.groupId);
  if (!x) return { semDado: 'Não tenho o status de ' + rotuloConselho(cons.titulo) + ' em ' + periodo + '.' };
  const status = x.status === 'realizado' ? 'realizado, com ' + (x.presente ?? 0) + ' presentes em ' + (x.registros ?? 0) + ' registros' : 'aguardando confirmação';
  return { vars: { conselho: rotuloConselho(cons.titulo), periodo, status }, fonte: await fonteDe(f, 'Presença do mês do board de Conselhos', periodo, 'Realizado quando há presença registrada no mês; presença é presentes sobre registros.'), destino: { rotulo: 'Abrir o conselho', url: '/conselho/' + encodeURIComponent(cons.groupId) } };
};

// ---- agenda ----
const proximoConselho: Manip = async (c, e, f, i) => {
  let grupos: ConselhoLite[], quem: string;
  if (e.conselho) {
    const cons = (await f.conselhos()).find((g) => g.groupId === e.conselho!.id);
    if (!cons) return { semDado: 'Não encontrei esse conselho.' };
    const { mes, ano } = mesAno(e, c.hoje);
    const d = await donoDoConselho(f, c, cons, mes, ano);
    if (!d.meu) return recusa();
    grupos = [cons]; quem = d.cs || 'o conselho';
  } else {
    const cs = alvoCS(c, e, i);
    if (!cs) return { faltando: 'cs' };
    if (!podeVer(c, cs)) return recusa();
    grupos = (await conselhosDoAlvo(f, cs, c.hoje)).filter((g) => !g.congelado); quem = cs;
  }
  const ev = (await f.encontros(grupos.map((g) => g.groupId), c.hoje, somarDias(c.hoje, 120))).filter((x) => x.data.slice(0, 10) >= c.hoje).sort((a, b) => (a.data < b.data ? -1 : 1))[0];
  if (!ev) return { semDado: 'Não encontrei conselho agendado para ' + quem + ' nos próximos 120 dias.' };
  const g = grupos.find((x) => x.groupId === ev.groupId)!;
  return {
    vars: { quem, conselho: rotuloConselho(g.titulo), data: dataLonga(ev.data) },
    blocos: [{ tipo: 'numero', rotulo: 'Próximo conselho de ' + quem, valor: dataLonga(ev.data), comparacoes: [{ rotulo: 'Conselho', valor: rotuloConselho(g.titulo) }] }],
    fonte: await fonteDe(f, 'Board de Agenda de Conselhos do Monday (encontros_conselho)', 'a partir de ' + iso2br(c.hoje), 'Primeiro encontro com data de hoje em diante entre os conselhos ativos.'),
    destino: { rotulo: 'Ir para a Agenda', url: c.perfil === 'gestor' ? '/gestor?aba=conselhos' : '/?aba=agenda' },
  };
};
const agendaSemana: Manip = async (c, e, f, i) => {
  const cs = alvoCS(c, e, i);
  if (!cs) return { faltando: 'cs' };
  if (!podeVer(c, cs)) return recusa();
  const p = e.periodo || periodoPadrao('semana_atual', c.hoje);
  const de = p.tipo === 'semana' ? p.inicio : p.tipo === 'dia' ? p.data : c.hoje, ate = p.tipo === 'semana' ? p.fim : p.tipo === 'dia' ? p.data : somarDias(c.hoje, 30);
  const grupos = (await conselhosDoAlvo(f, cs, c.hoje)).filter((g) => !g.congelado);
  const ev = (await f.encontros(grupos.map((g) => g.groupId), de, ate)).filter((x) => x.data.slice(0, 10) >= de && x.data.slice(0, 10) <= ate).sort((a, b) => (a.data < b.data ? -1 : 1));
  const itens = ev.map((x) => rotuloConselho(grupos.find((g) => g.groupId === x.groupId)!.titulo) + ' em ' + dataLonga(x.data));
  if (!ev.length) return { vars: { quem: cs, periodo: p.rotulo, n: 'nenhum conselho', itens: '' }, texto: cs + ' não tem conselho agendado em ' + p.rotulo + '.', fonte: await fonteDe(f, 'Board de Agenda de Conselhos do Monday (encontros_conselho)', p.rotulo, 'Encontros dos conselhos ativos do CS entre ' + dataBr(de) + ' e ' + dataBr(ate) + '.') };
  return {
    vars: { quem: cs, periodo: p.rotulo, n: plural(ev.length, 'conselho', 'conselhos'), itens: juntar(itens) },
    blocos: [lista(ev.map((x) => ({ titulo: rotuloConselho(grupos.find((g) => g.groupId === x.groupId)!.titulo), sub: dataLonga(x.data) })), { rotulo: 'Ver a agenda', url: c.perfil === 'gestor' ? '/gestor?aba=conselhos' : '/?aba=agenda' })],
    fonte: await fonteDe(f, 'Board de Agenda de Conselhos do Monday (encontros_conselho)', p.rotulo, 'Encontros dos conselhos ativos do CS entre ' + dataBr(de) + ' e ' + dataBr(ate) + '.'),
    destino: { rotulo: 'Ir para a Agenda', url: c.perfil === 'gestor' ? '/gestor?aba=conselhos' : '/?aba=agenda' },
  };
};
const confirmados: Manip = async (c, e, f) => {
  const cons = (await f.conselhos()).find((g) => g.groupId === e.conselho!.id);
  if (!cons) return { semDado: 'Não encontrei esse conselho.' };
  const { mes, ano } = mesAno({ ambiguas: [] }, c.hoje);
  const d = await donoDoConselho(f, c, cons, mes, ano);
  if (!d.meu) return recusa();
  const x = d.cs ? (await f.relatorioCS(d.cs, mes, ano)).conselhos.find((k) => k.groupId === cons.groupId) : null;
  if (!x || x.confirmados === null) return { semDado: 'Não há confirmações registradas para o próximo encontro de ' + rotuloConselho(cons.titulo) + '.' };
  return {
    vars: { conselho: rotuloConselho(cons.titulo), n: plural(x.confirmados, 'confirmado', 'confirmados') + ' de ' + plural(x.membros, 'membro', 'membros') },
    blocos: [{ tipo: 'numero', rotulo: 'Confirmados, ' + rotuloConselho(cons.titulo), valor: numeroBr(x.confirmados), comparacoes: [{ rotulo: 'Membros', valor: numeroBr(x.membros) }] }],
    fonte: await fonteDe(f, 'Confirmações do board de Conselhos e da agenda', 'próximo encontro', 'Confirmados do próximo encontro, sem repetir nomes.'),
    destino: { rotulo: 'Abrir o conselho', url: '/conselho/' + encodeURIComponent(cons.groupId) },
  };
};

// ---- rotinas ----
function segundaSemana(hoje: string): string { return hoje && new Date(hoje + 'T00:00:00Z').getUTCDay() === 1 ? hoje : somarDias(hoje, -((new Date(hoje + 'T00:00:00Z').getUTCDay() + 6) % 7)); }
const reportStatus: Manip = async (c, e, f, i) => {
  const cs = alvoCS(c, e, i);
  if (!cs) return { faltando: 'cs' };
  if (!podeVer(c, cs)) return recusa();
  const p = e.periodo?.tipo === 'semana' ? e.periodo : null;
  const ini = p ? p.inicio : segundaSemana(c.hoje), rotulo = p ? p.rotulo : 'esta semana';
  const r = (await f.reportsDaSemana(ini)).find((x) => x.cs === cs);
  const enviado = !!(r && r.enviadoEm);
  return {
    vars: { quem: cs, periodo: rotulo, estado: enviado ? 'foi enviado em ' + iso2br(r!.enviadoEm!.slice(0, 10)) : 'ainda não foi enviado; o prazo é sexta às 19h' },
    blocos: [{ tipo: 'numero', rotulo: 'Report ' + rotulo, valor: enviado ? 'Enviado' : 'Pendente', comparacoes: [{ rotulo: 'Semana de', valor: dataBr(ini) }], foraDoAlvo: !enviado && c.hoje > somarDias(ini, 4) }],
    fonte: await fonteDe(f, 'Reports semanais (tabela reports_individuais)', 'semana de ' + dataBr(ini), 'Enviado quando há report do CS com a semana de início igual; o prazo é sexta às 19h.'),
    destino: { rotulo: 'Ir para o Report semanal', url: '/?aba=report' },
  };
};
const reportPendentes: Manip = async (c, e, f) => {
  if (!c.isGestor) return recusa();
  const p = e.periodo?.tipo === 'semana' ? e.periodo : null;
  const ini = p ? p.inicio : segundaSemana(c.hoje), rotulo = p ? p.rotulo : 'esta semana';
  const { mes, ano } = mesAno({ ambiguas: [] }, c.hoje);
  const [r, sem] = await Promise.all([f.roster(mes, ano), f.reportsDaSemana(ini)]);
  const enviou = new Set(sem.filter((x) => x.enviadoEm).map((x) => x.cs));
  const pend = r.filter((x) => !enviou.has(x.nome));
  return {
    vars: { periodo: rotulo, itens: pend.length ? plural(pend.length, 'CS sem report', 'CS sem report') + ': ' + juntar(pend.map((x) => x.nome)) : 'todos os ' + r.length + ' CS enviaram o report' },
    blocos: [lista(pend.map((x) => ({ titulo: x.nome, sub: 'Report pendente', foto: fotoCS(x.nome) })), { rotulo: 'Ver a Fila de ação', url: '/gestor?aba=visaoGeral#filaAcao' })],
    fonte: await fonteDe(f, 'Reports semanais (tabela reports_individuais) e roster de CS', 'semana de ' + dataBr(ini), 'CS do roster sem report com a semana de início igual; prazo sexta às 19h.'),
    destino: { rotulo: 'Ir para a Fila de ação', url: '/gestor?aba=visaoGeral#filaAcao' },
  };
};
const pontosMeus: Manip = async (c, e, f, i) => {
  const cs = alvoCS(c, e, i);
  if (!cs) return { faltando: 'cs' };
  if (!podeVer(c, cs)) return recusa();
  const a = await f.advertencias(cs);
  return {
    vars: { quem: cs, ativos: plural(a.ativos, 'ponto', 'pontos'), total: plural(a.total, 'ponto', 'pontos') },
    blocos: [{ tipo: 'numero', rotulo: 'Pontos ativos, ' + cs, valor: numeroBr(a.ativos), comparacoes: [{ rotulo: 'No histórico', valor: numeroBr(a.total) }, ...(a.proximoVencimento ? [{ rotulo: 'Próximo vencimento', valor: iso2br(a.proximoVencimento.slice(0, 10)) }] : [])], foraDoAlvo: a.ativos > 0 }],
    fonte: await fonteDe(f, 'Advertências aplicadas (função pontos_cs)', 'situação atual', 'Pontos ativos: soma dos pontos cuja validade não expirou e que não foram anulados. O histórico inclui os vencidos.'),
    destino: { rotulo: 'Ir para Pontos tomados', url: c.perfil === 'gestor' ? '/gestor/cs/' + encodeURIComponent(cs) : '/?aba=advertencias' },
  };
};
const pontosMotivo: Manip = async (c, e, f, i) => {
  const cs = alvoCS(c, e, i);
  if (!cs) return { faltando: 'cs' };
  if (!podeVer(c, cs)) return recusa();
  const a = await f.advertencias(cs);
  const ativos = a.registros.filter((r) => r.ativa);
  if (!a.registros.length) return { semDado: cs + ' não tem advertências registradas.', fonte: await fonteDe(f, 'Advertências aplicadas', 'histórico', 'Registros de advertencias_aplicadas.') };
  const itens = ativos.slice(0, MAX_LISTA).map((r) => r.pontos + ' pontos em ' + iso2br(r.data.slice(0, 10)) + ', ' + r.tipo.toLowerCase());
  return {
    vars: { quem: cs, itens: ativos.length ? juntar(itens) + (ativos.length > MAX_LISTA ? ' e mais ' + (ativos.length - MAX_LISTA) : '') : 'nenhuma advertência ativa; as anteriores já venceram' },
    blocos: [lista(a.registros.map((r) => ({ titulo: r.tipo + ', ' + r.pontos + ' pontos', sub: iso2br(r.data.slice(0, 10)) + (r.ativa ? ', vale até ' + iso2br(r.validoAte.slice(0, 10)) : ', vencida') + (r.origem === 'sistema' ? ', regra automática' : '') })), { rotulo: 'Ver todos os pontos', url: c.perfil === 'gestor' ? '/gestor/cs/' + encodeURIComponent(cs) : '/?aba=advertencias' })],
    fonte: await fonteDe(f, 'Advertências aplicadas (tabela advertencias_aplicadas)', 'histórico', 'Cada registro mostra o tipo, os pontos, a data e a validade. Report atrasado e relatório do conselho atrasado são aplicados pelo sistema.'),
    destino: { rotulo: 'Ir para Pontos tomados', url: c.perfil === 'gestor' ? '/gestor/cs/' + encodeURIComponent(cs) : '/?aba=advertencias' },
  };
};
const pontosValidade: Manip = async (c, e, f, i) => {
  const cs = alvoCS(c, e, i);
  if (!cs) return { faltando: 'cs' };
  if (!podeVer(c, cs)) return recusa();
  const a = await f.advertencias(cs);
  if (!a.ativos || !a.proximoVencimento) return { semDado: cs + ' não tem pontos ativos para vencer.', fonte: await fonteDe(f, 'Advertências aplicadas (função pontos_cs)', 'situação atual', 'Pontos ativos e próximo vencimento.') };
  return { vars: { quem: cs, data: iso2br(a.proximoVencimento.slice(0, 10)) }, fonte: await fonteDe(f, 'Advertências aplicadas (função pontos_cs)', 'situação atual', 'Próximo vencimento entre os pontos ativos. Pontos automáticos valem até o fim do mês corrente.'), destino: { rotulo: 'Ir para Pontos tomados', url: c.perfil === 'gestor' ? '/gestor/cs/' + encodeURIComponent(cs) : '/?aba=advertencias' } };
};
const relatoriosPendentes: Manip = async (c, e, f, i) => {
  const cs = alvoCS(c, e, i);
  if (!cs && !c.isGestor) return { faltando: 'cs' };
  if (cs && !podeVer(c, cs)) return recusa();
  const todos = await f.encontrosRelatorio(cs);
  const pend = todos.filter((x) => x.estado === 'a_preencher' || x.estado === 'vence_hoje' || x.estado === 'atrasado');
  const quem = cs || 'o time';
  if (!pend.length) return { vars: { quem, itens: 'nenhum relatório pendente' }, fonte: await fonteDe(f, 'Relatórios do conselho (função encontros_pendentes_relatorio)', 'situação atual', 'Encontros que exigem relatório e ainda não foram enviados.'), destino: { rotulo: 'Ir para os relatórios', url: c.perfil === 'gestor' ? '/gestor?aba=conselhos#h-rel-gestor' : '/?aba=report' } };
  const itens = pend.map((x) => x.conselho + ': ' + fraseEstadoRelatorio(x.estado as any, x.diasRestantes).toLowerCase() + ' (prazo ' + iso2br(x.prazo.slice(0, 10)) + ')');
  return {
    vars: { quem, itens: juntar(itens.slice(0, MAX_LISTA)) + (itens.length > MAX_LISTA ? ' e mais ' + (itens.length - MAX_LISTA) : '') },
    blocos: [lista(pend.map((x) => ({ titulo: x.conselho, sub: fraseEstadoRelatorio(x.estado as any, x.diasRestantes) + ', prazo ' + iso2br(x.prazo.slice(0, 10)) })), { rotulo: 'Ver todos os relatórios', url: c.perfil === 'gestor' ? '/gestor?aba=conselhos#h-rel-gestor' : '/?aba=report' })],
    fonte: await fonteDe(f, 'Relatórios do conselho (função encontros_pendentes_relatorio)', 'situação atual', 'O prazo é de 7 dias depois do encontro; fora do prazo gera 5 pontos de advertência.'),
    destino: { rotulo: 'Ir para os relatórios', url: c.perfil === 'gestor' ? '/gestor?aba=conselhos#h-rel-gestor' : '/?aba=report' },
  };
};
const gtdAtrasadas: Manip = async (c, e, f, i) => {
  const cs = alvoCS(c, e, i);
  if (!cs && !c.isGestor) return { faltando: 'cs' };
  if (cs && !podeVer(c, cs)) return recusa();
  const g = (await f.gtd(cs)).filter((x) => !cs || x.cs === cs);
  const atr = g.reduce((s, x) => s + x.atrasadas, 0), av = g.reduce((s, x) => s + x.aVencer, 0);
  return {
    vars: { quem: cs || 'o time', atrasadas: plural(atr, 'etapa atrasada', 'etapas atrasadas'), avencer: plural(av, 'vence', 'vencem') + ' nos próximos 7 dias' },
    blocos: [{ tipo: 'numero', rotulo: 'GTD atrasado, ' + (cs || 'time'), valor: numeroBr(atr), comparacoes: [{ rotulo: 'A vencer em 7 dias', valor: numeroBr(av) }, ...(g[0] && atr ? [{ rotulo: 'Maior atraso', valor: Math.max(...g.map((x) => x.maiorAtrasoDias)) + ' dias', tom: 'ruim' as const }] : [])], foraDoAlvo: atr > 0 }],
    fonte: await fonteDe(f, 'Histórico de desempenho dos conselhos (GTD)', 'ciclos abertos', 'Etapas não feitas cujo prazo (contado da data do conselho) já passou; a vencer são as que vencem em até 7 dias.'),
    destino: { rotulo: 'Ir para o GTD', url: cs && c.perfil === 'gestor' ? '/gestor/cs/' + encodeURIComponent(cs) + '#secGtd' : c.perfil === 'gestor' ? '/gestor?aba=visaoGeral#filaAcao' : '/?aba=conselhos' },
  };
};

// ---- nps, churn, 1:1, saúde, causa ----
const npsValor: Manip = async (c, e, f, i) => {
  const { mes, ano } = mesAno(e, c.hoje), periodo = rotuloPeriodo(e, c.hoje);
  const n = await f.nps(mes, ano);
  const cs = e.cs ? e.cs.id : null;
  if (cs || (e.eu && c.csNome)) {
    const alvo = cs || c.csNome!;
    if (!podeVer(c, alvo)) return recusa();
    const ap = apelidoDe(await f.roster(mes, ano), alvo);
    const x = n.porCS.find((k) => k.cs === ap || k.cs === alvo);
    if (!x) return { semDado: 'Não há respostas de NPS atribuídas a ' + alvo + ' em ' + periodo + '.' };
    return {
      vars: { escopo: alvo, periodo, itens: 'nota do CS ' + fmtNps(x.notaCS) + ', conselheiro ' + fmtNps(x.conselheiro) + ', conselho ' + fmtNps(x.conselho) + ', com ' + plural(x.total, 'resposta', 'respostas') },
      blocos: [{ tipo: 'numero', rotulo: 'NPS do CS, ' + alvo, valor: fmtNps(x.notaCS), comparacoes: [{ rotulo: 'Conselheiro', valor: fmtNps(x.conselheiro) }, { rotulo: 'Conselho', valor: fmtNps(x.conselho) }, { rotulo: 'Respostas', valor: numeroBr(x.total) }] }],
      fonte: await fonteDe(f, 'Board NPS Conselhos Estratégicos (nps_conselhos_items)', periodo, 'NPS é a porcentagem de promotores (9 e 10) menos a de detratores (0 a 6). Só entram respostas com conselho confirmado.'),
      destino: { rotulo: 'Ir para o NPS', url: '/gestor?aba=nps' },
    };
  }
  if (!c.isGestor && !(await f.revelarEquipe())) return recusa();
  const g = n.geral;
  return {
    vars: { escopo: 'todos os conselhos', periodo, itens: 'conselheiro ' + fmtNps(g.conselheiro) + ', conselho ' + fmtNps(g.conselho) + ', CS ' + fmtNps(g.notaCS) + ', com ' + plural(g.total, 'resposta', 'respostas') },
    blocos: [{ tipo: 'numero', rotulo: 'NPS geral do conselho', valor: fmtNps(g.conselho), comparacoes: [{ rotulo: 'Conselheiro', valor: fmtNps(g.conselheiro) }, { rotulo: 'CS', valor: fmtNps(g.notaCS) }, { rotulo: 'Respostas', valor: numeroBr(g.total) }] }],
    fonte: await fonteDe(f, 'Board NPS Conselhos Estratégicos (nps_conselhos_items)', periodo, 'NPS é a porcentagem de promotores (9 e 10) menos a de detratores (0 a 6).'),
    destino: { rotulo: 'Ir para o NPS', url: '/gestor?aba=nps' },
  };
};
const fmtNps = (v: number | null) => (v === null || v === undefined ? 'sem dado' : numeroBr(v));
const npsAlertas: Manip = async (c, e, f) => {
  if (!c.isGestor) return recusa();
  const a = await f.alertasNps();
  return {
    vars: { n: plural(a.length, 'alerta', 'alertas'), itens: a.length ? juntar(a.slice(0, MAX_LISTA).map((x) => x.texto)) : 'nenhum alerta aberto' },
    blocos: [lista(a.map((x) => ({ titulo: x.texto })), { rotulo: 'Ver a Fila de ação', url: '/gestor?aba=visaoGeral#filaAcao' })],
    fonte: await fonteDe(f, 'Alertas de NPS (tabela de alertas, visível só a gestor)', 'abertos agora', 'Alerta abre quando a nota de um conselheiro é 6 ou menos, a nota do CS é 6 ou menos, ou o NPS do encontro fica abaixo de 70 ou a média abaixo de 8,5, com pelo menos 5 respostas.'),
    destino: { rotulo: 'Ir para a Fila de ação', url: '/gestor?aba=visaoGeral#filaAcao' },
  };
};
const churnMes: Manip = async (c, e, f, i) => {
  const e2 = { ...e, indicador: { tipo: 'indicador' as const, id: /receita|revenue/.test(c.q) ? 'revenue_churn' : 'churn', rotulo: 'Churn' } };
  const r = await indicadoresValor(c, e2, f, i);
  if (r.vars && !r.vars.quem) r.vars.quem = 'o time';
  return r;
};
const churnRisco: Manip = async (c, e, f) => {
  if (!c.isGestor) return recusa();
  return { vars: {}, texto: 'O risco de churn é calculado na página Churn e reconquista, com as regras da configuração de risco. Não repito a lista aqui para não divergir do cálculo oficial.', fonte: await fonteDe(f, 'Configuração de risco de churn (risco_churn_config)', 'situação atual', 'A página calcula a pontuação de risco de cada membro; esta resposta só aponta para ela.'), destino: { rotulo: 'Ir para Churn e reconquista', url: '/gestor?aba=churn' } };
};
const umAUm: Manip = async (c, e, f, i) => {
  const cs = alvoCS(c, e, i);
  if (!cs) return { faltando: 'cs' };
  if (!podeVer(c, cs)) return recusa();
  const u = await f.umAUm(cs, c.isGestor);
  if (!u.ultimaData) return { semDado: 'Não há 1:1 registrada para ' + cs + '.', destino: { rotulo: 'Ir para a página', url: c.perfil === 'gestor' ? '/gestor/cs/' + encodeURIComponent(cs) : '/' } };
  return {
    vars: { quem: cs, data: iso2br(u.ultimaData.slice(0, 10)), abertos: u.abertos ? plural(u.abertos, 'combinado em aberto', 'combinados em aberto') : 'Nenhum combinado em aberto' },
    blocos: [{ tipo: 'numero', rotulo: 'Combinados em aberto, ' + cs, valor: numeroBr(u.abertos), comparacoes: [{ rotulo: 'Última 1:1', valor: iso2br(u.ultimaData.slice(0, 10)) }], foraDoAlvo: u.abertos > 0 }],
    fonte: await fonteDe(f, 'Registros de 1:1 (um_a_um_registros e um_a_um_itens)', 'histórico', c.isGestor ? 'Gestor vê tudo, inclusive itens privados.' : 'O CS vê só o resumo e os itens compartilhados; notas privadas ficam com o gestor.'),
    destino: { rotulo: 'Ir para a 1:1', url: c.perfil === 'gestor' ? '/gestor/cs/' + encodeURIComponent(cs) : '/' },
  };
};
const saudeSync: Manip = async (c, e, f) => {
  const s = await f.saude();
  const q = c.q;
  const estado = /diferente|bate|divergen/.test(q)
    ? 'Os números do dash vêm dos boards do Monday sincronizados a cada 5 minutos, então podem diferir do Monday até a próxima leitura, e o dash aplica as próprias regras (por exemplo status Realizado em Rounds e Finalizado em Upsell). ' + s.texto
    : s.texto;
  return { vars: { estado }, fonte: await fonteDe(f, 'Log de sincronização (função saude_dados)', 'agora', 'Cada board tem a hora do último sucesso; atrasado e crítico seguem limites por board.'), destino: c.isGestor ? { rotulo: 'Ver a saúde dos dados', url: '/gestor' } : undefined };
};
const causa: Manip = async (c, e, f, i) => {
  const cs = alvoCS(c, e, i);
  if (!cs) return { faltando: 'cs' };
  if (!podeVer(c, cs)) return recusa();
  const chave = e.indicador!.id, { mes, ano } = mesAno(e, c.hoje), prev = mesAnterior({ mes, ano });
  const alvo = cs;
  const [a, b] = await Promise.all([f.relatorioCS(alvo, mes, ano), f.relatorioCS(alvo, prev.mes, prev.ano)]);
  const va = valorIndicador(a, chave), vb = valorIndicador(b, chave);
  if (!va.suportado || va.valor === null || vb.valor === null) return { semDado: 'Não tenho os dois meses de ' + (ROTULO[chave] || chave) + ' para comparar.' };
  const dif = va.valor - vb.valor;
  const partes: string[] = [];
  if (chave === 'health_base') {
    const ca = a.indicadores.criticos?.alcancado, cb = b.indicadores.criticos?.alcancado;
    if (ca !== undefined && cb !== undefined && ca !== null && cb !== null) partes.push('os críticos informados foram de ' + fmt(cb) + ' para ' + fmt(ca));
    const adv = await f.advertencias(alvo);
    partes.push('hoje há ' + plural(adv.ativos, 'ponto de advertência ativo', 'pontos de advertência ativos') + ', que somam ao Health');
  }
  const texto = (ROTULO[chave] || chave) + ' de ' + alvo + ' foi de ' + fmt(vb.valor, va.un) + ' em ' + prev.mes.toLowerCase() + ' para ' + fmt(va.valor, va.un) + ' em ' + mes.toLowerCase() + ' (' + (dif > 0 ? '+' : '') + fmt(dif, va.un) + '). ' +
    (partes.length ? 'Componentes que mudaram: ' + juntar(partes) + '. ' : '') + 'Não especulo a causa: a regra do cálculo é "' + regraDoIndicador(chave) + '" e o diagnóstico da página mostra o detalhe.';
  return {
    texto, vars: { texto },
    blocos: [{ tipo: 'numero', rotulo: ROTULO[chave] || chave, valor: fmt(va.valor, va.un), comparacoes: [{ rotulo: 'Mês anterior (' + prev.mes.toLowerCase() + ')', valor: fmt(vb.valor, va.un) }, { rotulo: 'Variação', valor: (dif > 0 ? '+' : '') + fmt(dif, va.un), tom: 'neutro' }] }],
    fonte: await fonteDe(f, 'Relatório do CS nos dois meses', mes.toLowerCase() + ' de ' + ano + ' e ' + prev.mes.toLowerCase() + ' de ' + prev.ano, regraDoIndicador(chave)),
    destino: { rotulo: 'Ir para o diagnóstico', url: c.perfil === 'gestor' ? '/gestor/cs/' + encodeURIComponent(alvo) : '/?aba=indicadores' },
  };
};

// ---- social ----
const social: Manip = async (c, e, f, i) => ({ vars: { nome: c.nome, capacidades: capacidades(c.perfil) }, sugestoes: i.id === 'social.capacidades' || i.id === 'social.ajuda' ? EXEMPLOS[c.perfil] : undefined });

export const MANIPULADORES: Record<string, Manip> = {
  'time.roster': roster, 'time.cs_do_conselho': csDoConselho, 'time.conselhos_do_cs': conselhosDoCS, 'time.head': head, 'time.gestores': gestores,
  'carteira.membros_do_conselho': membrosDoConselho, 'carteira.conselho_do_membro': conselhoDoMembro, 'carteira.resumo_cs': resumoCS, 'carteira.pagantes': pagantes, 'carteira.status_conselho': statusConselho,
  'agenda.proximo_conselho': proximoConselho, 'agenda.semana': agendaSemana, 'agenda.confirmados': confirmados,
  'indicadores.valor': indicadoresValor, 'indicadores.metas_fora': metasFora, 'indicadores.ranking': ranking,
  'report.status': reportStatus, 'report.pendentes': reportPendentes, 'pontos.meus': pontosMeus, 'pontos.motivo': pontosMotivo, 'pontos.validade': pontosValidade,
  'relatorio.pendentes': relatoriosPendentes, 'gtd.atrasadas': gtdAtrasadas,
  'nps.valor': npsValor, 'nps.alertas': npsAlertas, 'churn.mes': churnMes, 'churn.risco': churnRisco, 'um_a_um.ultima': umAUm, 'saude.sync': saudeSync, 'causa.mudanca': causa,
  social,
};
export { MESES_ORDEM };
