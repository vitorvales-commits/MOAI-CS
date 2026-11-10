import { responder } from './lib/vitorio/responder.ts';
import { servicos } from './tests/fixtures/vitorio-servicos.ts';
const perfil = (process.env.PERFIL || 'cs') as 'cs' | 'gestor';
const sv = servicos({ perfil, csNome: perfil === 'cs' ? 'George' : null });
(async () => {
  for (const q of process.argv.slice(2)) {
    const r = await responder({ texto: q, contexto: [] }, sv);
    console.log(JSON.stringify(q), '=>', r.resultado, r.intencao, r.confianca.toFixed(2), '|', r.texto.slice(0, 150), r.esclarecer ? ' [esc ' + r.esclarecer.opcoes.length + ']' : '', r.fonte ? '' : (r.resultado === 'resposta' && r.intencao && !/^(social|conhec|plataf|processo)/.test(r.intencao) ? ' !!sem fonte' : ''));
  }
})();
