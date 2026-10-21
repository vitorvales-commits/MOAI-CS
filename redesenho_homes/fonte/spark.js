document.querySelectorAll('svg.spark').forEach(function(s){
  var v=s.dataset.v.split(',').map(Number),W=76,H=24,p=3,mn=Math.min.apply(0,v),mx=Math.max.apply(0,v),r=(mx-mn)||1;
  var pts=v.map(function(x,i){return [p+i*(W-2*p)/(v.length-1),H-p-(x-mn)/r*(H-2*p)];});
  var c=s.dataset.bad?'#C0433D':'#1A1A1A',l=pts[pts.length-1];
  s.setAttribute('viewBox','0 0 '+W+' '+H);
  s.innerHTML='<polyline fill="none" stroke="'+c+'" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" points="'+pts.map(function(q){return q.join(',');}).join(' ')+'"/><circle cx="'+l[0]+'" cy="'+l[1]+'" r="2.4" fill="'+c+'"/>';
});
document.querySelectorAll('.seg,.filtros').forEach(function(g){
  g.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;g.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x===b);});});
});
/* Dock: abre por hover, foco ou toque; fecha com Esc ou clique fora */
(function(){
  var grps=[].slice.call(document.querySelectorAll('.grp'));
  function fechar(ex){grps.forEach(function(g){if(g!==ex){g.classList.remove('aberto');g.querySelector('.grp-btn').setAttribute('aria-expanded','false');}});}
  grps.forEach(function(g){
    var b=g.querySelector('.grp-btn');
    g.addEventListener('mouseenter',function(){b.setAttribute('aria-expanded','true');});
    g.addEventListener('mouseleave',function(){if(!g.classList.contains('aberto'))b.setAttribute('aria-expanded','false');});
    b.addEventListener('click',function(e){e.stopPropagation();var abre=!g.classList.contains('aberto');fechar(g);g.classList.toggle('aberto',abre);b.setAttribute('aria-expanded',String(abre));});
  });
  document.addEventListener('click',function(e){if(!e.target.closest('.grp'))fechar();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){fechar();if(document.activeElement)document.activeElement.blur();}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){var i=document.querySelector('.dsearch input');if(i){e.preventDefault();i.focus();}}});
})();
