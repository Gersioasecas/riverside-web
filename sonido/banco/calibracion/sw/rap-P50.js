/* v3 · EL MAR LEJANO — borrador 2 (parametrización limpia) */

function construirMar(ctx, dur) {
  const SR = ctx.sampleRate;

  const TILT      = 7.9;    // dB/oct que quita la cascada de highshelf
  const FCORTE    = 190;    // Hz del highpass
  const NHP       = 2;
  const MAESTRO   = 1.65;
  const NVOCES    = 21;
  const PROF      = 0.5;   // 0 = mar plano · 1 = la voz cae a silencio entre olas
  const INTERVALO = 9;     // s entre olas de UNA voz
  const TA        = 1.2;    // s de subida de una ola
  const TD        = 3;    // s de bajada
  const VIENTO_dB = 0.001;
  const VIENTO_T  = 431;    // s del ciclo largo del viento

  const LARGOS = [11.317, 15.731, 21.139];

  const ruidos = LARGOS.map((seg) => {
    const n = Math.round(SR * seg);
    const b = ctx.createBuffer(1, n, SR);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  });

  /* envolvente: tren aperiódico de olas, media 1, en un buffer diminuto */
  const NE = 4096;
  function ondas(periodoS, intervalo, ta, td) {
    const b = ctx.createBuffer(1, NE, SR);
    const d = b.getChannelData(0);
    const mps = NE / periodoS;
    for (let t = Math.random() * intervalo; t < periodoS; t += intervalo * (0.55 + 0.9 * Math.random())) {
      const A = 0.6 + 0.8 * Math.random();
      const a = ta * (0.7 + 0.6 * Math.random());
      const c = td * (0.7 + 0.6 * Math.random());
      for (let i = Math.round((t - a) * mps); i <= Math.round((t + c) * mps); i++) {
        const dt = i / mps - t;
        const v = dt < 0 ? 0.5 - 0.5 * Math.cos(Math.PI * (dt + a) / a)
                         : 0.5 + 0.5 * Math.cos(Math.PI * dt / c);
        d[((i % NE) + NE) % NE] += A * v;
      }
    }
    let s = 0; for (let i = 0; i < NE; i++) s += d[i];
    const k = NE / (s + 1e-9);                       // media = 1
    for (let i = 0; i < NE; i++) d[i] *= k;
    return b;
  }

  const lento = (buf, periodoS) => {
    const s = ctx.createBufferSource();
    s.buffer = buf; s.loop = true;
    s.playbackRate.value = NE / (periodoS * SR);
    return s;
  };

  /* bus y cadena FIJA de color */
  const bus = ctx.createGain(); bus.gain.value = 1;
  let nodo = bus;
  for (let i = 0; i < NHP; i++) {
    const f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = FCORTE; f.Q.value = 0.707;
    nodo = nodo.connect(f);
  }
  for (const f0 of [250, 500, 1000, 2000, 4000, 8000, 16000]) {
    const f = ctx.createBiquadFilter();
    f.type = 'highshelf'; f.frequency.value = f0; f.gain.value = -TILT;
    nodo = nodo.connect(f);
  }
  const salida = ctx.createGain();
  salida.gain.value = 0;
  salida.gain.setValueAtTime(0, 0);
  salida.gain.linearRampToValueAtTime(MAESTRO, 2.5);
  nodo.connect(salida).connect(ctx.destination);

  /* viento: un ciclo larguísimo de ±VIENTO_dB sobre TODO, sin tocar el color */
  const prof = Math.pow(10, VIENTO_dB / 20) - 1;
  const viento = lento(ondas(VIENTO_T, VIENTO_T / 7, VIENTO_T / 22, VIENTO_T / 13), VIENTO_T);
  const vg = ctx.createGain(); vg.gain.value = MAESTRO * prof;
  viento.connect(vg).connect(salida.gain);
  viento.start();

  /* voces */
  const NIVEL = 1 / Math.sqrt(NVOCES);
  for (let k = 0; k < NVOCES; k++) {
    const u = (k * 0.6180339887) % 1;
    const mag = k % 7 === 0 ? 0.10 + 0.14 * u : 0.45 + 0.54 * u;

    const src = ctx.createBufferSource();
    src.buffer = ruidos[k % ruidos.length];
    src.loop = true;
    src.playbackRate.value = 0.88 + 0.26 * ((k * 0.7548776662) % 1);

    const g = ctx.createGain();
    g.gain.value = NIVEL * (1 - PROF);                 // el mar nunca calla
    const pan = ctx.createStereoPanner();
    pan.pan.value = k % 2 === 0 ? -mag : mag;
    src.connect(g).connect(pan).connect(bus);

    const per = 137 + k * 11.7;
    const env = lento(ondas(per, INTERVALO * (0.75 + 0.5 * ((k * 0.4531) % 1)), TA, TD), per);
    const eg = ctx.createGain(); eg.gain.value = NIVEL * PROF;
    env.connect(eg).connect(g.gain);

    src.start(0, Math.random() * LARGOS[k % ruidos.length]);
    env.start(0, Math.random() * (NE / SR));
  }
}
