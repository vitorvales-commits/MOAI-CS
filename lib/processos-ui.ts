// Casca da página /processos (13/10/2026): CSS e HTML estáticos. Leitura em tela cheia (o documento
// já traz busca e navegação próprias); no modo de edição, o painel de itens abre à esquerda. O comportamento está em
// public/processos.js. Visual alinhado ao restante do painel (fundo #F5F5F5, Inter, dourado MOAI)
// para o time reconhecer a página como parte do mesmo produto. O documento em si é exibido num
// iframe isolado e mantém o visual do HTML original.

export const PROCESSOS_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
[hidden]{display:none !important}
html,body{height:100%}
body{font-family:'Inter',system-ui,sans-serif;background:#F5F5F5;color:#5D5D5D;font-size:13px;-webkit-font-smoothing:antialiased;display:flex;flex-direction:column}
button{font-family:inherit}
.pr-topo{display:flex;align-items:center;gap:14px;padding:14px 24px;background:rgba(245,245,245,.92);border-bottom:.75pt solid #C6C4C4;flex-wrap:wrap}
.pr-topo a.pr-logo img{height:22px;display:block}
.pr-topo-txt{flex:1;min-width:220px}
.pr-titulo{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:19px;color:#1A1A1A;line-height:1.2}
.pr-meta{font-size:11.5px;color:#807E7E;margin-top:2px}
.pr-topo-acoes{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.pr-voltar{font-size:11px;font-weight:700;color:#9F9F9F;text-decoration:none;padding:6px 10px;border-radius:8px}
.pr-voltar:hover{color:#1A1A1A;background:#E9E9E9}
.pr-btn{font-size:12px;font-weight:700;color:#1A1A1A;background:#fff;border:.75pt solid #D8D5D5;border-radius:9px;padding:8px 14px;cursor:pointer;transition:border-color .15s,background .15s}
.pr-btn:hover:not(:disabled){border-color:#1A1A1A}
.pr-btn:disabled{opacity:.45;cursor:not-allowed}
.pr-btn-ouro{background:#1A1A1A;color:#F5D273;border-color:#1A1A1A}
.pr-btn-ouro:hover:not(:disabled){background:#000}
.pr-btn-perigo{background:#C0433D;color:#fff;border-color:#C0433D}
.pr-link{background:none;border:none;color:#7A5C14;font-weight:700;font-size:12px;cursor:pointer;padding:2px 0;text-decoration:underline}
.pr-leitor{flex:1;display:flex;min-height:0}
.pr-lateral{width:420px;flex:0 0 420px;border-right:.75pt solid #D8D5D5;background:#FAFAFA;display:flex;flex-direction:column;min-height:0}
.pr-doc-wrap{flex:1;min-width:0;display:flex;flex-direction:column;background:#fff}
.pr-doc{flex:1;width:100%;border:0;background:#fff}

.pr-editor{flex:1;overflow:auto;display:flex;flex-direction:column;min-height:0}
.pr-ed-barra{padding:14px 16px;border-bottom:.75pt solid #E3E1E1;display:flex;flex-direction:column;gap:10px}
.pr-ed-status{font-size:12px;color:#5D5D5D;font-weight:600}
.pr-ed-linha{display:flex;gap:8px;flex-wrap:wrap}
.pr-ed-filtro{width:100%;font:inherit;font-size:13px;padding:9px 11px;border-radius:9px;border:.75pt solid #D8D5D5;background:#fff;color:#1A1A1A}
.pr-ed-filtro:focus{outline:2px solid #C89A2E;outline-offset:1px}
.pr-ed-lista{padding:8px 10px 24px;overflow:auto;flex:1}
.pr-ed-grupo{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#9F9F9F;margin:18px 6px 6px}
.pr-ed-bloco{border:.75pt solid #E3E1E1;border-radius:12px;background:#fff;margin-bottom:8px}
.pr-ed-bloco > summary{display:flex;align-items:center;gap:8px;padding:11px 12px;cursor:pointer;list-style:none}
.pr-ed-bloco > summary::-webkit-details-marker{display:none}
.pr-ed-bloco > summary::before{content:'';width:7px;height:7px;border-right:2px solid #9F9F9F;border-bottom:2px solid #9F9F9F;transform:rotate(-45deg);transition:transform .15s;flex:0 0 7px}
.pr-ed-bloco[open] > summary::before{transform:rotate(45deg)}
.pr-ed-bloco-nome{font-weight:800;color:#1A1A1A;font-size:13px;flex:1}
.pr-ed-bloco-n{font-size:11px;color:#9F9F9F;font-weight:600}
.pr-ed-bloco.simples{padding:2px 4px}
.pr-ed-itens{list-style:none;padding:0 6px 4px;max-height:420px;overflow:auto}
.pr-ed-bloco .pr-ed-mais{position:static;opacity:1;margin:4px 12px 12px}
.pr-ed-alterna{display:flex;gap:14px}
.pr-ed-alterna .pr-link[aria-pressed=true]{color:#1A1A1A;text-decoration:none}
.pr-imp-bloco{border-top:.75pt solid #EFEDED;padding-top:10px;display:flex;flex-direction:column;gap:6px;font-size:12.5px;color:#1A1A1A}
.pr-imp-bloco label{display:flex;gap:8px;align-items:center;cursor:pointer}
.pr-ed-refs{font-size:12px;line-height:1.45;padding:9px 11px;border-radius:9px;background:#FBEEEC;color:#8E2F2A}
.pr-validacao{font-size:12.5px;padding:10px 12px;border-radius:10px;background:#F5F5F5;color:#5D5D5D}
.pr-validacao.ok{background:#E3F1E8;color:#2E6B48;font-weight:700}
.pr-validacao.erro{background:#FBEEEC;color:#8E2F2A}
.pr-campo textarea.mono,.pr-campo textarea#prItemJson{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12px}
.pr-campo span em{font-style:normal;font-weight:500;color:#9F9F9F}
.pr-ed-item{display:flex;align-items:center;gap:6px;border-radius:10px;padding:2px 4px}
.pr-ed-item:hover{background:#EFEDED}
.pr-ed-item.atual{background:#F4EBD3}
.pr-ed-item.removida{padding:8px 10px;opacity:.75}
.pr-ed-item.removida .pr-ed-tit{text-decoration:line-through;flex:1}
.pr-ed-ir{flex:1;display:flex;gap:10px;align-items:baseline;background:none;border:none;text-align:left;padding:8px 6px;cursor:pointer;font-size:13px;color:#1A1A1A;min-width:0}
.pr-ed-tit{flex:1;min-width:0;overflow-wrap:anywhere}
.pr-ed-ctrl{display:flex;gap:2px;opacity:.35;transition:opacity .15s}
.pr-ed-item:hover .pr-ed-ctrl,.pr-ed-item:focus-within .pr-ed-ctrl{opacity:1}
.pr-ico{width:28px;height:28px;border-radius:7px;border:none;background:none;cursor:pointer;color:#5D5D5D;font-size:13px}
.pr-ico:hover{background:#fff;color:#1A1A1A}
.pr-ico.perigo:hover{color:#C0433D}
.pr-ed-insere{list-style:none;height:10px;position:relative}
.pr-ed-insere.fim{height:auto;margin-top:8px}
.pr-ed-mais{position:absolute;left:38px;top:-6px;font-size:10.5px;font-weight:700;color:#7A5C14;background:#F4EBD3;border:none;border-radius:99px;padding:2px 9px;cursor:pointer;opacity:0;transition:opacity .15s}
.pr-ed-insere:hover .pr-ed-mais,.pr-ed-mais:focus{opacity:1}
.pr-ed-insere.fim .pr-ed-mais{position:static;opacity:1;margin-left:38px}
.pr-ed-tag{font-size:10px;font-weight:800;border-radius:99px;padding:2px 8px;text-transform:uppercase;letter-spacing:.03em;white-space:nowrap}
.pr-ed-tag.nova,.pr-ed-tag.novo{background:#E3F1E8;color:#2E6B48}
.pr-ed-tag.alterada,.pr-ed-tag.alterado{background:#F4EBD3;color:#7A5C14}
.pr-ed-tag.renomeada,.pr-ed-tag.movida{background:#E9E9E9;color:#5D5D5D}
.pr-ed-tag.rem{background:#FBEEEC;color:#C0433D}
.pr-ed-tag.igual{background:#E9E9E9;color:#807E7E}

.pr-vazio{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 24px;gap:12px}
.pr-vazio h2{font-family:'Bricolage Grotesque',sans-serif;font-size:22px;color:#1A1A1A}
.pr-vazio p{max-width:460px;line-height:1.55}

.pr-aviso{position:fixed;left:50%;bottom:22px;transform:translate(-50%,20px);background:#1A1A1A;color:#fff;font-size:12.5px;font-weight:600;padding:11px 16px;border-radius:10px;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:60;max-width:90vw}
.pr-aviso.ativo{opacity:1;transform:translate(-50%,0)}

dialog.pr-dlg{border:none;border-radius:16px;padding:0;width:min(620px,94vw);max-height:88vh;box-shadow:0 24px 60px rgba(0,0,0,.25)}
dialog.pr-dlg::backdrop{background:rgba(20,20,20,.45)}
.pr-dlg-in{display:flex;flex-direction:column;max-height:88vh}
.pr-dlg-titulo{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px;color:#1A1A1A;padding:20px 22px 6px}
.pr-dlg-corpo{padding:8px 22px 6px;overflow:auto;display:flex;flex-direction:column;gap:12px}
.pr-dlg-botoes{display:flex;justify-content:flex-end;gap:8px;padding:14px 22px 18px;border-top:.75pt solid #EFEDED}
.pr-campo{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:700;color:#3A3A3A}
.pr-campo input[type=text],.pr-campo textarea,.pr-campo select{font:inherit;font-weight:500;font-size:13px;padding:9px 11px;border-radius:9px;border:.75pt solid #D8D5D5;color:#1A1A1A;background:#fff;width:100%}
.pr-campo textarea{font-size:13px;resize:vertical;line-height:1.45}
.pr-ajuda{font-size:12px;color:#807E7E;line-height:1.5}
.pr-erro{font-size:12px;color:#C0433D;font-weight:700}
.pr-check{display:flex;gap:8px;align-items:center;font-size:12.5px;color:#3A3A3A}
.pr-imp-resumo{font-size:12.5px;font-weight:700;color:#1A1A1A}
.pr-imp-lista{list-style:none;display:flex;flex-direction:column;gap:4px;max-height:280px;overflow:auto;border:.75pt solid #EFEDED;border-radius:10px;padding:8px 10px}
.pr-imp-lista label{display:flex;gap:8px;align-items:center;font-size:12.5px;color:#1A1A1A;cursor:pointer}
.pr-pub-resumo{list-style:none;display:flex;flex-direction:column;gap:6px;font-size:12.5px;color:#3A3A3A;line-height:1.45}
.pr-hist{list-style:none;display:flex;flex-direction:column;gap:12px}
.pr-hist li{border-bottom:.75pt solid #EFEDED;padding-bottom:10px}
.pr-hist-cab{display:flex;gap:8px;align-items:center;flex-wrap:wrap;color:#1A1A1A}
.pr-hist-meta{font-size:11.5px;color:#9F9F9F}
.pr-hist-desc{font-size:12.5px;margin:4px 0;line-height:1.45}

body[data-modo=versao] .pr-doc-wrap{outline:3px solid #F5D273;outline-offset:-3px}

@media (max-width:860px){
  .pr-leitor{flex-direction:column}
  .pr-lateral{width:auto;flex:0 0 auto;border-right:none;border-bottom:.75pt solid #D8D5D5}
  .pr-ed-lista{max-height:45vh}
  .pr-doc-wrap{min-height:75vh}
  .pr-ed-ctrl{opacity:1}
}
`;

export const PROCESSOS_HTML = `
<header class="pr-topo">
  <a class="pr-logo" href="/" aria-label="Voltar ao painel"><img src="/logo/moai-logo-black.png" alt="MOAI"></a>
  <div class="pr-topo-txt"><h1 class="pr-titulo" id="prTitulo">Processos de CS</h1><div class="pr-meta" id="prMeta">Carregando…</div></div>
  <div class="pr-topo-acoes"><span id="prAcoesTopo"></span><a class="pr-voltar" href="/">Voltar ao painel</a></div>
</header>
<div class="pr-vazio" id="prVazio" hidden></div>
<div class="pr-leitor" id="prLeitor">
  <aside class="pr-lateral" id="prEditor" hidden>
    <div class="pr-ed-barra">
      <div class="pr-ed-status" id="prEdStatus"></div>
      <div class="pr-ed-linha">
        <button type="button" class="pr-btn pr-btn-ouro" id="prEdPublicar" data-acao="publicar">Publicar</button>
        <button type="button" class="pr-btn" data-acao="importar">Importar HTML atualizado</button>
        <button type="button" class="pr-btn" id="prEdDesfazer" data-acao="desfazer">Desfazer</button>
      </div>
      <div class="pr-ed-linha">
        <button type="button" class="pr-link" data-acao="historico">Histórico de versões</button>
        <button type="button" class="pr-link" id="prEdDescartar" data-acao="descartar">Descartar rascunho</button>
        <button type="button" class="pr-link" data-acao="sair-edicao">Sair da edição</button>
      </div>
      <div class="pr-ed-refs" id="prEdRefs" role="alert" hidden></div>
      <input class="pr-ed-filtro" id="prEdFiltro" type="search" placeholder="Encontrar item para editar" aria-label="Encontrar item para editar" autocomplete="off">
    </div>
    <div class="pr-ed-lista" id="prEdLista"></div>
  </aside>
  <main class="pr-doc-wrap">
    <iframe class="pr-doc" id="prDoc" title="Documento de processos" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals" allow="fullscreen; clipboard-write"></iframe>
  </main>
</div>
<dialog class="pr-dlg" id="prDlg"><div class="pr-dlg-in">
  <div class="pr-dlg-titulo" id="prDlgTitulo"></div>
  <div class="pr-dlg-corpo" id="prDlgCorpo"></div>
  <div class="pr-dlg-botoes" id="prDlgBotoes"></div>
</div></dialog>
<div class="pr-aviso" id="prAviso" role="status" aria-live="polite"></div>
`;
