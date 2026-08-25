/* v3 · EL MAR LEJANO — v4 de trabajo */

function construirMar(ctx, dur) {
  const SR = ctx.sampleRate;

  const FCORTE    = 95;     // Hz · faldón de 12 dB/oct por debajo
  const RODILLA   = 707;    // Hz · primer peldaño de la caída
  const PELDANOS  = [3.1, 4.8, 8.2, 12.3, 18.7];   // dB por escalón de octava
  const MAESTRO   = 2.161;
  const NVOCES    = 19;
  const NTRENES   = 3;
  const T0        = 5.5;    // s entre olas
  const REPARTO   = 1.22;
  const JITTER    = 0.30;
  const PEEL      = 4.0;    // s que tarda la rotura en barrer el arco audible
  const TAU_A     = 0.8;    // s · constante de subida
  const TAU_D     = 2.2;    // s · constante de caída
  const BARRAS    = 1;
  const DBARRA    = 2.6;
  const CAIDA     = 0.62;
  const PROF      = 0.25;
  const VIENTO_dB = 0.5;    // L10-L90 del viento
  const VIENTO_T  = 407;
  const VIENTO_TAU= 12;     // s de correlación

  const LARGOS   = [11.317, 15.731, 21.139];
  const PERIODOS = [173.3, 197.9, 229.7];

  const ruidos = LARGOS.map((seg) => {
    const n = Math.round(SR * seg);
    const b = ctx.createBuffer(1, n, SR);
    const d = b.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759; b2=0.96900*b2+w*0.1538520;
      b3=0.86650*b3+w*0.3104856; b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
      d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6=w*0.115926;
    }
    return b;
  });

  const NE = 8192;
  function tren(periodoS, t0) {
    const b = ctx.createBuffer(1, NE, SR);
    const d = b.getChannelData(0);
    const mps = NE / periodoS;
    const cola = Math.ceil(TAU_D * 7 * mps);
    let t = Math.random() * t0;
    while (t < periodoS) {
      const A0 = 0.6 + 0.8 * Math.random();
      let tb = t;
      for (let n = 0; n < BARRAS; n++) {
        const A = A0 * Math.pow(CAIDA, n);
        const ta = TAU_A * (0.75 + 0.5 * Math.random());
        const td = TAU_D * (0.75 + 0.5 * Math.random());
        const i0 = Math.round(tb * mps);
        for (let i = i0; i <= i0 + cola; i++) {
          const dt = (i - i0) / mps;
          d[((i % NE) + NE) % NE] += A * (1 - Math.exp(-dt / ta)) * Math.exp(-dt / td);
        }
        tb += DBARRA * (0.75 + 0.5 * Math.random());
      }
      t += t0 * (1 + JITTER * (Math.random() + Math.random() + Math.random() - 1.5) * 2);
    }
    let s = 0; for (let i = 0; i < NE; i++) s += d[i];
    const k = NE / (s + 1e-9);
    for (let i = 0; i < NE; i++) d[i] *= k;
    return b;
  }

  const lento = (buf, periodoS, retardoS) => {
    const s = ctx.createBufferSource();
    s.buffer = buf; s.loop = true;
    s.playbackRate.value = NE / (periodoS * SR);
    s.start(0, (((retardoS || 0) % periodoS) + periodoS) % periodoS * NE / (periodoS * SR));
    return s;
  };

  /* cadena FIJA de color */
  const bus = ctx.createGain(); bus.gain.value = 1;
  let nodo = bus;
  { const f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = FCORTE; f.Q.value = 0.707;
    nodo = nodo.connect(f); }
  PELDANOS.forEach((g, i) => {
    const f = ctx.createBiquadFilter();
    f.type = 'highshelf';
    f.frequency.value = Math.min(RODILLA * Math.pow(2, i), SR * 0.45);
    f.gain.value = -g;
    nodo = nodo.connect(f);
  });
  const salida = ctx.createGain();
  salida.gain.value = 0;
  salida.gain.setValueAtTime(0, 0);
  salida.gain.linearRampToValueAtTime(MAESTRO, 2.5);
  nodo.connect(salida).connect(ctx.destination);

  /* viento: ruido gaussiano paso-bajo, JAMÁS una sinusoide */
  if (VIENTO_dB > 0.01) {
    const vb = ctx.createBuffer(1, NE, SR);
    const d = vb.getChannelData(0);
    const a = Math.exp(-(VIENTO_T / NE) / VIENTO_TAU);
    let x = 0, s = 0, s2 = 0;
    for (let i = 0; i < NE; i++) { x = a * x + (1 - a) * (Math.random()+Math.random()+Math.random()-1.5) * 2; d[i] = x; }
    for (let i = 0; i < NE; i++) { s += d[i]; }
    const m = s / NE;
    for (let i = 0; i < NE; i++) { d[i] -= m; s2 += d[i] * d[i]; }
    const sd = Math.sqrt(s2 / NE) + 1e-12;
    const rel = (Math.pow(10, VIENTO_dB / 20) - 1) / (2 * 1.2816);
    for (let i = 0; i < NE; i++) d[i] *= rel / sd;
    const vg = ctx.createGain(); vg.gain.value = MAESTRO;
    lento(vb, VIENTO_T).connect(vg).connect(salida.gain);
  }

  const trenes = PERIODOS.map((p, j) => tren(p, T0 * Math.pow(REPARTO, j - (NTRENES - 1) / 2)));

  const NIVEL = 1 / Math.sqrt(NVOCES);
  for (let k = 0; k < NVOCES; k++) {
    const u = (k * 0.6180339887) % 1;
    const pan = (k % 7 === 0 ? 0.10 + 0.14 * u : 0.45 + 0.54 * u) * (k % 2 === 0 ? -1 : 1);

    const src = ctx.createBufferSource();
    src.buffer = ruidos[k % ruidos.length];
    src.loop = true;
    src.playbackRate.value = 0.88 + 0.26 * ((k * 0.7548776662) % 1);

    const g = ctx.createGain();
    g.gain.value = NIVEL * (1 - PROF);
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    src.connect(g).connect(p).connect(bus);
    src.start(0, Math.random() * LARGOS[k % ruidos.length]);

    const j = k % NTRENES;
    const eg = ctx.createGain(); eg.gain.value = NIVEL * PROF;
    lento(trenes[j], PERIODOS[j], (pan + 1) / 2 * PEEL).connect(eg).connect(g.gain);
  }
}
