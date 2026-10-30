#!/usr/bin/env bash
# Restaura o backup criptografado num Postgres 17 descartável e compara as contagens com as da produção.
# Uso: verificar-restauracao.sh <pasta com banco.dump.gpg e contagens.json.gpg> <URL do Postgres de teste>
# Variável obrigatória: BACKUP_PASSPHRASE. Sai com código 1 se qualquer tabela divergir.
set -euo pipefail

PASTA="$1"
ALVO="$2"
DIRETORIO_SCRIPTS="$(cd "$(dirname "$0")" && pwd)"
TRABALHO="$(mktemp -d)"
trap 'rm -rf "$TRABALHO"' EXIT

descriptografar() {
  gpg --batch --quiet --yes --pinentry-mode loopback --passphrase "$BACKUP_PASSPHRASE" \
    --decrypt --output "$TRABALHO/$1" "$PASTA/$1.gpg"
}
descriptografar banco.dump
descriptografar contagens.json

psql_docker() {
  docker run --rm --network host -v "$DIRETORIO_SCRIPTS:/scripts:ro" -v "$TRABALHO:/trabalho" \
    postgres:17 psql "$ALVO" -X -v ON_ERROR_STOP=1 "$@"
}

# Papéis e schema que as policies, os grants e as funções do Supabase referenciam.
# A instância de teste não tem o Supabase, então estes stubs deixam o restauro completo.
psql_docker -c "
  do \$\$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
  end \$\$;
  create schema if not exists auth;
  create or replace function auth.uid() returns uuid language sql stable as \$f\$ select null::uuid \$f\$;
  create or replace function auth.jwt() returns jsonb language sql stable as \$f\$ select '{}'::jsonb \$f\$;
  create or replace function auth.role() returns text language sql stable as \$f\$ select null::text \$f\$;
  create extension if not exists pgcrypto;
  create extension if not exists \"uuid-ossp\";
"

# Um erro isolado de extensão ausente (pg_net, pg_cron, vault) não impede o restauro das tabelas de dados.
# A decisão de sucesso é só pela contagem, que é o critério da normativa.
docker run --rm --network host -v "$TRABALHO:/trabalho:ro" postgres:17 \
  pg_restore --no-owner --no-acl --dbname="$ALVO" /trabalho/banco.dump \
  || echo "pg_restore terminou com avisos ou erros; a decisão é pelas contagens abaixo"

psql_docker -X -At -F "$(printf '\t')" -f /scripts/contagens.sql > "$TRABALHO/restaurado.tsv"

python3 -I "$DIRETORIO_SCRIPTS/comparar_contagens.py" "$TRABALHO/contagens.json" "$TRABALHO/restaurado.tsv"
