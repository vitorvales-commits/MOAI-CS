// Registro de consultas do Vitorio (vitorio_registrar_consulta_v2), em função pura para teste.
// A rota passa o cliente do Supabase como rpc. Falha de registro nunca atrapalha quem perguntou:
// o retorno vira consultaId null e a tela não mostra "Isso ajudou?".

export interface ErroRpc { code?: string; message: string }
export type Rpc = (nome: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: ErroRpc | null }>

export interface ArgsRegistro {
  perfil: string;
  texto: string;
  resultado: 'resposta' | 'ambigua' | 'nada';
  // group_id escolhido numa pergunta de esclarecimento, para ligar a pergunta ambígua ao conselho escolhido
  escolhido: string | null;
  intencao: string | null;
  entidades: Record<string, unknown>;
  gravarPessoa: boolean;
}

// Monta os argumentos do rpc. Quando há escolha, ela vai em p_chave.
export function argsRegistro(a: ArgsRegistro): Record<string, unknown> {
  return {
    p_perfil: a.perfil,
    p_consulta: a.texto,
    p_resultado: a.resultado,
    p_chave: a.escolhido,
    p_gravar_email: a.gravarPessoa,
    p_intencao: a.intencao,
    p_entidades: a.entidades,
  };
}

// Devolve o uuid da consulta quando o registro deu certo. Erro, inclusive o limite de 30 por hora (54000), devolve null.
export async function registrarConsulta(rpc: Rpc, args: Record<string, unknown>): Promise<{ consultaId: string | null }> {
  try {
    const { data, error } = await rpc('vitorio_registrar_consulta_v2', args);
    if (error) {
      if (error.code !== '54000') console.error('[vitorio] registro', error.message);
      return { consultaId: null };
    }
    return { consultaId: typeof data === 'string' && data ? data : null };
  } catch (e) {
    console.error('[vitorio] registro', e);
    return { consultaId: null };
  }
}
