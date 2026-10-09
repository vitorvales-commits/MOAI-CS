// Página do CS na visão do gestor (/gestor/cs/[nome], 07/10/2026). Mesmo padrão vanilla das outras
// páginas: HTML, CSS e JS em strings, sem dependência nova no cliente. Uma única chamada a
// /api/gestor/cs/[nome] traz tudo (cabeçalho, radar, GTD, críticos por produto, Health da Base e
// advertências); cada seção é desenhada à parte e mostra a mensagem real do erro só dela. Esta
// página só desenha: pontuação, posição, radar, GTD e críticos vêm prontos do servidor. A aplicação
// de advertência mora aqui; a escrita passa pelas rotas e funções SECURITY DEFINER de gestor.
import { RADAR_SVG_SCRIPT } from '../lib/radar-svg';
import { GTD_CHECKLIST_STYLE } from '../lib/gtd-checklist';

export const GESTOR_CS_STYLE = `
:root{
  --cinza-fundo:#F5F5F5; --preto-tinta:#1A1A1A; --preto-profundo:#141414; --grafite:#272727;
  --branco:#FFFFFF; --cinza-texto:#5D5D5D; --cinza-apoio:#9F9F9F;
  --cinza-linha:#C6C4C4; --cinza-borda:#D8D5D5; --cinza-superficie:#E9E9E9;
  --vermelho:#C0433D; --dourado:#C89A2E; --verde:#3D8B5F;
}
.cs-page *{box-sizing:border-box;}
.cs-page{margin:0;background:var(--cinza-fundo);color:var(--preto-tinta);font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh;}
.cs-page h1,.cs-page h2,.cs-page h3{font-family:'Bricolage Grotesque',sans-serif;letter-spacing:-0.01em;}
.page{max-width:1040px;margin:0 auto;padding:0 28px 80px;}
@media (max-width:600px){ .page{padding:0 16px 60px;} .hero{padding:26px 18px !important;} }
.topbar{display:flex;align-items:center;justify-content:space-between;padding:22px 0;flex-wrap:wrap;gap:12px;}
.voltar-btn{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--cinza-texto);text-decoration:none;padding:7px 14px 7px 10px;border-radius:999px;border:1px solid var(--cinza-borda);background:var(--branco);}
.voltar-btn:hover{background:var(--cinza-superficie);}
.seletor{display:flex;gap:8px;flex-wrap:wrap;}
.seletor select{font:inherit;font-size:12px;font-weight:600;padding:7px 12px;border-radius:10px;border:1px solid var(--cinza-borda);background:var(--branco);color:var(--preto-tinta);}
.hero{position:relative;border-radius:28px;overflow:hidden;background:linear-gradient(135deg,#141414 0%,#1A1A1A 48%,#272727 100%);padding:36px;color:var(--branco);}
.hero::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 14% -10%, rgba(200,154,46,0.38), transparent 55%),radial-gradient(circle at 100% 110%, rgba(61,139,95,0.28), transparent 55%);pointer-events:none;}
.hero-top{position:relative;z-index:1;display:flex;align-items:center;gap:22px;flex-wrap:wrap;}
.foto-cs{width:112px;height:112px;border-radius:28px;object-fit:cover;background:var(--grafite);flex-shrink:0;}
.foto-cs-fallback{width:112px;height:112px;border-radius:28px;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:46px;color:#fff;flex-shrink:0;}
.hero-eyebrow{font-size:11px;letter-spacing:0.1em;font-weight:600;color:var(--dourado);text-transform:uppercase;}
.hero h1{font-size:30px;font-weight:700;margin:2px 0 4px;}
.hero-sub{font-size:13px;color:#C6C4C4;margin:0;}
.hero-selos{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;}
.selo{font-size:10px;font-weight:800;letter-spacing:0.6px;text-transform:uppercase;padding:4px 10px;border-radius:99px;background:rgba(255,255,255,0.1);color:#E9E9E9;border:1px solid rgba(255,255,255,0.2);}
.selo.ouro{background:var(--dourado);color:var(--preto-tinta);border-color:var(--dourado);}
.selo.alerta{background:#FBEEEC;color:var(--vermelho);border-color:#EBC6C0;}
.stats{position:relative;z-index:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:24px;}
.stat{background:var(--branco);color:var(--preto-tinta);border-radius:18px;padding:16px 18px;}
.stat.alerta{background:#FBEEEC;border:1px solid #EBC6C0;}
.stat-label{font-size:11px;font-weight:700;color:var(--cinza-texto);text-transform:uppercase;letter-spacing:.04em;}
.stat-valor{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:28px;line-height:1.1;margin-top:6px;}
.stat.alerta .stat-valor{color:var(--vermelho);}
.stat-sub{font-size:11.5px;color:var(--cinza-texto);margin-top:4px;line-height:1.4;}
.block{margin-top:34px;}
.block h2{font-size:21px;font-weight:700;margin:0 0 6px;}
.block .sub{font-size:13px;font-weight:400;color:var(--cinza-texto);display:block;margin-top:2px;font-family:'Inter',sans-serif;letter-spacing:0;}
.card{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:22px;padding:22px;margin-top:14px;}
.erro-secao{padding:14px 16px;border-radius:12px;background:#FBEEEC;color:var(--vermelho);border:1px solid #EBC6C0;font-size:13px;line-height:1.5;margin-top:14px;}
.vazio{padding:16px;border-radius:12px;background:var(--cinza-fundo);color:var(--cinza-texto);font-size:13px;line-height:1.5;}
details.composicao{margin-top:16px;background:rgba(255,255,255,0.06);border-radius:14px;padding:12px 16px;position:relative;z-index:1;}
details.composicao summary{cursor:pointer;font-size:12.5px;font-weight:700;color:#E9E9E9;}
.comp-linha{display:grid;grid-template-columns:1.6fr 70px 1.3fr 70px;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.1);font-size:12.5px;color:#E9E9E9;}
.comp-linha:last-child{border-bottom:none;}
.comp-linha .num{text-align:right;}
.comp-nota{margin-top:8px;font-size:11.5px;color:#C6C4C4;line-height:1.5;}
.radar-bloco{display:grid;grid-template-columns:minmax(260px,380px) 1fr;gap:24px;align-items:center;}
@media (max-width:760px){ .radar-bloco{grid-template-columns:1fr;} }
.radar-svg-wrap{display:flex;justify-content:center;}
table.leg{width:100%;border-collapse:collapse;font-size:13px;}
table.leg th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--cinza-texto);text-align:left;padding:6px 8px;border-bottom:1px solid var(--cinza-borda);}
table.leg td{padding:9px 8px;border-bottom:1px solid #EFEDED;}
table.leg td.num,table.leg th.num{text-align:right;}
.tag-sem-meta{display:inline-block;font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:99px;background:var(--cinza-superficie);color:var(--cinza-texto);}
.gtd-geral{display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-bottom:16px;}
.gtd-geral-valor{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:36px;line-height:1;}
.gtd-geral-sub{font-size:12.5px;color:var(--cinza-texto);}
.barra{height:8px;border-radius:99px;background:var(--cinza-superficie);overflow:hidden;}
.barra > i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--dourado),var(--verde));}
.gtd-linha{display:grid;grid-template-columns:1.3fr 1.4fr 70px auto;gap:14px;align-items:center;padding:12px 0;border-bottom:1px solid #EFEDED;font-size:13px;}
.gtd-linha:last-child{border-bottom:none;}
.gtd-linha a{color:var(--preto-tinta);font-weight:700;text-decoration:none;}
.gtd-linha a:hover{text-decoration:underline;}
.gtd-linha .meta{font-size:11.5px;color:var(--cinza-texto);}
@media (max-width:700px){ .gtd-linha{grid-template-columns:1fr 1fr;} }
.atraso{display:inline-block;font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;background:#FBEEEC;color:var(--vermelho);border:1px solid #EBC6C0;}
.nota{font-size:12px;color:var(--cinza-texto);margin-top:12px;line-height:1.5;}
.crit-total{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:12px;}
.crit-total b{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:36px;line-height:1;}
.form-adv{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin:6px 0 16px;}
.form-adv label{display:flex;flex-direction:column;gap:5px;font-size:11.5px;font-weight:700;color:var(--cinza-texto);}
.form-adv select,.form-adv textarea,.edit-obs{font:inherit;font-size:13px;font-weight:400;padding:8px 10px;border-radius:10px;border:1px solid var(--cinza-borda);background:var(--branco);color:var(--preto-tinta);}
.form-adv textarea,.edit-obs{min-height:62px;width:100%;resize:vertical;}
.btn{background:#D4AF37;color:#1A1A1A;border:none;border-radius:10px;padding:9px 16px;font-size:12.5px;font-weight:800;cursor:pointer;font-family:inherit;}
.btn:disabled{opacity:.6;cursor:default;}
.btn.sec{background:var(--cinza-superficie);color:var(--preto-tinta);}
.btn.perigo{background:#FBEEEC;color:var(--vermelho);border:1px solid #EBC6C0;}
.adv-linha{padding:14px 0;border-bottom:1px solid #EFEDED;font-size:13px;}
.adv-linha:last-child{border-bottom:none;}
.adv-topo{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.adv-tipo{font-weight:700;}
.status-adv{font-size:10.5px;font-weight:800;padding:3px 10px;border-radius:99px;}
.status-adv.ativa{background:#FBEEEC;color:var(--vermelho);}
.status-adv.vencida{background:var(--cinza-superficie);color:var(--cinza-texto);}
.adv-meta{font-size:12px;color:var(--cinza-texto);margin-top:4px;line-height:1.5;}
.adv-acoes{margin-left:auto;display:flex;gap:6px;}
.efeito{padding:12px 14px;border-radius:12px;background:var(--cinza-fundo);font-size:13px;line-height:1.5;margin-bottom:14px;}
.msg{font-size:12px;font-weight:600;margin-left:8px;}
.um-topo{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-bottom:12px;}
.btn.sec.ativo{background:var(--preto-tinta);color:var(--branco);}
/* ---------- indicadores do mês (09/10/2026): radar sempre visível e cartões por indicador ---------- */
.ind-resumo{display:flex;align-items:center;gap:18px;flex-wrap:wrap;padding-bottom:18px;margin-bottom:18px;border-bottom:1px solid var(--cinza-superficie);}
.ind-placar{display:flex;align-items:baseline;gap:6px;}
.ind-placar b{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:44px;line-height:1;}
.ind-placar span{font-size:14px;font-weight:700;color:var(--cinza-texto);}
.ind-resumo-txt{flex:1;min-width:220px;font-size:14px;line-height:1.55;}
.ind-resumo-txt .longe{color:var(--vermelho);font-weight:700;}
.ind-aviso{font-size:12px;color:var(--cinza-texto);margin-top:4px;}
.ind-grid{display:grid;grid-template-columns:minmax(280px,400px) 1fr;gap:22px;align-items:center;}
@media (max-width:860px){ .ind-grid{grid-template-columns:1fr;} }
.ind-radar{display:flex;flex-direction:column;align-items:center;gap:8px;}
.ind-radar svg{width:100%;max-width:400px;height:auto;overflow:visible;}
.ind-legenda{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;font-size:11.5px;color:var(--cinza-texto);}
.ind-legenda i{display:inline-block;width:9px;height:9px;border-radius:99px;margin-right:5px;vertical-align:middle;}
.ind-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;}
@media (min-width:861px) and (max-width:1000px){ .ind-grid{grid-template-columns:minmax(240px,320px) 1fr;} }
@media (max-width:1000px){ .ind-cards{grid-template-columns:repeat(2,minmax(0,1fr));} }
@media (max-width:330px){ .ind-cards{grid-template-columns:1fr;} }
@media (max-width:600px){ .ind-card{padding:10px 11px;} .ind-valor b{font-size:22px;} .evo-kpi{flex:1 1 40%;min-width:0;padding:9px 11px;} .evo-kpi-val{font-size:21px;} }
.ind-card{border:1px solid var(--cinza-borda);border-radius:16px;padding:12px 14px;background:var(--branco);display:flex;flex-direction:column;gap:7px;min-width:0;}
.ind-card.critico{border-color:#EBC6C0;background:#FDF6F5;}
.ind-card.atencao{border-color:#EAD9AE;background:#FDFAF2;}
.ind-card.neutro{background:var(--cinza-fundo);}
.ind-card-topo{display:flex;justify-content:space-between;align-items:center;gap:4px 8px;flex-wrap:wrap;}
.ind-nome{font-size:12.5px;font-weight:700;overflow-wrap:anywhere;}
@media (max-width:600px){ .ind-radar text{font-size:12.5px;} }
.ind-pill{font-size:10px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;padding:2px 8px;border-radius:99px;white-space:nowrap;}
.ind-pill.ok{background:#E6F2EB;color:var(--verde);}
.ind-pill.atencao{background:#F7EBCB;color:#8A6D1C;}
.ind-pill.critico{background:#F6DCD8;color:var(--vermelho);}
.ind-pill.neutro{background:var(--cinza-superficie);color:var(--cinza-texto);}
.ind-valor{display:flex;align-items:baseline;gap:6px;}
.ind-valor b{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:26px;line-height:1;}
.ind-valor span{font-size:12px;color:var(--cinza-texto);}
.ind-barra{position:relative;height:8px;border-radius:99px;background:var(--cinza-superficie);}
.ind-barra > i{position:absolute;left:0;top:0;bottom:0;border-radius:99px;}
.ind-barra > em{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--preto-tinta);border-radius:2px;}
.ind-card.ok .ind-barra > i{background:var(--verde);}
.ind-card.atencao .ind-barra > i{background:var(--dourado);}
.ind-card.critico .ind-barra > i{background:var(--vermelho);}
.ind-rodape{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;font-size:11px;color:var(--cinza-texto);min-height:18px;margin-top:2px;}
.ind-hist{flex:1;min-width:0;max-width:150px;}
.ind-hist svg{display:block;width:100%;height:30px;}
.ind-hist-eixo{display:flex;justify-content:space-between;font-size:9.5px;color:var(--cinza-apoio);margin-top:2px;text-transform:uppercase;letter-spacing:.04em;}
.ind-hist-vazio{font-size:11px;color:var(--cinza-apoio);}
.ind-ref{text-align:right;line-height:1.3;}
.ind-ritmo{position:absolute;top:-4px;bottom:-4px;width:3px;margin-left:-1px;background:var(--dourado);border-radius:2px;}
.ind-ritmo-txt{font-size:11px;color:#8A6D1C;font-weight:600;}
.ind-card.ritmo .ind-barra > i{background:var(--verde);}
.ind-card.cedo{background:var(--cinza-fundo);}
.ind-card.cedo .ind-barra > i{background:var(--cinza-apoio);}
.ind-pill.ritmo{background:#E6F2EB;color:var(--verde);}
.ind-pill.cedo{background:var(--cinza-superficie);color:var(--cinza-texto);}
.ind-placar.critico b{color:var(--vermelho);}
.ind-placar.ok b{color:var(--verde);}
.ind-rodape .ind-ref span{white-space:nowrap;}
.ind-rodape .sobe{color:var(--verde);font-weight:700;}
.ind-rodape .cai{color:var(--vermelho);font-weight:700;}
/* ---------- evolução (09/10/2026) ---------- */
.evo-cab{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;margin-bottom:8px;}
.evo-kpis{display:flex;gap:10px;flex-wrap:wrap;}
.evo-kpi{border:1px solid var(--cinza-borda);border-radius:14px;padding:10px 14px;min-width:132px;}
.evo-kpi.parcial{border-style:dashed;}
.evo-kpi-rot{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--cinza-texto);}
.evo-kpi-val{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:24px;line-height:1.1;margin-top:3px;}
.evo-kpi-var{font-size:11.5px;font-weight:700;margin-top:2px;color:var(--cinza-texto);}
.evo-kpi-var.sobe{color:var(--verde);}
.evo-kpi-var.cai{color:var(--vermelho);}
.seg{display:inline-flex;background:var(--cinza-superficie);border-radius:99px;padding:3px;gap:2px;}
.seg button{border:none;background:none;font:inherit;font-size:12px;font-weight:700;color:var(--cinza-texto);padding:6px 12px;border-radius:99px;cursor:pointer;}
.seg button.ativo{background:var(--branco);color:var(--preto-tinta);box-shadow:0 1px 2px rgba(0,0,0,.12);}
.evo-svg{width:100%;height:auto;display:block;}
.evo-eixo{font-size:11px;fill:var(--cinza-texto);}
.evo-valor{font-size:12.5px;font-weight:800;fill:var(--preto-tinta);}
.evo-pos{font-size:10.5px;font-weight:700;fill:var(--cinza-texto);}
.evo-legenda{display:flex;gap:16px;flex-wrap:wrap;font-size:11.5px;color:var(--cinza-texto);margin-top:4px;}
.evo-legenda i{display:inline-block;width:18px;height:0;border-top:2.5px solid var(--preto-tinta);margin-right:6px;vertical-align:middle;}
.evo-legenda i.med{border-top:2px dashed var(--cinza-apoio);}
.evo-legenda i.meta{border-top:2px dashed var(--dourado);}
.evo-legenda i.parc{border-top:2.5px dotted var(--preto-tinta);}
.evo-leitura{margin-top:12px;display:flex;flex-direction:column;gap:8px;}
.evo-leitura p{font-size:13px;line-height:1.55;margin:0;color:var(--cinza-texto);}
.evo-alerta{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border-left:4px solid var(--vermelho);background:#FDF6F5;border-radius:12px;padding:12px 14px;}
.evo-alerta-txt{font-size:13.5px;line-height:1.5;}
.evo-alerta-txt b{color:var(--vermelho);}
.evo-acao{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
.evo-acao button.principal{background:var(--preto-tinta);color:var(--branco);border:none;border-radius:99px;padding:8px 14px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;}
.evo-rodape{display:flex;justify-content:flex-end;margin-top:10px;}
.evo-rodape button{background:none;border:none;padding:0;font:inherit;font-size:11.5px;color:var(--cinza-texto);text-decoration:underline;cursor:pointer;}
.um-colunas{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;}
@media (max-width:820px){ .um-colunas{grid-template-columns:1fr;} }
.um-col h3{font-size:14px;margin:0 0 4px;}
.um-col-sub{font-size:11.5px;color:var(--cinza-texto);margin-bottom:10px;}
.um-item{border:1px solid var(--cinza-borda);border-radius:14px;padding:12px;margin-bottom:10px;background:var(--branco);}
.um-item.vencido{border-color:#EBC6C0;background:#FBEEEC;}
.um-item-texto{font-size:13.5px;line-height:1.5;white-space:pre-wrap;}
.um-item-meta{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px;font-size:11.5px;color:var(--cinza-texto);}
.um-item-acoes{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px;}
.um-item-acoes select{font:inherit;font-size:12px;padding:5px 8px;border-radius:8px;border:1px solid var(--cinza-borda);background:var(--branco);}
.um-prio-alta{color:var(--dourado);font-weight:700;}
.um-vencido{color:var(--vermelho);font-weight:700;}
.um-privado{font-size:10px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;padding:2px 8px;border-radius:99px;background:var(--cinza-superficie);color:var(--cinza-texto);}
.um-link{color:var(--preto-tinta);font-weight:600;}
.um-form{border:1px solid var(--cinza-borda);border-radius:16px;padding:16px;margin-bottom:16px;background:var(--cinza-fundo);}
.um-form label{display:block;font-size:12px;font-weight:700;color:var(--cinza-texto);margin:10px 0 4px;}
.um-form input,.um-form select,.um-form textarea{width:100%;font:inherit;font-size:13px;padding:8px 10px;border-radius:10px;border:1px solid var(--cinza-borda);background:var(--branco);color:var(--preto-tinta);}
.um-form textarea{min-height:70px;resize:vertical;}
.um-form-linha{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;}
@media (max-width:600px){ .um-form-linha{grid-template-columns:1fr;} }
.um-form-acoes{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;}
.um-form-msg{font-size:12px;margin-top:8px;color:var(--cinza-texto);}
.um-granola{white-space:pre-wrap;font-size:12.5px;line-height:1.5;background:var(--branco);border:1px solid var(--cinza-borda);border-radius:12px;padding:12px;max-height:260px;overflow:auto;}
.um-linha{padding:12px 0;border-bottom:1px solid var(--cinza-superficie);}
.um-linha:last-child{border-bottom:none;}
.um-linha-data{font-size:12px;font-weight:700;color:var(--cinza-texto);}
.um-linha-resumo{font-size:13.5px;line-height:1.5;white-space:pre-wrap;margin-top:4px;}
.um-linha-privado{font-size:12.5px;line-height:1.5;white-space:pre-wrap;margin-top:8px;padding:10px;border-radius:10px;background:var(--cinza-fundo);}
.um-acoes-linha{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;}
.um-acoes-linha button,.um-item-acoes button,.um-form-acoes button{background:var(--cinza-superficie);color:var(--preto-tinta);border:none;border-radius:8px;padding:6px 10px;font:inherit;font-size:12px;font-weight:600;cursor:pointer;}
.um-acoes-linha button.perigo,.um-item-acoes button.perigo{background:#FBEEEC;color:var(--vermelho);}
.um-acoes-linha button:disabled{opacity:.6;cursor:default;}
details.um-det{margin-top:14px;}
details.um-det summary{cursor:pointer;font-size:13px;font-weight:700;color:var(--preto-tinta);}
.um-itens-novos{margin:8px 0 0;padding:0;list-style:none;font-size:12.5px;}
.um-itens-novos li{padding:6px 0;border-bottom:1px solid var(--cinza-superficie);}
${GTD_CHECKLIST_STYLE}
`;

export const GESTOR_CS_HTML = `
<div class="cs-page">
<div class="page">
  <header class="topbar">
    <a href="/gestor" class="voltar-btn">&larr; Voltar à visão da área</a>
    <div class="seletor">
      <select id="selMesCS" aria-label="Mês"></select>
      <select id="selAnoCS" aria-label="Ano"><option>2025</option><option>2026</option><option>2027</option></select>
    </div>
  </header>

  <section class="hero" id="heroCS"><div class="vazio" style="background:rgba(255,255,255,0.08);color:#E9E9E9;">Carregando…</div></section>

  <section class="block">
    <h2>Indicadores do mês <span class="sub" id="indSub">Onde o CS está em relação à meta de cada indicador, do mais longe para o mais perto.</span></h2>
    <div class="card" id="secRadar"><div class="vazio">Carregando…</div></div>
  </section>

  <section class="block" id="secEvolucao">
    <h2>Evolução <span class="sub">Pontuação mensal do CS, mediana do time e meta de 100 pontos.</span></h2>
    <div class="card">
      <div class="evo-cab">
        <div class="evo-kpis" id="evoResumo"></div>
        <div class="seg" id="evoJanelas">
          <button type="button" data-evo-janela="3">3 meses</button>
          <button type="button" data-evo-janela="6">6 meses</button>
          <button type="button" data-evo-janela="12">12 meses</button>
        </div>
      </div>
      <div id="evoGrafico"><div class="vazio">Carregando…</div></div>
      <div id="evoLeitura"></div>
      <div id="evoRecalcular"></div>
    </div>
  </section>

  <section class="block" id="secUmAUm">
    <h2>1:1 <span class="sub">Próximos passos e pontos de atenção em aberto, de todas as conversas.</span></h2>
    <div class="card">
      <div class="um-topo"><button class="btn" type="button" data-um="novo">Registrar 1:1</button></div>
      <div id="umForm"></div>
      <div id="umLista"><div class="vazio">Carregando…</div></div>
    </div>
  </section>

  <section class="block">
    <h2>Andamento do GTD <span class="sub">Etapas feitas sobre etapas totais dos ciclos atuais dos conselhos deste CS.</span></h2>
    <div class="card" id="secGtd"><div class="vazio">Carregando…</div></div>
  </section>

  <section class="block">
    <h2>Membros críticos <span class="sub">Percentual no report mais recente, no total e por produto. Os nomes ficam só no report do próprio CS.</span></h2>
    <div class="card" id="secCriticos"><div class="vazio">Carregando…</div></div>
  </section>

  <section class="block">
    <h2>Advertências <span class="sub">Pontos ativos entram no Health da Base do CS. O CS vê o que foi aplicado na aba Pontos tomados.</span></h2>
    <div class="card" id="secAdvertencias"><div class="vazio">Carregando…</div></div>
  </section>
</div>
</div>
`;

// O nome do CS entra por JSON.stringify (nunca por concatenação crua), como nas outras páginas.
// O JS abaixo evita barra invertida e crase para não precisar de escapes dentro da template literal.
export function gestorCSScript(nome: string): string {
  return `
${RADAR_SVG_SCRIPT}
var CS_NOME = ${JSON.stringify(nome).replace(/</g, '\\u003c')};
var LIMIAR_ADVERTENCIA_DESTAQUE = 3;
var MESES_CS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
var DADOS_CS = null;
var advEditandoId = null;
var advExcluindoId = null;

function fetchJSON_(url, opts) {
  opts = opts || {};
  opts.cache = 'no-store';
  return fetch(url, opts).then(function (res) {
    if (res.status === 401) { window.location.href = '/login'; return new Promise(function () {}); }
    return res.json().then(function (data) {
      if (!res.ok) throw new Error((data && data.error) || ('Erro ' + res.status));
      return data;
    });
  });
}
function esc(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}
function dec(d) { return (d / 10).toFixed(1).replace('.', ',') + '%'; }
function dataBR(iso) {
  if (!iso) return 'sem data';
  var p = String(iso).slice(0, 10).split('-');
  return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : iso;
}
function corDoNome(nome) {
  var cores = ['#8A6D1C', '#3D8B5F', '#C0433D', '#2F6F8F', '#6B4E9B', '#B5651D', '#4A7A4A'];
  var h = 0; String(nome || '').split('').forEach(function (ch) { h = (h * 31 + ch.charCodeAt(0)) % 997; });
  return cores[h % cores.length];
}
function erroSecao(msg) { return '<div class="erro-secao">Não foi possível carregar esta seção: ' + esc(msg) + '</div>'; }
function numFmt(v) { return (v === null || v === undefined) ? 'Sem dado' : Number(v).toLocaleString('pt-BR'); }

// ---------- cabeçalho ----------
function renderHeroCS(d) {
  var el = document.getElementById('heroCS');
  if (d.cabecalho.erro) { el.innerHTML = erroSecao(d.cabecalho.erro); return; }
  var c = d.cabecalho.dado;
  var adv = d.advertencias.dado, hb = d.health.dado;
  var pontosAtivos = adv ? adv.pontuacaoAtiva : null;
  var acima = pontosAtivos !== null && pontosAtivos > LIMIAR_ADVERTENCIA_DESTAQUE;
  var foto = c.fotoUrl
    ? '<img class="foto-cs" src="' + esc(c.fotoUrl) + '" alt="Foto de ' + esc(c.nome) + '">'
    : '<div class="foto-cs-fallback" style="background:' + corDoNome(c.nomeCompleto || c.nome) + '">' + esc((c.nome || '?').charAt(0).toUpperCase()) + '</div>';
  var temNota = c.pontuacao !== null && c.pontuacao !== undefined;
  var selos = temNota
    ? '<span class="selo ouro">' + c.posicao + 'º de ' + c.totalRankeados + ' no ranking</span>'
    : '<span class="selo">Sem dados suficientes, fora do ranking</span>';
  if (acima) selos += '<span class="selo alerta">Advertências acima de ' + LIMIAR_ADVERTENCIA_DESTAQUE + ' pontos</span>';
  selos += '<span id="heroUmSelo">' + umSeloHtml() + '</span>';
  var carteira = c.carteira.numConselhos + (c.carteira.numConselhos === 1 ? ' conselho' : ' conselhos');
  var metaCarteira = c.carteira.semMetaPropria ? 'sem meta própria cadastrada' : 'meta de ' + c.carteira.meta;
  var healthTxt = 'Sem apuração', healthSub = '';
  if (hb) {
    if (hb.comPontosDecimos !== null && hb.comPontosDecimos !== undefined) healthTxt = dec(hb.comPontosDecimos);
    if (!hb.semApuracao) healthSub = 'sem os pontos: ' + dec(hb.semPontosDecimos);
  } else if (d.health.erro) { healthTxt = 'Erro'; healthSub = d.health.erro; }

  var linhas = c.detalhamento.map(function (it) {
    var sem = !!it.semMeta;
    return '<div class="comp-linha"><span>' + esc(it.label) + (sem ? ' (sem meta)' : '') + '</span><span class="num">peso ' + it.peso + '</span>'
      + '<span>' + (sem ? numFmt(it.valorAlcancado) + ', sem meta' : numFmt(it.valorAlcancado) + ' de ' + numFmt(it.meta) + ', ' + it.achievementPct + '%' + (it.alemDaMetaPct > 0 ? ', ' + it.alemDaMetaPct + '% além da meta' : '')) + '</span>'
      + '<span class="num">' + (it.semPontos ? 'sem pontos' : (sem || it.pontos === null ? 'fora da média' : it.pontos + ' pts')) + '</span></div>';
  }).join('');

  el.innerHTML = '<div class="hero-top">' + foto + '<div><div class="hero-eyebrow">CS</div><h1>' + esc(c.nome) + '</h1>'
    + '<p class="hero-sub">' + esc(carteira) + ' na carteira, ' + esc(metaCarteira) + '</p><div class="hero-selos">' + selos + '</div></div></div>'
    + '<div class="stats">'
    + '<div class="stat"><div class="stat-label">Pontuação</div><div class="stat-valor">' + (temNota ? c.pontuacao : 'Sem nota') + '</div><div class="stat-sub">'
      + (temNota ? c.elegiveis + ' indicadores com meta' : c.elegiveis + ' de ' + c.minimoIndicadores + ' indicadores com meta') + '</div></div>'
    + '<div class="stat"><div class="stat-label">Posição</div><div class="stat-valor">' + (temNota ? c.posicao + 'º' : 'Fora') + '</div><div class="stat-sub">' + (temNota ? 'entre ' + c.totalRankeados + ' CS ranqueados' : 'sem número no ranking') + '</div></div>'
    + '<div class="stat"><div class="stat-label">Carteira</div><div class="stat-valor">' + c.carteira.numConselhos + '</div><div class="stat-sub">' + esc(metaCarteira) + '</div></div>'
    + '<div class="stat' + (acima ? ' alerta' : '') + '"><div class="stat-label">Pontos de advertência</div><div class="stat-valor">' + (pontosAtivos === null ? 'Erro' : pontosAtivos) + '</div><div class="stat-sub">ativos' + (acima ? ', acima do limite de ' + LIMIAR_ADVERTENCIA_DESTAQUE : '') + '</div></div>'
    + '<div class="stat"><div class="stat-label">Health da Base</div><div class="stat-valor">' + esc(healthTxt) + '</div><div class="stat-sub">' + esc(healthSub) + '</div></div>'
    + '</div>'
    + '<details class="composicao"><summary>Como a pontuação foi composta</summary>' + linhas
    + '<div class="comp-nota">Pontos são o peso vezes o aproveitamento na meta. Indicador sem meta cadastrada fica fora da média e os pesos dos demais são redistribuídos. A carteira não dá pontos, e quem supera a meta passa de 100. A pontuação só existe com pelo menos ' + c.minimoIndicadores + ' indicadores com meta.</div></details>';
}

// ---------- indicadores do mês (09/10/2026) ----------
// Radar sempre visível e um cartão por indicador, ordenado do mais longe da meta para o mais perto.
// Estado: na meta (100 ou mais), abaixo (60 a 99), longe (menos de 60), sem meta. Os números vêm prontos
// do servidor (pct na escala de 0 a 150); aqui só se desenha.
var IND_LIMIAR_LONGE_ = 60;
var IND_ROTULO_ESTADO_ = { ok: 'Na meta', ritmo: 'No ritmo', atencao: 'Abaixo', critico: 'Longe', cedo: 'No prazo', neutro: 'Sem meta' };
var IND_COR_ESTADO_ = { ok: '#3D8B5F', ritmo: '#3D8B5F', atencao: '#C89A2E', critico: '#C0433D', cedo: '#9F9F9F', neutro: '#9F9F9F' };
var MESES_CURTOS_ = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Ritmo do mês em andamento (09/10/2026). Nos indicadores de fluxo com meta mínima, comparar o acumulado
// do dia 8 com a meta do mês inteiro pinta tudo de vermelho. Com o mês aberto, a régua passa a ser o
// esperado até hoje (meta vezes a fração do mês já decorrida). Estoque (carteira), percentual (GTD) e
// metas de limite (churn, downsell) continuam contra a meta cheia.
var IND_FLUXO_RITMO_ = ['casesSucesso', 'matchmakings', 'rounds', 'upsell', 'indicacoes'];
function indFracaoMes_() {
  var sm = document.getElementById('selMesCS'), sa = document.getElementById('selAnoCS');
  if (!sm || !sa) return null;
  var idx = MESES_CS.indexOf(sm.value);
  var hoje = new Date();
  if (idx !== hoje.getMonth() || Number(sa.value) !== hoje.getFullYear()) return null;
  var dias = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  return hoje.getDate() / dias;
}
function indRitmo_(e) {
  var f = indFracaoMes_();
  if (f === null || e.semMeta || e.pct === null || e.pct === undefined || e.pct >= 100) return null;
  if (IND_FLUXO_RITMO_.indexOf(e.chave) === -1 || !e.meta) return null;
  var esperado = e.meta * f;
  return { esperado: esperado, pct: esperado > 0 ? Math.round((Number(e.valor) || 0) / esperado * 100) : 100, cedo: esperado < 1, fracao: f };
}
function indEstado_(e) {
  if (e.semMeta || e.pct === null || e.pct === undefined) return 'neutro';
  if (e.pct >= 100) return 'ok';
  var r = indRitmo_(e);
  if (r) {
    if (r.cedo && !(Number(e.valor) > 0)) return 'cedo';
    if (r.pct >= 100) return 'ritmo';
    return r.pct >= IND_LIMIAR_LONGE_ ? 'atencao' : 'critico';
  }
  if (e.pct >= IND_LIMIAR_LONGE_) return 'atencao';
  return 'critico';
}
function indPill_(e, est) {
  var r = indRitmo_(e);
  if (est === 'neutro') return 'Sem meta';
  if (est === 'cedo') return 'No prazo';
  if (est === 'ritmo') return 'No ritmo';
  if (r) return 'Atrás';
  return e.pct + '%';
}
function decimalBR_(v) { return (Math.round(v * 10) / 10).toLocaleString('pt-BR'); }
function indValorFmt_(v, e) {
  if (v === null || v === undefined) return 'sem dado';
  return Number(v).toLocaleString('pt-BR') + (e.unidade === '%' ? '%' : '');
}
// Série do indicador nos meses da evolução: [{ pct, aberto, rotulo }]
function indSerie_(chave) {
  if (!EVO || !EVO.meses) return [];
  return EVO.meses.map(function (m) {
    var r = m.cs && m.cs.radar ? m.cs.radar.filter(function (x) { return x.chave === chave; })[0] : null;
    return { pct: r && r.pct !== null && r.pct !== undefined ? r.pct : null, valor: r ? r.valor : null, aberto: !!m.aberto, mes: m.mes };
  });
}
function indMesAberto_() {
  return !!(EVO && EVO.meses && EVO.meses.length && EVO.meses[EVO.meses.length - 1].aberto);
}
// Histórico do indicador em colunas (09/10/2026): uma coluna por mês da evolução, altura pelo
// aproveitamento (teto 150), cor pelo estado e o mês em andamento só com contorno. A linha tracejada é a meta.
function indHistorico_(serie) {
  var com = serie.filter(function (p) { return p.pct !== null; });
  if (com.length < 2) return '<span class="ind-hist-vazio">sem histórico</span>';
  var n = serie.length, w = 100, h = 30, gap = 3, bw = (w - gap * (n - 1)) / n, out = '';
  var yMeta = h - 100 / 150 * h;
  serie.forEach(function (p, i) {
    var x = i * (bw + gap);
    var rot = MESES_CURTOS_[(p.mes || 1) - 1] + (p.aberto ? ' (parcial)' : '') + ': ' + (p.pct === null ? 'sem dado' : p.pct + '% da meta');
    if (p.pct === null) { out += '<rect x="' + x.toFixed(1) + '" y="' + (h - 2) + '" width="' + bw.toFixed(1) + '" height="2" rx="1" fill="#E2DFDF"><title>' + esc(rot) + '</title></rect>'; return; }
    var alt = Math.max(2, Math.min(p.pct, 150) / 150 * h);
    var cor = p.pct >= 100 ? '#3D8B5F' : (p.pct >= IND_LIMIAR_LONGE_ ? '#C89A2E' : '#C0433D');
    out += '<rect x="' + x.toFixed(1) + '" y="' + (h - alt).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + alt.toFixed(1) + '" rx="2" '
      + (p.aberto ? 'fill="#fff" stroke="' + cor + '" stroke-width="1.4" stroke-dasharray="2 1.5"' : 'fill="' + cor + '"') + '><title>' + esc(rot) + '</title></rect>';
  });
  out += '<line x1="0" x2="' + w + '" y1="' + yMeta.toFixed(1) + '" y2="' + yMeta.toFixed(1) + '" stroke="#1A1A1A" stroke-width="0.8" stroke-dasharray="2 2" opacity=".5"/>';
  var ini = MESES_CURTOS_[(serie[0].mes || 1) - 1], fim = MESES_CURTOS_[(serie[n - 1].mes || 1) - 1];
  return '<div class="ind-hist"><svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-label="Histórico mensal do indicador">' + out + '</svg>'
    + '<div class="ind-hist-eixo"><span>' + esc(ini) + '</span><span>' + esc(fim) + '</span></div></div>';
}
// Referência do cartão: o mês anterior com dado. Se o mês atual está aberto, mostra só o valor de
// referência (comparar parcial com mês inteiro engana); se está fechado, mostra a variação.
function indReferencia_(serie) {
  if (serie.length < 2) return '';
  var atual = serie[serie.length - 1];
  var ant = null;
  for (var i = serie.length - 2; i >= 0; i--) { if (serie[i].pct !== null) { ant = serie[i]; break; } }
  if (!ant) return '';
  var rot = MESES_CURTOS_[(ant.mes || 1) - 1] + ': ' + ant.pct + '%';
  if (atual.aberto || atual.pct === null) return '<span>' + rot + '</span>';
  var diff = atual.pct - ant.pct;
  if (diff === 0) return '<span>igual a ' + rot + '</span>';
  return '<span class="' + (diff > 0 ? 'sobe' : 'cai') + '">' + (diff > 0 ? '+' : '−') + Math.abs(diff) + ' p.p.</span>';
}

// Radar do CS: anel da meta destacado, vértices pintados pelo estado e rótulo com o percentual.
// Diagrama de rosa (revisão out/2026, rodada 2, Fase 3). Uma pétala por indicador, todas com o mesmo ângulo.
// O raio segue a raiz da proporção (R * sqrt(min(p, 1.5) / 1.5)), então a área da pétala é proporcional ao valor.
// O anel tracejado âmbar marca 100% da meta. Cor pelo estado já calculado; sem meta vira contorno tracejado.
// Churn (menos é melhor) usa p = 1 quando está dentro do limite.
function indRoseSvg_(eixos) {
  var W = 440, H = 340, cx = 220, cy = 170, R = 100, total = eixos.length;
  var passo = 2 * Math.PI / total;
  var meia = passo / 2 * 0.92;
  function pol(r, ang) { var a = ang - Math.PI / 2; return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }; }
  function raio(p) { return R * Math.sqrt(Math.min(p, 1.5) / 1.5); }
  function pontoP(e) {
    if (e.tipoMeta === 'max') { if (e.meta === null || e.meta === undefined || !(e.meta >= 0)) return null; return (Number(e.valor) <= Number(e.meta)) ? 1 : (Number(e.meta) / Number(e.valor)); }
    if (e.pct === null || e.pct === undefined) return null;
    return Math.max(0, e.pct) / 100;
  }
  var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Diagrama de rosa dos indicadores do CS">';
  svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="#E2DFDF" stroke-width="1"/>';
  svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + raio(1) + '" fill="none" stroke="#C89A2E" stroke-width="1.4" stroke-dasharray="5 4"/>';
  svg += '<text x="' + cx + '" y="' + (cy - raio(1) - 4).toFixed(1) + '" text-anchor="middle" font-size="10" fill="#8A6D1C" font-weight="700">meta</text>';
  var petalas = '', rotulos = '';
  eixos.forEach(function (e, i) {
    var ang = i * passo;
    var est = indEstado_(e), cor = IND_COR_ESTADO_[est] || '#9F9F9F';
    var p = pontoP(e);
    var a0 = ang - meia, a1 = ang + meia;
    var lp = pol(R + 24, ang);
    var anchor = 'middle'; if (lp.x > cx + 6) anchor = 'start'; else if (lp.x < cx - 6) anchor = 'end';
    rotulos += '<text x="' + lp.x.toFixed(1) + '" y="' + (lp.y - 4).toFixed(1) + '" font-size="11" font-weight="700" fill="#1A1A1A" text-anchor="' + anchor + '">' + esc(e.label) + '</text>'
      + '<text x="' + lp.x.toFixed(1) + '" y="' + (lp.y + 9).toFixed(1) + '" font-size="10.5" font-weight="700" fill="' + cor + '" text-anchor="' + anchor + '">'
      + (p === null ? 'sem meta' : Math.round(p * 100) + '%') + '</text>';
    if (p === null || est === 'neutro' || est === 'cedo') {
      // Sem meta ou cedo: só o contorno tracejado cinza, sem preenchimento, no raio do valor sem meta (anel inteiro)
      var r0 = (p === null) ? R : raio(p);
      var s = pol(r0, a0), f = pol(r0, a1);
      petalas += '<path d="M ' + cx + ' ' + cy + ' L ' + s.x.toFixed(1) + ' ' + s.y.toFixed(1) + ' A ' + r0.toFixed(1) + ' ' + r0.toFixed(1) + ' 0 0 1 ' + f.x.toFixed(1) + ' ' + f.y.toFixed(1) + ' Z" fill="none" stroke="#9F9F9F" stroke-width="1.2" stroke-dasharray="3 3"/>';
      return;
    }
    var r = raio(p);
    var a = pol(r, a0), b = pol(r, a1);
    petalas += '<path d="M ' + cx + ' ' + cy + ' L ' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' A ' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 0 1 ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1) + ' Z" fill="' + cor + '" fill-opacity="0.78" stroke="' + cor + '" stroke-width="1"/>';
  });
  svg += petalas + rotulos;
  return svg + '</svg>';
}
function indCardHtml_(e) {
  var est = indEstado_(e);
  var r = indRitmo_(e);
  var serie = indSerie_(e.chave);
  var meta = e.semMeta ? 'sem meta cadastrada' : (e.tipoMeta === 'max' ? 'limite ' : 'de ') + indValorFmt_(e.meta, e);
  var largura = est === 'neutro' ? 0 : Math.max(2, Math.min(150, e.pct) / 150 * 100);
  var marcaRitmo = r ? '<b class="ind-ritmo" style="left:' + (r.fracao * 100 / 150 * 100).toFixed(1) + '%" title="esperado até hoje: ' + decimalBR_(r.esperado) + '"></b>' : '';
  var barra = est === 'neutro' ? '' : '<div class="ind-barra" title="' + e.pct + '% da meta do mês"><i style="width:' + largura.toFixed(1) + '%"></i>' + marcaRitmo + '<em style="left:' + (100 / 150 * 100).toFixed(1) + '%"></em></div>';
  var linhaRitmo = r ? '<div class="ind-ritmo-txt">Esperado até hoje: ' + decimalBR_(r.esperado) + '</div>' : '';
  var historico = e.chave === 'cumprimentoGtd' ? '<span class="ind-hist-vazio">sem histórico mensal</span>' : indHistorico_(serie);
  var ref = e.chave === 'cumprimentoGtd' ? '' : indReferencia_(serie);
  return '<div class="ind-card ' + est + '">'
    + '<div class="ind-card-topo"><span class="ind-nome">' + esc(e.label) + '</span><span class="ind-pill ' + est + '">' + indPill_(e, est) + '</span></div>'
    + '<div class="ind-valor"><b>' + indValorFmt_(e.valor, e) + '</b><span>' + esc(meta) + '</span></div>'
    + barra + linhaRitmo
    + '<div class="ind-rodape">' + historico + (ref ? '<div class="ind-ref">' + ref + '</div>' : '') + '</div></div>';
}

function renderRadarCS(d) {
  var el = document.getElementById('secRadar');
  if (d.radar.erro) { el.innerHTML = erroSecao(d.radar.erro); return; }
  var eixos = d.radar.dado;
  var peso = { critico: 0, atencao: 1, cedo: 2, ritmo: 3, ok: 4, neutro: 5 };
  var ordenados = eixos.slice().sort(function (a, b) {
    var ea = indEstado_(a), eb = indEstado_(b);
    if (peso[ea] !== peso[eb]) return peso[ea] - peso[eb];
    return (a.pct || 0) - (b.pct || 0);
  });
  var aberto = indFracaoMes_() !== null;
  var comMeta = eixos.filter(function (e) { return indEstado_(e) !== 'neutro'; });
  var bem = comMeta.filter(function (e) { var s = indEstado_(e); return s === 'ok' || s === 'ritmo' || s === 'cedo'; });
  var longe = ordenados.filter(function (e) { return indEstado_(e) === 'critico'; });
  var frase;
  if (!comMeta.length) frase = 'Nenhum indicador tem meta cadastrada neste mês.';
  else if (!longe.length && bem.length === comMeta.length) frase = aberto ? 'Todos os indicadores com meta estão batidos ou no ritmo esperado para hoje.' : 'Todos os indicadores com meta estão batidos.';
  else if (longe.length) frase = (aberto ? 'Atrás do ritmo: ' : 'Mais longe da meta: ') + longe.slice(0, 3).map(function (e) {
    var r = indRitmo_(e);
    return '<span class="longe">' + esc(e.label) + '</span> (' + indValorFmt_(e.valor, e) + (r ? ', esperado ' + decimalBR_(r.esperado) + ' até hoje' : ' de ' + indValorFmt_(e.meta, e)) + ')';
  }).join(', ') + '. É por aí que a pontuação mais sobe; vale levar para a próxima 1:1.';
  else frase = 'Nenhum indicador está longe; ' + (comMeta.length - bem.length) + ' ainda pede atenção.';
  var aviso = aberto ? '<div class="ind-aviso">Mês em andamento: nos indicadores de volume a régua é o esperado até hoje, e a barra mostra o ritmo com um traço âmbar.</div>' : '';
  var legenda = '<div class="ind-legenda"><span><i style="background:#3D8B5F"></i>' + (aberto ? 'na meta ou no ritmo' : 'na meta') + '</span><span><i style="background:#C89A2E"></i>abaixo</span><span><i style="background:#C0433D"></i>' + (aberto ? 'atrás' : 'longe') + '</span><span><i style="background:#fff;border:1px dashed #9F9F9F"></i>sem meta ou cedo</span></div>';
  var tom = longe.length ? 'critico' : (bem.length === comMeta.length ? 'ok' : 'atencao');
  el.innerHTML = '<div class="ind-resumo"><div class="ind-placar ' + tom + '"><b>' + bem.length + '</b><span>de ' + comMeta.length + (aberto ? ' na meta ou no ritmo' : ' na meta') + '</span></div>'
    + '<div class="ind-resumo-txt">' + frase + aviso + '</div></div>'
    + '<div class="ind-grid"><div class="ind-radar">' + indRoseSvg_(eixos) + legenda + '</div>'
    + '<div class="ind-cards">' + ordenados.map(indCardHtml_).join('') + '</div></div>';
}

// ---------- GTD ----------
function renderGtdCS(d) {
  var el = document.getElementById('secGtd');
  if (d.gtd.erro) { el.innerHTML = erroSecao(d.gtd.erro); return; }
  var g = d.gtd.dado;
  if (!g.conselhos.length) { el.innerHTML = '<div class="vazio">Nenhum ciclo de GTD em aberto para os conselhos deste CS.</div>'; return; }
  var pct = g.taxa === null ? null : g.taxa;
  var qs = '?mes=' + encodeURIComponent(d.periodo.mes) + '&ano=' + encodeURIComponent(d.periodo.ano);
  var html = '<div class="gtd-geral"><div class="gtd-geral-valor">' + (pct === null ? 'Sem taxa' : pct + '%') + '</div>'
    + '<div style="flex:1;min-width:200px;"><div class="barra"><i style="width:' + (pct === null ? 0 : pct) + '%"></i></div>'
    + '<div class="gtd-geral-sub" style="margin-top:6px;">' + g.feitas + ' de ' + g.total + ' etapas feitas em ' + g.conselhos.length + (g.conselhos.length === 1 ? ' conselho' : ' conselhos') + '</div></div></div>';
  html += g.conselhos.map(function (c) {
    var nome = c.groupId ? '<a href="/conselho/' + encodeURIComponent(c.groupId) + qs + '">' + esc(c.membro) + '</a>' : esc(c.membro);
    var taxa = (c.taxa === null || c.taxa === undefined) ? 0 : c.taxa;
    return '<div class="gtd-linha"><div>' + nome + '<div class="meta">Encontro em ' + esc(dataBR(c.dataConselho)) + (c.vinculado ? '' : ' · não vinculado a um conselho') + '</div></div>'
      + '<div class="barra"><i style="width:' + taxa + '%"></i></div>'
      + '<div><b>' + (c.taxa === null ? 'Sem taxa' : c.taxa + '%') + '</b><div class="meta">' + c.feitas + ' de ' + c.total + '</div></div>'
      + '<div>' + (c.etapasAtrasadas.length ? '<span class="atraso">' + c.etapasAtrasadas.length + (c.etapasAtrasadas.length === 1 ? ' atrasada' : ' atrasadas') + '</span>' : '') + '</div></div>';
  }).join('');
  if (g.naoVinculados.length) html += '<div class="nota">Não vinculados a um conselho ativo: ' + esc(g.naoVinculados.join(', ')) + '. O vínculo é pelo nome do conselheiro, igual à visão do CS.</div>';
  el.innerHTML = html;
}

// ---------- críticos ----------
function renderCriticosCS(d) {
  var el = document.getElementById('secCriticos');
  if (d.criticos.erro) { el.innerHTML = erroSecao(d.criticos.erro); return; }
  var c = d.criticos.dado;
  if (c.estado === 'sem_report') { el.innerHTML = '<div class="vazio">Sem report. Este CS ainda não tem report individual registrado.</div>'; return; }
  if (c.estado === 'sem_detalhamento') {
    var p = c.percentualDecimos;
    el.innerHTML = '<div class="crit-total"><b>' + (p === null || p === undefined ? 'Sem dado' : dec(p)) + '</b><span class="gtd-geral-sub">'
      + (c.criticos === null || c.criticos === undefined ? 'Sem total declarado' : c.criticos + ' críticos de ' + numFmt(c.membros) + ' membros declarados') + ', semana de ' + esc(dataBR(c.semana)) + '</span></div>'
      + '<div class="vazio">Sem detalhamento por produto. O report mais recente foi importado do Monday só com a contagem, sem os nomes dos críticos.</div>';
    return;
  }
  var linhas = c.linhas.map(function (l) {
    return '<tr><td>' + esc(l.produto) + '</td><td class="num">' + l.criticos + '</td><td class="num">' + l.membros + '</td><td class="num">' + (l.percentualDecimos === null ? 'Sem dado' : dec(l.percentualDecimos)) + '</td></tr>';
  }).join('');
  el.innerHTML = '<div class="crit-total"><b>' + (c.total.percentualDecimos === null ? 'Sem dado' : dec(c.total.percentualDecimos)) + '</b><span class="gtd-geral-sub">'
    + c.total.criticos + ' críticos de ' + c.total.membros + ' membros, semana de ' + esc(dataBR(c.semana)) + '</span></div>'
    + '<table class="leg"><thead><tr><th>Produto</th><th class="num">Críticos</th><th class="num">Membros</th><th class="num">Percentual</th></tr></thead><tbody>' + linhas
    + '<tr><td><b>Total do CS</b></td><td class="num"><b>' + c.total.criticos + '</b></td><td class="num"><b>' + c.total.membros + '</b></td><td class="num"><b>' + (c.total.percentualDecimos === null ? 'Sem dado' : dec(c.total.percentualDecimos)) + '</b></td></tr></tbody></table>';
}

// ---------- advertências ----------
function renderAdvertenciasCS(d) {
  var el = document.getElementById('secAdvertencias');
  if (d.advertencias.erro) { el.innerHTML = erroSecao(d.advertencias.erro); return; }
  var a = d.advertencias.dado, hb = d.health.dado;
  var efeito = '';
  if (hb && !hb.semApuracao) {
    efeito = '<div class="efeito">Efeito no Health da Base: <b>' + dec(hb.comPontosDecimos) + '</b> com os ' + hb.pontosAtivos + (hb.pontosAtivos === 1 ? ' ponto ativo' : ' pontos ativos')
      + ' e <b>' + dec(hb.semPontosDecimos) + '</b> sem eles.</div>';
  } else if (hb) { efeito = '<div class="efeito">Health da Base sem apuração: sem report com críticos e base.</div>'; }
  var opcoes = a.tipos.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.nome) + ' (' + t.pontos + (t.pontos === 1 ? ' ponto' : ' pontos') + ', ' + t.validadeMeses + ' meses)</option>'; }).join('');
  var form = a.tipos.length
    ? '<div class="form-adv"><label>Tipo<select id="advTipo">' + opcoes + '</select></label>'
      + '<label style="flex:1 1 240px;">Observação (opcional)<textarea id="advObs" placeholder="Contexto da advertência"></textarea></label>'
      + '<div><button class="btn" id="advAplicar" type="button">Aplicar</button><span class="msg" id="advMsg"></span></div></div>'
    : '<div class="vazio" style="margin-bottom:14px;">Nenhum tipo de advertência ativo. Cadastre em Controle de perfis.</div>';
  var lista = a.registros.length ? a.registros.map(function (r) {
    var editando = advEditandoId === r.id, excluindo = advExcluindoId === r.id;
    var acoes = '<div class="adv-acoes"><button class="btn sec" type="button" data-adv-acao="editar" data-id="' + esc(r.id) + '">Editar</button>'
      + (excluindo
        ? '<button class="btn perigo" type="button" data-adv-acao="excluir-confirmar" data-id="' + esc(r.id) + '">Confirmar exclusão</button><button class="btn sec" type="button" data-adv-acao="cancelar" data-id="' + esc(r.id) + '">Cancelar</button>'
        : '<button class="btn perigo" type="button" data-adv-acao="excluir" data-id="' + esc(r.id) + '">Excluir</button>') + '</div>';
    var corpo = editando
      ? '<div style="margin-top:8px;"><textarea class="edit-obs" id="advObsEdit">' + esc(r.observacao || '') + '</textarea><div style="margin-top:8px;display:flex;gap:6px;"><button class="btn" type="button" data-adv-acao="salvar" data-id="' + esc(r.id) + '">Salvar</button><button class="btn sec" type="button" data-adv-acao="cancelar" data-id="' + esc(r.id) + '">Cancelar</button></div></div>'
      : (r.observacao ? '<div class="adv-meta">' + esc(r.observacao) + '</div>' : '');
    var validade = new Date(r.aplicadoEm); validade.setMonth(validade.getMonth() + r.validadeMeses);
    return '<div class="adv-linha"><div class="adv-topo"><span class="adv-tipo">' + esc(r.tipoNome) + '</span><span>' + r.pontos + (r.pontos === 1 ? ' ponto' : ' pontos') + '</span>'
      + '<span class="status-adv ' + (r.ativa ? 'ativa' : 'vencida') + '">' + (r.ativa ? 'Ativa' : 'Vencida') + '</span>' + acoes + '</div>'
      + '<div class="adv-meta">Aplicada em ' + esc(dataBR(r.aplicadoEm)) + ' por ' + esc(r.aplicadoPor) + ', válida até ' + esc(dataBR(validade.toISOString())) + '</div>' + corpo + '</div>';
  }).join('') : '<div class="vazio">Nenhuma advertência aplicada a este CS.</div>';
  el.innerHTML = efeito + form + lista;
}

// ---------- 1:1 (08/10/2026): conduzida e editada só nesta página ----------
var UM = null;
var UM_FORM_REGISTRO = null;
var UM_FORM_GRANOLA = null;
var UM_FORM_ITENS = [];
var UM_TIPOS = [
  { chave: 'passo_lideranca', rotulo: 'A liderança vai fazer' },
  { chave: 'passo_liderado', rotulo: 'O liderado vai fazer' },
  { chave: 'ponto_atencao', rotulo: 'Ponto de atenção' }
];
var UM_PRIOS = [{ chave: 'alta', rotulo: 'Alta' }, { chave: 'media', rotulo: 'Média' }, { chave: 'baixa', rotulo: 'Baixa' }];

function umErro(msg) { return '<div class="erro-secao">Não foi possível carregar esta seção: ' + esc(msg) + '.</div>'; }
function umDataSP(iso) { return iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'sem data'; }
function umIsoDataSP(iso) {
  return iso ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso)) : '';
}
function umRotuloTipo(t) { for (var i = 0; i < UM_TIPOS.length; i++) { if (UM_TIPOS[i].chave === t) return UM_TIPOS[i].rotulo; } return t; }
function umPorId(lista, id) { for (var i = 0; i < (lista || []).length; i++) { if (lista[i].id === id) return lista[i]; } return null; }
function umItemPorId(id) { return umPorId(UM && UM.itens, id) || umPorId(UM && UM.excluidos, id); }
function umRegistroPorId(id) { return umPorId(UM && UM.registros, id); }
function umGravacaoPorId(id) { for (var i = 0; UM && i < UM.granola.length; i++) { if (UM.granola[i].noteId === id) return UM.granola[i]; } return null; }

function umSeloHtml() {
  if (!UM || !UM.resumo) return '';
  var r = UM.resumo, s = '';
  if (r.liderancaVencidos > 0) s += '<a class="selo alerta" href="#secUmAUm">' + r.liderancaVencidos + (r.liderancaVencidos === 1 ? ' compromisso da liderança vencido' : ' compromissos da liderança vencidos') + '</a>';
  if (r.atencaoAbertos > 0) s += '<a class="selo" href="#secUmAUm">' + r.atencaoAbertos + (r.atencaoAbertos === 1 ? ' ponto de atenção' : ' pontos de atenção') + '</a>';
  return s;
}

function postUm(corpo) {
  return fetchJSON_('/api/gestor/cs/' + encodeURIComponent(CS_NOME) + '/um-a-um', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
}
function mostrarErroUm(err) {
  document.getElementById('umLista').insertAdjacentHTML('afterbegin', umErro(err.message));
}

function carregarUmAUm() {
  fetchJSON_('/api/gestor/cs/' + encodeURIComponent(CS_NOME) + '/um-a-um').then(function (d) {
    UM = d; renderUmAUm();
  }).catch(function (err) {
    document.getElementById('umLista').innerHTML = umErro(err.message);
  });
}

function umItemCardHtml(i) {
  var vencido = !!i.vencido;
  var meta = '';
  if (i.visibilidade === 'privado_gestor' && i.tipo === 'passo_lideranca') meta += '<span class="um-privado">Só a liderança</span>';
  if (i.prioridade === 'alta') meta += '<span class="um-prio-alta">Alta</span>';
  if (i.prazo) {
    meta += vencido
      ? '<span class="um-vencido">vencido há ' + i.diasVencido + (i.diasVencido === 1 ? ' dia' : ' dias') + '</span>'
      : '<span>prazo ' + dataBR(i.prazo) + '</span>';
  }
  if (i.dataOrigem) meta += '<span>1:1 de ' + dataBR(i.dataOrigem) + '</span>';
  var opcoes = (UM.statusOpcoes || []).map(function (s) {
    return '<option value="' + esc(s.chave) + '"' + (s.chave === i.status ? ' selected' : '') + '>' + esc(s.rotulo) + '</option>';
  }).join('');
  return '<div class="um-item' + (vencido ? ' vencido' : '') + '">'
    + '<div class="um-item-texto">' + esc(i.texto) + '</div>'
    + (i.observacao ? '<div class="um-item-meta">' + esc(i.observacao) + '</div>' : '')
    + '<div class="um-item-meta">' + meta + '</div>'
    + '<div class="um-item-acoes"><select data-um="status" data-id="' + esc(i.id) + '" aria-label="Status do item">' + opcoes + '</select>'
    + '<button type="button" data-um="editar-item" data-id="' + esc(i.id) + '">Editar</button>'
    + '<button type="button" class="perigo" data-um="excluir-item" data-id="' + esc(i.id) + '">Excluir</button></div></div>';
}

function umColunaHtml(titulo, sub, lista, privado) {
  var corpo = lista.length ? lista.map(umItemCardHtml).join('') : '<div class="vazio">Nenhum item nesta coluna.</div>';
  return '<div class="um-col"><h3>' + esc(titulo) + '</h3><div class="um-col-sub">' + esc(sub)
    + (privado ? ' <span class="um-privado">Só a liderança vê</span>' : '') + '</div>' + corpo + '</div>';
}

function umRegistroHtml(r) {
  var g = r.granolaNoteId ? umGravacaoPorId(r.granolaNoteId) : null;
  var link = g && g.webUrl ? ' · <a class="um-link" href="' + esc(g.webUrl) + '" target="_blank" rel="noopener">Abrir no Granola</a>' : '';
  var transc = g && g.transcricao && g.transcricao.length
    ? '<details class="um-det"><summary>Transcrição</summary><div class="um-granola">' + g.transcricao.map(function (t) { return esc(t.quem) + ': ' + esc(t.texto); }).join('<br>') + '</div></details>'
    : '';
  return '<div class="um-linha"><div class="um-linha-data">1:1 de ' + dataBR(r.data) + link + '</div>'
    + '<div class="um-linha-resumo">' + (r.resumoCompartilhado ? esc(r.resumoCompartilhado) : 'Sem resumo compartilhado.') + '</div>'
    + (r.notasPrivadas ? '<div class="um-linha-privado"><strong>Notas só da liderança</strong><br>' + esc(r.notasPrivadas) + '</div>' : '')
    + transc
    + '<div class="um-acoes-linha"><button type="button" data-um="editar-registro" data-id="' + esc(r.id) + '">Editar</button>'
    + '<button type="button" class="perigo" data-um="excluir-registro" data-id="' + esc(r.id) + '">Excluir</button></div></div>';
}

function umGravacaoHtml(g) {
  return '<div class="um-linha"><div class="um-linha-data">' + umDataSP(g.dataReuniao) + '</div>'
    + '<div class="um-linha-resumo"><strong>' + esc(g.titulo || 'Sem título') + '</strong></div>'
    + '<div class="um-acoes-linha">' + (g.webUrl ? '<a class="um-link" href="' + esc(g.webUrl) + '" target="_blank" rel="noopener">Abrir no Granola</a>' : '')
    + '<button type="button" data-um="criar-de-gravacao" data-id="' + esc(g.noteId) + '">Criar 1:1 a partir desta gravação</button></div></div>';
}

function renderUmAUm() {
  if (!UM) return;
  var seloEl = document.getElementById('heroUmSelo');
  if (seloEl) seloEl.innerHTML = umSeloHtml();
  var abertos = (UM.itens || []).filter(function (i) { return i.status === 'backlog' || i.status === 'em_andamento'; });
  var fechados = (UM.itens || []).filter(function (i) { return i.status === 'realizado' || i.status === 'rejeitado'; });
  var doTipo = function (t) { return abertos.filter(function (i) { return i.tipo === t; }); };
  var html = abertos.length
    ? '<div class="um-colunas">'
      + umColunaHtml('A liderança vai fazer', 'Compromissos da liderança com este CS.', doTipo('passo_lideranca'), false)
      + umColunaHtml('O liderado vai fazer', 'Passos do CS, visíveis para ele.', doTipo('passo_liderado'), false)
      + umColunaHtml('Pontos de atenção', 'Observações da liderança sobre este CS.', doTipo('ponto_atencao'), true)
      + '</div>'
    : '<div class="vazio">Nenhum item em aberto. Registre a próxima 1:1 para definir os próximos passos.</div>';
  var excluidos = UM.excluidos || [];
  var livres = (UM.granola || []).filter(function (g) { return !g.ligadaA1a1; });
  html += '<details class="um-det"><summary>Concluídos e descartados (' + fechados.length + ')</summary>'
    + (fechados.length ? fechados.map(umItemCardHtml).join('') : '<div class="vazio">Nada concluído ou descartado ainda.</div>') + '</details>';
  html += '<details class="um-det"><summary>Excluídos (' + excluidos.length + ')</summary>'
    + (excluidos.length ? excluidos.map(function (i) {
      return '<div class="um-item"><div class="um-item-texto">' + esc(i.texto) + '</div><div class="um-item-acoes">'
        + '<button type="button" data-um="restaurar-item" data-id="' + esc(i.id) + '">Restaurar</button></div></div>';
    }).join('') : '<div class="vazio">Nenhum item excluído.</div>') + '</details>';
  html += '<details class="um-det"><summary>Histórico de 1:1 (' + (UM.registros || []).length + ')</summary>'
    + ((UM.registros || []).length ? UM.registros.map(umRegistroHtml).join('') : '<div class="vazio">Ainda não há 1:1 registrada.</div>') + '</details>';
  html += '<details class="um-det"><summary>Gravações do Granola sem 1:1 ligada (' + livres.length + ')</summary>'
    + (livres.length ? livres.map(umGravacaoHtml).join('') : '<div class="vazio">Nenhuma gravação sem 1:1 ligada.</div>') + '</details>';
  document.getElementById('umLista').innerHTML = html;
}

function umItemFormHtml(item) {
  var t = item || {};
  var tipoOpc = UM_TIPOS.map(function (x) {
    return '<option value="' + x.chave + '"' + ((t.tipo || 'passo_liderado') === x.chave ? ' selected' : '') + '>' + esc(x.rotulo) + '</option>';
  }).join('');
  var prioOpc = UM_PRIOS.map(function (x) {
    return '<option value="' + x.chave + '"' + ((t.prioridade || 'media') === x.chave ? ' selected' : '') + '>' + esc(x.rotulo) + '</option>';
  }).join('');
  var acoes = item
    ? '<button type="button" data-um="salvar-item-editado" data-id="' + esc(item.id) + '">Salvar item</button> <button type="button" data-um="cancelar-item">Cancelar</button>'
    : '<button type="button" data-um="acrescentar-item">Acrescentar item</button>';
  return '<label for="umTipo">Tipo</label><select id="umTipo"' + (item ? ' disabled' : '') + '>' + tipoOpc + '</select>'
    + '<div class="um-form-linha"><div><label for="umPrio">Prioridade</label><select id="umPrio">' + prioOpc + '</select></div>'
    + '<div><label for="umPrazo">Prazo</label><input type="date" id="umPrazo" value="' + esc(t.prazo || '') + '"></div>'
    + '<div><label for="umObs">Observação</label><input type="text" id="umObs" maxlength="600" value="' + esc(t.observacao || '') + '"></div></div>'
    + '<label for="umTexto">Texto do item</label><textarea id="umTexto" maxlength="600">' + esc(t.texto || '') + '</textarea>'
    + '<label><input type="checkbox" id="umPrivado"' + (t.visibilidade === 'privado_gestor' ? ' checked' : '') + '> Só para a liderança (vale só para passo da liderança)</label>'
    + '<div class="um-form-acoes">' + acoes + '</div>';
}

function umLerItemForm() {
  return {
    tipo: document.getElementById('umTipo').value,
    prioridade: document.getElementById('umPrio').value,
    prazo: document.getElementById('umPrazo').value || null,
    texto: document.getElementById('umTexto').value.trim(),
    observacao: document.getElementById('umObs').value.trim() || null,
    privado: document.getElementById('umPrivado').checked
  };
}

function umValidarItem(it) {
  if (it.texto.length < 3) return 'O texto do item precisa de pelo menos 3 caracteres.';
  if (it.texto.length > 600) return 'O texto do item passa de 600 caracteres.';
  return null;
}

function umRenderItensNovos() {
  var ul = document.getElementById('umItensNovos');
  if (!ul) return;
  ul.innerHTML = UM_FORM_ITENS.map(function (it, idx) {
    return '<li>' + esc(umRotuloTipo(it.tipo)) + ': ' + esc(it.texto)
      + ' <button type="button" data-um="remover-item-fila" data-id="' + idx + '">Remover</button></li>';
  }).join('');
}

function abrirFormUm(modo, dados) {
  dados = dados || {};
  UM_FORM_REGISTRO = modo === 'editar' ? (dados.id || null) : null;
  UM_FORM_GRANOLA = dados.granolaNoteId || null;
  UM_FORM_ITENS = [];
  var g = dados.granolaNoteId ? umGravacaoPorId(dados.granolaNoteId) : null;
  var blocoGranola = g
    ? '<label>Resumo da gravação do Granola (somente leitura)</label><div class="um-granola">' + esc(g.resumoMarkdown || 'Esta gravação ainda não tem resumo.') + '</div>'
    : '';
  document.getElementById('umForm').innerHTML = '<div class="um-form">'
    + '<div class="um-form-linha"><div><label for="umData">Data da 1:1</label><input type="date" id="umData" value="' + esc(dados.data || UM.hoje) + '"></div></div>'
    + blocoGranola
    + '<label for="umResumo">Resumo que o liderado vê</label><textarea id="umResumo" maxlength="600">' + esc(dados.resumo || dados.resumoCompartilhado || '') + '</textarea>'
    + '<label for="umNotas">Notas só da liderança</label><textarea id="umNotas" maxlength="600">' + esc(dados.notasPrivadas || '') + '</textarea>'
    + '<div id="umItemForm" class="um-form-bloco">' + umItemFormHtml(null) + '</div>'
    + '<ul class="um-itens-novos" id="umItensNovos"></ul>'
    + '<div class="um-form-acoes"><button type="button" class="btn" data-um="salvar-registro">Salvar 1:1</button><button type="button" data-um="cancelar-form">Cancelar</button></div>'
    + '<div class="um-form-msg" id="umFormMsg"></div></div>';
  umRenderItensNovos();
  document.getElementById('umForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function abrirFormItem(item) {
  if (!item) return;
  document.getElementById('umForm').innerHTML = '<div class="um-form">' + umItemFormHtml(item) + '<div class="um-form-msg" id="umFormMsg"></div></div>';
  document.getElementById('umTexto').focus();
}

function fecharFormUm() {
  UM_FORM_REGISTRO = null; UM_FORM_GRANOLA = null; UM_FORM_ITENS = [];
  document.getElementById('umForm').innerHTML = '';
}

function acrescentarItemNaFila() {
  var msg = document.getElementById('umFormMsg');
  var it = umLerItemForm();
  var erro = umValidarItem(it);
  if (erro) { msg.textContent = erro; return; }
  UM_FORM_ITENS.push(it);
  document.getElementById('umItemForm').innerHTML = umItemFormHtml(null);
  umRenderItensNovos();
  msg.textContent = '';
}

// Envia os itens da fila um por um; cada item enviado sai da fila, então uma nova tentativa não duplica.
function enviarFilaUm() {
  if (!UM_FORM_ITENS.length) return Promise.resolve();
  var it = UM_FORM_ITENS[0];
  return postUm({ acao: 'salvar_item', id: null, registroId: UM_FORM_REGISTRO, tipo: it.tipo, texto: it.texto, privado: it.privado, prioridade: it.prioridade, prazo: it.prazo, observacao: it.observacao })
    .then(function () { UM_FORM_ITENS.shift(); umRenderItensNovos(); return enviarFilaUm(); });
}

function salvarRegistroUm() {
  var msg = document.getElementById('umFormMsg');
  var data = document.getElementById('umData').value;
  if (!data) { msg.textContent = 'Informe a data da 1:1.'; return; }
  msg.textContent = 'Salvando';
  postUm({
    acao: 'salvar_registro', id: UM_FORM_REGISTRO, data: data,
    resumo: document.getElementById('umResumo').value.trim() || null,
    notasPrivadas: document.getElementById('umNotas').value.trim() || null,
    granolaNoteId: UM_FORM_GRANOLA
  }).then(function (r) {
    UM_FORM_REGISTRO = r.id;
    return enviarFilaUm();
  }).then(function () {
    fecharFormUm();
    return carregarUmAUm();
  }).catch(function (err) {
    msg.textContent = 'Erro: ' + err.message;
    if (UM_FORM_REGISTRO) carregarUmAUm();
  });
}

function salvarItemEditado(id) {
  var msg = document.getElementById('umFormMsg');
  var it = umLerItemForm();
  var erro = umValidarItem(it);
  if (erro) { msg.textContent = erro; return; }
  postUm({ acao: 'salvar_item', id: id, texto: it.texto, prioridade: it.prioridade, prazo: it.prazo, observacao: it.observacao, privado: it.privado })
    .then(function () { fecharFormUm(); return carregarUmAUm(); })
    .catch(function (err) { msg.textContent = 'Erro: ' + err.message; });
}

function umAoClicar(ev) {
  var alvo = ev.target;
  if (!alvo || !alvo.closest) return;
  var b = alvo.closest('[data-um]');
  if (!b) return;
  var acao = b.getAttribute('data-um'), id = b.getAttribute('data-id');
  if (acao === 'novo') abrirFormUm('novo', {});
  else if (acao === 'editar-registro') {
    var r = umRegistroPorId(id);
    if (r) abrirFormUm('editar', { id: r.id, data: r.data, resumo: r.resumoCompartilhado, notasPrivadas: r.notasPrivadas, granolaNoteId: r.granolaNoteId });
  }
  else if (acao === 'criar-de-gravacao') {
    var g = umGravacaoPorId(id);
    if (g) abrirFormUm('novo', { data: umIsoDataSP(g.dataReuniao), granolaNoteId: g.noteId });
  }
  else if (acao === 'cancelar-form') fecharFormUm();
  else if (acao === 'acrescentar-item') acrescentarItemNaFila();
  else if (acao === 'remover-item-fila') { UM_FORM_ITENS.splice(Number(id), 1); umRenderItensNovos(); }
  else if (acao === 'salvar-registro') salvarRegistroUm();
  else if (acao === 'editar-item') abrirFormItem(umItemPorId(id));
  else if (acao === 'salvar-item-editado') salvarItemEditado(id);
  else if (acao === 'cancelar-item') fecharFormUm();
  else if (acao === 'excluir-registro') {
    if (!confirm('Excluir esta 1:1? Os itens dela continuam em aberto.')) return;
    postUm({ acao: 'excluir_registro', id: id }).then(carregarUmAUm).catch(mostrarErroUm);
  }
  else if (acao === 'excluir-item') {
    if (!confirm('Excluir este item? Ele pode ser restaurado depois.')) return;
    postUm({ acao: 'excluir_item', id: id }).then(carregarUmAUm).catch(mostrarErroUm);
  }
  else if (acao === 'restaurar-item') {
    postUm({ acao: 'restaurar_item', id: id }).then(carregarUmAUm).catch(mostrarErroUm);
  }
}

function umAoMudarStatus(ev) {
  var alvo = ev.target;
  if (!alvo || alvo.getAttribute('data-um') !== 'status') return;
  postUm({ acao: 'status_item', id: alvo.getAttribute('data-id'), status: alvo.value })
    .then(carregarUmAUm).catch(mostrarErroUm);
}
document.addEventListener('click', umAoClicar);
document.addEventListener('change', umAoMudarStatus);

// ---------- evolução (08/10/2026): fotografia mensal, lida do servidor ----------
var EVO = null;
var EVO_JANELA = 6;
var EVO_REQ = 0;
var EVO_QUEDA_TEXTO = '';
var QUEDA_APROVEITAMENTO_ALERTA_PP_ = 30;

function evoErro_(msg) { return '<div class="erro-secao">Não foi possível carregar esta seção: ' + esc(msg) + '.</div>'; }

function carregarEvolucao() {
  var req = ++EVO_REQ;
  var mes = document.getElementById('selMesCS').value, ano = document.getElementById('selAnoCS').value;
  document.querySelectorAll('[data-evo-janela]').forEach(function (b) {
    b.classList.toggle('ativo', Number(b.getAttribute('data-evo-janela')) === EVO_JANELA);
  });
  fetchJSON_('/api/gestor/cs/' + encodeURIComponent(CS_NOME) + '/evolucao?mes=' + encodeURIComponent(mes) + '&ano=' + encodeURIComponent(ano) + '&meses=' + EVO_JANELA).then(function (d) {
    if (req !== EVO_REQ) return;
    EVO = d;
    renderEvolucao();
    if (DADOS_CS) renderRadarCS(DADOS_CS);
  }).catch(function (err) {
    if (req !== EVO_REQ) return;
    EVO = null;
    document.getElementById('evoGrafico').innerHTML = evoErro_(err.message);
    if (DADOS_CS) renderRadarCS(DADOS_CS);
  });
}

function evoMesCurto_(m) { return MESES_CURTOS_[(m.mes || 1) - 1]; }

// Resumo no topo: último mês fechado contra o fechado anterior, e o mês aberto à parte (parcial).
function evoResumoHtml_(meses) {
  var fechados = meses.filter(function (m) { return !m.aberto && !m.pendente && m.cs && m.cs.pontuacao !== null && m.cs.pontuacao !== undefined; });
  var aberto = meses.length && meses[meses.length - 1].aberto ? meses[meses.length - 1] : null;
  var html = '';
  if (fechados.length) {
    var u = fechados[fechados.length - 1], a = fechados.length > 1 ? fechados[fechados.length - 2] : null;
    var dPts = a ? u.cs.pontuacao - a.cs.pontuacao : null;
    var dPos = a && u.cs.posicao !== null && a.cs.posicao !== null ? a.cs.posicao - u.cs.posicao : null;
    html += '<div class="evo-kpi"><div class="evo-kpi-rot">Pontuação em ' + esc(evoMesCurto_(u)) + '</div><div class="evo-kpi-val">' + u.cs.pontuacao + '</div>'
      + '<div class="evo-kpi-var' + (dPts === null || dPts === 0 ? '' : (dPts > 0 ? ' sobe' : ' cai')) + '">' + (dPts === null ? 'primeiro mês fechado' : (dPts === 0 ? 'igual a ' + esc(evoMesCurto_(a)) : (dPts > 0 ? '▲ ' : '▼ ') + Math.abs(dPts) + ' desde ' + esc(evoMesCurto_(a)))) + '</div></div>';
    if (u.cs.posicao !== null && u.cs.posicao !== undefined) {
      html += '<div class="evo-kpi"><div class="evo-kpi-rot">Posição em ' + esc(evoMesCurto_(u)) + '</div><div class="evo-kpi-val">' + u.cs.posicao + 'º</div>'
        + '<div class="evo-kpi-var' + (dPos === null || dPos === 0 ? '' : (dPos > 0 ? ' sobe' : ' cai')) + '">' + (dPos === null ? 'de ' + (u.cs.totalRankeados || '') : (dPos === 0 ? 'mesma posição' : (dPos > 0 ? '▲ subiu ' : '▼ caiu ') + Math.abs(dPos) + (Math.abs(dPos) === 1 ? ' posição' : ' posições'))) + '</div></div>';
    }
  }
  if (aberto && aberto.cs && aberto.cs.pontuacao !== null && aberto.cs.pontuacao !== undefined) {
    html += '<div class="evo-kpi parcial"><div class="evo-kpi-rot">' + esc(evoMesCurto_(aberto)) + ' até agora</div><div class="evo-kpi-val">' + aberto.cs.pontuacao + '</div>'
      + '<div class="evo-kpi-var">parcial' + (aberto.cs.posicao ? ', ' + aberto.cs.posicao + 'º no momento' : '') + '</div></div>';
  }
  return html;
}

function evoSvgHtml_(meses) {
  // Em tela estreita o viewBox encolhe, para o texto do gráfico não ficar minúsculo.
  var estreito = window.innerWidth < 600;
  var W = estreito ? 400 : 680, H = estreito ? 280 : 260, pL = 34, pR = 70, pT = 34, pB = 34;
  var valores = [0];
  meses.forEach(function (m) {
    if (m.cs && m.cs.pontuacao !== null && m.cs.pontuacao !== undefined) valores.push(m.cs.pontuacao);
    if (m.medianaTime !== null && m.medianaTime !== undefined) valores.push(m.medianaTime);
  });
  var topo = Math.max(120, Math.ceil(Math.max.apply(null, valores) * 1.1 / 20) * 20);
  var n = meses.length;
  function X(i) { return n === 1 ? pL + (W - pL - pR) / 2 : pL + i * (W - pL - pR) / (n - 1); }
  function Y(v) { return pT + (H - pT - pB) * (1 - v / topo); }
  var g = '<defs><linearGradient id="evoArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#C89A2E" stop-opacity="0.35"/><stop offset="100%" stop-color="#C89A2E" stop-opacity="0"/></linearGradient></defs>';
  [0, topo / 2, topo].forEach(function (v) {
    g += '<line x1="' + pL + '" x2="' + (W - pR) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" stroke="#EFEDED"/>'
      + '<text class="evo-eixo" x="' + (pL - 8) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end">' + Math.round(v) + '</text>';
  });
  var yMeta = Y(100);
  g += '<line x1="' + pL + '" x2="' + (W - pR) + '" y1="' + yMeta.toFixed(1) + '" y2="' + yMeta.toFixed(1) + '" stroke="#C89A2E" stroke-width="1.5" stroke-dasharray="5 4"/>'
    + '<text x="' + (W - pR + 6) + '" y="' + (yMeta + 4).toFixed(1) + '" font-size="11" font-weight="700" fill="#8A6D1C">meta 100</text>';
  // pontos do CS separados entre fechados (linha cheia + área) e o aberto (pontilhado)
  var pts = [];
  meses.forEach(function (m, i) {
    var v = m.cs ? m.cs.pontuacao : null;
    if (v === null || v === undefined) return;
    pts.push({ i: i, x: X(i), y: Y(v), v: v, aberto: !!m.aberto, pos: m.cs.posicao, rotulo: m.rotulo });
  });
  var fech = pts.filter(function (p) { return !p.aberto; });
  if (fech.length >= 2) {
    var area = 'M ' + fech[0].x.toFixed(1) + ' ' + Y(0).toFixed(1);
    fech.forEach(function (p) { area += ' L ' + p.x.toFixed(1) + ' ' + p.y.toFixed(1); });
    area += ' L ' + fech[fech.length - 1].x.toFixed(1) + ' ' + Y(0).toFixed(1) + ' Z';
    g += '<path d="' + area + '" fill="url(#evoArea)"/>';
  }
  // mediana
  var dMed = '', ultimaMed = null;
  meses.forEach(function (m, i) {
    if (m.medianaTime === null || m.medianaTime === undefined || m.aberto) return;
    dMed += (dMed ? ' L ' : 'M ') + X(i).toFixed(1) + ' ' + Y(m.medianaTime).toFixed(1);
    ultimaMed = { x: X(i), y: Y(m.medianaTime), v: m.medianaTime };
  });
  if (dMed) g += '<path d="' + dMed + '" fill="none" stroke="#9F9F9F" stroke-width="2" stroke-dasharray="6 5"/>';
  if (ultimaMed) {
    // rótulo da mediana na margem direita, sem encostar no rótulo da meta
    var yMedTxt = ultimaMed.y + 4;
    if (Math.abs(ultimaMed.y - yMeta) < 14) yMedTxt = ultimaMed.y < yMeta ? yMeta - 12 : yMeta + 18;
    g += '<line x1="' + ultimaMed.x.toFixed(1) + '" x2="' + (W - pR).toFixed(1) + '" y1="' + ultimaMed.y.toFixed(1) + '" y2="' + ultimaMed.y.toFixed(1) + '" stroke="#9F9F9F" stroke-width="1" stroke-dasharray="2 4"/>'
      + '<text x="' + (W - pR + 6) + '" y="' + yMedTxt.toFixed(1) + '" font-size="11" fill="#5D5D5D">mediana ' + Math.round(ultimaMed.v) + '</text>';
  }
  // linha do CS
  var dCS = '';
  fech.forEach(function (p) { dCS += (dCS ? ' L ' : 'M ') + p.x.toFixed(1) + ' ' + p.y.toFixed(1); });
  if (dCS) g += '<path d="' + dCS + '" fill="none" stroke="#1A1A1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>';
  var ab = pts.filter(function (p) { return p.aberto; })[0];
  if (ab && fech.length) {
    var ult = fech[fech.length - 1];
    g += '<path d="M ' + ult.x.toFixed(1) + ' ' + ult.y.toFixed(1) + ' L ' + ab.x.toFixed(1) + ' ' + ab.y.toFixed(1) + '" fill="none" stroke="#1A1A1A" stroke-width="2" stroke-dasharray="2 4" stroke-linecap="round"/>';
  }
  pts.forEach(function (p) {
    var acima = p.v >= 100;
    var cor = p.aberto ? '#FFFFFF' : (acima ? '#3D8B5F' : '#C0433D');
    g += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="6" fill="' + cor + '" stroke="' + (p.aberto ? '#1A1A1A' : '#FFFFFF') + '" stroke-width="2"><title>' + esc(p.rotulo) + ': ' + p.v + ' pontos' + (p.pos ? ', ' + p.pos + 'º' : '') + (p.aberto ? ' (parcial)' : '') + '</title></circle>';
    var yTxt = p.y - 14 < pT - 18 ? p.y + 22 : p.y - 14;
    g += '<text class="evo-valor" x="' + p.x.toFixed(1) + '" y="' + yTxt.toFixed(1) + '" text-anchor="middle">' + p.v + (p.pos ? '<tspan class="evo-pos" dx="5">' + p.pos + 'º</tspan>' : '') + '</text>';
  });
  meses.forEach(function (m, i) {
    g += '<text class="evo-eixo" x="' + X(i).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle"' + (m.aberto ? ' font-style="italic"' : '') + '>' + esc(evoMesCurto_(m)) + (m.aberto ? ' (parcial)' : '') + '</text>';
  });
  return '<svg class="evo-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Pontuação mensal do CS, mediana do time e meta">' + g + '</svg>'
    + '<div class="evo-legenda"><span><i></i>este CS</span><span><i class="med"></i>mediana do time</span><span><i class="meta"></i>meta</span><span><i class="parc"></i>mês em andamento</span></div>';
}

function renderEvolucao() {
  if (!EVO) return;
  var meses = EVO.meses;
  document.querySelectorAll('[data-evo-janela]').forEach(function (b) {
    b.classList.toggle('ativo', Number(b.getAttribute('data-evo-janela')) === EVO_JANELA);
  });
  var temPonto = meses.some(function (m) { return m.cs && m.cs.pontuacao !== null && m.cs.pontuacao !== undefined; });
  document.getElementById('evoResumo').innerHTML = temPonto ? evoResumoHtml_(meses) : '';
  document.getElementById('evoGrafico').innerHTML = temPonto
    ? evoSvgHtml_(meses)
    : '<div class="vazio">Ainda não há meses com pontuação para comparar.</div>';

  var pendente = meses.some(function (m) { return m.pendente; });
  var html = '<div class="evo-leitura">';
  if (EVO.maiorQueda) {
    var q = EVO.maiorQueda;
    EVO_QUEDA_TEXTO = 'Maior queda: ' + q.label + ', de ' + q.de + '% para ' + q.para + '% da meta.';
    html += '<div class="evo-alerta"><div class="evo-alerta-txt">Maior queda entre os meses fechados: <b>' + esc(q.label) + '</b>, de ' + q.de + '% para ' + q.para + '% da meta. Vale levar para a próxima 1:1.</div>'
      + '<div class="evo-acao"><button type="button" class="principal" data-evo-acao="ponto-atencao">Registrar como ponto de atenção</button><span id="evoMsg" style="font-size:12px;color:var(--cinza-texto);"></span></div></div>';
  }
  if (pendente) html += '<p>Alguns meses ainda estão sendo fechados. Atualize a página em instantes.</p>';
  // Os cartões do topo já comparam os dois últimos meses fechados e mostram o mês aberto; a leitura só
  // entra quando a janela tem mais meses fechados do que isso (visão de prazo maior).
  var nFechados = meses.filter(function (m) { return !m.aberto && m.cs && m.cs.pontuacao !== null && m.cs.pontuacao !== undefined; }).length;
  if (nFechados > 2) {
    var frasesPeriodo = EVO.leitura.filter(function (f) { return f.indexOf('em andamento') === -1; });
    if (frasesPeriodo.length) html += '<p>No período, ' + esc(frasesPeriodo.map(function (f) { return f.charAt(0).toLowerCase() + f.slice(1).replace(/[.]$/, ''); }).join('; ')) + '.</p>';
  }
  document.getElementById('evoLeitura').innerHTML = html + '</div>';

  var fechados = meses.filter(function (m) { return !m.aberto && !m.pendente; });
  var ultimo = fechados.length ? fechados[fechados.length - 1] : null;
  document.getElementById('evoRecalcular').innerHTML = ultimo
    ? '<div class="evo-rodape"><button type="button" data-evo-acao="recalcular" data-ano="' + ultimo.ano + '" data-mes="' + ultimo.mes + '" title="Apaga a fotografia gravada deste mês e recalcula com os dados de agora">Recalcular a fotografia de ' + esc(ultimo.rotulo) + '</button></div>'
    : '';
}

function evoAoClicar_(ev) {
  var alvo = ev.target;
  if (!alvo || !alvo.closest) return;
  var janela = alvo.closest('[data-evo-janela]');
  if (janela) { EVO_JANELA = Number(janela.getAttribute('data-evo-janela')); carregarEvolucao(); return; }
  var b = alvo.closest('[data-evo-acao]');
  if (!b) return;
  var acao = b.getAttribute('data-evo-acao');
  if (acao === 'ponto-atencao') {
    var msg = document.getElementById('evoMsg');
    postUm({ acao: 'salvar_item', id: null, registroId: null, tipo: 'ponto_atencao', texto: EVO_QUEDA_TEXTO, privado: false, prioridade: 'alta', prazo: null, observacao: null })
      .then(function () { msg.textContent = 'Registrado na 1:1.'; return carregarUmAUm(); })
      .catch(function (err) { msg.textContent = 'Erro: ' + err.message; });
  } else if (acao === 'recalcular') {
    fetchJSON_('/api/gestor/cs/' + encodeURIComponent(CS_NOME) + '/evolucao', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'reabrir', ano: Number(b.getAttribute('data-ano')), mes: Number(b.getAttribute('data-mes')) })
    }).then(carregarEvolucao).catch(function (err) {
      document.getElementById('evoGrafico').innerHTML = evoErro_(err.message);
    });
  }
}
document.addEventListener('click', evoAoClicar_);

function renderTudoCS(d) {
  DADOS_CS = d;
  renderHeroCS(d); renderRadarCS(d); renderGtdCS(d); renderCriticosCS(d); renderAdvertenciasCS(d);
}

function carregarCS() {
  var mes = document.getElementById('selMesCS').value, ano = document.getElementById('selAnoCS').value;
  carregarEvolucao();
  fetchJSON_('/api/gestor/cs/' + encodeURIComponent(CS_NOME) + '?mes=' + encodeURIComponent(mes) + '&ano=' + encodeURIComponent(ano)).then(renderTudoCS).catch(function (err) {
    document.getElementById('heroCS').innerHTML = erroSecao(err.message);
    ['secRadar', 'secGtd', 'secCriticos', 'secAdvertencias'].forEach(function (id) { document.getElementById(id).innerHTML = ''; });
  });
}

function postAdv(url, metodo, corpo) {
  var opts = { method: metodo, headers: { 'Content-Type': 'application/json' } };
  if (corpo) opts.body = JSON.stringify(corpo);
  return fetchJSON_(url, opts);
}
document.addEventListener('click', function (ev) {
  var alvo = ev.target;
  if (!alvo || !alvo.closest) return;
  var base = '/api/cs/' + encodeURIComponent(CS_NOME) + '/advertencias';
  if (alvo.id === 'advAplicar') {
    var msg = document.getElementById('advMsg');
    alvo.disabled = true; msg.style.color = '#5D5D5D'; msg.textContent = 'Aplicando';
    postAdv(base, 'POST', { tipoId: document.getElementById('advTipo').value, observacao: document.getElementById('advObs').value.trim() || null })
      .then(carregarCS).catch(function (err) { alvo.disabled = false; msg.style.color = '#C0433D'; msg.textContent = 'Erro: ' + err.message; });
    return;
  }
  var botao = alvo.closest('[data-adv-acao]');
  if (!botao) return;
  var acao = botao.getAttribute('data-adv-acao'), id = botao.getAttribute('data-id');
  if (acao === 'editar') { advEditandoId = id; advExcluindoId = null; renderAdvertenciasCS(DADOS_CS); }
  else if (acao === 'excluir') { advExcluindoId = id; advEditandoId = null; renderAdvertenciasCS(DADOS_CS); }
  else if (acao === 'cancelar') { advEditandoId = null; advExcluindoId = null; renderAdvertenciasCS(DADOS_CS); }
  else if (acao === 'salvar') {
    postAdv(base + '/' + encodeURIComponent(id), 'PATCH', { observacao: document.getElementById('advObsEdit').value.trim() || null })
      .then(function () { advEditandoId = null; return carregarCS(); }).catch(function (err) { botao.textContent = 'Erro: ' + err.message; });
  } else if (acao === 'excluir-confirmar') {
    postAdv(base + '/' + encodeURIComponent(id), 'DELETE')
      .then(function () { advExcluindoId = null; return carregarCS(); }).catch(function (err) { botao.textContent = 'Erro: ' + err.message; });
  }
});

(function inicializarCS() {
  var selMes = document.getElementById('selMesCS'), selAno = document.getElementById('selAnoCS');
  ['Visão Geral'].concat(MESES_CS).forEach(function (m) { var o = document.createElement('option'); o.textContent = m; selMes.appendChild(o); });
  var params = new URLSearchParams(window.location.search);
  var agora = new Date();
  var mesUrl = params.get('mes');
  selMes.value = (mesUrl && (mesUrl === 'Visão Geral' || MESES_CS.indexOf(mesUrl) !== -1)) ? mesUrl : MESES_CS[agora.getMonth()];
  selAno.value = params.get('ano') || String(agora.getFullYear());
  if (!selAno.value) selAno.value = String(agora.getFullYear());
  function aoMudar() {
    var url = new URL(window.location.href);
    url.searchParams.set('mes', selMes.value); url.searchParams.set('ano', selAno.value);
    window.history.replaceState(null, '', url.toString());
    carregarCS();
  }
  selMes.onchange = aoMudar; selAno.onchange = aoMudar;
  aoMudar();
  carregarUmAUm();
})();
`;
}
