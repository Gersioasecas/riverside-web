
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
  { const b = ctx.createBiquadFilter(); b.type='highpass'; b.frequency.value=120; b.Q.value=0.707;  nodo = nodo.connect(b); }
  { const b = ctx.createBiquadFilter(); b.type='highpass'; b.frequency.value=120; b.Q.value=0.707;  nodo = nodo.connect(b); }
  { const b = ctx.createBiquadFilter(); b.type='lowpass'; b.frequency.value=900; b.Q.value=0.707;  nodo = nodo.connect(b); }
  { const b = ctx.createBiquadFilter(); b.type='lowpass'; b.frequency.value=1800; b.Q.value=0.707;  nodo = nodo.connect(b); }
  const g = ctx.createGain(); g.gain.value = 4;
  nodo.connect(g).connect(ctx.destination);
  s.start();
}