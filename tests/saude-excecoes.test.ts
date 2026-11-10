// Roda com: npx tsx tests/saude-excecoes.test.ts
// Faixa de saúde (etapas 6 e 7): nomes de CS não reconhecidos e exclusões de dado no dash, classificação pura.
import assert from 'node:assert/strict';
import {
  classificarExcecoesDados, resumoExcecoes, combinarEstadoFaixa, fonteLegivel, haTexto,
  type PendenciaVinculo, type ExclusaoDado, type ResumoSaude,
} from '../lib/saude-dados.ts';
import { ROTULO_ESPELHO } from '../lib/sincronia.ts';

const AGORA = new Date('2026-11-10T12:00:00Z');
const pend = (over: Partial<PendenciaVinculo>): PendenciaVinculo => ({
  texto_original: 'Não sei informar', texto_normalizado: 'nao sei informar', fontes: ['churn_items.quem_e_seu_cs'],
  ocorrencias: 4, sugestao_cs_id: null, sugestao_nome: null, ...over,
});
const excl = (over: Partial<ExclusaoDado>): ExclusaoDado => ({
  id: 1, tabela: 'metas_definidas', rotulo: 'Metas definidas', chave: 'k', resumo: 'Indicador | CS | 10/2026',
  removido_em: '2026-11-10T09:00:00Z', removido_por: 'gestor@x.com', restaurado_em: null, ...over,
});
const rotinasSaudaveis: ResumoSaude = { estado: 'saudavel', texto: 'Dados atualizados há 2 minutos', itens: [] };

// Pendência sem sugestão: "Este é o CS..." (escolha na lista de CS ativos) e "Não é um CS". Texto em plural conforme os registros.
const [v] = classificarExcecoesDados([pend({})], [], AGORA);
assert.equal(v.tipo, 'vinculo');
assert.equal(v.titulo, 'Nome de CS não reconhecido: Não sei informar');
assert.equal(v.texto, '4 registros em Churn (Quem é seu CS) usam esse nome. Ele precisa apontar para um CS ou ser ignorado para entrar nos indicadores.');
assert.deepEqual(v.acoes, [{ tipo: 'escolher_cs', rotulo: 'Este é o CS...' }, { tipo: 'ignorar', rotulo: 'Não é um CS' }]);

// Pendência com sugestão: "Este é o CS" com o id sugerido aparece antes de "Não é um CS".
const [com] = classificarExcecoesDados([pend({ sugestao_cs_id: 7, sugestao_nome: 'Vitor', ocorrencias: 1 })], [], AGORA);
assert.deepEqual(com.acoes, [
  { tipo: 'confirmar_cs', rotulo: 'Este é o CS: Vitor', cs_id: 7 },
  { tipo: 'ignorar', rotulo: 'Não é um CS' },
]);
assert.match(com.texto, /^1 registro em /);

// Exclusão: título com o rótulo, texto com o resumo, quem excluiu e há quanto tempo; ação Restaurar.
const [e] = classificarExcecoesDados([], [excl({})], AGORA);
assert.equal(e.titulo, 'Metas definidas excluído no dash');
assert.equal(e.texto, 'Indicador | CS | 10/2026. Excluído por gestor@x.com há 3 horas.');
assert.deepEqual(e.acoes, [{ tipo: 'restaurar', rotulo: 'Restaurar' }]);
assert.deepEqual(e.ref, { lixeiraId: 1 });

// Exclusão sem resumo usa o rótulo; sem autor, a frase diz que o autor não foi informado.
const [sem] = classificarExcecoesDados([], [excl({ resumo: null, removido_por: null })], AGORA);
assert.equal(sem.texto, 'Metas definidas. Excluído por autor não informado há 3 horas.');

// Ordem: vínculos antes, depois exclusões; entre vínculos, mais ocorrências primeiro.
const ordem = classificarExcecoesDados(
  [pend({ texto_original: 'A', texto_normalizado: 'a', ocorrencias: 1 }), pend({ texto_original: 'B', texto_normalizado: 'b', ocorrencias: 9 })],
  [excl({ id: 5 })], AGORA);
assert.deepEqual(ordem.map((i) => i.id), ['vinculo:b', 'vinculo:a', 'exclusao:5']);

// Sem exceção, nada aparece e a faixa fica neutra.
assert.deepEqual(classificarExcecoesDados([], [], AGORA), []);
assert.deepEqual(resumoExcecoes([]), { quantidade: 0, texto: null });
assert.deepEqual(combinarEstadoFaixa(rotinasSaudaveis, resumoExcecoes([])), { estado: 'saudavel', texto: 'Dados atualizados há 2 minutos' });

// Frase da faixa: exemplo do texto, no singular e combinando os dois tipos.
const soNome = resumoExcecoes(classificarExcecoesDados([pend({})], [], AGORA));
assert.equal(soNome.texto, '1 nome de CS não reconhecido. Ver o que tratar.');
const ambos = resumoExcecoes(classificarExcecoesDados([pend({})], [excl({ id: 2 }), excl({ id: 3 })], AGORA));
assert.equal(ambos.texto, '1 nome de CS não reconhecido e 2 exclusões de dado no dash. Ver o que tratar.');

// Cor: exceção de dados é âmbar; rotina parada (crítico) continua vermelha; rotina atrasada continua âmbar.
const exc = resumoExcecoes(classificarExcecoesDados([pend({})], [], AGORA));
assert.deepEqual(combinarEstadoFaixa(rotinasSaudaveis, exc).estado, 'atrasado');
const critico: ResumoSaude = { estado: 'critico', texto: '1 rotina de dados parada. Abra para ver o que tratar.', itens: [] };
assert.deepEqual(combinarEstadoFaixa(critico, exc).estado, 'critico');
assert.match(combinarEstadoFaixa(critico, exc).texto, /^1 rotina de dados parada\. .*1 nome de CS/);

// Nomes de fonte e a conta de horas da exclusão.
assert.equal(fonteLegivel('churn_items.quem_e_seu_cs'), 'Churn (Quem é seu CS)');
assert.equal(fonteLegivel('reports_individuais.x_y'), 'reports individuais x y');
assert.equal(haTexto('2026-11-10T09:00:00Z', AGORA), 'há 3 horas');
assert.equal(haTexto('2026-11-10T11:59:30Z', AGORA), 'há menos de 1 minuto');

// Rótulo da linha de faltas (ajuste pendente da etapa 5).
assert.equal(ROTULO_ESPELHO['relatorio_conselho_faltas'], 'Relatórios pós conselho');

console.log('saude-excecoes: ok');
