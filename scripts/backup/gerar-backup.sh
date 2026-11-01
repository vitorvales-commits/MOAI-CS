#!/usr/bin/env bash
# Gera o dump do banco e as contagens de linhas no mesmo snapshot. Roda dentro da imagem postgres:17
# (ver backup-banco.yml). Grava só em $SAIDA; quem chama é responsável por criptografar antes de
# publicar qualquer arquivo.
#
# Por que um snapshot: o sync de 5 minutos e o uso do dash inserem linhas o tempo todo. Se as contagens
# e o pg_dump lessem momentos diferentes, a restauração divergiria sem defeito real. Por isso uma sessão
# exporta um snapshot e o segura aberto; as contagens e o pg_dump importam esse mesmo id; só então a
# sessão recebe commit.
set -euo pipefail

SAIDA="${SAIDA:-/saida}"
SCRIPTS="${SCRIPTS:-/scripts}"
SCHEMAS_PROTEGIDOS="'public', 'seguranca', 'canonico', 'sincronia'"

if [ -z "${DB_URL:-}" ]; then
  echo 'DB_URL ausente' >&2
  exit 1
fi

TRABALHO="$(mktemp -d)"
ENTRADA="$TRABALHO/entrada"
SAIDA_SNAPSHOT="$TRABALHO/snapshot"
SAIDA_SCHEMAS="$TRABALHO/schemas"
SNAP_PID=""

# Encerra a sessão que segura o snapshot em qualquer saída, inclusive erro. Sem isso, ela ficaria com
# uma transação aberta no banco de produção.
limpar() {
  exec 3>&- 2>/dev/null || true
  if [ -n "$SNAP_PID" ]; then
    kill "$SNAP_PID" 2>/dev/null || true
    wait "$SNAP_PID" 2>/dev/null || true
  fi
  rm -rf "$TRABALHO"
}
trap limpar EXIT

mkfifo "$ENTRADA"

# Sessão 1: abre a transação somente leitura, lista os schemas que existem e exporta o snapshot. Fica
# aberta lendo comandos do FIFO até receber commit. A saída principal vai para um arquivo, e nele só
# entra o id do snapshot, porque a lista de schemas é desviada com \o para outro arquivo.
psql "$DB_URL" -q -X -At -v ON_ERROR_STOP=1 < "$ENTRADA" > "$SAIDA_SNAPSHOT" &
SNAP_PID=$!
exec 3> "$ENTRADA"
printf '%s\n' \
  'begin isolation level repeatable read read only;' \
  "\\o $SAIDA_SCHEMAS" \
  "select nspname from pg_namespace where nspname in ($SCHEMAS_PROTEGIDOS) order by nspname;" \
  '\o' \
  'select pg_export_snapshot();' >&3

# Espera o id do snapshot. O formato é fixo (ex.: 00000003-0000001B-1), então o filtro não pega nada além dele.
SNAP=""
for _ in $(seq 1 300); do
  if grep -Eq '^[0-9A-F]+-[0-9A-F]+-[0-9]+$' "$SAIDA_SNAPSHOT" 2>/dev/null; then
    SNAP="$(grep -E '^[0-9A-F]+-[0-9A-F]+-[0-9]+$' "$SAIDA_SNAPSHOT" | head -n1)"
    break
  fi
  if ! kill -0 "$SNAP_PID" 2>/dev/null; then
    echo 'a sessão do snapshot terminou antes de exportar o id' >&2
    exit 1
  fi
  sleep 0.2
done
if [ -z "$SNAP" ]; then
  echo 'snapshot não exportado em 60 segundos' >&2
  exit 1
fi

ARGS=()
while IFS= read -r schema; do
  if [ -n "$schema" ]; then
    ARGS+=("--schema=$schema")
  fi
done < "$SAIDA_SCHEMAS"

# Sessão 2: contagens dentro do snapshot. Exata (count(*) por tabela, não a estimativa do planejador).
# public.sync_log fica fora porque o dump não traz os dados dela (--exclude-table-data).
psql "$DB_URL" -q -X -At -F "$(printf '\t')" -v ON_ERROR_STOP=1 > "$SAIDA/contagens.tsv" <<EOF
begin isolation level repeatable read read only;
set transaction snapshot '$SNAP';
\i $SCRIPTS/contagens.sql
commit;
EOF

# pg_dump no mesmo snapshot. A sessão 1 continua aberta, então o id ainda é válido.
pg_dump "$DB_URL" --format=custom --snapshot="$SNAP" --file="$SAIDA/banco.dump" \
  "${ARGS[@]}" --exclude-table-data=public.sync_log

# Só depois do dump a sessão 1 recebe commit e é encerrada.
printf 'commit;\n' >&3
exec 3>&-
wait "$SNAP_PID"
SNAP_PID=""

echo "dump gerado: $(wc -c < "$SAIDA/banco.dump") bytes, $(wc -l < "$SAIDA/contagens.tsv") tabelas contadas, snapshot $SNAP"
