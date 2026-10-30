"""Converte o TSV de contagens (tabela, linhas) em JSON. Uso: tsv_para_json.py entrada.tsv saida.json"""
import json
import sys

entrada, saida = sys.argv[1], sys.argv[2]
contagens = {}
with open(entrada, encoding="utf-8") as arquivo:
    for linha in arquivo:
        tabela, linhas = linha.rstrip("\n").split("\t")
        contagens[tabela] = int(linhas)

with open(saida, "w", encoding="utf-8") as arquivo:
    json.dump(contagens, arquivo, indent=2, sort_keys=True)
    arquivo.write("\n")

print(f"{len(contagens)} tabela(s) contada(s)")
