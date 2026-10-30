// Apoio das rotas /api/vitorio/*: perfil efetivo e leitura do corpus no servidor.
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { VITORIO_VERSAO_CORPUS } from '../constants.ts';
import { extrasOrfas, montarCorpus, type ExtrasPerguntas, type Perfil } from './corpus.ts';

// Perfil que a página montou: o cliente informa em ?perfil=, o servidor só confirma que ele pode ter aquele perfil.
// Gestor pode pedir cs (ao abrir a página do CS); quem não é gestor nunca recebe gestor.
export function perfilPermitido(pedido: string | null, isGestor: boolean, csNome: string | null): Perfil {
  if (pedido === 'gestor') return isGestor ? 'gestor' : 'cs';
  if (pedido === 'cs') return 'cs';
  return isGestor && !csNome ? 'gestor' : 'cs';
}

// Frases extras por chave. Tabela ausente (migração ainda não aplicada) conta como sem extras.
export async function lerExtras(sb: SupabaseClient): Promise<{ extras: ExtrasPerguntas; ultima: string }> {
  const { data, error } = await sb.from('vitorio_perguntas_extras').select('chave, frases, atualizado_em');
  if (error) return { extras: {}, ultima: '' };
  const extras: ExtrasPerguntas = {};
  let ultima = '';
  (data || []).forEach((r: any) => {
    extras[r.chave] = Array.isArray(r.frases) ? r.frases : [];
    if (r.atualizado_em && String(r.atualizado_em) > ultima) ultima = String(r.atualizado_em);
  });
  return { extras, ultima };
}

export async function versaoCorpus(sb: SupabaseClient, perfil: Perfil): Promise<{ versao: string; versaoProcessos: number; atualizadoEm: string | null; extras: ExtrasPerguntas }> {
  const [{ data: doc, error }, ex] = await Promise.all([
    sb.from('processos_documento').select('versao, atualizado_em').eq('id', 1).maybeSingle(),
    lerExtras(sb),
  ]);
  if (error) throw new Error('Erro ao ler processos_documento: ' + error.message);
  const versaoProcessos = doc?.versao || 0;
  const composta = [versaoProcessos, ex.ultima, VITORIO_VERSAO_CORPUS, perfil].join('|');
  return { versao: createHash('sha1').update(composta).digest('hex').slice(0, 16), versaoProcessos, atualizadoEm: doc?.atualizado_em || null, extras: ex.extras };
}

export async function corpusDoPerfil(sb: SupabaseClient, perfil: Perfil, publicadoEm: string | null, extras: ExtrasPerguntas) {
  const { data, error } = await sb.from('processos_documento').select('dados').eq('id', 1).maybeSingle();
  if (error) throw new Error('Erro ao ler processos_documento: ' + error.message);
  return montarCorpus({ dados: Array.isArray(data?.dados) ? data.dados : [], publicadoEm, perfil, extras });
}

// Perguntas extras órfãs, para o gestor reatribuir ou descartar na Fila de ação. Compara com o corpus do gestor (o mais completo).
export async function listarExtrasOrfas(sb: SupabaseClient) {
  const { extras } = await lerExtras(sb);
  if (!Object.keys(extras).length) return [];
  // união dos dois perfis: uma chave só existe para o CS (ou só para o gestor) e não é órfã por isso
  const docs = [...(await corpusDoPerfil(sb, 'gestor', null, {})), ...(await corpusDoPerfil(sb, 'cs', null, {}))];
  return extrasOrfas(extras, docs);
}
