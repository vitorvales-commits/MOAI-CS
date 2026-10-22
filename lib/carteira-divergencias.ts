// Alertas de carteira do Controle de perfis (22/10/2026). Puro: sem banco.
// A carteira de um CS é definida pelo título do grupo no Monday ("Nível | Conselheiro (CS)"). Duas leituras
// divergentes viram alerta, para a próxima sucessão de CS ser detectada pela própria plataforma:
//  1. cadastro do conselheiro diverge da carteira: o CS do board Conselheiros é outro que o do título;
//  2. grupo cuja CS no título está inativa ou não cadastrada em cs_config.
import { chaveAgenda, acharChaveTolerante, normalizarApelidos, chavesDoContato } from './agenda-nomes.ts';
import { APELIDOS_AGENDA } from './constants.ts';

export interface GrupoCarteira { group_id: string; titulo: string | null; is_repo?: boolean | null; congelado?: boolean | null }
export interface ConselheiroCadastro { nome: string; cs_responsavel: string | null }
export interface CsCadastro { nome: string; nome_completo: string | null; apelido_conselho: string | null; ativo: boolean }

export interface DivergenciaCadastro { grupoId: string; conselheiro: string; csNoTitulo: string; csNoCadastro: string }
export interface GrupoSemCS { grupoId: string; titulo: string; csNoTitulo: string; motivo: 'inativo' | 'nao_cadastrado' }

const semAcento = (s: string | null | undefined) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

function parseTitulo(titulo: string | null): { contato: string; cs: string } | null {
  const m = /^(.*?)\s*\|\s*([^|()]*?)\s*\(([^)]*)\)/.exec(String(titulo || '').replace(/\[?congelado\]?/i, ''));
  return m && m[2].trim() ? { contato: m[2].trim(), cs: m[3].trim() } : null;
}

export function divergenciasDeCarteira(grupos: GrupoCarteira[], conselheiros: ConselheiroCadastro[], cs: CsCadastro[]) {
  // CS pelo apelido do título e pelo nome completo do cadastro do conselheiro.
  const porApelido = new Map<string, CsCadastro>();
  const porCompleto = new Map<string, CsCadastro>();
  cs.forEach((c) => {
    if (c.apelido_conselho) porApelido.set(semAcento(c.apelido_conselho), c);
    if (c.nome_completo) porCompleto.set(semAcento(c.nome_completo), c);
    porApelido.set(semAcento(c.nome), porApelido.get(semAcento(c.nome)) || c);
  });
  const resolverCadastro = (texto: string | null) => {
    const k = semAcento(texto);
    return porCompleto.get(k) || porApelido.get(k) || null;
  };

  const ativos = grupos.filter((g) => !g.is_repo && !String(g.titulo || '').startsWith('Reposições') && parseTitulo(g.titulo));
  const apelidos = normalizarApelidos(APELIDOS_AGENDA);
  const donoDaChave = new Map<string, GrupoCarteira>();
  ativos.forEach((g) => chavesDoContato(parseTitulo(g.titulo)!.contato, apelidos).forEach((k) => { if (!donoDaChave.has(k)) donoDaChave.set(k, g); }));

  const semCS: GrupoSemCS[] = [];
  ativos.forEach((g) => {
    const t = parseTitulo(g.titulo)!;
    const achado = porApelido.get(semAcento(t.cs));
    if (!achado) semCS.push({ grupoId: g.group_id, titulo: String(g.titulo), csNoTitulo: t.cs, motivo: 'nao_cadastrado' });
    else if (!achado.ativo) semCS.push({ grupoId: g.group_id, titulo: String(g.titulo), csNoTitulo: t.cs, motivo: 'inativo' });
  });

  const cadastro: DivergenciaCadastro[] = [];
  conselheiros.forEach((c) => {
    const k = chaveAgenda(c.nome);
    const chave = donoDaChave.has(k) ? k : acharChaveTolerante(k, donoDaChave.keys());
    const g = chave ? donoDaChave.get(chave) : null;
    if (!g) return;
    const t = parseTitulo(g.titulo)!;
    const doTitulo = porApelido.get(semAcento(t.cs));
    const doCadastro = resolverCadastro(c.cs_responsavel);
    if (!doTitulo) return; // já aparece em grupos sem CS cadastrada
    if (!doCadastro || doCadastro.nome !== doTitulo.nome) {
      cadastro.push({ grupoId: g.group_id, conselheiro: c.nome, csNoTitulo: t.cs, csNoCadastro: c.cs_responsavel || 'sem CS no cadastro' });
    }
  });
  const ordem = (a: string, b: string) => a.localeCompare(b, 'pt-BR');
  return { cadastro: cadastro.sort((a, b) => ordem(a.conselheiro, b.conselheiro)), semCS: semCS.sort((a, b) => ordem(a.titulo, b.titulo)) };
}
