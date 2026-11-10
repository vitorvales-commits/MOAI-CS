import { responder } from './lib/vitorio/responder.ts';
import { servicos } from './tests/fixtures/vitorio-servicos.ts';
(async () => {
  const sv = servicos({ perfil: 'gestor' });
  const a = await responder({ texto: 'quantos membros tem o conselho da renata', contexto: [] }, sv);
  console.log(a.intencao, a.resultado, a.texto.slice(0, 80));
  const b = await responder({ texto: 'quem sao eles', contexto: [{ pergunta: 'x', intencao: a.intencao, entidades: a.entidades }] }, sv);
  console.log(b.intencao, b.resultado, b.texto.slice(0, 80));
})();
import { normalizar } from './lib/vitorio/busca.ts';
import { corrigirTermos, extrair } from './lib/vitorio/entidades.ts';
const sv2 = servicos({ perfil: 'gestor' });
const n = corrigirTermos(normalizar('quem sao eles'), new Set([...sv2.vocabulario, ...sv2.dic.vocabulario]));
console.log('norm=', n, 'mask=', extrair(n, sv2.dic, '2026-10-30').mascarado);
