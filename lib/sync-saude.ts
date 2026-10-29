// Saúde da sincronização (29/10/2026): deriva de sync_log, sem tabela nova. Cada quadro do Monday sincroniza a cada
// 5 minutos; a idade que importa é a do quadro mais atrasado. Granola e alertas não contam: o primeiro registra sucesso
// mesmo sem fonte configurada e o segundo não lê do Monday, então ambos mascarariam uma queda do Monday.
// Roda com: node --experimental-strip-types tests/sync-saude.test.ts
export const SYNC_LIMITE_MINUTOS = 15;
export const SYNC_QUADROS_IGNORADOS = ['granola', 'alertas_nps'];

export type LinhaSync = { board: string; finished_at: string | null };
export type SaudeSync = { ultimoSucesso: string | null; minutos: number | null; atrasado: boolean; quadroMaisAtrasado: string | null; texto: string };

export function textoIdade(minutos: number): string {
  if (minutos < 1) return 'agora há pouco';
  if (minutos < 60) return `há ${minutos} min`;
  const h = Math.floor(minutos / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}

export function resumirSync(linhas: LinhaSync[], agoraMs: number, limite = SYNC_LIMITE_MINUTOS): SaudeSync {
  const ultimoPorQuadro = new Map<string, number>();
  linhas.forEach((l) => {
    const t = l.finished_at ? Date.parse(l.finished_at) : NaN;
    if (!Number.isFinite(t) || SYNC_QUADROS_IGNORADOS.includes(l.board)) return;
    if (t > (ultimoPorQuadro.get(l.board) ?? 0)) ultimoPorQuadro.set(l.board, t);
  });
  if (!ultimoPorQuadro.size) return { ultimoSucesso: null, minutos: null, atrasado: true, quadroMaisAtrasado: null, texto: 'Sem registro de sincronização' };
  const [quadro, t] = [...ultimoPorQuadro.entries()].sort((a, b) => a[1] - b[1])[0];
  const minutos = Math.max(0, Math.floor((agoraMs - t) / 60000));
  return { ultimoSucesso: new Date(t).toISOString(), minutos, atrasado: minutos > limite, quadroMaisAtrasado: quadro, texto: 'Monday ' + textoIdade(minutos) };
}
