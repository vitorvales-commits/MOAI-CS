// Roda o conjunto cego do Vitorio (tests/fixtures/vitorio-cego-b1.json) contra o pipeline, usando o retrato
// do banco em tests/fixtures/vitorio-snapshot-b1.txt. Só relata: não falha por divergência.
// Uso: npx --no-install tsx scripts/vitorio-cego.ts
import { readFileSync } from 'node:fs';
import { responderTexto, type DadosPipeline } from '../lib/vitorio/pipeline.ts';

const base = new URL('../tests/fixtures/', import.meta.url);
const linhas = readFileSync(new URL('vitorio-snapshot-b1.txt', base), 'utf8').split('\n').filter(Boolean);
const cego: any[] = JSON.parse(readFileSync(new URL('vitorio-cego-b1.json', base), 'utf8'));

const conselhosLista: { group_id: string; titulo: string }[] = [];
const vigencias: DadosPipeline['vigencias'] = [];
const cs: { id: number; nome_curto: string; ativo: boolean }[] = [];
const apelidos: { texto: string; cs_id: number }[] = [];
const periodos: DadosPipeline['periodos'] = [];
for (const l of linhas) {
  const p = l.split(';;');
  if (p[0] === 'g') conselhosLista.push({ group_id: p[1], titulo: p[2] });
  else if (p[0] === 'v') vigencias.push({ group_id: p[1], cs_id: Number(p[2]), inicio: p[3] === '-infinity' ? '-infinity' : p[3], fim: p[4] || null });
  else if (p[0] === 'c') cs.push({ id: Number(p[1]), nome_curto: p[2], ativo: p[3] === 'true' });
  else if (p[0] === 'a') apelidos.push({ texto: p[1], cs_id: Number(p[3]) });
  else if (p[0] === 'p') periodos.push({ nome_curto: p[1], nome_completo: p[1], primeiro_mes: p[2], ultimo_mes: p[3] || null });
}

const csPorId = Object.fromEntries(cs.map((c) => [c.id, c.nome_curto]));
const tituloDo = (gid: string | null) => conselhosLista.find((c) => c.group_id === gid)?.titulo ?? null;
const dados: DadosPipeline = {
  hojeIso: '2026-11-10',
  periodos,
  ativosHoje: cs.filter((c) => c.ativo).map((c) => c.nome_curto),
  vigencias,
  csPorId,
  conselhos: Object.fromEntries(conselhosLista.map((c) => [c.group_id, c.titulo])),
  conselhosLista,
  csLista: cs.map((c) => ({ id: c.id, nome_curto: c.nome_curto, apelidos: apelidos.filter((a) => a.cs_id === c.id).map((a) => a.texto) })),
};

let intOk = 0, stOk = 0, entOk = 0, entTot = 0;
for (const c of cego) {
  const out = responderTexto(c.pergunta, dados);
  const intencaoOut = out.intencao ?? null;
  const intOkI = intencaoOut === c.intencao;
  const stOkI = out.status === c.status;
  if (intOkI) intOk++;
  if (stOkI) stOk++;
  const notas: string[] = [];
  if (c.conselho !== undefined) {
    entTot++;
    const obtido = tituloDo(out.entidades.conselho);
    if (obtido === c.conselho) entOk++; else notas.push(`conselho: obteve ${JSON.stringify(obtido)}, esperava ${JSON.stringify(c.conselho)}`);
  }
  if (c.data !== undefined) {
    entTot++;
    if (out.entidades.data === c.data) entOk++; else notas.push(`data: obteve ${out.entidades.data}, esperava ${c.data}`);
  }
  if (c.mes !== undefined) {
    entTot++;
    if (out.entidades.mes === c.mes) entOk++; else notas.push(`mes: obteve ${out.entidades.mes}, esperava ${c.mes}`);
  }
  if (c.temRegistro !== undefined && out.status === 'resposta') {
    entTot++;
    const tr = out.resposta.temRegistro;
    if (tr === c.temRegistro) entOk++; else notas.push(`temRegistro: obteve ${tr}, esperava ${c.temRegistro}`);
  }
  if (c.opcoesContem && out.status === 'esclarecimento') {
    entTot++;
    const titulos = out.opcoes.map((o) => o.label).join(' || ');
    const ok = c.opcoesContem.every((n: string) => titulos.includes(n));
    if (ok) entOk++; else notas.push(`opções: ${titulos}`);
  }
  if (c.maxOpcoes !== undefined && out.status === 'esclarecimento') {
    entTot++;
    // O limite de cinco vale para os conselhos; "Nenhum desses" (valor nenhum) fica fora da contagem.
    const conselhosOpc = out.opcoes.filter((o) => o.valor !== 'nenhum').length;
    if (conselhosOpc <= c.maxOpcoes) entOk++; else notas.push(`opções demais: ${conselhosOpc}`);
  }
  const marca = intOkI && stOkI && !notas.length ? 'OK ' : 'XX ';
  console.log(`${marca}${String(c.id).padStart(2)} ${c.pergunta}`);
  console.log(`      obteve: intenção=${intencaoOut} (${out.confianca.toFixed(2)}) status=${out.status}`);
  console.log(`      esperava: intenção=${c.intencao} status=${c.status}`);
  notas.forEach((n) => console.log(`      divergência: ${n}`));
}
console.log(`\nintenção ${intOk}/${cego.length} | status ${stOk}/${cego.length} | entidades ${entOk}/${entTot}`);
