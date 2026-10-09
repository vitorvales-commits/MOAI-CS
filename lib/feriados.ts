// Feriados nacionais de 2026 usados no cálculo de dias úteis do ritmo do mês (revisão out/2026, V3).
// Carnaval e Corpo de Deus são ponto facultativo e ficam de fora. Sexta-feira Santa entra porque o
// comércio e a maioria das empresas param. Para atualizar, acrescente as datas em formato AAAA-MM-DD.
export const FERIADOS_NACIONAIS_2026: readonly string[] = [
  '2026-01-01', // Confraternização universal
  '2026-04-03', // Sexta-feira Santa
  '2026-04-21', // Tiradentes
  '2026-05-01', // Dia do trabalho
  '2026-09-07', // Independência
  '2026-10-12', // Nossa Senhora Aparecida
  '2026-11-02', // Finados
  '2026-11-15', // Proclamação da República
  '2026-12-25', // Natal
];
