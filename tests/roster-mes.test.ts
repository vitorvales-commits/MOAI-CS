// Time do mês (29/10/2026): mês fechado mostra quem era CS naquele mês, mês corrente só os ativos de hoje,
// e as grafias de ex CS casam com os campos de texto dos boards.
import assert from 'node:assert/strict';
import { nomesDoRoster, grafiasDoCS, type LinhaPeriodo } from '../lib/cs-periodos.ts';
import { nomeBateColunaPessoa, parseChurn } from '../lib/reports.ts';

const periodos: LinhaPeriodo[] = [
  { nome_curto: 'Luma', nome_completo: 'Luma Guadanhim', primeiro_mes: '2025-08-01', ultimo_mes: '2026-05-01', aliases: ['Luma Guadanhim', 'Luma'] },
  { nome_curto: 'Lucas', nome_completo: 'Lucas Nicoli', primeiro_mes: '2026-01-01', ultimo_mes: '2026-09-01', aliases: ['Lucas Nicoli'] },
  { nome_curto: 'Vinicius W.', nome_completo: 'Vinicius Walviesse', primeiro_mes: '2025-08-01', ultimo_mes: '2026-05-01', aliases: ['vinicius.souza@mmoai.com.br'] },
  { nome_curto: 'Marcos', nome_completo: 'Marcos Vinicius De Oliveira Teixeira', primeiro_mes: '2026-05-01', ultimo_mes: '2026-10-01' },
  { nome_curto: 'George', nome_completo: 'George Washington', primeiro_mes: '2026-05-01', ultimo_mes: null },
];
const ativosHoje = ['George', 'Iasmin'];
const hoje = '2026-10-29';

// Janeiro: só quem atuava em janeiro, nunca a equipe de hoje.
let r = nomesDoRoster(periodos, '2026-01', hoje, ativosHoje);
assert.equal(r.modo, 'quem_era_cs');
assert.deepEqual(r.nomes, ['Lucas', 'Luma', 'Vinicius W.']);

// Setembro: Marcos e Lucas ainda eram CS e aparecem; Luma, que saiu em maio, não.
r = nomesDoRoster(periodos, '2026-09', hoje, ativosHoje);
assert.deepEqual(r.nomes, ['George', 'Lucas', 'Marcos']);

// Mês corrente: só os ativos hoje. Marcos, que atuou em outubro mas já saiu, não aparece.
r = nomesDoRoster(periodos, '2026-10', hoje, ativosHoje);
assert.equal(r.modo, 'ativos_hoje');
assert.deepEqual(r.nomes, ['George', 'Iasmin']);

// Mês futuro segue a regra do corrente.
assert.equal(nomesDoRoster(periodos, '2026-12', hoje, ativosHoje).modo, 'ativos_hoje');

// Mês sem registro: lista vazia, nunca a equipe de hoje.
assert.deepEqual(nomesDoRoster(periodos, '2025-01', hoje, ativosHoje).nomes, []);

// Grafias: sem repetição, sem acento como critério de igualdade, vazios descartados.
assert.deepEqual(grafiasDoCS('Luma', 'Luma Guadanhim', ['LUMA', 'Luma Guadanhim', '']), ['Luma', 'Luma Guadanhim']);

// Casamento com campos de pessoa: e-mail de conta excluída e nome completo valem para o mesmo ex CS.
const vinicius = grafiasDoCS('Vinicius W.', 'Vinicius Walviesse', ['vinicius.souza@mmoai.com.br']);
assert.equal(nomeBateColunaPessoa('vinicius.souza@mmoai.com.br', vinicius), true);
assert.equal(nomeBateColunaPessoa('Luma Guadanhim, vinicius.souza@mmoai.com.br', vinicius), true);
assert.equal(nomeBateColunaPessoa('Gustavo Lucas', grafiasDoCS('Lucas', 'Lucas Nicoli', [])), false);
// Compatibilidade: uma grafia só continua funcionando como antes.
assert.equal(nomeBateColunaPessoa('Mateus Ries', 'Mateus Ries'), true);

// Churn: o nome curto do board de Churn casa pela lista de grafias.
const linhas = [
  { quem_e_seu_cs: 'Vinicius W.', data: '2026-01-10', data_referencia: '2026-01-10', produto: 'X', eh_comunidade: false },
  { quem_e_seu_cs: 'Luma', data: '2026-01-12', data_referencia: '2026-01-12', produto: 'X', eh_comunidade: false },
];
assert.equal(parseChurn(linhas, vinicius, '2026-01-01', '2026-01-31').churn, 1);
assert.equal(parseChurn(linhas, 'Luma', '2026-01-01', '2026-01-31').churn, 1);

console.log('roster-mes: ok');
