// Roda com: npx tsx tests/parse-grupo-equivalencia.test.ts
// Equivalência entre parseGrupoAtivo (TypeScript, sync-monday) e canonico.apelido_do_titulo (SQL, migração
// 20261030e). Os pares abaixo foram lidos do banco em 01/11/2026, para os 67 títulos de conselhos_grupos.
// Se a regra mudar em um dos dois lados, este teste precisa falhar.
import assert from 'node:assert/strict';
import { parseGrupoAtivo } from '../supabase/functions/sync-monday/parse-grupo.ts';

const banco: [titulo: string, apelido: string | null][] = [
  ['[CONGELADO] Executivo | Digo Melo (Ale)', 'Ale'],
  ['C-Level | Alan (George)', 'George'],
  ['C-Level | Carol Borges (Vitor)', 'Vitor'],
  ['C-Level | Eraldo Queiroz (Vitor)', 'Vitor'],
  ['C-Level | Gallo (Vitor)', 'Vitor'],
  ['C-Level | Gui Figueiredo (George)', 'George'],
  ['C-Level | Herick (Vilker)', 'Vilker'],
  ['C-Level | JP (Rodrigo)', 'Rodrigo'],
  ['C-Level | Zago (Vilker)', 'Vilker'],
  ['C-Level+ | Luis Gustavo (Luana)', 'Luana'],
  ['C-Level+ | Renato Santos (Vilker)', 'Vilker'],
  ['CONGELADO C-Level | Lucas Marques (Vilker)', 'Vilker'],
  ['Executivo | Adriana Soares (Mateus)', 'Mateus'],
  ['Executivo | André Soares (Rodrigo)', 'Rodrigo'],
  ['Executivo | Carlos Júnior (Iasmin)', 'Iasmin'],
  ['Executivo | Daniel Brayer (George)', 'George'],
  ['Executivo | Eduardo Santinoni (Vilker)', 'Vilker'],
  ['Executivo | Henrique Guimaraes (Vitor)', 'Vitor'],
  ['Executivo | João Vitor (Mateus) | EXTERNO', 'Mateus'],
  ['Executivo | Kadydja (Rodrigo)', 'Rodrigo'],
  ['Executivo | Marcos Cunha (Vilker)', 'Vilker'],
  ['Executivo | Murilo (Amanda)', 'Amanda'],
  ['Executivo | Rafael Gianesini (Mateus)', 'Mateus'],
  ['Executivo | Rodrigo Gianesini (George)', 'George'],
  ['Executivo | Thiago Correa (Amanda)', 'Amanda'],
  ['Fast Track | Bruno Teixeira (Iasmin)', 'Iasmin'],
  ['Fast Track | Caio Vivan (George)', 'George'],
  ['Fast Track | Gustavo Dayahn (Rodrigo)', 'Rodrigo'],
  ['Fast Track | Julio Faccioli (Vitor)', 'Vitor'],
  ['Fast Track | Livia', null],
  ['Fast Track | Rodrigo Félix (Rodrigo)', 'Rodrigo'],
  ['Fast Track | Tati Moura (George)', 'George'],
  ['Novo grupo', null],
  ['Reposição | Rodrigo Félix', null],
  ['Reposições no  Executivo | André Soares', null],
  ['Reposições no  Executivo | Thiago', null],
  ['Reposições no C-Level | Alan', null],
  ['Reposições no C-Level | Carol Borges', null],
  ['Reposições no C-Level | Eraldo Queiroz', null],
  ['Reposições no C-Level | Gallo (Vitor)', 'Vitor'],
  ['Reposições no C-Level | Gui Figueiredo (George)', 'George'],
  ['Reposições no C-Level | Herick', null],
  ['Reposições no C-Level | JP', null],
  ['Reposições no C-Level | Lucas Marques', null],
  ['Reposições no C-Level | Zago', null],
  ['Reposições no C-Level+ | Luis Gustavo', null],
  ['Reposições no C-Level+ | Renato Santos', null],
  ['Reposições no Executivo | Adriana Soares', null],
  ['Reposições no Executivo | Carlos Júnior', null],
  ['Reposições no Executivo | Daniel Brayer', null],
  ['Reposições no Executivo | Eduardo Santinoni', null],
  ['Reposições no Executivo | Henrique Guimarães (Vitor)', 'Vitor'],
  ['Reposições no Executivo | João Vitor', null],
  ['Reposições no Executivo | Kadydja', null],
  ['Reposições no Executivo | Marcos Cunha', null],
  ['Reposições no Executivo | Murilo', null],
  ['Reposições no Executivo | Rafael Gianesini', null],
  ['Reposições no Executivo | Rodrigo Gianesini', null],
  ['Reposições no Fast Track | Bruno Teixeira', null],
  ['Reposições no Fast Track | Caio Vivan', null],
  ['Reposições no Fast Track | Gustavo Dayahn', null],
  ['Reposições no Fast Track | Julio Faccioli (Vitor)', 'Vitor'],
  ['Reposições no Fast Track | Tati Moura', null],
  ['Reposições no Setorial | Pedro Prado (Vitor)', 'Vitor'],
  ['Reposições no Setorial | Tarso', null],
  ['Setorial | Pedro Prado (Vitor)', 'Vitor'],
  ['Setorial | Tarso (Amanda)', 'Amanda'],
];

assert.equal(banco.length, 67, 'o conjunto precisa ter os 67 títulos de conselhos_grupos');

for (const [titulo, apelidoBanco] of banco) {
  const ts = parseGrupoAtivo(titulo);
  const apelidoTs = ts ? ts.apelido : null;
  assert.equal(apelidoTs, apelidoBanco, `título "${titulo}": TypeScript ${apelidoTs} x banco ${apelidoBanco}`);
}

// O nome continua saindo como antes: o bloco sem o apelido. Exemplo de texto extra depois do segundo bloco.
assert.deepEqual(parseGrupoAtivo('C-Level | Gallo (Vitor) | Mapear Executivos bons, upsell.'),
  { produto: 'C-Level', nome: 'Gallo', apelido: 'Vitor' });

console.log('ok: 67 títulos de conselhos_grupos conferidos contra canonico.apelido_do_titulo');
