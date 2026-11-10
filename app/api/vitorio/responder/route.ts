// POST /api/vitorio/responder: respostas de time e carteira do Vitorio (B1, parte 2/n).
// Corpo: { tipo: 'elenco', mes: 'AAAA-MM-DD' } ou { tipo: 'carteira', group_id, data: 'AAAA-MM-DD' }.
// Leitura com o cliente da própria pessoa: vitorio_dicionario (CS, apelidos, vigências) e cs_periodos (RLS moai_select).
// Não grava nada e não devolve número, pontuação nem dado de 1:1.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { responderCarteira, responderElenco, type DadosTime } from '@/lib/vitorio/time-carteira';

export const dynamic = 'force-dynamic';

const DATA = /^\d{4}-\d{2}-\d{2}$/;

function hojeSP(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await requireMoaiUser();
    const b: any = await req.json().catch(() => null);
    if (!b || (b.tipo !== 'elenco' && b.tipo !== 'carteira')) {
      return NextResponse.json({ error: 'Pergunta inválida.' }, { status: 400 });
    }

    const [{ data: dic, error: eDic }, { data: periodos, error: ePer }] = await Promise.all([
      supabase.rpc('vitorio_dicionario'),
      supabase.from('cs_periodos').select('nome_curto, nome_completo, primeiro_mes, ultimo_mes'),
    ]);
    if (eDic || ePer) return NextResponse.json({ error: 'Não consegui ler os dados agora.' }, { status: 503 });

    const cs: { id: number; nome_curto: string; ativo: boolean }[] = dic?.cs || [];
    const dados: DadosTime = {
      hojeIso: hojeSP(),
      periodos: (periodos || []).map((p: any) => ({
        nome_curto: p.nome_curto,
        nome_completo: p.nome_completo,
        primeiro_mes: String(p.primeiro_mes),
        ultimo_mes: p.ultimo_mes ? String(p.ultimo_mes) : null,
      })),
      ativosHoje: cs.filter((c) => c.ativo).map((c) => c.nome_curto),
      csPorId: Object.fromEntries(cs.map((c) => [c.id, c.nome_curto])),
      conselhos: Object.fromEntries((dic?.conselhos || []).map((v: any) => [v.group_id, v.titulo || ''])),
      // Início nulo (sem limite inferior) é a carga inicial: vira '-infinity' explicitamente.
      vigencias: (dic?.conselhos || []).map((v: any) => ({
        group_id: v.group_id,
        cs_id: v.cs_id,
        inicio: v.inicio ?? '-infinity',
        fim: v.fim ?? null,
      })),
    };

    if (b.tipo === 'elenco') {
      const mes = String(b.mes || '');
      if (!DATA.test(mes)) return NextResponse.json({ error: 'Data inválida.' }, { status: 400 });
      return NextResponse.json(responderElenco(mes, dados));
    }
    const groupId = String(b.group_id || '');
    const data = String(b.data || '');
    if (!groupId || !DATA.test(data)) return NextResponse.json({ error: 'Pergunta inválida.' }, { status: 400 });
    return NextResponse.json(responderCarteira(groupId, data, dados));
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('[api/vitorio/responder]', e);
    return NextResponse.json({ error: 'Erro ao responder.' }, { status: 500 });
  }
}
