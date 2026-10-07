// POST /api/consulta — painel de "Consulta rápida" da visão de gestor (app/gestor-html.ts).
// requireMoaiUser() já confirma sessão válida (getUser revalidado no servidor); aqui, além disso,
// a rota é exclusiva de gestor — CS comum recebe 403 genérico, mesmo padrão das demais rotas
// /api/gestor/*. A interpretação da pergunta e a formatação da resposta vivem em lib/consulta.ts
// (processarPergunta), que despacha por intenção; hoje só existe metas, chamando a RPC
// consultar_metas_cs (que já reconfere is_moai_user/is_gestor no banco, independente desta
// checagem aqui — defesa em profundidade, mesmo padrão do resto do projeto).
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { processarPergunta, type CsRef } from '@/lib/consulta';
import { healthBaseExibidoPorCS } from '@/lib/reports';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ erro: 'Esta área é restrita a gestores.' }, { status: 403 });
    }

    let pergunta = '';
    try {
      const body = await req.json();
      pergunta = typeof body?.pergunta === 'string' ? body.pergunta.trim() : '';
    } catch {
      return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 });
    }
    if (!pergunta || pergunta.length > 300) {
      return NextResponse.json({ erro: 'Pergunta vazia ou longa demais.' }, { status: 400 });
    }

    const { data: roster, error: rosterError } = await supabase
      .from('cs_config')
      .select('nome, nome_completo')
      .eq('ativo', true);
    if (rosterError) throw rosterError;

    // Health da Base calculado (07/10/2026) entra por injeção, só é buscado se a resposta precisar.
    const { resposta, resource } = await processarPergunta(supabase, pergunta, (roster ?? []) as CsRef[], new Date(), {
      healthBasePorCS: () => healthBaseExibidoPorCS(supabase),
    });

    // resource carrega só CS + mês (ex.: "Rodrigo|2026-09-01"), nunca o texto integral da
    // pergunta — access_audit_log.metadata já tem limite de tamanho, e o texto livre digitado
    // pelo gestor não precisa virar trilha de auditoria permanente.
    await supabase.rpc('log_access', { p_action: 'consulta_metas', p_result: 'success', p_resource: resource });

    return NextResponse.json({ resposta });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('consulta rápida falhou', e);
    return NextResponse.json({ erro: 'Não foi possível consultar agora.' }, { status: 500 });
  }
}
