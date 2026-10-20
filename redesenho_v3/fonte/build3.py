import pathlib
s=pathlib.Path('src3'); o=pathlib.Path('dist3'); o.mkdir(exist_ok=True)
base=(s/'base.css').read_text(encoding='utf-8'); ic=(s/'icons.svg').read_text(encoding='utf-8'); sp=(s/'spark.js').read_text(encoding='utf-8')
for n in ['home.html','gestor.html','cs.html']:
    t=(s/n).read_text(encoding='utf-8').replace('/*BASE*/',base).replace('<!--ICONS-->',ic).replace('/*SPARK*/',sp)
    (o/n).write_text(t,encoding='utf-8')
print('ok')
