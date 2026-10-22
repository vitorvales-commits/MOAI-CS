// Roda com: npx tsx tests/carteira-divergencias.test.ts
import assert from 'node:assert/strict';
import { divergenciasDeCarteira } from '../lib/carteira-divergencias.ts';

const cs = [
  { nome: 'Rodrigo', nome_completo: 'Rodrigo Queiroz Campos', apelido_conselho: 'Rodrigo', ativo: true },
  { nome: 'Marcos', nome_completo: 'Marcos Vinicius De Oliveira Teixeira', apelido_conselho: 'Marcos', ativo: true },
  { nome: 'Amanda', nome_completo: 'Amanda Silva', apelido_conselho: 'Amanda', ativo: true },
  { nome: 'Lucas', nome_completo: 'Lucas Nicoli', apelido_conselho: 'Lucas', ativo: false },
];
const grupos = [
  { group_id: 'g1', titulo: 'Executivo | Kadydja (Rodrigo)' },
  { group_id: 'g2', titulo: 'Executivo | Thiago Correa (Amanda)' },
  { group_id: 'g3', titulo: 'Executivo | Fulano Antigo (Lucas)' },
  { group_id: 'g4', titulo: 'Executivo | Beltrano (Iasmin)' },
  { group_id: 'g5', titulo: 'Reposições no Executivo | Kadydja', is_repo: true },
];
const conselheiros = [
  { nome: 'Kadydja Albuquerque', cs_responsavel: 'RODRIGO QUEIROZ CAMPOS' }, // consistente, nome longo na agenda
  { nome: 'Thiago Correia', cs_responsavel: 'Marcos Vinicius De Oliveira Teixeira' }, // título diz Amanda, cadastro diz Marcos
];
const r = divergenciasDeCarteira(grupos, conselheiros, cs);
assert.deepEqual(r.cadastro.map((d) => [d.conselheiro, d.csNoTitulo, d.csNoCadastro]), [['Thiago Correia', 'Amanda', 'Marcos Vinicius De Oliveira Teixeira']]);
assert.ok(r.semCS.some((g) => g.grupoId === 'g3' && g.motivo === 'inativo'));
assert.ok(r.semCS.some((g) => g.grupoId === 'g4' && g.motivo === 'nao_cadastrado'));
assert.equal(r.semCS.length, 2);
console.log('carteira-divergencias ok');
