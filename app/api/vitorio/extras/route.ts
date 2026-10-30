// POST /api/vitorio/extras { acao: 'reatribuir' | 'descartar', de, para }  move as frases de uma chave órfã para um item existente
// ou as descarta (a chave fica com lista vazia, que não conta como órfã).
// POST /api/vitorio/extras { chave, frase, tratar }  cadastra uma frase como pergunta extra de um item do Vitorio (só gestor)
// e tira da Fila de ação as consultas iguais. A chave é colecao:id do corpus; a frase soma às que o item já tem.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { lerExtras } from '@/lib/vitorio/servidor';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Só gestor pode cadastrar perguntas.' }, { status: 403 });
    let b: any;
    try { b = await req.json(); } catch { return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 }); }
    if (b?.acao === 'reatribuir' || b?.acao === 'descartar') {
      const de = String(b?.de || '').trim(), para = String(b?.para || '').trim();
      if (!de || de.length > 200 || (b.acao === 'reatribuir' && (!para || para.length > 200 || para === de))) return NextResponse.json({ error: 'Escolha o item de destino.' }, { status: 400 });
      const { extras } = await lerExtras(supabase);
      const frasesDe = extras[de] || [];
      if (b.acao === 'reatribuir') {
        const junto = Array.from(new Set([...(extras[para] || []), ...frasesDe]));
        const { error } = await supabase.rpc('vitorio_salvar_perguntas_extras', { p_chave: para, p_frases: junto, p_tratar: [] });
        if (error) { console.error('[api/vitorio/extras]', error.message); return NextResponse.json({ error: 'Não foi possível reatribuir agora.' }, { status: 500 }); }
      }
      const { error } = await supabase.rpc('vitorio_salvar_perguntas_extras', { p_chave: de, p_frases: [], p_tratar: [] });
      if (error) { console.error('[api/vitorio/extras]', error.message); return NextResponse.json({ error: 'Não foi possível concluir agora.' }, { status: 500 }); }
      return NextResponse.json({ ok: true });
    }
    const chave = String(b?.chave || '').trim();
    const frase = String(b?.frase || '').trim().slice(0, 200);
    if (!chave || chave.length > 200 || !frase) return NextResponse.json({ error: 'Escolha o item e informe a pergunta.' }, { status: 400 });
    const tratar = (Array.isArray(b?.tratar) ? b.tratar : [b?.frase]).map((t: unknown) => String(t || '').trim().slice(0, 200)).filter(Boolean).slice(0, 20);
    const { extras } = await lerExtras(supabase);
    const frases = Array.from(new Set([...(extras[chave] || []), frase]));
    const { error } = await supabase.rpc('vitorio_salvar_perguntas_extras', { p_chave: chave, p_frases: frases, p_tratar: tratar });
    if (error) {
      console.error('[api/vitorio/extras]', error.message);
      const negado = error.code === '42501';
      return NextResponse.json({ error: negado ? 'Só gestor pode cadastrar perguntas.' : 'Não foi possível salvar a pergunta agora.' }, { status: negado ? 403 : 500 });
    }
    return NextResponse.json({ ok: true, frases });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('[api/vitorio/extras]', e);
    return NextResponse.json({ error: 'Não foi possível salvar a pergunta agora.' }, { status: 500 });
  }
}
