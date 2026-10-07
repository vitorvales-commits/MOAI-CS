// Roda com: node --experimental-strip-types tests/report-semana.test.ts
// Portado da lógica de referência do prompt de 07/10/2026 (seção 6, report semanal).
import assert from 'node:assert/strict';
import { diaSemanaISO, semanaReferenciaReport, atribuiReport, statusReportSemana, semanasRecentes } from '../lib/report-semana.ts';

assert.equal(diaSemanaISO('2026-10-05'), 1, 'segunda');
assert.equal(diaSemanaISO('2026-10-02'), 5, 'sexta');
assert.equal(diaSemanaISO('2026-10-04'), 7, 'domingo');

assert.equal(semanaReferenciaReport('2026-10-07'), '2026-09-28', 'quarta');
assert.equal(semanaReferenciaReport('2026-10-02'), '2026-09-21', 'a própria sexta ainda está no prazo');
assert.equal(semanaReferenciaReport('2026-10-03'), '2026-09-28', 'sábado');
assert.equal(semanaReferenciaReport('2026-10-05'), '2026-09-28', 'segunda');

assert.deepEqual(atribuiReport('2026-10-02'), { semana: '2026-09-28', status: 'em_dia' });
assert.deepEqual(atribuiReport('2026-09-22'), { semana: '2026-09-21', status: 'em_dia' });
assert.deepEqual(atribuiReport('2026-10-03'), { semana: '2026-09-28', status: 'com_atraso' }, 'sábado');
assert.deepEqual(atribuiReport('2026-10-04'), { semana: '2026-09-28', status: 'com_atraso' }, 'domingo');
assert.deepEqual(atribuiReport('2026-10-05'), { semana: '2026-09-28', status: 'com_atraso' }, 'segunda fecha a semana anterior');

const S = '2026-09-28';
assert.equal(statusReportSemana(S, [{ tipo: 'monday', data: '2026-10-05' }]), 'com_atraso', 'Marcos');
assert.equal(statusReportSemana(S, []), 'pendente', 'Mateus');
assert.equal(statusReportSemana(S, [{ tipo: 'monday', data: '2026-10-05' }, { tipo: 'nativo', semana: S, data: '2026-10-01' }]), 'em_dia', 'o nativo vence o Monday');
assert.equal(statusReportSemana(S, [{ tipo: 'monday', data: '2026-10-05' }, { tipo: 'monday', data: '2026-10-01' }]), 'em_dia', 'o primeiro envio vence');
// Vitor: um report na segunda 28/09 (fecha a semana 21/09) e outro em 02/10 (semana 28/09, em dia)
const vitor = [{ tipo: 'monday' as const, data: '2026-09-28' }, { tipo: 'monday' as const, data: '2026-10-02' }];
assert.equal(statusReportSemana(S, vitor), 'em_dia');
assert.equal(statusReportSemana('2026-09-21', vitor), 'com_atraso');
assert.equal(statusReportSemana(S, [{ tipo: 'nativo', semana: S, data: '2026-10-03' }]), 'com_atraso');

assert.deepEqual(semanasRecentes('2026-10-07', 4), ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28']);

console.log('report-semana: testes aprovados');
