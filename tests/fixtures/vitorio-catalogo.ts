// Cópia do catálogo de indicadores do banco (indicadores_catalogo, lido em 30/10/2026). O teste tests/vitorio-dicionario.test.ts
// compara estas chaves com o dicionário de dados e com o config_home_indicadores.
export const INDICADORES_CAT = [
  { chave: 'cases', rotulo: 'Cases de Sucesso' }, { chave: 'matchmakings', rotulo: 'Matchmakings' }, { chave: 'rounds', rotulo: 'Rounds' }, { chave: 'indicacoes', rotulo: 'Indicações' },
  { chave: 'upsell', rotulo: 'Upsell' }, { chave: 'downsell', rotulo: 'Downsell' }, { chave: 'churn', rotulo: 'Churn' }, { chave: 'revenue_churn', rotulo: 'Revenue Churn' },
  { chave: 'carteira', rotulo: 'Carteira' }, { chave: 'presenca', rotulo: 'Presença nos conselhos' }, { chave: 'suspensoes', rotulo: 'Suspensões' }, { chave: 'critico', rotulo: 'Críticos' },
  { chave: 'health_base', rotulo: 'Health da Base' },
];
export const CONFIG_HOME = ['churn', 'revenue_churn', 'cases', 'matchmakings', 'rounds', 'health_base', 'indicacoes', 'upsell', 'downsell', 'carteira', 'presenca', 'suspensoes', 'critico'];
