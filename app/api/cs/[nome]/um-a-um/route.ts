// GET /api/cs/:nome/um-a-um — visão compartilhada da 1:1 daquele CS. Só leitura.
// Regra de acesso igual à de /api/cs/[nome]: gestor vê qualquer CS, CS comum só o próprio.
// Devolve SEMPRE a visão compartilhada, inclusive para o gestor. Ponto de atenção, notas privadas,
// item privado e dados do Granola nunca saem daqui.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { carregarUmAUmCompartilhado, resumoAbertos, ordenarItensAbertos, itemVencido, diasEntre, type ItemUmAUm } from '@/lib/um-a-um';
import { hojeSP } from '@/lib/gtd-prazos';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { nome: string } }) {
  noStore();
  const nome = decodeURIComponent(params.nome);
  try {
    const { supabase, isGestor, csNome } = await requireMoaiUser();
    if (!isGestor && nome !== csNome) {
      return NextResponse.json({ error: 'Você só pode consultar a própria 1:1.' }, { status: 403 });
    }
    const hoje = hojeSP();
    const visao = await carregarUmAUmCompartilhado(supabase, nome);
    // Mesma ordem da tela do gestor: vencidos, prioridade, prazo. Só itens abertos.
    const ordenar = (lista: ItemUmAUm[]) => ordenarItensAbertos(lista, hoje).map((i) => {
      const venc = itemVencido(i, hoje);
      return { ...i, vencido: venc, diasVencido: venc && i.prazo ? diasEntre(i.prazo, hoje) : null };
    });
    const passosLiderado = ordenar(visao.passosLiderado);
    const compromissosLideranca = ordenar(visao.compromissosLideranca);
    return NextResponse.json({
      hoje,
      registros: visao.registros,
      passosLiderado,
      compromissosLideranca,
      resumo: resumoAbertos([...passosLiderado, ...compromissosLideranca], hoje),
    });
  } catch (e: any) {
    console.error('cs um-a-um GET', e);
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
