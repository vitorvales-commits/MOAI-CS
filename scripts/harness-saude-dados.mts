// Sobe o HTML do gestor com a API simulada para capturar a faixa de saúde dos dados nos estados saudável, atrasado e
// crítico, sem login nem banco. Uso: npx tsx scripts/harness-saude-dados.mts <porta>
// e abra http://localhost:<porta>/?estado=saudavel|atrasado|critico|erro|vazio, com &abrir=1 para o painel aberto.
// Os dados são fictícios e servem só para conferir o desenho.
import http from 'node:http';
import { montarDock, DOCK_SCRIPT, FONTES_LINK } from '../lib/ui/tema.ts';
import { GESTOR_STYLE, GESTOR_HTML, GESTOR_SCRIPT } from '../app/gestor-html.ts';
import { classificarSaude, minutosTexto, type LinhaSaude } from '../lib/saude-dados.ts';

const porta = Number(process.argv[2] || 4598);
const agora = new Date();
const antes = (m: number) => new Date(agora.getTime() - m * 60000).toISOString();
const linha = (board: string, idade: number, falhas = 0, erro: string | null = null): LinhaSaude => ({
  board, ultima_sucesso: antes(idade), ultima_execucao: antes(1), falhas_consecutivas: falhas, ultimo_erro: erro, ultimo_erro_em: erro ? antes(1) : null,
});
const base = [linha('churn', 3), linha('metas', 4), linha('cases', 2), linha('nps_conselhos', 3), linha('granola', 11)];
const cenarios: Record<string, LinhaSaude[]> = {
  saudavel: base,
  atrasado: [...base, linha('agenda', 24, 4, 'Monday API: 504 Gateway Timeout [tentativas: 4]')],
  critico: [...base, linha('agenda', 24, 4, 'Monday API: 504 Gateway Timeout [tentativas: 4]'), linha('alertas_nps', 7 * 24 * 60 - 20, 659, 'Resend HTTP 403')],
  vazio: [],
};

const pagina = (abrir: boolean) => {
  const dock = montarDock('gestor', 'area', {}, { inicial: 'V' });
  return '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + FONTES_LINK +
    '<style>' + GESTOR_STYLE + '</style>' + GESTOR_HTML.replace('<!--DOCK-->', dock) + '<script>' + DOCK_SCRIPT + '</script><script>' + GESTOR_SCRIPT + '</script>' +
    (abrir ? '<script>setTimeout(function(){document.getElementById("saudeFaixa").click()},400)</script>' : '');
};
http.createServer((req, res) => {
  const u = new URL(req.url || '/', 'http://x');
  const json = (o: unknown, s = 200) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  const estado = u.searchParams.get('estado') || (req.headers.referer ? new URL(req.headers.referer).searchParams.get('estado') : null) || 'saudavel';
  if (u.pathname === '/api/gestor/saude-dados') {
    if (estado === 'erro') return json({ error: 'Simulado' }, 500);
    const r = classificarSaude(cenarios[estado] || base, agora);
    return json({ ...r, itens: r.itens.map((i) => ({ ...i, paradoTexto: i.minutosParado === null ? null : minutosTexto(i.minutosParado) })) });
  }
  if (u.pathname.startsWith('/api/')) return json({ error: 'Simulado: sem dados nesta captura.' }, 500);
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(pagina(u.searchParams.get('abrir') === '1'));
}).listen(porta, () => console.log('harness em http://localhost:' + porta));
