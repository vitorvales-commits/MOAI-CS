// POST /api/gestor/bonus — concede bônus de pontuação (só gestor). Um CS ou vários (lote), numa transação só.
// Corpo: { itens: [{ csNome, pontos }], dinamica, mesReferencia: "AAAA-MM-01", observacao? }.
// O mês é o mês que conta (dia 1). O banco também recusa mês futuro e mês fora do dia 1.
import { NextRequest, NextResponse } from 'next/server';
import { concederBonus } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const MES_RE = /^\d{4}-\d{2}-01$/;

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Só gestor pode conceder um bônus.' }, { status: 403 });
    }
    const body = await req.json();
    const dinamica = String(body?.dinamica || '').trim();
    const mes = String(body?.mesReferencia || '').trim();
    const observacao = body?.observacao ? String(body.observacao).trim() || null : null;
    const itens = Array.isArray(body?.itens) ? body.itens : [];
    if (!dinamica) return NextResponse.json({ error: 'Informe a dinâmica.' }, { status: 400 });
    if (!MES_RE.test(mes)) return NextResponse.json({ error: 'Mês que conta deve ser o primeiro dia do mês (AAAA-MM-01).' }, { status: 400 });
    if (itens.length === 0) return NextResponse.json({ error: 'Escolha ao menos um CS.' }, { status: 400 });
    const limpos = itens.map((i: any) => ({ csNome: String(i?.csNome || '').trim(), pontos: Number(i?.pontos) }));
    if (limpos.some((i: { csNome: string; pontos: number }) => !i.csNome || !Number.isInteger(i.pontos) || i.pontos <= 0)) {
      return NextResponse.json({ error: 'Cada CS precisa de um número inteiro de pontos maior que zero.' }, { status: 400 });
    }
    const ids = await concederBonus(supabase, limpos, dinamica, mes, observacao);
    return NextResponse.json({ ids });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
