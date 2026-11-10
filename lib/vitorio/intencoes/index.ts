// Todas as intenções do Vitorio 2, em ordem de família. Cada arquivo declara frases exemplo, entidades, perfis, modelos e continuações.
import type { Intencao } from '../tipos.ts';
import { AGENDA } from './agenda.ts';
import { CARTEIRA } from './carteira.ts';
import { INDICADORES } from './indicadores.ts';
import { PLATAFORMA } from './plataforma.ts';
import { ROTINAS } from './rotinas.ts';
import { SAUDE_BASE } from './saude-base.ts';
import { SOCIAL } from './social.ts';
import { TIME } from './time.ts';

export const INTENCOES: Intencao[] = [...TIME, ...CARTEIRA, ...AGENDA, ...INDICADORES, ...ROTINAS, ...SAUDE_BASE, ...PLATAFORMA, ...SOCIAL];
export const INTENCAO_POR_ID = new Map(INTENCOES.map((i) => [i.id, i]));
