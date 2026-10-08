// Montagem dos dados das visitas de reversão (churn, onda 2, 08/10/2026). Usada pela rota
// /api/gestor/visitas e pelo relatório imprimível, para que os dois mostrem os mesmos números.
// Tudo sai da função visitas_resultado (SQL), que já calcula retenção, IEV e situação do membro.
import { hojeSP } from './gtd-prazos.ts';
import { infoMotivo } from './churn.ts';
import { csvVisitas, dentroDaJanelaVisitas, eficacia, calibracao, filaAcoes, funil, ievPorSafra, perfil, type VisitaLinha } from './visitas.ts';

export async function carregarVisitas(supabase: any, ref: string) {
  const { data, error } = await supabase.rpc('visitas_resultado');
  if (error) throw new Error(error.message);
  const todas = (data || []) as VisitaLinha[];
  const hoje = hojeSP();
  const janela = todas.filter((l) => dentroDaJanelaVisitas(l, ref));

  // cartões 2 e 3 de a1: pedidos em aberto (são pendências, sem janela) e reversão em 90 dias
  const emAberto = todas.filter((l) => ['pedido', 'visita', 'acompanhamento'].includes(l.etapa));
  const f = funil(janela);
  const respondidas = janela.filter((l) => l.evitavel !== null && l.evitavel !== undefined);
  const origem = new Map<string, number>();
  janela.forEach((l) => { if (l.etapa_origem) origem.set(l.etapa_origem, (origem.get(l.etapa_origem) || 0) + 1); });
  const topo = Array.from(origem.entries()).sort((x, y) => y[1] - x[1])[0];

  // b1: motivo declarado no formulário de saída versus causa raiz da visita, só com churn ligado
  const comChurn = janela.filter((l) => l.churn_item_id !== null && l.churn_item_id !== undefined);
  const idsChurn = Array.from(new Set(comChurn.map((l) => Number(l.churn_item_id))));
  const motivoDoChurn = new Map<number, string>();
  if (idsChurn.length) {
    const { data: itens, error: errItens } = await supabase.from('churn_items').select('id, motivo_principal').in('id', idsChurn);
    if (errItens) throw new Error(errItens.message);
    (itens || []).forEach((i: any) => motivoDoChurn.set(Number(i.id), i.motivo_principal));
  }
  const pares = comChurn.filter((l) => l.causa_raiz && motivoDoChurn.has(Number(l.churn_item_id)))
    .map((l) => ({ motivo: infoMotivo(motivoDoChurn.get(Number(l.churn_item_id)) as string).rotulo, causa: l.causa_raiz as string }));
  const contaMotivo = new Map<string, number>();
  const contaCausa = new Map<string, number>();
  pares.forEach((p) => { contaMotivo.set(p.motivo, (contaMotivo.get(p.motivo) || 0) + 1); contaCausa.set(p.causa, (contaCausa.get(p.causa) || 0) + 1); });
  const motivos = Array.from(contaMotivo.keys()).sort((a, b) => (contaMotivo.get(b) as number) - (contaMotivo.get(a) as number) || a.localeCompare(b, 'pt-BR'));
  const causas = Array.from(contaCausa.keys()).sort((a, b) => (contaCausa.get(b) as number) - (contaCausa.get(a) as number) || a.localeCompare(b, 'pt-BR'));
  const matriz = motivos.map((m) => causas.map((c) => pares.filter((p) => p.motivo === m && p.causa === c).length));
  const topoCausa = causas[0];
  const destaque = pares.length && topoCausa && (contaCausa.get(topoCausa) as number) / pares.length > 0.4 ? `A causa mais encontrada nas visitas é ${topoCausa}` : null;
  const cruzamento = { ligadas: comChurn.length, motivos, causas, matriz, destaque };

  return {
    janela,
    payload: {
      ref,
      hoje,
      a2: filaAcoes(todas, hoje),
      cartoes: {
        pedidosEmAberto: {
          quantidade: emAberto.length,
          mrr: emAberto.reduce((s, l) => s + (l.mrr_em_risco || 0), 0),
          semMrr: emAberto.filter((l) => l.mrr_em_risco === null).length,
        },
        retencao90: f.retencao90,
      },
      // fatos fixos da fila de melhorias: últimos 6 meses de visitas
      b3: {
        etapaOrigemMaisApontada: topo ? { etapa: topo[0], visitas: topo[1] } : null,
        evitaveis: respondidas.filter((l) => l.evitavel === true).length,
        respondidasEvitavel: respondidas.length,
        identificaveisAntes: janela.filter((l) => l.identificavel_antes === true).length,
      },
      c1: {
        cruzamento,
        funil: f,
        eficaciaAcao: eficacia(janela, 'acao_principal'),
        eficaciaCausa: eficacia(janela, 'causa_raiz'),
        calibracao: calibracao(janela),
        iev: ievPorSafra(janela, hoje),
      },
      c2: {
        produto: perfil(janela, 'produto'),
        local: perfil(janela, 'local'),
        duracao: perfil(janela, 'duracao'),
        visitantes: perfil(janela, 'visitantes'),
      },
      c3: {
        total: janela.length,
        linhas: janela.map((l) => ({
          id: l.id, membro: l.membro_nome, cs: l.cs_responsavel, etapa: l.etapa, dataPedido: l.data_pedido,
          dataVisita: l.data_visita, diasAteVisita: l.dias_ate_visita, mrr: l.mrr_em_risco, acaoPrincipal: l.acao_principal,
          causaRaiz: l.causa_raiz, termometro: l.termometro, retido90: l.retido_90, iev: l.iev,
          link: `https://moai-global.monday.com/boards/18432210313/pulses/${l.id}`,
        })),
      },
    },
  };
}

export { csvVisitas };
