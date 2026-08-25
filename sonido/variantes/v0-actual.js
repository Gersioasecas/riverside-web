/* v0 · LO QUE HAY HOY — la línea base, el que Sergio describió como
   «un bong en la filarmónica cuando el sonido se queda largo».
   Se conserva para poder MEDIR contra qué estamos mejorando. */
function construirMar(ctx, dur) {
  const SR = ctx.sampleRate;
  const n = Math.round(SR * Math.min(dur, 6));       // bucle de 6 s
  const buf = ctx.createBuffer(1, n, SR);
  const d = buf.getChannelData(0);
  let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759; b2=0.96900*b2+w*0.1538520;
    b3=0.86650*b3+w*0.3104856; b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
    d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.16; b6=w*0.115926;
  }
  const maestro = ctx.createGain(); maestro.gain.value = 0.52; maestro.connect(ctx.destination);

  const s1 = ctx.createBufferSource(); s1.buffer = buf; s1.loop = true;
  const f1 = ctx.createBiquadFilter(); f1.type='lowpass'; f1.Q.value=0.7;
  const g1 = ctx.createGain();
  const SUB=0.22, T=8.3;
  const swash = u => { u -= Math.floor(u); return u<SUB ? 1-Math.pow(1-u/SUB,3) : Math.pow(1-(u-SUB)/(1-SUB),1.7); };
  for (let k = 0; k < dur*20; k++) {
    const t = k/20, s = swash(t/T);
    f1.frequency.setValueAtTime(600 + s*3200, t);
    g1.gain.setValueAtTime(0.5 + s*0.7, t);
  }
  s1.connect(f1).connect(g1).connect(maestro); s1.start();

  const s2 = ctx.createBufferSource(); s2.buffer = buf; s2.loop = true;
  const f2 = ctx.createBiquadFilter(); f2.type='lowpass'; f2.frequency.value=220; f2.Q.value=0.5;
  const g2 = ctx.createGain(); g2.gain.value = 0.40;
  s2.connect(f2).connect(g2).connect(maestro); s2.start();
}
