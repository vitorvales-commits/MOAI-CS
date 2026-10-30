#!/bin/sh
# Gera o dump do banco e as contagens de linhas. Roda dentro da imagem postgres:17 (ver backup-banco.yml).
# Grava só em /saida; quem chama é responsável por criptografar antes de publicar qualquer arquivo.
set -eu

SAIDA=/saida
SCHEMAS="public seguranca canonico sincronia"

if [ -z "${DB_URL:-}" ]; then
  echo 'DB_URL ausente' >&2
  exit 1
fi

# Contagem exata (count(*) por tabela, não a estimativa do planejador). public.sync_log fica de fora:
# o dump não traz os dados dela (--exclude-table-data), então a conta da produção e a restaurada
# nunca bateriam.
psql "$DB_URL" -X -At -F "$(printf '\t')" -v ON_ERROR_STOP=1 -f /scripts/contagens.sql > "$SAIDA/contagens.tsv"

ARGS=""
for schema in $SCHEMAS; do
  existe=$(psql "$DB_URL" -X -At -c "select count(*) from pg_namespace where nspname = '$schema'")
  if [ "$existe" = "1" ]; then
    ARGS="$ARGS --schema=$schema"
  fi
done

# Nenhum schema em ARGS além dos existentes: pg_dump falharia com schema inexistente.
# shellcheck disable=SC2086
pg_dump "$DB_URL" --format=custom --file="$SAIDA/banco.dump" $ARGS --exclude-table-data=public.sync_log

echo "dump gerado: $(ls -l "$SAIDA/banco.dump" | awk '{print $5}') bytes, $(wc -l < "$SAIDA/contagens.tsv") tabelas contadas"
