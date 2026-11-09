// Espelho nativo do dash no Monday (normativa de dados, etapa 5, PR B). Funções puras: não acessam banco nem API.
// Testadas em tests/espelho-destino.test.ts. Quem chama fica em index.ts (executarEspelho).

// Destino de uma escrita de espelho, na ordem: vínculo registrado; senão, item achado pela "Chave do dash";
// senão, criar. O vínculo só conta quando o item ainda existe no board certo (quem chama verifica).
// Ao achar mais de um item com a mesma chave, usa o primeiro e informa quantos são duplicatas.
export type DestinoEspelho = {
  tipo: 'vinculo' | 'achado' | 'criar';
  itemId?: string;
  duplicatas: number;
};

export function decidirDestinoEspelho(vinculoValido: string | null, achados: string[]): DestinoEspelho {
  if (vinculoValido) return { tipo: 'vinculo', itemId: vinculoValido, duplicatas: 0 };
  if (achados.length > 0) return { tipo: 'achado', itemId: achados[0], duplicatas: achados.length - 1 };
  return { tipo: 'criar', duplicatas: 0 };
}

// O nome do item só é reescrito quando muda. Nome vazio na linha de origem não apaga o nome do item.
export function precisaRenomear(nomeAtual: string | null, nomeNovo: string | null): boolean {
  if (!nomeNovo) return false;
  return nomeAtual !== nomeNovo;
}

// Vínculo lido existia, mas o item não está mais no board: o vínculo é recriado e isso vai para o resultado.
export function vinculoFoiRecriado(vinculoLido: string | null, vinculoValido: string | null): boolean {
  return vinculoLido !== null && vinculoValido === null;
}
