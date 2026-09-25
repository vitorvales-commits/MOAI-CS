// GET /api/perfil — identidade do usuário logado pro front-end decidir qual home mostrar (Parte
// A, pedido do Vitor 25/09/2026): isGestor (já existia em /api/gestor/check) + csNome, o perfil de
// cs_config vinculado a este e-mail via cs_usuarios (null enquanto o gestor não tiver feito esse
// vínculo em Controle de Perfis). Só conveniência visual pro client escolher a tela — a restrição
// de verdade continua em cada rota (/api/cs/[nome], /api/equipe, /api/home-resumo), que checam
// isGestor/csNome de novo no servidor.
import { NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { isGestor, csNome } = await requireMoaiUser();
    return NextResponse.json({ isGestor, csNome });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
