// GET /api/gestor/check — endpoint leve só pra saber se a sessão atual é de gestor (usado pelo
// dashboard-html.ts pra decidir se mostra o link "Visão da área" na topbar). Isso é só
// conveniência visual: o acesso de verdade é garantido pelo servidor em app/gestor/page.tsx e
// em /api/gestor/visao-geral, que checam isGestor de novo e não confiam em nada vindo do client.
import { NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { isGestor } = await requireMoaiUser();
    return NextResponse.json({ isGestor });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
