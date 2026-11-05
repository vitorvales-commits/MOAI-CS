// POST /api/interno/metas-semanais/fechar. Chamada pelo pg_cron (migração 20261105e), com o cabeçalho
// X-Metas-Secret. O middleware já deixa passar só com o segredo certo (lib/supabase/interno.ts); esta rota confere
// de novo, por defesa em profundidade. Corpo opcional: { "mes": "AAAA-MM", "reprocessar": false }.
// Sem mes, fecha o mês anterior e o atual de Brasília.
import { NextRequest, NextResponse } from 'next/server';
import { clienteAdmin } from '@/lib/supabase/admin';
import { CABECALHO_SEGREDO, CAMINHO_FECHAMENTO, decidirRotaInterna } from '@/lib/supabase/interno';
import { fecharMetasSemanais } from '@/lib/metas-semanais-fechamento';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const decisao = decidirRotaInterna('POST', CAMINHO_FECHAMENTO, req.headers.get(CABECALHO_SEGREDO), process.env.METAS_FECHAMENTO_SECRET);
  if (decisao !== 'liberar') return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  let corpo: { mes?: unknown; reprocessar?: unknown } = {};
  try {
    const texto = await req.text();
    if (texto.trim()) corpo = JSON.parse(texto);
  } catch {
    return NextResponse.json({ error: 'Corpo precisa ser JSON.' }, { status: 400 });
  }

  let meses: string[] | undefined;
  if (corpo.mes !== undefined) {
    if (typeof corpo.mes !== 'string' || !/^\d{4}-\d{2}(-\d{2})?$/.test(corpo.mes)) {
      return NextResponse.json({ error: 'mes precisa estar no formato AAAA-MM.' }, { status: 400 });
    }
    meses = [`${corpo.mes.slice(0, 7)}-01`];
  }
  const reprocessar = corpo.reprocessar === true;

  try {
    const resultado = await fecharMetasSemanais(clienteAdmin(), { meses, reprocessar });
    return NextResponse.json({ ok: true, ...resultado });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Falha no fechamento.' }, { status: 500 });
  }
}
