// Sobe o HTML do gestor com a API simulada, para capturar as telas novas sem login nem banco.
// Uso: npx tsx scripts/harness-telas.mts <porta>   e abra http://localhost:<porta>/?aba=conselhos
// Os dados são fictícios e servem só para conferir o desenho.
import http from 'node:http';
import { montarDock, DOCK_SCRIPT, FONTES_LINK } from '../lib/ui/tema.ts';
import { GESTOR_STYLE, GESTOR_HTML, GESTOR_SCRIPT } from '../app/gestor-html.ts';
import { fraseSituacaoConselhos } from '../lib/conselhos-aba.ts';

const porta = Number(process.argv[2] || 4599);
const card = (i: number, nome: string, nivel: string, cs: string, o: object = {}) => ({
  groupId: 'g' + i, conselheiro: nome, nivel, nivelOrdem: i % 4, csResponsavel: cs, membros: 5 + (i % 3), fotoUrl: null, congelado: false, atencao: false,
  proximaData: new Date(Date.now() + (i + 1) * 864e5).toISOString(), proximaDataEhFutura: true, healthscore: 60 + i * 3,
  atas: { comAta: i % 4, membros: 6, semAta: 6 - (i % 4) }, presenca: { mes: 'Outubro', taxa: 80 - i * 4, mesAnterior: 'Setembro', variacaoPp: i % 2 ? -5 : 4 }, ...o,
});
const cards = [
  card(0, 'Kadydja', 'Executivo', 'Rodrigo'), card(1, 'André Soares', 'Executivo', 'Rodrigo', { atencao: true }), card(2, 'Carlos Júnior', 'Executivo', 'Marcos', { proximaData: null, proximaDataEhFutura: false }),
  card(3, 'Bruno Teixeira', 'Fast Track', 'Marcos'), card(4, 'Tarso Frota', 'Setorial', 'Marcos', { congelado: true }), card(5, 'Adriana Soares', 'Executivo', 'Mateus'),
];
const topo = (nome: string, cs: string, total: number) => ({ nome: 'Executivo | ' + nome + ' (' + cs + ')', groupId: 'g1', cs, total });
const impacto = { totalCases: 12, totalMatchmakings: 20, matchmakingsSemResultado: 3, topConselhos: [topo('Kadydja', 'Rodrigo', 7), topo('André Soares', 'Rodrigo', 5), topo('Adriana Soares', 'Mateus', 3)] };
const conselhos = { situacao: fraseSituacaoConselhos(cards as any), grade: { mesReferencia: 'Outubro', cards }, gradeErro: null, impacto: { historico: impacto, periodo: { ...impacto, totalCases: 4 } }, impactoErro: null };

const cat = [['cases', 'Cases de Sucesso', 'min'], ['matchmakings', 'Matchmakings', 'min'], ['churn', 'Churn', 'max']].map(([chave, rotulo, direcao]) => ({ chave, rotulo, direcao, unidade: 'contagem', fonte: 'calculado', agregacao_time: 'soma', visivel: true }));
const csAtivos = ['Rodrigo', 'Mateus', 'Iasmin'].map((nome) => ({ nome, nome_completo: nome }));
const sug = {
  mes: '2026-11-01', janela: ['2026-07-01', '2026-08-01', '2026-09-01'], validacao: null,
  indicadores: [
    ...cat.slice(0, 3).map((c, i) => ({
      chave: c.chave, rotulo: c.rotulo, direcao: c.direcao, semModelo: null,
      vigente: { time: 10, porCS: { Rodrigo: 4, Mateus: 3, Iasmin: null } }, mediaRealizada: { time: 9, porCS: { Rodrigo: 4.3, Mateus: 2.7, Iasmin: 0 } },
      time: { sugerido: 11 - i, somaIndividuais: 10, explicacao: 'Time gera 0,8 por conselho, carteira total 15. Sugestão 11.' },
      porCS: { Rodrigo: { sugerido: 5, esperado: 4.6, explicacao: 'Time tem 0,8 por conselho. Rodrigo tem 6 conselhos. Esperado 4,8, com 10% de crescimento 5,3. Sugestão 5.' }, Mateus: { sugerido: 3, esperado: 2.9, explicacao: 'Exemplo.' }, Iasmin: { sugerido: 2, esperado: 1.6, explicacao: 'Time gera 0,8 case por conselho. Iasmin tem 3 conselhos, primeiro mês na carteira (60%). Esperado 1,4, com 10% de crescimento 1,6. Sugestão 2.' } },
    })),
    { chave: 'health_base', rotulo: 'Health da Base', direcao: 'max', semModelo: 'Indicador de razão ponderada, definido por política. Mantém o valor atual.', vigente: { time: null, porCS: {} }, mediaRealizada: { time: null, porCS: {} }, time: null, porCS: {} },
  ],
};

const pagina = () => {
  const dock = montarDock('gestor', 'conselhos', {}, { inicial: 'V' });
  return '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + FONTES_LINK +
    '<style>' + GESTOR_STYLE + '</style>' + GESTOR_HTML.replace('<!--DOCK-->', dock) + '<script>' + DOCK_SCRIPT + '</script><script>' + GESTOR_SCRIPT + '</script>' +
    '<script>if(location.hash==="#metas"){abrirAba("metasDestaques");setTimeout(function(){abrirSugestaoMetas_()},700);}</script>';
};
http.createServer((req, res) => {
  const u = new URL(req.url || '/', 'http://x');
  const json = (o: unknown, s = 200) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (u.pathname === '/api/conselhos-grade') return json(conselhos);
  if (u.pathname === '/api/gestor/metas/sugestao') return json(sug);
  if (u.pathname === '/api/gestor/metas') return json({ mes: u.searchParams.get('mes'), catalogo: cat, csAtivos, resolvidas: [] });
  if (u.pathname.startsWith('/api/')) return json({ error: 'Simulado: sem dados nesta captura.' }, 500);
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(pagina());
}).listen(porta, () => console.log('harness em http://localhost:' + porta));
