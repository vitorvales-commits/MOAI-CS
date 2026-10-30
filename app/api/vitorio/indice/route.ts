// GET /api/vitorio/indice?perfil=cs|gestor  documentos indexáveis do Vitorio (processos publicados, navegação e glossário),
// já em texto simples e filtrados pelo perfil efetivo, mais o dicionário de sinônimos e os limiares da busca. A versão
// (processos publicados + última alteração de perguntas extras + VITORIO_VERSAO_CORPUS + perfil) vira ETag: o navegador
// revalida a cada abertura e só baixa o corpo quando algo mudou.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { corpusDoPerfil, perfilPermitido, versaoCorpus } from '@/lib/vitorio/servidor';
import { SINONIMOS } from '@/lib/vitorio/sinonimos';
import { CONFIG_BUSCA } from '@/lib/vitorio/busca';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  noStore();
  try {
    const { supabase, isGestor, csNome } = await requireMoaiUser();
    const perfil = perfilPermitido(req.nextUrl.searchParams.get('perfil'), isGestor, csNome);
    const v = await versaoCorpus(supabase, perfil);
    const etag = '"' + v.versao + '"';
    const cabecalhos = { ETag: etag, 'Cache-Control': 'private, no-cache' };
    if (req.headers.get('if-none-match') === etag) return new NextResponse(null, { status: 304, headers: cabecalhos });
    const documentos = await corpusDoPerfil(supabase, perfil, v.atualizadoEm, v.extras);
    return NextResponse.json({ versao: v.versao, perfil, documentos, sinonimos: SINONIMOS, config: CONFIG_BUSCA }, { headers: cabecalhos });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('[api/vitorio/indice]', e);
    return NextResponse.json({ error: 'Não foi possível carregar o índice do Vitorio.' }, { status: 500 });
  }
}
