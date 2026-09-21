// GET /api/gestor/visao-geral?mes=X&ano=Y — visão não mascarada da área (valor calculado puro,
// divergência com o manual, score real, radar), restrita a quem tem is_gestor()=true no banco.
// requireMoaiUser() já garante domínio @moaiclubedelideres.com; aqui checamos isGestor ANTES de
// tocar em qualquer dado — nunca monta a resposta pra depois filtrar quem pode ver.
import { NextRequest, NextResponse } from 'next/server';
import { generateVisaoGestor } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mes = searchParams.get('mes');
  const ano = Number(searchParams.get('ano'));
  if (!mes || !ano) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: mes, ano' }, { status: 400 });
  }
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    const data = await generateVisaoGestor(supabase, mes, ano);
    return NextResponse.json(data);
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
