# Backup e restauração do banco

Este documento descreve o backup diário do banco do dash de CS, como verificar que ele funciona e como restaurar. O backup existe porque o plano gratuito do Supabase não tem backup automático, e porque parte do histórico (transições de status, fotografias mensais, reconquistas) só existe no banco.

## O que é copiado

O workflow `.github/workflows/backup-banco.yml` roda todo dia às 06h17 UTC e pode ser disparado manualmente. Ele gera um `pg_dump` em formato custom com os schemas `public`, `seguranca`, `canonico` e `sincronia` (os três últimos só entram se existirem). Junto com o dump, gera um arquivo de contagens com o número exato de linhas de cada tabela desses schemas, usado pelo teste de restauração.

Tudo que sai do runner é criptografado com AES256 pela frase `BACKUP_PASSPHRASE` antes de virar artefato. O repositório é público, então nenhum dump ou contagem em texto plano pode ser publicado.

### Decisão: o backup não inclui o schema `auth` nem o Storage

Verificado em 30/10/2026: o Storage não tem objetos (as fotos ficam em tabelas, como `cs_fotos` e `conselheiros_fotos`), e o schema `auth` tem 10 usuários, todos com login Google. Nenhuma tabela de `public` referencia o id de usuário do `auth`: os vínculos são feitos por e-mail. Por isso o backup não copia o schema `auth` nem o Storage.

Consequência: se o projeto for perdido, os usuários precisam ser recriados no Supabase Auth pelo login Google, e os vínculos de permissão voltam a funcionar pelo e-mail. Se, no futuro, alguma tabela passar a guardar o id do `auth`, esta decisão precisa ser revista e o schema `auth` deve entrar no dump.

### Decisão: `public.sync_log` fica fora das contagens

O dump não traz os dados de `public.sync_log` (`--exclude-table-data`), porque o volume é alto e a tabela é só de registro operacional. Por isso essa tabela também não entra nas contagens, senão a comparação falharia sempre.

## Como o teste de restauração funciona

O job `teste-restauracao` sobe um Postgres 17 descartável como serviço do GitHub Actions, cria os papéis `anon`, `authenticated` e `service_role`, cria o schema `auth` com funções stub (`auth.uid()`, `auth.jwt()`, `auth.role()`) para que as policies restaurem, descriptografa o dump e roda `pg_restore --no-owner --no-acl`. Depois conta as linhas de cada tabela restaurada e compara com o arquivo de contagens da produção. Se qualquer tabela divergir, em qualquer direção, o job falha.

Erros isolados no `pg_restore` (por exemplo, extensões que a instância de teste não tem, como `pg_net` e `pg_cron`) não reprovam o teste por si. O critério de sucesso é a contagem.

## Como baixar um backup

1. Abra a execução desejada em Actions, na aba do workflow "Backup do banco".
2. Baixe o artefato `backup-banco-<id da execução>`. Ele contém `banco.dump.gpg` e `contagens.json.gpg`.
3. Guarde o artefato fora do GitHub se for usá-lo por muito tempo. O artefato expira em 35 dias.

## Procedimento de restauração completa

Pré-requisito: a frase `BACKUP_PASSPHRASE`, guardada fora do GitHub, por exemplo em um gerenciador de senhas.

1. Descriptografe os arquivos:

```bash
gpg --decrypt --output banco.dump banco.dump.gpg
gpg --decrypt --output contagens.json contagens.json.gpg
```

2. Crie ou escolha o banco de destino. Se for um projeto novo do Supabase, antes de restaurar crie os papéis `anon`, `authenticated` e `service_role` e as extensões que o schema usa (`pgcrypto`, `uuid-ossp`, `pg_cron`, `pg_net`, `supabase_vault`).

3. Restaure:

```bash
pg_restore --no-owner --no-acl --dbname="<URL do banco de destino>" banco.dump
```

4. Confira as contagens. Rode `scripts/backup/contagens.sql` contra o banco restaurado, exporte em formato de tabela separada por tabulação e compare com `contagens.json` pelo script `scripts/backup/comparar_contagens.py`.

## Procedimento de restauração de uma tabela

Para recuperar só uma tabela, sem tocar nas demais:

```bash
pg_restore --no-owner --no-acl -t nome_da_tabela --dbname="<URL do banco de destino>" banco.dump
```

Se a tabela já existir no destino com dados, não restaure por cima. Primeiro mova o conteúdo atual para uma tabela temporária, ou restaure num banco separado e copie as linhas faltantes com `insert ... select ... on conflict do nothing`. Restaurar por cima de uma tabela viva pode duplicar ou sobrescrever dados.

## Para recuperar uma linha excluída

Exclusões em tabelas protegidas passam pela lixeira da normativa (`seguranca.lixeira`), e a restauração de uma linha pode ser feita pela função `seguranca.restaurar(id)` sem recorrer ao backup. O backup serve para perdas maiores, por exemplo uma tabela inteira ou uma alteração em massa.

## Limites conhecidos

- O backup é diário. A perda máxima de dados em um incidente é de até 24 horas de escrita, mais o que já estiver na lixeira ou nas versões.
- O schema `auth` e o Storage não entram (ver decisão acima).
- O backup depende de dois segredos: `SUPABASE_DB_URL` (URI do Session pooler, porta 5432) e `BACKUP_PASSPHRASE`. Se a frase for perdida, o backup fica ilegível.
- Trocar a senha do banco no painel do Supabase exige atualizar `SUPABASE_DB_URL` no GitHub.
