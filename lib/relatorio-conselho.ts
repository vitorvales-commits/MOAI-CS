// Relatório do conselho (22/10/2026). Puro: sem banco. Validação do formulário (espelha salvar_relatorio_conselho no
// SQL, que valida de novo), resumo por CS para a fila do gestor e frases de estado. O estado e o prazo vêm de
// encontros_pendentes_relatorio (espelhados em lib/pontos.ts).
import {
  RELATORIO_AVANCO_MAX, RELATORIO_COMBINADO_MAX, RELATORIO_MOTIVO_ATENCAO_MAX, RELATORIO_JUSTIFICATIVA_MAX,
} from './constants.ts';
import type { EstadoRelatorio } from './pontos.ts';

export type { EstadoRelatorio };

export const AVALIACOES_ENCONTRO = ['Muito bom', 'Bom', 'Regular', 'Ruim'] as const;
export const CATEGORIAS_FALTA = ['Imprevisto profissional', 'Saúde', 'Viagem', 'Esquecimento', 'Sem retorno do membro', 'Outro'] as const;

export type FaltaEncontro = {
  membroId: number; nome: string; tipo: 'falta' | 'desistencia'; categoria: string | null; justificativa: string | null;
};
export type EncontroRelatorio = {
  groupId: string; conselho: string; cs: string | null; dataEncontro: string; prazo: string; estado: EstadoRelatorio;
  diasRestantes: number; relatorioId: string | null; enviadoEm: string | null; avaliacao: string | null;
  faltas: FaltaEncontro[]; faltasSemJustificativa: number; presencaPendente: number;
};

// Linha de encontros_pendentes_relatorio (snake_case) para o formato acima.
export function encontroDeLinha(r: any): EncontroRelatorio {
  return {
    groupId: r.group_id, conselho: r.conselho, cs: r.cs_nome ?? null, dataEncontro: r.data_encontro, prazo: r.prazo, estado: r.estado,
    diasRestantes: Number(r.dias_restantes), relatorioId: r.relatorio_id ?? null, enviadoEm: r.enviado_em ?? null, avaliacao: r.avaliacao ?? null,
    faltas: (r.faltas || []).map((f: any) => ({ membroId: Number(f.membro_id), nome: f.nome, tipo: f.tipo, categoria: f.categoria ?? null, justificativa: f.justificativa ?? null })),
    faltasSemJustificativa: Number(r.faltas_sem_justificativa || 0), presencaPendente: Number(r.presenca_pendente || 0),
  };
}

export type EntradaRelatorio = {
  avaliacao: string; avanco: string; membroAtencaoId: number | null; membroAtencaoMotivo: string; combinado: string;
  faltas: { membroId: number; categoria: string; justificativa: string }[];
};

// Lista de mensagens de erro, vazia quando o formulário está pronto para envio.
export function validarRelatorio(e: EntradaRelatorio, faltasDoEncontro: Pick<FaltaEncontro, 'membroId' | 'nome' | 'tipo'>[]): string[] {
  const erros: string[] = [];
  if (!(AVALIACOES_ENCONTRO as readonly string[]).includes(e.avaliacao)) erros.push('Escolha como foi o encontro.');
  const avanco = e.avanco.trim();
  if (!avanco) erros.push('Descreva o principal avanço ou tema.');
  else if (avanco.length > RELATORIO_AVANCO_MAX) erros.push('O principal avanço pode ter até ' + RELATORIO_AVANCO_MAX + ' caracteres.');
  if (e.combinado.trim().length > RELATORIO_COMBINADO_MAX) erros.push('O combinado pode ter até ' + RELATORIO_COMBINADO_MAX + ' caracteres.');
  if (e.membroAtencaoId !== null) {
    const motivo = e.membroAtencaoMotivo.trim();
    if (!motivo) erros.push('Explique por que o membro exige atenção.');
    else if (motivo.length > RELATORIO_MOTIVO_ATENCAO_MAX) erros.push('O motivo da atenção pode ter até ' + RELATORIO_MOTIVO_ATENCAO_MAX + ' caracteres.');
  }
  faltasDoEncontro.filter((f) => f.tipo === 'falta').forEach((f) => {
    const item = e.faltas.find((x) => x.membroId === f.membroId);
    const just = (item?.justificativa || '').trim();
    if (!item || !(CATEGORIAS_FALTA as readonly string[]).includes(item.categoria)) erros.push('Escolha a categoria da falta de ' + f.nome + '.');
    if (!just) erros.push('Justifique a falta de ' + f.nome + '.');
    else if (just.length > RELATORIO_JUSTIFICATIVA_MAX) erros.push('A justificativa de ' + f.nome + ' pode ter até ' + RELATORIO_JUSTIFICATIVA_MAX + ' caracteres.');
  });
  return erros;
}

// Pendentes (a preencher ou vence hoje) e atrasados por CS, do mais atrasado ao menos, para a fila do gestor.
export type ResumoRelatoriosCS = { cs: string; pendentes: number; atrasados: number; maiorAtrasoDias: number };
export function resumoRelatoriosPorCS(encontros: Pick<EncontroRelatorio, 'cs' | 'estado' | 'diasRestantes'>[]): ResumoRelatoriosCS[] {
  const por = new Map<string, ResumoRelatoriosCS>();
  encontros.forEach((e) => {
    if (!e.cs || (e.estado !== 'a_preencher' && e.estado !== 'vence_hoje' && e.estado !== 'atrasado')) return;
    const r = por.get(e.cs) || { cs: e.cs, pendentes: 0, atrasados: 0, maiorAtrasoDias: 0 };
    if (e.estado === 'atrasado') { r.atrasados++; r.maiorAtrasoDias = Math.max(r.maiorAtrasoDias, -e.diasRestantes); } else r.pendentes++;
    por.set(e.cs, r);
  });
  return [...por.values()].sort((a, b) => b.atrasados - a.atrasados || b.maiorAtrasoDias - a.maiorAtrasoDias || b.pendentes - a.pendentes || a.cs.localeCompare(b.cs, 'pt-BR'));
}

export function fraseEstadoRelatorio(estado: EstadoRelatorio, diasRestantes: number): string {
  switch (estado) {
    case 'enviado_no_prazo': return 'Enviado no prazo';
    case 'enviado_com_atraso': return 'Enviado com atraso';
    case 'atrasado': { const d = -diasRestantes; return d <= 0 ? 'Prazo venceu hoje' : d === 1 ? 'Atrasado há 1 dia' : 'Atrasado há ' + d + ' dias'; }
    case 'vence_hoje': return 'O prazo vence hoje';
    case 'a_preencher': return diasRestantes === 1 ? 'Falta 1 dia para o prazo' : 'Faltam ' + diasRestantes + ' dias para o prazo';
  }
}
