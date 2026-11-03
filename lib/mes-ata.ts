// Normaliza o campo mes_ata de atas_conselho_extraido, que chega em formatos diferentes conforme a rodada de
// extração: "Marco", "Março", "Março/2026", "Julho/2026 (Guia 12)". Função pura, sem dependências.
const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// mesIdx 0 a 11 (-1 se não for um mês); ano só quando explícito no texto.
export function normalizarMesAta(mesAta: string | null | undefined): { mesIdx: number; ano: number | null } {
  const m = String(mesAta || '').trim().match(/^([^\/\s\d]+)\s*(?:[\/\s-]\s*(\d{4}))?/);
  if (!m) return { mesIdx: -1, ano: null };
  return { mesIdx: MESES.indexOf(semAcento(m[1])), ano: m[2] ? Number(m[2]) : null };
}

// Vale para o mês e ano pedidos? Sem ano explícito não dá para saber a qual ano pertence, então não casa.
export function mesAtaCasa(mesAta: string | null | undefined, mesIdx: number, ano: number): boolean {
  const p = normalizarMesAta(mesAta);
  return p.mesIdx === mesIdx && p.ano === ano;
}
