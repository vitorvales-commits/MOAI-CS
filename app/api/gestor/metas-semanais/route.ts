// GET /api/gestor/metas-semanais?mes=AAAA-MM-01 — metas semanais de todo o elenco do mês (metasSemanaisDoElenco,
// a mesma função que o fechamento usa). Restrito a gestor.
// POST /api/gestor/metas-semanais — { mes, csNome, indicador, semanaInicio, valor } grava uma exceção manual (salvar_meta_semanal).
// DELETE /api/gestor/metas-semanais — { mes, csNome, indicador, semanaInicio } volta ao automático (remover_meta_semanal).
// A escrita passa pelas funções SECURITY DEFINER, que checam is_gestor de novo dentro do banco.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { metasSemanaisDoElenco } from '@/lib/metas-semanais';
import { validarRemoverMetaSemanal, validarSalvarMetaSemanal } from '@/lib/metas-semanais-api';

export const dynamic = 'force-dynamic';

const RE_MES = /^\d{4}-\d{2}-01$/;

// Erros do banco vindos de raise: 42501 é sem permissão, 22023 é validação. O resto vira 500 sem vazar detalhe.
function erroDoBanco(e: any) {
  const code = String(e?.code ?? '');
  if (code === '42501') return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
  if (code === '22023') return NextResponse.json({ error: e.message }, { status: 400 });
  console.error('metas-semanais: erro no banco', e);
  return NextResponse.json({ error: 'Não foi possível gravar agora.' }, { status: 500 });
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const mes = new URL(req.url).searchParams.get('mes');
    if (!mes || !RE_MES.test(mes)) return NextResponse.json({ error: 'Parâmetro mes inválido (esperado AAAA-MM-01).' }, { status: 400 });
    const r = await metasSemanaisDoElenco(supabase, mes);
    return NextResponse.json({ mes, modo: r.modo, cs: r.cs });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('GET /api/gestor/metas-semanais falhou', e);
    return NextResponse.json({ error: 'Não foi possível carregar as metas semanais agora.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const v = validarSalvarMetaSemanal(await req.json().catch(() => null));
    if (!v.ok) return NextResponse.json({ error: v.erro }, { status: 400 });
    const { error } = await supabase.rpc('salvar_meta_semanal', {
      p_cs_nome: v.valor.csNome, p_indicador: v.valor.indicador, p_mes: v.valor.mes,
      p_semana_inicio: v.valor.semanaInicio, p_valor: v.valor.valor,
    });
    if (error) return erroDoBanco(error);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('POST /api/gestor/metas-semanais falhou', e);
    return NextResponse.json({ error: 'Não foi possível gravar agora.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const v = validarRemoverMetaSemanal(await req.json().catch(() => null));
    if (!v.ok) return NextResponse.json({ error: v.erro }, { status: 400 });
    const { error } = await supabase.rpc('remover_meta_semanal', {
      p_cs_nome: v.valor.csNome, p_indicador: v.valor.indicador, p_mes: v.valor.mes, p_semana_inicio: v.valor.semanaInicio,
    });
    if (error) return erroDoBanco(error);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('DELETE /api/gestor/metas-semanais falhou', e);
    return NextResponse.json({ error: 'Não foi possível remover agora.' }, { status: 500 });
  }
}
