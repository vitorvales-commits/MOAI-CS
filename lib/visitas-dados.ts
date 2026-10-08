// Montagem dos dados das visitas de reversão (churn, onda 2, 08/10/2026). Usada pela rota
// /api/gestor/visitas e pelo relatório imprimível, para que os dois mostrem os mesmos números.
// Tudo sai da função visitas_resultado (SQL), que já calcula retenção, IEV e situação do membro.
import { hojeSP } from './gtd-prazos.ts';
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
