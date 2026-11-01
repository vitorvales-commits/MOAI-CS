// Leitura do título de um grupo ATIVO (normativa de dados, etapa 3, 01/11/2026). Função pura, usada pelo
// sync-monday e espelhada em SQL por canonico.apelido_do_titulo (migração 20261030e). Um teste de
// equivalência confere as duas para todos os títulos de conselhos_grupos.
//
// Padrão: "Produto | Nome (Apelido)", com texto extra depois do segundo bloco (ex.: "C-Level | Gallo (Vitor)
// | Mapear Executivos bons, upsell."). O apelido é o parêntese no fim do segundo bloco, e o marcador de
// congelado é removido antes da leitura.

export function parseGrupoAtivo(titulo: string): { produto: string; nome: string; apelido: string | null } | null {
  const partes = titulo.replace(/\[?congelado\]?/i, '').split('|');
  if (partes.length < 2) return null;
  const produto = partes[0].trim();
  const bloco = partes[1].trim();
  const nome = bloco.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (!nome) return null;
  const casado = bloco.match(/\(([^)]*)\)\s*$/);
  const apelido = casado ? casado[1].trim() || null : null;
  return { produto, nome, apelido };
}
