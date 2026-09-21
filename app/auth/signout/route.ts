import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

async function signout(request: NextRequest) {
  const supabase = getSupabaseServer();
  await supabase.rpc('log_access', { p_action: 'logout', p_result: 'success', p_metadata: {} });
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', request.url));
}

export async function POST(request: NextRequest) {
  return signout(request);
}
export async function GET(request: NextRequest) {
  return signout(request);
}
