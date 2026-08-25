
function construirMar(ctx, dur) {
  const SR = ctx.sampleRate;
  const n = Math.round(SR * 11.3);
  const buf = ctx.createBuffer(2, n, SR);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < n; i++) {
      const w = Math.random()*2-1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759; b2=0.96900*b2+w*0.1538520;
      b3=0.86650*b3+w*0.3104856; b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
      d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6=w*0.115926;
    }
  }
  const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
  let nodo = s;
  {const b=ctx.createBiquadFilter();b.type='highpass';b.frequency.value=190;b.Q.value=0.707;nodo=nodo.connect(b);}
  {const b=ctx.createBiquadFilter();b.type='highpass';b.frequency.value=190;b.Q.value=0.707;nodo=nodo.connect(b);}
  {const b=ctx.createBiquadFilter();b.type='highshelf';b.frequency.value=250;b.gain.value=-5.5;nodo=nodo.connect(b);}
  {const b=ctx.createBiquadFilter();b.type='highshelf';b.frequency.value=500;b.gain.value=-5.5;nodo=nodo.connect(b);}
  {const b=ctx.createBiquadFilter();b.type='highshelf';b.frequency.value=1000;b.gain.value=-5.5;nodo=nodo.connect(b);}
  {const b=ctx.createBiquadFilter();b.type='highshelf';b.frequency.value=2000;b.gain.value=-5.5;nodo=nodo.connect(b);}
  {const b=ctx.createBiquadFilter();b.type='highshelf';b.frequency.value=4000;b.gain.value=-5.5;nodo=nodo.connect(b);}
  {const b=ctx.createBiquadFilter();b.type='highshelf';b.frequency.value=8000;b.gain.value=-5.5;nodo=nodo.connect(b);}
  {const b=ctx.createBiquadFilter();b.type='highshelf';b.frequency.value=16000;b.gain.value=-5.5;nodo=nodo.connect(b);}
  const g = ctx.createGain(); g.gain.value = 4;
  nodo.connect(g).connect(ctx.destination);
  s.start();
}