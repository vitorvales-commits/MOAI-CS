// Funções puras da sincronização do Granola (08/10/2026). Sem nenhuma API do Deno, para o teste rodar
// no Node (tests/granola.test.ts). Nada daqui lê ou grava private_notes_* nem recebe a chave de API.

export type FonteGranola = { gestor: string; chave: string; pasta: string };
export type Descarte = { indice: number; motivo: string };

// Valida o secret GRANOLA_FONTES. Fonte sem gestor, chave ou pasta válidos é descartada, e o descarte
// registra só o motivo, nunca a chave.
export function lerFontes(json: unknown): { fontes: FonteGranola[]; descartes: Descarte[] } {
  const fontes: FonteGranola[] = [];
  const descartes: Descarte[] = [];
  if (!Array.isArray(json)) return { fontes, descartes: [{ indice: -1, motivo: 'GRANOLA_FONTES precisa ser uma lista JSON' }] };
  json.forEach((item: any, indice) => {
    const gestor = typeof item?.gestor === 'string' ? item.gestor.trim().toLowerCase() : '';
    const chave = typeof item?.chave === 'string' ? item.chave.trim() : '';
    const pasta = typeof item?.pasta === 'string' ? item.pasta.trim() : '';
    if (!gestor.includes('@')) return descartes.push({ indice, motivo: 'gestor sem e-mail válido' });
    if (!chave.startsWith('grn_')) return descartes.push({ indice, motivo: 'chave ausente ou em formato inesperado' });
    if (!pasta.startsWith('fol_')) return descartes.push({ indice, motivo: 'pasta ausente. Fonte sem pasta é ignorada.' });
    fontes.push({ gestor, chave, pasta });
  });
  return { fontes, descartes };
}

// Emails dos participantes da nota (attendees e convidados do calendário), minúsculos, sem repetição.
export function participantesDaNota(nota: any): string[] {
  const vindos: unknown[] = [
    ...(Array.isArray(nota?.attendees) ? nota.attendees.map((a: any) => a?.email) : []),
    ...(Array.isArray(nota?.calendar_event?.invitees) ? nota.calendar_event.invitees.map((i: any) => i?.email) : []),
  ];
  const emails = vindos
    .filter((e): e is string => typeof e === 'string' && e.includes('@'))
    .map((e) => e.trim().toLowerCase());
  return [...new Set(emails)];
}

// Vínculo automático só com exatamente um CS. Participantes que são gestores não contam.
// Zero ou mais de um CS fica pendente, e o gestor resolve na Fila da liderança.
export function vincularCS(
  participantes: string[],
  emailsGestores: Set<string>,
  mapaEmailParaCS: Map<string, string>,
): { cs: string | null; vinculo: 'auto' | 'pendente' } {
  const csEncontrados = new Set<string>();
  for (const email of participantes) {
    if (emailsGestores.has(email)) continue;
    const cs = mapaEmailParaCS.get(email);
    if (cs) csEncontrados.add(cs);
  }
  if (csEncontrados.size === 1) return { cs: [...csEncontrados][0], vinculo: 'auto' };
  return { cs: null, vinculo: 'pendente' };
}

// Data da reunião: horário agendado do calendário, senão a criação da nota.
export function dataReuniao(nota: any): string | null {
  return nota?.calendar_event?.scheduled_start_time ?? nota?.created_at ?? null;
}

export type SegmentoTranscricao = { quem: string; texto: string; inicio: string | null };

// Quem fala: nome do speaker, senão Liderança (attribution me), Liderado (them), ou Participante.
export function normalizarTranscricao(segmentos: any): SegmentoTranscricao[] | null {
  if (!Array.isArray(segmentos)) return null;
  return segmentos
    .map((s: any) => {
      const nomeSpeaker = typeof s?.speaker?.name === 'string' ? s.speaker.name.trim() : '';
      const attribution = s?.speaker?.attribution;
      const quem = nomeSpeaker || (attribution === 'me' ? 'Liderança' : attribution === 'them' ? 'Liderado' : 'Participante');
      return { quem, texto: typeof s?.text === 'string' ? s.text.trim() : '', inicio: s?.start_time ?? null };
    })
    .filter((s) => s.texto.length > 0);
}

// id da nota no formato da API: "not_" seguido de 14 caracteres alfanuméricos.
export function idNotaValido(id: unknown): id is string {
  return typeof id === 'string' && /^not_[A-Za-z0-9]{14}$/.test(id);
}

// Linha de granola_notas. Vínculo é decidido fora (vincularCS). O trigger do banco impede que esta
// linha mude um vínculo manual ou ignorado.
export function linhaGranola(nota: any, fonte: FonteGranola, vinculo: { cs: string | null; vinculo: 'auto' | 'pendente' }, participantes: string[], transcricao: SegmentoTranscricao[] | null | undefined) {
  if (!idNotaValido(nota?.id)) return null;
  const linha: Record<string, unknown> = {
    note_id: nota.id,
    gestor_email: fonte.gestor,
    titulo: nota.title ?? null,
    data_reuniao: dataReuniao(nota),
    criado_em_granola: nota.created_at ?? null,
    atualizado_em_granola: nota.updated_at ?? null,
    web_url: nota.web_url ?? null,
    participantes,
    cs_nome: vinculo.cs,
    vinculo: vinculo.vinculo,
    resumo_markdown: nota.summary_markdown ?? nota.summary_text ?? null,
    excluida_no_granola: !!nota.deleted_at,
    synced_at: new Date().toISOString(),
  };
  // transcricao undefined = não buscada nesta rodada (ex.: já expurgada). Não entra no upsert, então o valor do banco fica.
  if (transcricao !== undefined) linha.transcricao = transcricao;
  return linha;
}
