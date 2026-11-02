#!/usr/bin/env bash
# Aplica uma migração de supabase/migrations na produção, sempre com o mesmo arquivo transacional que foi
# testado na cópia restaurada. Usado por .github/workflows/aplicar-migracao.yml.
#
# Uso:
#   aplicar-migracao.sh checar  <arquivo.sql>   recusa se o nome já consta em supabase_migrations.schema_migrations (DB_URL)
#   aplicar-migracao.sh testar  <arquivo.sql>   aplica na cópia restaurada (ALVO), com --single-transaction
#   aplicar-migracao.sh aplicar <arquivo.sql>   aplica na produção (DB_URL), com --single-transaction e registro
#
# Variáveis: DB_URL (produção), ALVO (cópia restaurada). Nenhuma senha aparece na linha de comando.
set -euo pipefail

MODO="$1"
ARQUIVO="$2"
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
DIR_SCRIPTS="$RAIZ/scripts/backup"
ORIGEM="$RAIZ/supabase/migrations/$ARQUIVO"
NOME="$(basename "$ARQUIVO" .sql)"

if ! [[ "$ARQUIVO" =~ ^[0-9]{8}[a-z]?_[a-z0-9_]+\.sql$ ]]; then
  echo "nome de arquivo inválido: $ARQUIVO" >&2
  exit 1
fi
if [ ! -f "$ORIGEM" ]; then
  echo "arquivo não existe em supabase/migrations: $ARQUIVO" >&2
  exit 1
fi
# A transação é do próprio aplicador. Um begin ou commit dentro do arquivo quebraria a garantia de tudo ou nada.
if grep -qiE '^[[:space:]]*(begin|commit|rollback)[[:space:]]*;' "$ORIGEM"; then
  echo "a migração não pode conter begin, commit ou rollback: a transação é do aplicador" >&2
  exit 1
fi

TRABALHO="$(mktemp -d)"
trap 'rm -rf "$TRABALHO"' EXIT

# Roda psql num container postgres:17 com a rede do host. A URL vai por variável de ambiente.
psql_em() {
  local url="$1"
  shift
  docker run --rm -i --network host -e URL_BANCO="$url" \
    -v "$RAIZ/supabase/migrations:/migracoes:ro" -v "$TRABALHO:/trabalho" \
    postgres:17 sh -c 'psql "$URL_BANCO" -X -v ON_ERROR_STOP=1 "$@"' sh "$@"
}

# Quantas vezes o nome da migração consta no registro. Zero significa que ainda não foi aplicada.
contar_registro() {
  psql_em "$1" -At -v nome="$NOME" <<'SQL'
select count(*) from supabase_migrations.schema_migrations where name = :'nome';
SQL
}

# Arquivo transacional: a migração e a linha de registro. Vai inteiro para o --single-transaction.
montar_transacao() {
  local versao
  versao="$(date -u +%Y%m%d%H%M%S)"
  cp "$ORIGEM" "$TRABALHO/transacao.sql"
  printf "\ninsert into supabase_migrations.schema_migrations (version, name) values ('%s', '%s');\n" \
    "$versao" "$NOME" >> "$TRABALHO/transacao.sql"
  echo "$versao"
}

case "$MODO" in
  checar)
    : "${DB_URL:?DB_URL obrigatória}"
    if [ "$(contar_registro "$DB_URL")" != "0" ]; then
      echo "recusado: $NOME já consta em supabase_migrations.schema_migrations da produção" >&2
      exit 1
    fi
    echo "ok: $NOME ainda não foi aplicada na produção"
    ;;

  testar)
    : "${ALVO:?ALVO obrigatória}"
    cp "$DIR_SCRIPTS/copia_stubs.sql" "$TRABALHO/copia_stubs.sql"
    psql_em "$ALVO" -q -f /trabalho/copia_stubs.sql
    montar_transacao > /dev/null
    psql_em "$ALVO" -q --single-transaction -f /trabalho/transacao.sql
    echo "migração aplicada na cópia restaurada: $NOME"
    echo "registro na cópia: $(contar_registro "$ALVO") linha(s)"
    ;;

  aplicar)
    : "${DB_URL:?DB_URL obrigatória}"
    if [ "$(contar_registro "$DB_URL")" != "0" ]; then
      echo "recusado: $NOME já consta em supabase_migrations.schema_migrations da produção" >&2
      exit 1
    fi
    montar_transacao > /dev/null
    psql_em "$DB_URL" -q --single-transaction -f /trabalho/transacao.sql
    echo "aplicada e registrada na produção: $NOME"
    echo "registro: $(contar_registro "$DB_URL") linha(s)"
    ;;

  *)
    echo "modo inválido: $MODO (use checar, testar ou aplicar)" >&2
    exit 1
    ;;
esac
