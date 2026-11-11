// Título de exibição de um conselho nas respostas do Vitorio, sem o CS responsável entre parênteses.
// O parêntese reflete o CS atual do título no Monday; numa data passada a frase pode se contradizer.
// Remove só o primeiro parêntese; o que vem depois (ex.: "| EXTERNO") é preservado.
// Nas opções de esclarecimento, o título completo continua, porque o parêntese ajuda a distinguir.
export function tituloDeExibicao(titulo: string): string {
  return titulo
    .replace(/\([^()]*\)/, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+\|/g, ' |')
    .trim();
}
