// Notificação de alertas de NPS: agrupamento por encontro, janela de 60 minutos, expirados e o email.
// Roda com: npx tsx tests/notificar-alertas.test.ts
import assert from 'node:assert/strict';
import { montarEmail, separarParaEnvio, janelaVencida, esc, type AlertaParaEnviar } from '../supabase/functions/notificar-alertas/logica.ts';
import { ALERTA_NPS_JANELA_AGRUPAMENTO_MIN } from '../lib/constants.ts';

const base = { group_id: 'g1', mes: 'Setembro 2026', conselho: 'Fast Track | Julio Faccioli (Vitor)', cs_responsavel: 'Vitor', expirado: false, amostra: null, detalhe: null };
const alertas: AlertaParaEnviar[] = [
  { ...base, id: 'a1', criterio: 'detrator', respondente_nome: 'Juliana', valor: 2, referencia: 6, detalhe: { nota: 2, comentario: 'Encontro sem foco <b>' } },
  { ...base, id: 'a2', criterio: 'nps_encontro', respondente_nome: null, valor: 63.6, referencia: 70, amostra: 11 },
  { ...base, id: 'a3', group_id: 'g2', conselho: 'Executivo | Adriana Soares (Mateus)', cs_responsavel: 'Mateus', criterio: 'nota_cs_baixa', respondente_nome: 'Carlos', valor: 6, referencia: 6 },
  { ...base, id: 'a4', expirado: true, criterio: 'detrator', respondente_nome: 'Antigo', valor: 5, referencia: 6 },
];

// janela: 59 minutos ainda espera, 60 envia
assert.equal(ALERTA_NPS_JANELA_AGRUPAMENTO_MIN, 60);
const t0 = new Date('2026-10-22T12:00:00Z');
assert.equal(janelaVencida(t0, new Date('2026-10-22T12:59:00Z'), 60), false);
assert.equal(janelaVencida(t0, new Date('2026-10-22T13:00:00Z'), 60), true);

// um email por encontro; expirado é baixado sem envio
const { enviar, baixar } = separarParaEnvio(alertas);
assert.equal(enviar.size, 2);
assert.deepEqual(baixar, ['a4']);
assert.deepEqual(enviar.get('g1|Setembro 2026')!.map((a) => a.id), ['a1', 'a2']);

// email
const e = montarEmail(enviar.get('g1|Setembro 2026')!, 'https://exemplo.test/');
assert.equal(e.assunto, 'NPS em atenção: Fast Track | Julio Faccioli (Vitor) (Setembro 2026)');
assert.deepEqual(e.ids, ['a1', 'a2']);
assert.ok(e.html.includes('href="https://exemplo.test/conselho/g1"'), 'botão para /conselho/[grupo]');
assert.ok(e.html.includes('Juliana deu nota 2'), 'nome e nota do detrator');
assert.ok(e.html.includes('NPS 63,6 com 11 respostas (mínimo 70)'), 'critério agregado com número e referência');
assert.ok(e.html.includes('CS responsável: <b>Vitor</b>'));
assert.ok(e.html.includes('Encontro sem foco &lt;b&gt;'), 'comentário escapado');
assert.ok(!/\d{3}\.\d{3}\.\d{3}-\d{2}/.test(e.html + e.texto), 'nenhum CPF');
assert.equal(esc('<a href="x">&'), '&lt;a href=&quot;x&quot;&gt;&amp;');

// texto visível do corpo sem travessão e sem hífen (o assunto traz o título do conselho, que vem do Monday)
const visivel = e.html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/Fast Track \| Julio Faccioli \(Vitor\)/g, '');
assert.ok(!/[–—-]/.test(visivel), 'sem travessão nem hífen no corpo: ' + (visivel.match(/.{0,20}[–—-].{0,20}/) || [''])[0]);

console.log('notificar-alertas: todos os testes aprovados');
