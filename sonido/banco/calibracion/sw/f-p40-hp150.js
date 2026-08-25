/* ============================================================================
   v3 · EL MAR LEJANO — borrador 1
   ========================================================================== */

function construirMar(ctx, dur) {
  const SR = ctx.sampleRate;

  /* ── perillas ─────────────────────────────────────────────────────────── */
  const TILT      = 7.9;    // dB/oct que quita la cascada de highshelf
  const FCORTE    = 150;    // Hz del highpass
  const NHP       = 2;      // cuántos highpass en cascada
  const MAESTRO   = 2.4;
  const PROF      = 0.4;   // profundidad de las envolventes de ola
  const NVOCES    = 21;
  const VIENTO_dB = 2.5;

  const LARGOS = [11.317, 15.731, 21.139];   // s, inconmensurables

  /* ── ruido blanco: el color entero lo pone la cadena fija de más abajo ── */
  const ruidos = LARGOS.map((seg) => {
    const n = Math.round(SR * seg);
    const b = ctx.createBuffer(1, n, SR);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  });

  /* ── envolventes como buffer diminuto a playbackRate ínfimo ───────────── */
  const NE = 4096;
  function envolvente(periodoS, intervalo, ta, td, piso) {
    const b = ctx.createBuffer(1, NE, SR);
    const d = b.getChannelData(0);
    const mps = NE / periodoS;                       // muestras por segundo
    for (let t = Math.random() * intervalo; t < periodoS; t += intervalo * (0.55 + 0.9 * Math.random())) {
      const A = 0.6 + 0.8 * Math.random();
      const a = ta * (0.7 + 0.6 * Math.random());
      const c = td * (0.7 + 0.6 * Math.random());
      const i0 = Math.round((t - a) * mps), i1 = Math.round((t + c) * mps);
      for (let i = i0; i <= i1; i++) {
        const dt = i / mps - t;
        let v;
        if (dt < 0) v = 0.5 - 0.5 * Math.cos(Math.PI * (dt + a) / a);
        else        v = 0.5 + 0.5 * Math.cos(Math.PI * dt / c);
        d[((i % NE) + NE) % NE] += A * v;
      }
    }
    let s = 0, s2 = 0;
    for (let i = 0; i < NE; i++) { s += d[i]; s2 += d[i] * d[i]; }
    const med = s / NE, rms = Math.sqrt(s2 / NE);
    for (let i = 0; i < NE; i++) d[i] = piso + PROF * (d[i] - med) / (rms + 1e-9) * 0.5 + PROF * med / (rms + 1e-9) * 0.5;
    // reescala a rms 1 para que los niveles sean predecibles
    s2 = 0; for (let i = 0; i < NE; i++) { if (d[i] < 0) d[i] = 0; s2 += d[i] * d[i]; }
    const r2 = Math.sqrt(s2 / NE);
    for (let i = 0; i < NE; i++) d[i] /= (r2 + 1e-9);
    return b;
  }

  const lento = (buf, periodoS) => {
    const s = ctx.createBufferSource();
    s.buffer = buf; s.loop = true;
    s.playbackRate.value = NE / (periodoS * SR);
    return s;
  };

  /* ── bus y cadena FIJA ────────────────────────────────────────────────── */
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
  const salida = ctx.createGain(); salida.gain.value = 0;
  nodo.connect(salida).connect(ctx.destination);

  // entrada suave + viento
  salida.gain.setValueAtTime(0, 0);
  salida.gain.linearRampToValueAtTime(MAESTRO, 2.5);
  const vientoBuf = envolvente(431, 47, 22, 30, 1);
  const viento = lento(vientoBuf, 431);
  const vGan = ctx.createGain();
  vGan.gain.value = MAESTRO * (Math.pow(10, VIENTO_dB / 20) - 1) * 0.5;
  viento.connect(vGan).connect(salida.gain);
  viento.start();

  /* ── las voces ────────────────────────────────────────────────────────── */
  const PANS = [];
  for (let k = 0; k < NVOCES; k++) {
    const u = (k * 0.6180339887) % 1;
    const mag = k % 7 === 0 ? 0.10 + 0.14 * u : 0.45 + 0.54 * u;
    PANS.push(k % 2 === 0 ? -mag : mag);
  }

  for (let k = 0; k < NVOCES; k++) {
    const src = ctx.createBufferSource();
    src.buffer = ruidos[k % ruidos.length];
    src.loop = true;
    src.playbackRate.value = 0.88 + 0.26 * ((k * 0.7548776662) % 1);

    const g = ctx.createGain(); g.gain.value = 0;
    const pan = ctx.createStereoPanner(); pan.pan.value = PANS[k];
    src.connect(g).connect(pan).connect(bus);

    const per = 137 + k * 11.7;
    const env = lento(envolvente(per, 26 + 14 * ((k * 0.4531) % 1), 3.4, 7.6, 0.55), per);
    const eg = ctx.createGain(); eg.gain.value = 1 / Math.sqrt(NVOCES);
    env.connect(eg).connect(g.gain);

    src.start(0, Math.random() * LARGOS[k % ruidos.length]);
    env.start(0, Math.random() * (NE / SR));
  }
}
