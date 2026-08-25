/* calibración: ¿qué lee `pend` para cada color de ruido? COLOR se sustituye. */
function construirMar(ctx, dur) {
  const SR = ctx.sampleRate;
  const n = Math.round(SR * 12);
  const buf = ctx.createBuffer(2, n, SR);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    let c0=0,c1=0,c2=0,c3=0,c4=0,c5=0,c6=0;
    let br=0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      // Kellett pink
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759; b2=0.96900*b2+w*0.1538520;
      b3=0.86650*b3+w*0.3104856; b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
      const p=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6=w*0.115926;
      // Kellett aplicado por segunda vez -> pendiente doble
      c0=0.99886*c0+p*0.0555179; c1=0.99332*c1+p*0.0750759; c2=0.96900*c2+p*0.1538520;
      c3=0.86650*c3+p*0.3104856; c4=0.55000*c4+p*0.5329522; c5=-0.7616*c5-p*0.0168980;
      const pp=(c0+c1+c2+c3+c4+c5+c6+p*0.5362)*0.11; c6=p*0.115926;
      // marrón (un polo)
      br=(br+0.02*w)/1.02;
      d[i] = p;
    }
  }
  const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
  const g = ctx.createGain(); g.gain.value = 1;
  s.connect(g).connect(ctx.destination); s.start();
}
