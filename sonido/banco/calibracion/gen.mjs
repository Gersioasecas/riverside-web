/* genera variantes de calibración: ruido blanco -> cadena de filtros FIJA */
import { writeFileSync } from 'node:fs';
const casos = JSON.parse(process.argv[2]);
for (const c of casos) {
  const js = `
function construirMar(ctx, dur) {
  const SR = ctx.sampleRate;
  const n = Math.round(SR * 11.3);
  const buf = ctx.createBuffer(2, n, SR);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (Math.random()+Math.random()+Math.random()+Math.random()-2) * 0.5;
  }
  const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
  let nodo = s;
  ${c.filtros.map(f => `{ const b = ctx.createBiquadFilter(); b.type='${f[0]}'; b.frequency.value=${f[1]}; b.Q.value=${f[2]}; ${f[3]!==undefined?`b.gain.value=${f[3]};`:''} nodo = nodo.connect(b); }`).join('\n  ')}
  const g = ctx.createGain(); g.gain.value = ${c.gan};
  nodo.connect(g).connect(ctx.destination);
  s.start();
}`;
  writeFileSync(`/tmp/mar-cal/f-${c.nom}.js`, js);
}
