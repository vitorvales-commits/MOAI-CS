// Resolve os encontros da agenda para group_id (resolverEncontrosAgenda), grava em encontros_conselho e lista os
// conselhos ativos de um mês que ficaram sem encontro resolvido. Roda com a chave de serviço (nunca commitada):
//   npx tsx scripts/sincronizar-encontros.mts [AAAA-MM]      (padrão: mês corrente)
import { clienteScripts } from '../lib/scripts-cliente.mts';
import { getDadosBrutos, sincronizarEncontrosConselho } from '../lib/reports.ts';
import { chaveAgenda } from '../lib/agenda-nomes.ts';

const sb = clienteScripts();
const mes = process.argv[2] || new Date().toISOString().slice(0, 7);
const dados = await getDadosBrutos(sb);
const r = await sincronizarEncontrosConselho(sb, dados);
console.log(`Encontros resolvidos: ${r.resolvidos.length}. Sem grupo: ${r.semGrupo.length}.`);
const doMes = r.semGrupo.filter((x) => x.dataIso.slice(0, 7) === mes);
console.log(`\nSem grupo em ${mes}:`);
console.table(doMes.map((x) => ({ id: x.id, conselheiro: x.conselheiro, data: x.dataIso.slice(0, 10), status: x.status })));

// Conselhos ativos (grupos não repo e não congelados) sem nenhuma data resolvida no mês
const { data: enc } = await sb.from('encontros_conselho').select('group_id, data_iso, status_agenda').gte('data_iso', mes + '-01').lt('data_iso', new Date(new Date(mes + '-01T00:00:00Z').setUTCMonth(new Date(mes + '-01T00:00:00Z').getUTCMonth() + 1)).toISOString().slice(0, 10));
const comData = new Set((enc || []).map((e: any) => e.group_id));
const ativos = dados.conselhosGrupos.filter((g: any) => !g.is_repo && !g.congelado && !g.titulo.startsWith('Reposições'));
const sem = ativos.filter((g: any) => !comData.has(g.group_id));
console.log(`\nConselhos ativos: ${ativos.length}. Com encontro resolvido em ${mes}: ${ativos.length - sem.length}. Sem data: ${sem.length}.`);
console.table(sem.map((g: any) => ({ group_id: g.group_id, titulo: g.titulo, chave: chaveAgenda(g.titulo) })));
