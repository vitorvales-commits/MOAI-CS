// Cliente de leitura para os scripts locais, com a chave de serviço. As RPCs protegidas por is_moai_user() exigem
// uma sessão de usuário e recusam a chave de serviço; aqui elas devolvem lista vazia em vez de derrubar o script.
// Efeito: dados que dependem só dessas RPCs (membros elegíveis, metas resolvidas) ficam vazios nos scripts.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

export function clienteScripts() {
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) throw new Error('Defina SUPABASE_SERVICE_ROLE_KEY em .env.local.');
  const sb: any = createClient(env.NEXT_PUBLIC_SUPABASE_URL, chave, { auth: { persistSession: false } });
  const rpc = sb.rpc.bind(sb);
  sb.rpc = async (nome: string, args?: any) => {
    const r = await rpc(nome, args);
    if (r.error && /not authorized/i.test(r.error.message)) return { data: [], error: null };
    return r;
  };
  return sb;
}
