// Lógica pura do tour do Vitorio (30/10/2026): qual roteiro vale para a página e o que oferecer a quem já viu uma versão.
// O desenho do tour (sobreposição, balão, navegação) está em public/vitorio.js.
import { ROTEIROS, type Passo, type Perfil, type Roteiro } from './roteiros.ts';

// Chave da página para o tour, a partir do caminho e do parâmetro ?aba=. Nulo quando a página não tem tour.
export function chavePagina(perfil: Perfil, pathname: string, aba: string | null): string | null {
  if (pathname === '/processos') return 'processos';
  if (perfil === 'gestor') {
    if (pathname === '/gestor' && (!aba || aba === 'visaoGeral')) return 'area';
    if (pathname.startsWith('/gestor/cs/')) return 'cs-do-gestor';
    return null;
  }
  if (pathname !== '/') return null;
  if (!aba) return 'inicio';
  if (aba === 'agenda' || aba === 'conselhos') return 'conselhos';
  if (aba === 'report' || aba === 'advertencias') return 'acompanhamento';
  return null;
}

export function roteiroDaPagina(perfil: Perfil, pagina: string | null): Roteiro | null {
  return ROTEIROS.find((r) => r.perfil === perfil && r.pagina === pagina) || null;
}

export type Convite = { tipo: 'nenhum' | 'primeiro' | 'mudou'; passos: Passo[] };
// versaoVista: a versão que a pessoa já viu (nulo se nunca viu). Primeira visita: convite normal com todos os passos.
// Versão nova: convite "esta página mudou" só com os passos marcados como novos nela.
export function decidirConvite(roteiro: Roteiro | null, versaoVista: number | null): Convite {
  if (!roteiro) return { tipo: 'nenhum', passos: [] };
  if (versaoVista === null || versaoVista === undefined) return { tipo: 'primeiro', passos: roteiro.passos };
  if (versaoVista >= roteiro.versao) return { tipo: 'nenhum', passos: [] };
  const novos = roteiro.passos.filter((p) => p.novoDesde > versaoVista);
  return novos.length ? { tipo: 'mudou', passos: novos } : { tipo: 'nenhum', passos: [] };
}
