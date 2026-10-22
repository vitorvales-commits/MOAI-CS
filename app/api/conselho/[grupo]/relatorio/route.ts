// POST /api/conselho/:grupo/relatorio — cria ou edita o relatório de um encontro. A autorização de verdade é do banco
// (salvar_relatorio_conselho): só o CS responsável pelo conselho ou gestor; depois do prazo só gestor edita.
import { NextRequest, NextResponse } from 'next/server';
import { salvarRelatorioConselho, listarEncontrosRelatorio } from '@/lib/relatorio-conselho-dados';
import { validarRelatorio, type EntradaRelatorio } from '@/lib/relatorio-conselho';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { grupo: string } }) {
  const grupo = decodeURIComponent(params.grupo);
  try {
    const { supabase } = await requireMoaiUser();
    const body = await req.json();
    const dataEncontro = String(body?.dataEncontro || '');
    if (!dataEncontro || Number.isNaN(new Date(dataEncontro).getTime())) return NextResponse.json({ error: 'Informe a data do encontro.' }, { status: 400 });
    const entrada: EntradaRelatorio = {
      avaliacao: String(body?.avaliacao || ''), avanco: String(body?.avanco || ''), combinado: String(body?.combinado || ''),
      membroAtencaoId: body?.membroAtencaoId === null || body?.membroAtencaoId === undefined || body?.membroAtencaoId === '' ? null : Number(body.membroAtencaoId),
      membroAtencaoMotivo: String(body?.membroAtencaoMotivo || ''),
      faltas: Array.isArray(body?.faltas) ? body.faltas.map((f: any) => ({ membroId: Number(f?.membroId), categoria: String(f?.categoria || ''), justificativa: String(f?.justificativa || '') })) : [],
    };
    // Validação antecipada com as faltas calculadas pelo banco; o banco valida de novo ao gravar.
    const encontro = (await listarEncontrosRelatorio(supabase)).find((e) => e.groupId === grupo && new Date(e.dataEncontro).getTime() === new Date(dataEncontro).getTime());
    if (!encontro) return NextResponse.json({ error: 'Este encontro não exige relatório.' }, { status: 404 });
    const erros = validarRelatorio(entrada, encontro.faltas);
    if (erros.length) return NextResponse.json({ error: erros.join(' '), erros }, { status: 400 });
    const id = await salvarRelatorioConselho(supabase, grupo, encontro.dataEncontro, entrada);
    return NextResponse.json({ id });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    const proibido = e?.codigo === '42501';
    return NextResponse.json({ error: proibido ? 'Você não pode enviar ou editar este relatório.' : e.message || String(e) }, { status: proibido ? 403 : e?.codigo === '22023' ? 400 : 500 });
  }
}
