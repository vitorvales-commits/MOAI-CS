import re,pathlib
def mi(href,ico,t,s,on=False,badge=''):
    return f'<a class="mi{" on" if on else ""}" href="{href}" role="menuitem"><span class="ico"><svg><use href="#{ico}"/></svg></span><span><b>{t}</b><small>{s}</small></span>{badge}</a>'
def grp(ico,lbl,titulo,itens,on=False,badge=''):
    return (f'<div class="grp{" on" if on else ""}"><button type="button" class="grp-btn" aria-haspopup="true" aria-expanded="false" aria-label="{titulo}">'
            f'<svg aria-hidden="true"><use href="#{ico}"/></svg><span class="grp-lbl">{lbl}</span>{badge}</button>'
            f'<div class="menu" role="menu"><span class="menu-h">{titulo}</span>{"".join(itens)}</div></div>')
def dock(grupos,av,avcor,avtxtcor='#fff',placeholder='Pergunte ou busque'):
    return ('<header class="dock-wrap"><nav class="dock" aria-label="Navegação principal">'
      '<a class="dock-brand" href="#"><span class="brand-mark">M</span><span class="brand-txt">MOAI<small>CS</small></span></a><span class="dock-sep"></span>'
      + ''.join(grupos) +
      f'<span class="dock-fill"></span><label class="dsearch"><svg aria-hidden="true"><use href="#i-search"/></svg><input type="text" aria-label="{placeholder}" placeholder="{placeholder}"><kbd>Ctrl K</kbd></label>'
      '<span class="dsync" title="Monday sincronizado às 12:07"><i></i>12:07</span>'
      f'<span class="av" style="background:{avcor};color:{avtxtcor}" aria-label="Perfil">{av}</span></nav></header>')
B5='<span class="nbadge">5</span>'
def gestor(active):
    g1=[mi('gestor.html','i-area','Visão da área','Situação e fila de ação',active=='area',B5),mi('cs.html','i-users','Time','Página de cada CS',active=='time'),mi('#','i-layers','Conselhos','Rede, presença e GTD'),mi('#','i-target','Metas e destaques','Metas do mês e recordes')]
    g2=[mi('#','i-shield','Churn e reconquista','Saídas, motivos e retorno'),mi('#','i-pulse','NPS e Pulso de CS','Voz do membro e do time'),mi('#','i-flag','Fila da liderança','Pedidos para a liderança')]
    g3=[mi('#','i-gear','Controle de perfis','Vínculos e permissões'),mi('home.html','i-home','Ver como CS','A home que o CS enxerga')]
    lbl={'area':'Visão da área','time':'Time · Amanda'}[active]
    ico={'area':'i-area','time':'i-users'}[active]
    return dock([grp(ico,lbl,'Gestão',g1,True,B5 if active=='area' else ''),grp('i-shield','Saúde','Saúde da base',g2),grp('i-gear','Sistema','Sistema',g3)],'V','var(--gold)','var(--side)','Pergunte: o que a Luana não bateu?')
def cs():
    g1=[mi('home.html','i-home','Início','Seu dia e seu mês',True),mi('#','i-cal','Agenda','Conselhos e rounds'),mi('#','i-layers','Meus conselhos','Membros, presença e GTD')]
    g2=[mi('#','i-target','Meus indicadores','Metas contra o realizado'),mi('#','i-shield','Pontos tomados','Advertências ativas')]
    g3=[mi('#','i-file','Report semanal','Vence sexta às 19h',False,'<span class="nbadge gold">1</span>')]
    g4=[mi('gestor.html','i-area','Visão da área','Se você também é gestor')]
    return dock([grp('i-home','Início','Meu trabalho',g1,True),grp('i-target','Desempenho','Desempenho',g2),grp('i-file','Report','Report',g3,False,'<span class="nbadge gold">1</span>'),grp('i-area','Gestor','Gestor',g4)],'A','#7A5A1C',placeholder='Buscar conselho ou membro')
src=pathlib.Path('src3')
for n,d in [('gestor.html',gestor('area')),('cs.html',gestor('time')),('home.html',cs())]:
    p=src/n; t=p.read_text(encoding='utf-8')
    t=re.sub(r'\s*<aside class="side">.*?</aside>\s*','\n',t,flags=re.S)
    t=t.replace('<div class="app">','<div class="app">\n'+d,1)
    t=re.sub(r'<label class="cmd">.*?</label>\s*','',t,flags=re.S)
    p.write_text(t,encoding='utf-8')
    print(n,'side' in t and 'class="side"' in t, t.count('class="grp'))
