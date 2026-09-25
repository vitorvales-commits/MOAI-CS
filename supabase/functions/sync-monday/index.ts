// ============================================================================
// MOAI CS Dashboard — sync-monday (Supabase Edge Function)
//
// Espelha os boards do Monday.com usados pelo dashboard de CS pra dentro do
// Postgres (Supabase), substituindo o CacheService + Cache_Historico do
// Code.gs original. Roda agendada via pg_cron (ver migração
// `agendar_sync_monday`) e pode ser chamada manualmente também.
//
// Ponto 1 do pedido do Vitor (dashboard lento, migrar pra Vercel/Supabase):
// esta função é o "motor" que mantém os dados frescos no Postgres — o app em
// Next.js (Vercel) nunca fala com o Monday na hora do acesso, só lê daqui,
// que é ordens de magnitude mais rápido que Apps Script + Monday API.
//
// Mesmos board IDs e column IDs do Code.gs (Code.Gs no projeto MOAI) —
// qualquer mudança de coluna no Monday precisa ser replicada aqui também.
//
// v2 (17/09/2026): corrige três queries GraphQL (metas, rounds, cases) que
// tinham uma chave de fechamento "}" sobrando no final — a Monday tolerava
// isso na maioria das vezes mas quebrou de forma intermitente no board de
// Rounds ("Unexpected }"). Corrige também o upsert de conselhos_grupos, que
// podia falhar quando um grupo aparecia ao mesmo tempo como "ativo" e como
// destino de reposição na mesma leva (ON CONFLICT não pode afetar a mesma
// linha duas vezes no mesmo comando).
//
// v6 (21/09/2026 — auditoria de segurança/hardening de produção): a função
// era pública e sem nenhuma verificação (verify_jwt=false, sem checagem
// própria) — qualquer pessoa com a URL podia disparar sincronizações à
// vontade (abuso/DoS contra a API do Monday, além de expor o corpo da
// resposta com status/erro de cada board pra qualquer chamador anônimo).
// Duas camadas agora: (1) verify_jwt=true na configuração da função exige um
// JWT Supabase válido no header Authorization; (2) um segredo compartilhado
// (X-Sync-Secret) é checado explicitamente aqui dentro, então mesmo alguém
// com a chave anon (que não é secreta por natureza no modelo Supabase) não
// consegue chamar a função sem também ter esse segredo. O pg_cron já foi
// atualizado pra mandar os dois.
//
// v7 (21/09/2026): este arquivo passa a existir também no repositório git
// (supabase/functions/sync-monday/index.ts) — antes só existia como deploy
// direto no Supabase, sem histórico/diff revisável. SYNC_FUNCTION_SECRET
// continua hardcoded abaixo (não migrei pra Deno.env desta vez: fazer isso
// exigiria também rodar `supabase secrets set` pra configurar o valor no
// projeto, e esta sessão não tem acesso à CLI/Management API do Supabase
// pra isso — só à API REST/SQL via MCP. Migrar sem conseguir setar o
// secret quebraria a autenticação da função pro pg_cron, que hoje manda o
// mesmo valor fixo no header X-Sync-Secret. Fica documentado aqui como
// pendência pro Vitor rodar localmente quando puder: mesma recomendação já
// anotada na nota v6 abaixo).
//
// v7 (21/09/2026 — pedido do Vitor): ACTIVE_TO_REPO_MAP é uma tabela fixa
// portada do Code.gs que liga grupo ativo -> grupo de reposição; ela não se
// atualiza sozinha quando um conselho novo é criado no Monday (foi assim que
// "Fast Track | Livia", group_mm331w1n, ficou sem repo_group_id — e nesse
// caso específico nem existe grupo de reposição pra ela ainda no board, quem
// tem que criar é o time, não dá pra inventar um id). Como reforço da tabela
// fixa (que continua tendo prioridade), syncConselhos agora tenta resolver
// por casamento de nome — mesmo espírito do casamento já usado em
// APELIDOS_AGENDA no app Next.js — qualquer grupo ativo sem entrada válida
// no mapa, registrando um aviso no log quando cai nesse caminho (ou quando
// nem por nome encontra nada). Ver resolverRepoGroupIdPorNome.
//
// v12 (23/09/2026 — pedido do Vitor): duas coisas novas, ambas alimentando o
// drill down do conselho (lib/reports.ts no Next.js):
// (1) syncConselheirosFotos baixa a foto de cada conselheiro do board
//     "Conselheiros 2026" (coluna file_mm519xd1, tipo file) e guarda como
//     data URI base64 em conselheiros_fotos — a URL que o Monday devolve pro
//     asset (S3 assinado, "protected_static") expira em 1h, não dá pra só
//     guardar a URL. Throttle: só baixa de novo quando o assetId mudou (foto
//     trocada de verdade), comparando com monday_asset_id já salvo — o board
//     tem só ~35 itens e a foto quase nunca muda, então isso normalmente é
//     zero downloads por execução.
// (2) syncConselhos agora compara, antes de sobrescrever, o status
//     anterior x novo de cada membro+mês em conselhos_status_mensal (que é
//     só um snapshot — nunca guardou o valor anterior) e loga toda mudança
//     em conselhos_status_historico (append-only). É a base pro cálculo de
//     no-show (confirmou presença e depois o status virou falta) — setembro
//     de 2026 é o "mês zero" desse log: não dá pra reconstruir transições
//     anteriores a esta versão existir, começa a valer a partir de agora.
//
// v13 (24/09/2026 — pedido do Vitor, aba "Conselhos" da home): (1)
// syncConselheiros espelha o perfil de cada conselheiro do board
// "Conselheiros 2026" (segmento, perfis, especialidade, status de
// engajamento — de onde saem os selos "ATENÇÃO"/"CONGELADO" dos cartões —,
// e-mail, data de entrada, faturamento, dados pessoais) em `conselheiros`;
// só texto, leve, roda junto com o resto a cada execução (a foto continua
// em syncConselheirosFotos, com throttle próprio). (2) syncConselhos passa
// a guardar também Plaquinha e Status de Pagamento de cada membro.
//
// v14 (25/09/2026 — pedido do Vitor): syncConselhos para de ler a coluna
// Plaquinha (color_mm52vb2t) — decisão fechada com o Vitor: plaquinha e
// crachá ficam de fora de tudo, nem sincronizados. A coluna plaquinha em
// conselhos_membros continua existindo no banco (não migrada por não ser
// destrutiva mantê-la parada), só não é mais escrita nem lida por ninguém.
//
// v16 (25/09/2026 — diagnóstico do Vitor: "matchmaking tem 127 no monday e
// 129 na aba de indicadores"): causa raiz confirmada — matchmakings_items
// tinha 2 linhas de itens já apagados/movidos no Monday que nunca saíram do
// Supabase, porque nenhuma sync fazia delete, só upsert. Sistêmico (qualquer
// board acumula lixo assim). Fix: pruneOrfaos (churn, upsell_downsell,
// reports_semanais, metas, rounds, feedback, cases, matchmakings — todas
// leem o board INTEIRO a cada execução, então um id que sobrou no Supabase e
// não voltou nesta leitura realmente não existe mais) e
// prunarMembrosRemovidos (conselhos_membros, escopado por group_id pra não
// mexer em grupos fora do escopo desta leitura, com cascata manual pra
// conselhos_status_historico/conselhos_status_mensal antes do pai, já que
// não têm ON DELETE CASCADE).
//
// v17 (25/09/2026 — pedido do Vitor): causa raiz real do "Rounds do card de
// Indicadores não bate com o Ranking" era outra: cs_config.nome_completo
// truncado pra Marcos ("Marcos Vinicius" em vez de "Marcos Vinicius De
// Oliveira Teixeira") e Luana ("Luana Sampaio" em vez de "Luana Sampaio
// Alves") — nomeBateColunaPessoa (lib/reports.ts, usada por Cases/Rounds/
// Upsell-Downsell) faz correspondência exata de token, então esses dois
// nunca batiam nos campos de pessoa desses três boards, zerando o calculado
// deles silenciosamente por meses. Corrigido direto em cs_config (sem
// deploy, sem migração de dado — essas funções recalculam a partir das
// tabelas brutas a cada request). syncStatusUsuarios agora compara
// nome_completo contra o nome real do Monday pra aquele monday_user_id a
// cada execução e avisa no log quando divergir, pra não passar batido de
// novo se alguém digitar um nome_completo incompleto no futuro.
// ============================================================================

const MONDAY_API_TOKEN = Deno.env.get('MONDAY_API_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Segredo compartilhado só entre o pg_cron (que roda dentro do próprio projeto Supabase) e esta
// função — nunca exposto ao Next.js/Vercel nem a nenhum código client-side. Continua hardcoded
// aqui (ver nota v7 no topo do arquivo pro porquê de não ter migrado pra Deno.env desta vez) —
// mesmo valor que o pg_cron manda no header X-Sync-Secret (migração `harden_sync_monday_cron_headers`).
const SYNC_FUNCTION_SECRET = 'UwUdNblkJeUkhscpzguyVxIW-BzUJnDoGGYlos618Dc';

const BOARDS = {
  METAS: '18408969048',
  CHURN: '10008640053',
  REPORTS_SEMANAIS: '18394181332',
  CASES: '9820032997',
  MATCHMAKINGS: '18409198202',
  ROUNDS: '18415251314',
  UPSELL_DOWNSELL: '9974267506',
  CONSELHOS: '18393363935',
  FEEDBACK: '18412032453',
  AGENDA_CONSELHOS: '18395814635',
  HISTORICO_CONSELHOS: '18430666375',
  CONSELHEIROS: '18393359980',
};

const CONSELHEIROS_FOTO_COL = 'file_mm519xd1';
const CONSELHEIROS_COLS = {
  csResponsavel: 'person', nivel: 'color_mkxkdaes', email: 'text_mkyfyxzp', status: 'status',
  dataEntrada: 'data', faturamento: 'numeric_mkxkt5ks', filhos: 'color_mkxkqr3b',
  segmento: 'color_mm52cgy8', perfilConselho: 'color_mm527dbv', perfilConselheiro: 'color_mm521r4g',
  especialidade: 'color_mm52jx3q', endereco: 'text_mkxkfayk', estadoCivil: 'color_mkxk1kbj',
  vegetariano: 'color_mkxkdtzs', formacao: 'text_mm53mq3m', dataNascimento: 'date_mkxkmtdn',
  curiosidades: 'text_mm53k7mv',
};
// Plaquinha (color_mm52vb2t) e Crachá nunca são lidos — decisão fechada com o Vitor (25/09/2026):
// essas colunas do Monday ficam de fora de tudo, nem sincronizadas.
const CONSELHOS_MEMBRO_COLS = { statusPagamento: 'color_mm5bzhq3' };

const METAS_COLS = { meta: 'numeric_mm2fmyy8', alcancado: 'numeric_mm2fcwfg' };
const CASES_COLS_LEVE = { cs: 'person', empresa: 'short_textjsf26bus', produto: 'status' };
const CASES_COLS_DETALHE = {
  segmento: 'short_text20lz1za1', desafio: 'long_text36vg2ash', sugestao: 'long_textbgozc3el',
  decisao: 'long_texthukofl8i', resultado: 'long_textqu1an24s', impacto: 'ratingqc3dcemw', ondeAconteceu: 'color_mm2na1nq',
};
const CHURN_COLS = { quemEhSeuCs: 'single_select7xxqn59', produto: 'single_selectnwxipe5', data: 'date_mm3p6naz' };
const ROUNDS_COLS = { status: 'color_mm3sxe13', csResponsavel: 'multiple_person_mm3sb795' };
const UD_COLS = { cs: 'person', status: 'dup__of_status', tipoTroca: 'color_mkvfrrbq', data: 'data' };
const REPORTS_COLS = { data: 'datezx87b73k', nota: 'number12l0b75h', mm: 'numbers378ng0h', indicacoes: 'numberm2mh66ag' };
const CONSELHOS_COL_POR_MES: Record<string, string> = {
  Janeiro: 'color_mkz343x2', Fevereiro: 'color_mkzt3sk3', Março: 'color_mkzt7139',
  Abril: 'color_mkztzmry', Maio: 'color_mkztc9tw', Junho: 'color_mkzt6p3k',
  Julho: 'color_mkztq52s', Agosto: 'color_mkztgds', Setembro: 'color_mkztqs38',
  Outubro: 'color_mkztf5q5', Novembro: 'color_mkztc1km', Dezembro: 'color_mkztxpq3',
};
const AGENDA_COLS = { data: 'data', status: 'color_mm06t5d9' };
const HISTORICO_COLS = {
  csResponsavel: 'text_mm73f6ve', membro: 'text_mm73d1kg',
  dataConselho: 'date_mm733nqy', dataSnapshot: 'date_mm73mz9m',
  taxaCumprimento: 'numeric_mm73s5k1', idItemConselho: 'text_mm78r52q',
  etapasAtrasadas: 'long_text_mm785fcx',
};
const HISTORICO_ETAPAS = [
  { id: 'boolean_mm73sheb', label: 'D+9 Confirmação Individual e Anúncio da Data' },
  { id: 'boolean_mm73927r', label: 'D+5 Confirmação no grupo' },
  { id: 'boolean_mm73r4fk', label: 'D-1 Verificar a jornada' },
  { id: 'boolean_mm737baj', label: 'D+2 Encaminhamentos' },
  { id: 'boolean_mm73e41r', label: 'D+2 Cuidei dos membros que não foram' },
  { id: 'boolean_mm73cdjz', label: 'D+4 Gestão de Conhecimento' },
  { id: 'boolean_mm735wad', label: 'D+7 Fiz e registrei meus matchmakings' },
  { id: 'boolean_mm73ggr', label: 'D+8 Mapeei oportunidades de upsells' },
  { id: 'boolean_mm73q8h1', label: 'D+9 Follow do Encaminhamento' },
];
const FEEDBACK_COLS = {
  positivo: 'long_text8zat95mr',
  construtivo: 'long_textgbetn4bw',
  votos: [
    { id: 'multi_selectsw393dtf', categoria: 'Proatividade em ajudar colegas' },
    { id: 'multi_selectcl1r4fbc', categoria: 'Contribui para ambiente positivo e motivador' },
    { id: 'multi_selectw8rprepj', categoria: 'Colabora ativamente com a equipe' },
    { id: 'multi_selecttylvbs4z', categoria: 'Colabora ativamente com os membros da MOAI' },
    { id: 'multi_select2i0l1l28', categoria: 'Abertura a feedbacks' },
  ],
};
// mesma tabela do Code.gs — grupo ativo do board de Conselhos -> grupo de reposição correspondente.
// Prioridade sempre dela quando tiver entrada válida; resolverRepoGroupIdPorNome só entra em ação
// pros grupos ativos que faltarem aqui (ver nota v7 no topo do arquivo).
const ACTIVE_TO_REPO_MAP: Record<string, string> = {
  duplicate_of_bruno_capanema___: 'group_mkwycjaz', group_mktkqd1: 'group_mkx0gfmt', topics: 'group_mkyppy12',
  group_title: 'group_mkwzpywy', novo_grupo84680: 'group_mkypw7rc', novo_grupo: 'group_mkx7s52z',
  novo_grupo18849: 'group_mkyp7jdf', novo_grupo50247: 'group_mkx094vx', group_mktkwg6v: 'group_mkx4y5e4',
  group_mkw5757m: 'group_mkx46ens', group_mktkzr1y: 'group_mkx4e5gc', group_mkvegqts: 'group_mkz537he',
  novo_grupo8268: 'group_mkz5kgfb', novo_grupo58809: 'group_mkx4efkq', novo_grupo74947: 'group_mkx1hgaf',
  novo_grupo33254: 'group_mm44mzvn', novo_grupo91575: 'group_mkx0qzmh', novo_grupo36799: 'group_mkx1c9qp',
  group_mkvcqfd8: 'group_mkz5sar4', novo_grupo64326: 'group_mkx051vk', group_mm33rstr: 'group_mm3sw05w',
  novo_grupo65945: 'group_mkz5tsgn', novo_grupo21990: 'group_mkz54bkh', novo_grupo70162: 'group_mkx4v5qn',
  group_mkvvwbpj: 'group_mkz5309h', novo_grupo17438: 'group_mkx147g5', group_mkv9wd3q: 'group_mkx04bn6',
  novo_grupo76506: 'group_mkz7rm9p', novo_grupo46057: 'group_mkx4ky2w', novo_grupo47062: 'group_mkxcdr94',
  new_group: 'group_mkx0vtwa', novo_grupo__1: 'group_mm1660ty', group_mkz7tfgw: 'group_mkz7v4nh',
};

// ============ cliente Monday (GraphQL) ============

async function mondayFetch(query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: MONDAY_API_TOKEN! },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors) throw new Error('Monday API error: ' + JSON.stringify(body.errors));
  return body.data;
}

function colText(columnValues: { id: string; text: string | null }[], colId: string): string | null {
  const c = columnValues.find((cv) => cv.id === colId);
  return c ? c.text : null;
}
function numOrNull(txt: string | null): number | null {
  return txt === '' || txt === null || txt === undefined ? null : Number(txt);
}
function dateOrNull(txt: string | null): string | null {
  return txt || null;
}

const GROUPS_QUERY = `query($boardId: [ID!]) { boards(ids: $boardId) { groups { id title } } }`;

async function fetchGroups(boardId: string): Promise<{ id: string; title: string }[]> {
  const data = await mondayFetch(GROUPS_QUERY, { boardId: [boardId] });
  return data.boards[0].groups;
}

// pagina um board "achatado" (sem groups) inteiro via next_items_page
async function fetchAllItemsFlat(boardId: string, colIds: string[], extraFields = ''): Promise<any[]> {
  const fields = `id creator_id ${extraFields} column_values(ids:[${colIds.map((c) => `"${c}"`).join(',')}]){id text}`;
  let query = `query($boardId:[ID!]){boards(ids:$boardId){items_page(limit:200){cursor items{${fields}}}}}`;
  let data = await mondayFetch(query, { boardId: [boardId] });
  let page = data.boards[0].items_page;
  let items = page.items;
  let cursor = page.cursor;
  while (cursor) {
    const q2 = `query($cursor:String!){next_items_page(limit:200,cursor:$cursor){cursor items{${fields}}}}`;
    const d2 = await mondayFetch(q2, { cursor });
    items = items.concat(d2.next_items_page.items);
    cursor = d2.next_items_page.cursor;
  }
  return items;
}

// ============ supabase (REST, service role) ============

async function upsert(table: string, rows: any[], onConflict = 'id') {
  if (rows.length === 0) return;
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`Supabase upsert falhou (${table}): ${res.status} ${await res.text()}`);
  }
}

// GET paginado de verdade (mesma lição da correção de paginação feita no Next.js — ver
// lib/reports.ts): o Max Rows padrão do PostgREST (1000) corta silenciosamente uma resposta
// maior mesmo pedindo limit/offset além disso, então pagina até vir uma página incompleta.
async function fetchAllFromSupabase(table: string, select: string): Promise<any[]> {
  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let offset = 0;
  while (true) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${select}&limit=${PAGE_SIZE}&offset=${offset}`, {
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    });
    if (!res.ok) throw new Error(`Supabase select falhou (${table}): ${res.status} ${await res.text()}`);
    const data = await res.json();
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return allRows;
}

// insert puro (sem on_conflict) — pra log append-only (conselhos_status_historico), onde cada
// linha é um evento novo, nunca uma atualização de uma linha existente.
async function insertRows(table: string, rows: any[]) {
  if (rows.length === 0) return;
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`Supabase insert falhou (${table}): ${res.status} ${await res.text()}`);
  }
}

// DELETE puro por filtro PostgREST (ex.: "id=in.(1,2,3)") — base dos helpers de prune abaixo.
async function deleteWhere(table: string, filtro: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filtro}`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: 'return=minimal',
    },
  });
  if (!res.ok) throw new Error(`Supabase delete falhou (${table} ${filtro}): ${res.status} ${await res.text()}`);
}

// ============ prune de linhas órfãs (25/09/2026 — pedido do Vitor) ============
// Achado real: matchmakings_items tinha 129 linhas com mes_grupo_titulo='Setembro' contra 127
// itens ao vivo no grupo "Setembro" do board — 2 itens tinham sido apagados/movidos no Monday
// depois de sincronizados e nunca saíram do Supabase, porque nenhuma sync fazia nada além de
// upsert (nunca um delete). Isso é sistêmico: qualquer board onde alguém apague ou mova um item
// no Monday acumula lixo no Supabase pra sempre. pruneOrfaos cobre os boards "achatados" (sync lê
// o board INTEIRO a cada execução, então qualquer id que sobrou no Supabase e não veio nesta
// leitura realmente não existe mais no Monday — sem risco de derrubar algo que só ficou fora do
// escopo desta leitura por acaso).
async function pruneOrfaos(table: string, idsValidos: Set<number>, colunaId = 'id'): Promise<number> {
  const existentes = await fetchAllFromSupabase(table, colunaId);
  const orfaos = existentes.map((r: any) => Number(r[colunaId])).filter((id) => !idsValidos.has(id));
  if (orfaos.length === 0) return 0;
  await deleteWhere(table, `${colunaId}=in.(${orfaos.join(',')})`);
  console.warn(`[sync-monday] prune: removidas ${orfaos.length} linha(s) órfã(s) de ${table} (ids: ${orfaos.join(',')})`);
  return orfaos.length;
}

// syncConselhos só lê os grupos "ativos" (ver ehGrupoDeReposicao/filtro "em designa") + seus
// grupos de reposição resolvidos nesta execução — não o board inteiro (grupos tipo "Em
// designação" ficam de fora de propósito). Por isso o prune de conselhos_membros tem que ser
// escopado por group_id: só considera órfão um membro cujo group_id ESTAVA no escopo desta
// leitura (todosGroupIds) e cujo id não veio de volta — nunca um membro de um grupo que
// simplesmente não fez parte desta leitura. Cascata manual (conselhos_status_historico e
// conselhos_status_mensal têm FK pra conselhos_membros, sem ON DELETE CASCADE): apaga os filhos
// antes do pai, senão o Postgres rejeita o delete por violação de FK.
async function prunarMembrosRemovidos(idsValidos: Set<number>, groupIdsEscopo: Set<string>): Promise<number> {
  const existentes = await fetchAllFromSupabase('conselhos_membros', 'id,group_id');
  const orfaos = existentes
    .filter((r: any) => groupIdsEscopo.has(r.group_id) && !idsValidos.has(Number(r.id)))
    .map((r: any) => Number(r.id));
  if (orfaos.length === 0) return 0;
  const filtro = `membro_id=in.(${orfaos.join(',')})`;
  await deleteWhere('conselhos_status_historico', filtro);
  await deleteWhere('conselhos_status_mensal', filtro);
  await deleteWhere('conselhos_membros', `id=in.(${orfaos.join(',')})`);
  console.warn(`[sync-monday] prune: removidos ${orfaos.length} membro(s) órfão(s) de conselhos_membros (ids: ${orfaos.join(',')})`);
  return orfaos.length;
}

// remove linhas duplicadas (mesma chave de conflito) antes de mandar num único
// comando de upsert — Postgres rejeita ON CONFLICT DO UPDATE afetando a mesma
// linha duas vezes no mesmo comando. Mantém a última ocorrência de cada chave.
function dedupePorChave<T extends Record<string, any>>(rows: T[], chaveFn: (r: T) => string): T[] {
  const porChave = new Map<string, T>();
  for (const r of rows) porChave.set(chaveFn(r), r);
  return [...porChave.values()];
}

async function logSync(board: string, status: 'sucesso' | 'erro', itens?: number, erro?: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/sync_log`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ board, status, itens_sincronizados: itens ?? null, erro: erro ?? null, finished_at: new Date().toISOString() }]),
  });
}

// ============ casamento de grupo ativo <-> grupo de reposição por nome ============
// Reforço da ACTIVE_TO_REPO_MAP (que continua tendo prioridade) — mesmo espírito do casamento de
// nome já usado em APELIDOS_AGENDA no app Next.js (lib/constants.ts), pra não depender de
// atualização manual do mapa toda vez que um conselho novo for criado no Monday.

function normalizarTexto(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Único ponto de checagem "esse título é de grupo de reposição?" — cobre "Reposições no..."
// (plural, forma mais comum no board) e "Reposição | ..." (singular, ex: "Reposição | Rodrigo
// Félix") de uma vez só, via normalizarTexto (que já tira acento/maiúscula), em vez de tentar
// cobrir as duas formas num regex só (ção -> ções muda mais que só o acento, não é só trocar
// a/ã por o/õ — foi exatamente esse erro que fez o v10 marcar os próprios grupos de reposição
// como "ativos sem par" no log).
function ehGrupoDeReposicao(titulo: string): boolean {
  return normalizarTexto(titulo).startsWith('reposi');
}

// Extrai { produto, nome } de um título de grupo ATIVO no padrão "Produto | Nome (Apelido)" —
// tolera texto extra depois, ex: "C-Level | Gallo (Vitor) | Mapear Executivos bons, upsell.".
function parseGrupoAtivo(titulo: string): { produto: string; nome: string } | null {
  const partes = titulo.replace(/\[?congelado\]?/i, '').split('|');
  if (partes.length < 2) return null;
  const produto = partes[0].trim();
  const nome = partes[1].trim().replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (!nome) return null;
  return { produto, nome };
}

// Extrai o nome do membro de um título de grupo de REPOSIÇÃO — sempre o texto depois do último
// "|", em qualquer um dos dois padrões vistos no board: "Reposições no <Produto> | <Nome>" e o
// mais raro "Reposição | <Nome>" (sem produto, ex: "Reposição | Rodrigo Félix").
function parseGrupoRepo(titulo: string): { nome: string } | null {
  if (!ehGrupoDeReposicao(titulo)) return null;
  const partes = titulo.split('|');
  if (partes.length < 2) return null;
  const nome = partes[partes.length - 1].trim().replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (!nome) return null;
  return { nome };
}

// Tenta achar o grupo de reposição de um grupo ativo casando nome (e, em caso de empate,
// produto) — ignorando acento, maiúscula e variação de espaçamento. Retorna null se não achar
// nenhum candidato ou se achar mais de um e não conseguir desempatar.
function resolverRepoGroupIdPorNome(
  grupoAtivo: { id: string; title: string },
  todosGrupos: { id: string; title: string }[],
): { id: string; titulo: string } | null {
  const alvo = parseGrupoAtivo(grupoAtivo.title);
  if (!alvo) return null;
  const nomeAlvoNorm = normalizarTexto(alvo.nome);
  const produtoAlvoNorm = normalizarTexto(alvo.produto);

  const candidatos = todosGrupos
    .filter((g) => g.id !== grupoAtivo.id)
    .map((g) => ({ g, repo: parseGrupoRepo(g.title) }))
    .filter((x) => x.repo && normalizarTexto(x.repo.nome) === nomeAlvoNorm) as { g: { id: string; title: string }; repo: { nome: string } }[];

  if (candidatos.length === 0) return null;
  if (candidatos.length === 1) return { id: candidatos[0].g.id, titulo: candidatos[0].g.title };

  const comProduto = candidatos.filter((c) => normalizarTexto(c.g.title).includes(produtoAlvoNorm));
  if (comProduto.length === 1) return { id: comProduto[0].g.id, titulo: comProduto[0].g.title };

  return null; // ambíguo demais pra decidir sozinho — fica sem repo_group_id, como se não tivesse achado
}

// ============ sync por board ============

async function syncChurn() {
  const items = await fetchAllItemsFlat(BOARDS.CHURN, [CHURN_COLS.quemEhSeuCs, CHURN_COLS.produto, CHURN_COLS.data]);
  const rows = items.map((it) => ({
    id: Number(it.id),
    quem_e_seu_cs: colText(it.column_values, CHURN_COLS.quemEhSeuCs),
    produto: colText(it.column_values, CHURN_COLS.produto),
    data: dateOrNull(colText(it.column_values, CHURN_COLS.data)),
  }));
  await upsert('churn_items', rows);
  await pruneOrfaos('churn_items', new Set(rows.map((r) => r.id)));
  return rows.length;
}

async function syncUpsellDownsell() {
  const items = await fetchAllItemsFlat(BOARDS.UPSELL_DOWNSELL, [UD_COLS.cs, UD_COLS.status, UD_COLS.tipoTroca, UD_COLS.data]);
  const rows = items.map((it) => ({
    id: Number(it.id),
    cs_raw: colText(it.column_values, UD_COLS.cs),
    status: colText(it.column_values, UD_COLS.status),
    tipo_troca: colText(it.column_values, UD_COLS.tipoTroca),
    data: dateOrNull(colText(it.column_values, UD_COLS.data)),
  }));
  await upsert('upsell_downsell_items', rows);
  await pruneOrfaos('upsell_downsell_items', new Set(rows.map((r) => r.id)));
  return rows.length;
}

// v15 (fix ponto 3 — indicações desatualizadas): guarda created_at do item no Monday além da
// Data manual, pra servir de fallback quando o CS esquece de preencher a Data no report semanal.
async function syncReportsSemanais() {
  const items = await fetchAllItemsFlat(
    BOARDS.REPORTS_SEMANAIS,
    [REPORTS_COLS.data, REPORTS_COLS.nota, REPORTS_COLS.mm, REPORTS_COLS.indicacoes],
    'created_at'
  );
  const rows = items.map((it) => ({
    id: Number(it.id),
    creator_id: it.creator_id ? Number(it.creator_id) : null,
    data: dateOrNull(colText(it.column_values, REPORTS_COLS.data)),
    created_at_monday: it.created_at || null,
    nota: numOrNull(colText(it.column_values, REPORTS_COLS.nota)),
    matchmakings: Number(colText(it.column_values, REPORTS_COLS.mm)) || 0,
    indicacoes: Number(colText(it.column_values, REPORTS_COLS.indicacoes)) || 0,
  }));
  await upsert('reports_semanais_items', rows);
  await pruneOrfaos('reports_semanais_items', new Set(rows.map((r) => r.id)));
  return rows.length;
}

async function syncMetas() {
  const groups = await fetchGroups(BOARDS.METAS);
  const query = `query($boardId:[ID!],$groupIds:[String!]){boards(ids:$boardId){groups(ids:$groupIds){id title items_page(limit:100){items{name subitems{id name column_values(ids:["${METAS_COLS.meta}","${METAS_COLS.alcancado}"]){id text}}}}}}}`;
  const data = await mondayFetch(query, { boardId: [BOARDS.METAS], groupIds: groups.map((g) => g.id) });
  const rows: any[] = [];
  (data.boards[0].groups || []).forEach((g: any) => {
    (g.items_page?.items || []).forEach((item: any) => {
      (item.subitems || []).forEach((sub: any) => {
        rows.push({
          id: Number(sub.id),
          board_group_id: g.id,
          mes_grupo_titulo: g.title,
          item_metrica: item.name,
          cs_nome: sub.name,
          meta: numOrNull(colText(sub.column_values, METAS_COLS.meta)),
          alcancado: numOrNull(colText(sub.column_values, METAS_COLS.alcancado)),
        });
      });
    });
  });
  await upsert('metas_subitens', rows);
  await pruneOrfaos('metas_subitens', new Set(rows.map((r) => r.id)));
  return rows.length;
}

async function syncRounds() {
  const groups = await fetchGroups(BOARDS.ROUNDS);
  const query = `query($boardId:[ID!],$groupIds:[String!]){boards(ids:$boardId){groups(ids:$groupIds){id title items_page(limit:150){items{id column_values(ids:["${ROUNDS_COLS.status}","${ROUNDS_COLS.csResponsavel}"]){id text}}}}}}`;
  const data = await mondayFetch(query, { boardId: [BOARDS.ROUNDS], groupIds: groups.map((g) => g.id) });
  const rows: any[] = [];
  (data.boards[0].groups || []).forEach((g: any) => {
    (g.items_page?.items || []).forEach((item: any) => {
      rows.push({
        id: Number(item.id),
        board_group_id: g.id,
        mes_grupo_titulo: g.title,
        status: colText(item.column_values, ROUNDS_COLS.status),
        cs_responsavel_raw: colText(item.column_values, ROUNDS_COLS.csResponsavel),
      });
    });
  });
  await upsert('rounds_items', rows);
  await pruneOrfaos('rounds_items', new Set(rows.map((r) => r.id)));
  return rows.length;
}

async function syncFeedback() {
  const groups = await fetchGroups(BOARDS.FEEDBACK);
  const colsIds = [FEEDBACK_COLS.positivo, FEEDBACK_COLS.construtivo, ...FEEDBACK_COLS.votos.map((v) => v.id)];
  const query = `query($boardId:[ID!],$groupIds:[String!]){boards(ids:$boardId){groups(ids:$groupIds){id title items_page(limit:50){items{id name column_values(ids:[${colsIds.map((c) => `"${c}"`).join(',')}]){id text}}}}}}`;
  const data = await mondayFetch(query, { boardId: [BOARDS.FEEDBACK], groupIds: groups.map((g) => g.id) });
  const rows: any[] = [];
  (data.boards[0].groups || []).forEach((g: any) => {
    (g.items_page?.items || []).forEach((item: any) => {
      const votos: Record<string, string[]> = {};
      FEEDBACK_COLS.votos.forEach((v) => {
        const texto = colText(item.column_values, v.id) || '';
        votos[v.categoria] = texto ? texto.split(',').map((s: string) => s.trim()) : [];
      });
      rows.push({
        id: Number(item.id),
        board_group_id: g.id,
        mes_grupo_titulo: g.title,
        avaliador_nome: item.name,
        positivo_texto: colText(item.column_values, FEEDBACK_COLS.positivo),
        construtivo_texto: colText(item.column_values, FEEDBACK_COLS.construtivo),
        votos,
      });
    });
  });
  await upsert('feedback_items', rows);
  await pruneOrfaos('feedback_items', new Set(rows.map((r) => r.id)));
  return rows.length;
}

async function syncCases() {
  const groups = await fetchGroups(BOARDS.CASES);
  const colsIds = [...Object.values(CASES_COLS_LEVE), ...Object.values(CASES_COLS_DETALHE)];
  const query = `query($boardId:[ID!],$groupIds:[String!]){boards(ids:$boardId){groups(ids:$groupIds){id title items_page(limit:150){items{id name column_values(ids:[${colsIds.map((c) => `"${c}"`).join(',')}]){id text}}}}}}`;
  const data = await mondayFetch(query, { boardId: [BOARDS.CASES], groupIds: groups.map((g) => g.id) });
  const rows: any[] = [];
  (data.boards[0].groups || []).forEach((g: any) => {
    (g.items_page?.items || []).forEach((item: any) => {
      rows.push({
        id: Number(item.id),
        board_group_id: g.id,
        mes_grupo_titulo: g.title,
        nome: item.name,
        cs_raw: colText(item.column_values, CASES_COLS_LEVE.cs),
        empresa: colText(item.column_values, CASES_COLS_LEVE.empresa),
        produto: colText(item.column_values, CASES_COLS_LEVE.produto),
        segmento: colText(item.column_values, CASES_COLS_DETALHE.segmento),
        desafio: colText(item.column_values, CASES_COLS_DETALHE.desafio),
        sugestao: colText(item.column_values, CASES_COLS_DETALHE.sugestao),
        decisao: colText(item.column_values, CASES_COLS_DETALHE.decisao),
        resultado: colText(item.column_values, CASES_COLS_DETALHE.resultado),
        impacto: numOrNull(colText(item.column_values, CASES_COLS_DETALHE.impacto)),
        onde_aconteceu: colText(item.column_values, CASES_COLS_DETALHE.ondeAconteceu),
      });
    });
  });
  await upsert('cases_items', rows);
  await pruneOrfaos('cases_items', new Set(rows.map((r) => r.id)));
  return rows.length;
}

async function syncMatchmakings() {
  const groups = await fetchGroups(BOARDS.MATCHMAKINGS);
  // BUG FIX (v13, 24/09/2026): a query não pedia `id title` do grupo, então board_group_id e
  // mes_grupo_titulo iam null e o upsert era rejeitado (NOT NULL) — matchmakings_items ficou
  // parado desde 17/09/2026 sem ninguém perceber (o erro só aparecia em sync_log).
  const query = `query($boardId:[ID!],$groupIds:[String!]){boards(ids:$boardId){groups(ids:$groupIds){id title items_page(limit:250){items{id name creator_id}}}}}`;
  const data = await mondayFetch(query, { boardId: [BOARDS.MATCHMAKINGS], groupIds: groups.map((g) => g.id) });
  const rows: any[] = [];
  (data.boards[0].groups || []).forEach((g: any) => {
    (g.items_page?.items || []).forEach((item: any) => {
      rows.push({
        id: Number(item.id),
        board_group_id: g.id,
        mes_grupo_titulo: g.title,
        nome: item.name,
        creator_id: item.creator_id ? Number(item.creator_id) : null,
      });
    });
  });
  await upsert('matchmakings_items', rows);
  await pruneOrfaos('matchmakings_items', new Set(rows.map((r) => r.id)));
  return rows.length;
}

// board de Conselhos: grupos ativos + seus grupos de reposição (ACTIVE_TO_REPO_MAP, reforçada por
// resolverRepoGroupIdPorNome — ver nota v7 no topo do arquivo), 12 colunas de status por mês de
// uma vez -> "explode" em 1 linha por membro+mês em conselhos_status_mensal.
async function syncConselhos() {
  const gruposTodos = await fetchGroups(BOARDS.CONSELHOS);
  // Exclui qualquer título de reposição (ver ehGrupoDeReposicao) — pra não deixar um grupo de
  // reposição entrar em `ativos` e cair (sem necessidade) na resolução por nome logo abaixo.
  const ativos = gruposTodos.filter(
    (g) => !ehGrupoDeReposicao(g.title) && g.title.toLowerCase().indexOf('em designa') === -1
  );

  // Candidatos a grupo de reposição: os já referenciados na tabela fixa + qualquer grupo do board
  // cujo título seja de reposição — isso garante que um grupo de reposição achado só por nome
  // (ainda não presente em ACTIVE_TO_REPO_MAP) também entre como is_repo=true no upsert abaixo, e
  // não fique de fora por não estar nos values() do mapa fixo.
  const repoIds = new Set<string>([
    ...Object.values(ACTIVE_TO_REPO_MAP),
    ...gruposTodos.filter((g) => ehGrupoDeReposicao(g.title)).map((g) => g.id),
  ]);
  const repoRows = gruposTodos
    .filter((g) => repoIds.has(g.id))
    .map((g) => ({ group_id: g.id, titulo: g.title, congelado: false, is_repo: true, repo_group_id: null }));
  // ACTIVE_TO_REPO_MAP é uma tabela fixa herdada do Code.gs — alguns grupos de reposição que ela
  // referencia já não existem mais no board (foram apagados/renomeados no Monday). repo_group_id
  // é FK pra própria tabela, então só aponta pra um grupo de reposição que realmente veio do board
  // agora; senão vira null em vez de quebrar o upsert inteiro.
  const repoGroupIdsExistentes = new Set(repoRows.map((r) => r.group_id));
  const grupoRow = ativos.map((g) => {
    const repoDoMapa = ACTIVE_TO_REPO_MAP[g.id] || null;
    if (repoDoMapa && repoGroupIdsExistentes.has(repoDoMapa)) {
      return { group_id: g.id, titulo: g.title, congelado: /congelado/i.test(g.title), is_repo: false, repo_group_id: repoDoMapa };
    }
    const porNome = resolverRepoGroupIdPorNome(g, gruposTodos);
    if (porNome) {
      console.warn(`[sync-monday] repo_group_id resolvido por nome (sem entrada válida em ACTIVE_TO_REPO_MAP): grupo ativo "${g.title}" (${g.id}) -> "${porNome.titulo}" (${porNome.id})`);
    } else {
      console.warn(`[sync-monday] grupo ativo sem grupo de reposição encontrado, nem na tabela fixa nem por nome: "${g.title}" (${g.id})`);
    }
    return { group_id: g.id, titulo: g.title, congelado: /congelado/i.test(g.title), is_repo: false, repo_group_id: porNome ? porNome.id : null };
  });
  // repoRows por último: se um grupo aparecer nos dois (título não bateu no filtro de "ativos"
  // mas também é destino de reposição no mapa), a classificação como reposição prevalece.
  await upsert('conselhos_grupos', dedupePorChave([...grupoRow, ...repoRows], (r) => r.group_id), 'group_id');

  const repoGroupIdsResolvidos = grupoRow.map((g) => g.repo_group_id).filter((id): id is string => !!id);
  const todosGroupIds = [...ativos.map((g) => g.id), ...repoGroupIdsResolvidos];
  const colsTodos = [...Object.values(CONSELHOS_COL_POR_MES), ...Object.values(CONSELHOS_MEMBRO_COLS)];
  const query = `query($boardId:[ID!],$groupIds:[String!]){boards(ids:$boardId){groups(ids:$groupIds){id items_page(limit:30){items{id name column_values(ids:[${colsTodos.map((c) => `"${c}"`).join(',')}]){id text}}}}}}`;
  const data = await mondayFetch(query, { boardId: [BOARDS.CONSELHOS], groupIds: todosGroupIds });

  const membros: any[] = [];
  const statusRows: any[] = [];
  (data.boards[0].groups || []).forEach((g: any) => {
    (g.items_page?.items || []).forEach((item: any) => {
      if (item.name === 'ATAS') return;
      membros.push({
        id: Number(item.id), group_id: g.id, nome: item.name,
        status_pagamento: colText(item.column_values, CONSELHOS_MEMBRO_COLS.statusPagamento) || null,
      });
      Object.keys(CONSELHOS_COL_POR_MES).forEach((mes) => {
        const status = colText(item.column_values, CONSELHOS_COL_POR_MES[mes]);
        if (status) statusRows.push({ membro_id: Number(item.id), mes, status });
      });
    });
  });
  await upsert('conselhos_membros', dedupePorChave(membros, (r) => String(r.id)));

  // log de transição de status (v12) — compara com o snapshot atual ANTES de sobrescrever, e só
  // grava em conselhos_status_historico quando o status de fato mudou (não na primeira vez que um
  // membro+mês aparece, isso não é uma "transição").
  const statusRowsDedup = dedupePorChave(statusRows, (r) => `${r.membro_id}|${r.mes}`);
  const statusExistentes = await fetchAllFromSupabase('conselhos_status_mensal', 'membro_id,mes,status');
  const statusExistenteMap = new Map<string, string | null>();
  statusExistentes.forEach((r: any) => statusExistenteMap.set(`${r.membro_id}|${r.mes}`, r.status));
  const historicoRows = statusRowsDedup
    .filter((r) => {
      const anterior = statusExistenteMap.get(`${r.membro_id}|${r.mes}`);
      return anterior !== undefined && anterior !== null && anterior !== r.status;
    })
    .map((r) => ({
      membro_id: r.membro_id,
      mes: r.mes,
      status_anterior: statusExistenteMap.get(`${r.membro_id}|${r.mes}`),
      status_novo: r.status,
    }));
  await insertRows('conselhos_status_historico', historicoRows);

  await upsert('conselhos_status_mensal', statusRowsDedup, 'membro_id,mes');

  await prunarMembrosRemovidos(new Set(membros.map((m) => m.id)), new Set(todosGroupIds));
  return membros.length;
}

// converte um ArrayBuffer pra base64 em blocos (evita "Maximum call stack size exceeded" do
// spread operator em String.fromCharCode(...bytes) pra imagens de algumas centenas de KB).
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// board "Conselheiros 2026": baixa a foto (coluna file_mm519xd1) de cada conselheiro e guarda
// como data URI base64 — ver nota v12 no topo do arquivo pro porquê (URL do Monday expira em 1h).
// Throttle por monday_asset_id: só baixa de novo quando o arquivo realmente mudou.
async function syncConselheirosFotos() {
  const query = `query($boardId:[ID!]){boards(ids:$boardId){items_page(limit:100){items{id name column_values(ids:["${CONSELHEIROS_FOTO_COL}"]){id value} assets{id public_url}}}}}`;
  const data = await mondayFetch(query, { boardId: [BOARDS.CONSELHEIROS] });
  const items = data.boards[0].items_page.items;

  const existentes = await fetchAllFromSupabase('conselheiros_fotos', 'conselheiro_nome,monday_asset_id');
  const assetIdExistente = new Map<string, number | null>();
  existentes.forEach((r: any) => assetIdExistente.set(r.conselheiro_nome, r.monday_asset_id));

  const rows: any[] = [];
  for (const item of items) {
    const colVal = item.column_values.find((cv: any) => cv.id === CONSELHEIROS_FOTO_COL)?.value;
    if (!colVal) continue;
    let assetId: number | null = null;
    try {
      assetId = JSON.parse(colVal)?.files?.[0]?.assetId ?? null;
    } catch {
      continue;
    }
    if (!assetId) continue;
    if (assetIdExistente.get(item.name) === assetId) continue; // já temos essa foto — não baixa de novo

    const asset = (item.assets || []).find((a: any) => Number(a.id) === assetId);
    if (!asset?.public_url) continue;

    const imgRes = await fetch(asset.public_url);
    if (!imgRes.ok) {
      console.warn(`[sync-monday] falha ao baixar foto de "${item.name}": ${imgRes.status}`);
      continue;
    }
    const contentType = imgRes.headers.get('content-type') || 'image/png';
    const base64 = arrayBufferToBase64(await imgRes.arrayBuffer());
    rows.push({
      conselheiro_nome: item.name,
      monday_item_id: Number(item.id),
      monday_asset_id: assetId,
      foto_base64: `data:${contentType};base64,${base64}`,
      atualizado_em: new Date().toISOString(),
    });
  }
  await upsert('conselheiros_fotos', rows, 'conselheiro_nome');
  return rows.length;
}

// board "Conselheiros 2026": perfil de cada conselheiro (só colunas de texto/status — a foto fica
// em syncConselheirosFotos). Guarda o grupo do Monday ("Conselheiros MOAI" x "Arquivo") pra quem
// lê poder separar conselheiro ativo de arquivado sem outra consulta.
async function syncConselheiros() {
  const colsIds = Object.values(CONSELHEIROS_COLS);
  const query = `query($boardId:[ID!]){boards(ids:$boardId){items_page(limit:200){items{id name group{title} column_values(ids:[${colsIds.map((c) => `"${c}"`).join(',')}]){id text}}}}}`;
  const data = await mondayFetch(query, { boardId: [BOARDS.CONSELHEIROS] });
  const rows = data.boards[0].items_page.items.map((it: any) => {
    const cv = it.column_values;
    const t = (col: string) => colText(cv, col) || null;
    return {
      monday_item_id: Number(it.id), nome: it.name, grupo_monday: it.group?.title || null,
      cs_responsavel: t(CONSELHEIROS_COLS.csResponsavel), nivel: t(CONSELHEIROS_COLS.nivel),
      email: t(CONSELHEIROS_COLS.email), status_engajamento: t(CONSELHEIROS_COLS.status),
      data_entrada: dateOrNull(t(CONSELHEIROS_COLS.dataEntrada)), faturamento: numOrNull(t(CONSELHEIROS_COLS.faturamento)),
      filhos: t(CONSELHEIROS_COLS.filhos), segmento: t(CONSELHEIROS_COLS.segmento),
      perfil_conselho: t(CONSELHEIROS_COLS.perfilConselho), perfil_conselheiro: t(CONSELHEIROS_COLS.perfilConselheiro),
      especialidade: t(CONSELHEIROS_COLS.especialidade), endereco: t(CONSELHEIROS_COLS.endereco),
      estado_civil: t(CONSELHEIROS_COLS.estadoCivil), vegetariano: t(CONSELHEIROS_COLS.vegetariano),
      formacao: t(CONSELHEIROS_COLS.formacao), data_nascimento: dateOrNull(t(CONSELHEIROS_COLS.dataNascimento)),
      curiosidades: t(CONSELHEIROS_COLS.curiosidades), synced_at: new Date().toISOString(),
    };
  });
  await upsert('conselheiros', rows, 'monday_item_id');
  return rows.length;
}

async function syncAgenda() {
  const groups = await fetchGroups(BOARDS.AGENDA_CONSELHOS);
  const query = `query($boardId:[ID!],$groupIds:[String!]){boards(ids:$boardId){groups(ids:$groupIds){items_page(limit:100){items{id name column_values(ids:["${AGENDA_COLS.data}","${AGENDA_COLS.status}"]){id text}}}}}}`;
  const data = await mondayFetch(query, { boardId: [BOARDS.AGENDA_CONSELHOS], groupIds: groups.map((g) => g.id) });
  const rows: any[] = [];
  (data.boards[0].groups || []).forEach((g: any) => {
    (g.items_page?.items || []).forEach((item: any) => {
      const dataTxt = colText(item.column_values, AGENDA_COLS.data);
      if (!dataTxt) return;
      rows.push({
        id: Number(item.id),
        conselheiro_nome: item.name,
        data_iso: dataTxt.replace(' ', 'T') + ':00',
        status: colText(item.column_values, AGENDA_COLS.status),
      });
    });
  });
  await upsert('agenda_conselhos_items', rows);
  return rows.length;
}

function checkboxMarcado(columnValues: any[], colId: string) {
  return colText(columnValues, colId) === 'v';
}

async function syncHistoricoGtd() {
  const groups = await fetchGroups(BOARDS.HISTORICO_CONSELHOS);
  const colsIds = [
    HISTORICO_COLS.csResponsavel, HISTORICO_COLS.membro, HISTORICO_COLS.dataConselho,
    HISTORICO_COLS.dataSnapshot, HISTORICO_COLS.taxaCumprimento, HISTORICO_COLS.idItemConselho,
    HISTORICO_COLS.etapasAtrasadas, ...HISTORICO_ETAPAS.map((e) => e.id),
  ];
  const query = `query($boardId:[ID!],$groupIds:[String!]){boards(ids:$boardId){groups(ids:$groupIds){items_page(limit:100){items{id column_values(ids:[${colsIds.map((c) => `"${c}"`).join(',')}]){id text}}}}}}`;
  const data = await mondayFetch(query, { boardId: [BOARDS.HISTORICO_CONSELHOS], groupIds: groups.map((g) => g.id) });
  const rows: any[] = [];
  (data.boards[0].groups || []).forEach((g: any) => {
    (g.items_page?.items || []).forEach((item: any) => {
      const cv = item.column_values;
      rows.push({
        id: Number(item.id),
        cs_responsavel: colText(cv, HISTORICO_COLS.csResponsavel),
        membro: colText(cv, HISTORICO_COLS.membro),
        data_conselho: dateOrNull(colText(cv, HISTORICO_COLS.dataConselho)),
        data_snapshot: dateOrNull(colText(cv, HISTORICO_COLS.dataSnapshot)),
        taxa_cumprimento: numOrNull(colText(cv, HISTORICO_COLS.taxaCumprimento)),
        id_item_conselho: colText(cv, HISTORICO_COLS.idItemConselho),
        etapas_atrasadas: (colText(cv, HISTORICO_COLS.etapasAtrasadas) || '').split(';').map((s) => s.trim()).filter(Boolean),
        etapas: HISTORICO_ETAPAS.map((e) => ({ label: e.label, feito: checkboxMarcado(cv, e.id) })),
      });
    });
  });
  await upsert('historico_conselhos_items', rows);
  return rows.length;
}

// atualiza o status de conta ativa (enabled) dos CS já cadastrados em cs_config
async function syncStatusUsuarios() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/cs_config?select=id,nome,nome_completo,monday_user_id&monday_user_id=not.is.null`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  const csConfig = await res.json();
  const ids = csConfig.map((c: any) => c.monday_user_id);
  if (ids.length === 0) return 0;
  const data = await mondayFetch(`query($ids:[ID!]){users(ids:$ids){id name enabled}}`, { ids });
  const porId: Record<string, { name: string; enabled: boolean }> = {};
  data.users.forEach((u: any) => (porId[u.id] = { name: u.name, enabled: u.enabled }));
  for (const c of csConfig) {
    const infoMonday = porId[c.monday_user_id];
    if (!infoMonday) continue;

    // Validação (pedido do Vitor, 25/09/2026 — achado real): nome_completo é digitado à mão em
    // cs_config e precisa bater EXATO (a menos de acento/maiúscula) com o nome que o Monday usa nos
    // campos de pessoa dos boards de Rounds/Cases/Upsell-Downsell — nomeBateColunaPessoa
    // (lib/reports.ts) casa por token via normalizeNome (ignora acento/maiúscula, não ignora
    // palavra faltando). Marcos estava cadastrado como "Marcos Vinicius" (faltando "De Oliveira
    // Teixeira") e Luana como "Luana Sampaio" (faltando "Alves") — isso zerava silenciosamente o
    // calculado desses dois nesses três indicadores por meses inteiros, sem nenhum erro visível em
    // lugar nenhum. A comparação aqui usa normalizarTexto (mesmo tratamento de acento/maiúscula que
    // normalizeNome do Next.js) pra não disparar falso positivo em quem só está com uma variação de
    // caixa (ex.: "RODRIGO QUEIROZ CAMPOS" no Monday x "Rodrigo Queiroz Campos" em cs_config — isso
    // já casa igual em nomeBateColunaPessoa, não é o bug). Só avisa no log (não corrige sozinho:
    // nome_completo é editado à mão e uma correção automática poderia sobrescrever uma variação
    // intencional que a própria pessoa preferiu cadastrar).
    if (infoMonday.name && c.nome_completo && normalizarTexto(infoMonday.name) !== normalizarTexto(c.nome_completo)) {
      console.warn(`[sync-monday] cs_config.nome_completo diverge do nome no Monday pra "${c.nome}": cadastrado="${c.nome_completo}" · Monday="${infoMonday.name}" — Cases de Sucesso/Rounds/Upsell-Downsell desse CS podem estar sendo subcontados (ver nomeBateColunaPessoa em lib/reports.ts).`);
    }

    if (infoMonday.enabled === undefined) continue;
    await fetch(`${SUPABASE_URL}/rest/v1/cs_config?id=eq.${c.id}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json', Prefer: 'return=minimal',
      },
      body: JSON.stringify({ ativo: infoMonday.enabled, updated_at: new Date().toISOString() }),
    });
  }
  return csConfig.length;
}

// ============ orquestração ============

const SYNC_TASKS: Record<string, () => Promise<number>> = {
  churn: syncChurn,
  upsell_downsell: syncUpsellDownsell,
  reports_semanais: syncReportsSemanais,
  metas: syncMetas,
  rounds: syncRounds,
  feedback: syncFeedback,
  cases: syncCases,
  matchmakings: syncMatchmakings,
  conselhos: syncConselhos,
  agenda: syncAgenda,
  historico_gtd: syncHistoricoGtd,
  status_usuarios: syncStatusUsuarios,
  conselheiros_fotos: syncConselheirosFotos,
  conselheiros: syncConselheiros,
};

Deno.serve(async (req) => {
  // v6 (21/09/2026): segundo portão de autorização, independente do verify_jwt da plataforma —
  // ver nota de topo do arquivo.
  const providedSecret = req.headers.get('x-sync-secret');
  if (providedSecret !== SYNC_FUNCTION_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!MONDAY_API_TOKEN) {
    return new Response(JSON.stringify({ error: 'MONDAY_API_TOKEN não configurado nos secrets da função.' }), { status: 500 });
  }
  const url = new URL(req.url);
  const somenteBoard = url.searchParams.get('board');
  const tarefas = somenteBoard ? { [somenteBoard]: SYNC_TASKS[somenteBoard] } : SYNC_TASKS;

  const resultados: Record<string, any> = {};
  for (const [nome, fn] of Object.entries(tarefas)) {
    if (!fn) { resultados[nome] = { erro: 'board desconhecido' }; continue; }
    try {
      const itens = await fn();
      resultados[nome] = { status: 'sucesso', itens };
      await logSync(nome, 'sucesso', itens);
    } catch (e) {
      resultados[nome] = { status: 'erro', erro: String(e?.message || e) };
      await logSync(nome, 'erro', undefined, String(e?.message || e));
    }
  }
  return new Response(JSON.stringify(resultados, null, 2), { headers: { 'Content-Type': 'application/json' } });
});
