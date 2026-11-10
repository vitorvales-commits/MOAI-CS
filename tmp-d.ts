import { classificar } from './lib/vitorio/classificador.ts';
import { servicos } from './tests/fixtures/vitorio-servicos.ts';
const sv = servicos({ perfil: 'gestor' });
const c = classificar(sv.cl, 'quem sao eles', { ambiguas: [] });
console.log(c.intencao?.id, c.confianca, c.margem, c.exato, sv.cl.intencoes.get('carteira.membros_do_conselho')?.id);
console.log(/\b(eles|elas|esses|essas|deles|delas)\b/.test('quem sao eles'));
