// Diagnóstico de um conselho que some da carteira de um CS: compara o conselho suspeito com um de controle em cada
// superfície que o servidor monta. Roda com a chave de serviço (nunca commitada), por exemplo:
//   SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/diagnostico-conselho.mts Rodrigo Outubro 2026 Kadydja "André Soares"
// A URL vem de NEXT_PUBLIC_SUPABASE_URL em .env.local.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { generateCSReport, getDadosBrutos, gruposDaCarteira } from '../lib/reports.ts';
import { carregarReunioes, responderProximasReunioes } from '../lib/consulta/proximas-reunioes.ts';
import { chaveAgenda } from '../lib/agenda-nomes.ts';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!chave) { console.error('Defina SUPABASE_SERVICE_ROLE_KEY.'); process.exit(1); }
const [cs, mes, ano, suspeito, controle] = process.argv.slice(2);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, chave, { auth: { persistSession: false } });

const dados = await getDadosBrutos(sb);
const rel: any = await generateCSReport(sb, cs, mes, Number(ano), dados);
const grupos = gruposDaCarteira(dados, rel.cs.apelidoConselho);
const tem = (nome: string) => (lista: string[]) => lista.some((t) => chaveAgenda(t).includes(chaveAgenda(nome)));
console.log(`CS ${cs}, ${mes}/${ano}: numConselhos (carteira) = ${rel.conselhos.length}`);
for (const nome of [suspeito, controle]) {
  const noTitulo = tem(nome)(grupos.map((g: any) => g.titulo));
  const c = rel.conselhos.find((x: any) => chaveAgenda(x.nome).includes(chaveAgenda(nome)));
  console.log(`\n== ${nome}`);
  console.log('  na carteira pelo título do grupo:', noTitulo);
  console.log('  relatorio.conselhos:', !!c, c ? `próxima data ${c.proximaData} (futura: ${c.proximaDataEhFutura})` : '');
  console.log('  GTD ligado ao conselho:', !!(c && c.gtd), c?.gtd ? `${c.gtd.feitas}/${c.gtd.total}` : '');
}
const { vinculos, agenda } = await carregarReunioes(sb);
console.log('\nConsulta "próximas reuniões" do CS:\n' + responderProximasReunioes(`próximas reuniões do ${cs}`, vinculos, agenda, new Date().toISOString()));
