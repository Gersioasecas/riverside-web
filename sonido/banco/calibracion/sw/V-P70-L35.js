/* ============================================================================
   v3 · EL MAR LEJANO — el mar oído desde la terraza, a cien metros del agua
   ========================================================================== */

function construirMar(ctx, dur) {
  const SR = ctx.sampleRate;

  /* ── perillas ─────────────────────────────────────────────────────────── */
  const FCORTE    = 105;    // Hz · pie de la meseta
  const FRODILLA  = 1400;   // Hz · donde empieza a comerse los agudos el aire
  const TILT      = 8.7;    // dB/oct de caída por encima de la rodilla
  const MAESTRO   = 1.3136;
  const NVOCES    = 21;     // sectores de costa
  const NTRENES   = 3;      // trenes de oleaje independientes
  const T0        = 6.2;    // s entre olas
  const JITTER    = 0.32;   // dispersión relativa del periodo
  const PEEL      = 3.5;    // s que tarda la rotura en barrer el arco audible
  const TA        = 1.1;    // s de subida por sector
  const TD        = 4.2;    // s de bajada (el lavado de espuma)
  const PROF      = 0.7;   // profundidad de la modulación por sector
  const VIENTO_dB = 2.0;
  const VIENTO_T  = 407;    // s

  const LARGOS  = [11.317, 15.731, 21.139];        // s, inconmensurables
  const PERIODOS = [173.3, 197.9, 229.7];          // s de cada tren

  /* ── ruido rosa (Kellett): meseta plana por construcción ──────────────── */
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

  /* ── un tren de olas, en un buffer diminuto ───────────────────────────── */
  const NE = 8192;
  function tren(periodoS) {
    const b = ctx.createBuffer(1, NE, SR);
    const d = b.getChannelData(0);
    const mps = NE / periodoS;
    let t = Math.random() * T0;
    while (t < periodoS) {
      const A = 0.55 + 0.9 * Math.random();
      const a = TA * (0.7 + 0.6 * Math.random());
      const c = TD * (0.7 + 0.6 * Math.random());
      for (let i = Math.round((t - a) * mps); i <= Math.round((t + c) * mps); i++) {
        const dt = i / mps - t;
        const v = dt < 0 ? 0.5 - 0.5 * Math.cos(Math.PI * (dt + a) / a)
                         : 0.5 + 0.5 * Math.cos(Math.PI * dt / c);
        d[((i % NE) + NE) % NE] += A * v;
      }
      t += T0 * (1 + JITTER * (Math.random() + Math.random() + Math.random() - 1.5) * 2);
    }
    let s = 0; for (let i = 0; i < NE; i++) s += d[i];
    const k = NE / (s + 1e-9);                        // media = 1
    for (let i = 0; i < NE; i++) d[i] *= k;
    return b;
  }

  const lento = (buf, periodoS, retardoS) => {
    const s = ctx.createBufferSource();
    s.buffer = buf; s.loop = true;
    s.playbackRate.value = NE / (periodoS * SR);
    s.start(0, ((retardoS || 0) % periodoS) * NE / (periodoS * SR));
    return s;
  };

  /* ── cadena FIJA de color · nunca se mueve, y ahí está todo el asunto ─── */
  const bus = ctx.createGain(); bus.gain.value = 1;
  let nodo = bus;
  for (let i = 0; i < 2; i++) {
    const f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = FCORTE; f.Q.value = 0.707;
    nodo = nodo.connect(f);
  }
  for (const f0 of [FRODILLA, FRODILLA * 2, FRODILLA * 4, FRODILLA * 8]) {
    const f = ctx.createBiquadFilter();
    f.type = 'highshelf'; f.frequency.value = Math.min(f0, SR * 0.45); f.gain.value = -TILT;
    nodo = nodo.connect(f);
  }
  const salida = ctx.createGain();
  salida.gain.value = 0;
  salida.gain.setValueAtTime(0, 0);
  salida.gain.linearRampToValueAtTime(MAESTRO, 2.5);
  nodo.connect(salida).connect(ctx.destination);

  /* viento: un ciclo de minutos sobre TODO, pura ganancia */
  const vBuf = ctx.createBuffer(1, NE, SR);
  { const d = vBuf.getChannelData(0);
    let x = 0; const tmp = new Float32Array(NE);
    for (let i = 0; i < NE; i++) { x = 0.995 * x + 0.005 * (Math.random() * 2 - 1); tmp[i] = x; }
    let mx = 0; for (let i = 0; i < NE; i++) mx = Math.max(mx, Math.abs(tmp[i]));
    for (let i = 0; i < NE; i++) d[i] = tmp[i] / (mx + 1e-9);
  }
  const vg = ctx.createGain();
  vg.gain.value = MAESTRO * (Math.pow(10, VIENTO_dB / 20) - 1);
  lento(vBuf, VIENTO_T).connect(vg).connect(salida.gain);

  /* ── los trenes de oleaje ─────────────────────────────────────────────── */
  const trenes = PERIODOS.map((p) => tren(p));

  /* ── los sectores de costa ────────────────────────────────────────────── */
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
