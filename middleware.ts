import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

// Roda em toda rota, exceto assets estáticos do Next e arquivos de public/ (fotos, logo,
// badges) — esses continuam liberados sem sessão, igual já eram antes.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
