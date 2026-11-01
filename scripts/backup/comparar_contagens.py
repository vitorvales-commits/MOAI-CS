"""Compara as contagens da produção (JSON) com as da cópia restaurada (TSV).

Uso: comparar_contagens.py producao.json restaurado.tsv
Sai com código 1 se qualquer tabela divergir, em qualquer direção (faltando, sobrando ou com outro total).
"""
import json
import sys

producao = json.load(open(sys.argv[1], encoding="utf-8"))
restaurado = {}
with open(sys.argv[2], encoding="utf-8") as arquivo:
    for linha in arquivo:
        tabela, linhas = linha.rstrip("\n").split("\t")
        restaurado[tabela] = int(linhas)

divergencias = [
    (tabela, producao.get(tabela), restaurado.get(tabela))
    for tabela in sorted(set(producao) | set(restaurado))
    if producao.get(tabela) != restaurado.get(tabela)
]
for tabela, esperado, obtido in divergencias:
    print(f"DIVERGE {tabela}: produção {esperado}, restaurado {obtido}")
print(f"{len(producao)} tabela(s) comparada(s), {len(divergencias)} divergência(s)")
sys.exit(1 if divergencias else 0)
