/* ============================================================================
   v1 · BANCO DE BANDAS FIJAS + BURBUJAS
   ----------------------------------------------------------------------------
   LA IDEA QUE MATA EL «BONG»: no se barre ningún filtro.

   En v0 un lowpass recorría 600→3800 Hz. Un filtro que se mueve deja una
   cresta de resonancia que el oído sigue como si fuera una nota: medido, un
   tono 29.8 dB por encima del ruido de fondo. Eso es lo que Sergio oyó.

   Aquí los filtros están QUIETOS. Lo que se mueve es la GANANCIA de cada banda.
   Es además lo que pasa de verdad: al romper una ola no cambia la frecuencia de
   nada, cambia cuánta energía hay en cada zona del espectro.

   CAPAS
     1. FONDO   — ruido marrón continuo, el rumor que nunca para.
     2. OLAS    — 9 voces independientes. Cada una: ruido propio → tres bandas
                  fijas (grave/medio/agudo) cuyas ganancias sigue una envolvente
                  de swash asimétrica con SU periodo y SU fase → panorámica
                  propia. Nueve olas en fases distintas nunca coinciden.
     3. ESPUMA  — burbujas sintetizadas una a una (Minnaert): un seno cuya
                  frecuencia sube y cuya amplitud cae en pocos milisegundos.
                  Es el siseo, y es lo que le faltaba para sonar a agua.
   ========================================================================== */

function construirMar(ctx, dur) {
  const SR = ctx.sampleRate;

  /* ── ruidos ─────────────────────────────────────────────────────────── */
  function ruidoRosa(segundos, escala) {
    const n = Math.round(SR * segundos);
    const buf = ctx.createBuffer(1, n, SR);
    const d = buf.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759; b2=0.96900*b2+w*0.1538520;
      b3=0.86650*b3+w*0.3104856; b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
      d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*escala; b6=w*0.115926;
    }
    return buf;
  }

  function ruidoMarron(segundos, escala) {
    const n = Math.round(SR * segundos);
    const buf = ctx.createBuffer(1, n, SR);
    const d = buf.getChannelData(0);
    let ult = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      ult = (ult + 0.02 * w) / 1.02;
      d[i] = ult * escala * 3.5;
    }
    return buf;
  }

  /* ── espuma: burbujas de verdad ──────────────────────────────────────
     Minnaert: una burbuja de aire en agua resuena a f ≈ 3.26/r (r en metros),
     así que 0.2–2 mm de radio caen entre ~1.6 y ~16 kHz. Al colapsar, la
     frecuencia SUBE mientras la amplitud cae. Cada una dura milisegundos; son
     miles las que producen el siseo.                                        */
  function bufferEspuma(segundos, cuantas, escala) {
    const n = Math.round(SR * segundos);
    const buf = ctx.createBuffer(1, n, SR);
    const d = buf.getChannelData(0);
    for (let k = 0; k < cuantas; k++) {
      const ini = Math.floor(Math.random() * (n - 2000));
      const r = 0.0002 + Math.random() * 0.0018;      // 0.2–2 mm
      const f0 = 3.26 / r;                            // Minnaert
      if (f0 > SR * 0.45) continue;
      const dur = 0.002 + Math.random() * 0.012;      // 2–14 ms
      const largo = Math.floor(dur * SR);
      const amp = (0.25 + Math.random() * 0.75) * escala;
      const subida = 0.12 + Math.random() * 0.3;      // cuánto sube al colapsar
      const amort = 3 / dur;
      let fase = 0;
      for (let i = 0; i < largo && ini + i < n; i++) {
        const t = i / SR;
        const f = f0 * (1 + subida * (t / dur));
        fase += (2 * Math.PI * f) / SR;
        d[ini + i] += Math.sin(fase) * amp * Math.exp(-amort * t);
      }
    }
    return buf;
  }

  const enBucle = (buf) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; return s; };
  const banda = (tipo, f, q) => { const b = ctx.createBiquadFilter(); b.type = tipo; b.frequency.value = f; b.Q.value = q; return b; };

  const maestro = ctx.createGain();
  maestro.gain.value = 0.85;
  maestro.connect(ctx.destination);

  /* ── 1 · el rumor de fondo ──────────────────────────────────────────── */
  const fondo = enBucle(ruidoMarron(19, 0.5));
  const fLP = banda('lowpass', 420, 0.5);
  const gFondo = ctx.createGain(); gFondo.gain.value = 0.5;
  fondo.connect(fLP).connect(gFondo).connect(maestro);
  fondo.start();

  /* ── 2 · nueve olas ─────────────────────────────────────────────────
     Periodos primos entre sí: el conjunto tarda muchísimo en repetir la misma
     combinación. Las lejanas suenan más oscuras y más bajas, porque el aire se
     come los agudos con la distancia.                                       */
  const OLAS = [
    { periodo: 11.3, fase: 0.00, pan: -0.75, lejos: 0.85, nivel: 0.55 },
    { periodo: 14.9, fase: 0.31, pan:  0.62, lejos: 0.90, nivel: 0.50 },
    { periodo:  9.7, fase: 0.57, pan: -0.30, lejos: 0.55, nivel: 0.75 },
    { periodo: 17.3, fase: 0.13, pan:  0.88, lejos: 0.95, nivel: 0.42 },
    { periodo: 12.7, fase: 0.79, pan:  0.18, lejos: 0.40, nivel: 0.85 },
    { periodo: 21.1, fase: 0.46, pan: -0.92, lejos: 0.97, nivel: 0.38 },
    { periodo:  8.3, fase: 0.68, pan:  0.42, lejos: 0.65, nivel: 0.68 },
    { periodo: 19.7, fase: 0.22, pan: -0.55, lejos: 0.92, nivel: 0.45 },
    { periodo: 15.7, fase: 0.91, pan:  0.05, lejos: 0.72, nivel: 0.60 },
  ];

  // swash: sube rápido (22 %) y se retira despacio (78 %). Igual que la marea visual.
  const SUB = 0.22;
  const swash = (u) => {
    u -= Math.floor(u);
    return u < SUB ? 1 - Math.pow(1 - u / SUB, 2.4) : Math.pow(1 - (u - SUB) / (1 - SUB), 1.9);
  };

  const PASO = 0.04;                       // 25 puntos por segundo de envolvente

  OLAS.forEach((o, idx) => {
    const fuente = enBucle(ruidoRosa(13 + idx * 1.7, 0.5));   // cada ola, su ruido
    const pan = ctx.createStereoPanner(); pan.pan.value = o.pan;
    const nivel = ctx.createGain(); nivel.gain.value = o.nivel;
    pan.connect(nivel).connect(maestro);

    /* tres bandas QUIETAS. Q bajo a propósito: por encima de ~1.2 la banda
       empieza a cantar y vuelve el problema de v0. */
    const cuerpo = { f: 180 + idx * 11,  q: 0.45, peso: 1.00 };   // el rugido
    const medio  = { f: 900 + idx * 60,  q: 0.55, peso: 0.62 };   // el agua moviéndose
    const brillo = { f: 3200 - o.lejos * 1800, q: 0.5, peso: 0.55 * (1 - o.lejos * 0.75) };

    [cuerpo, medio, brillo].forEach((b, j) => {
      const filtro = banda(j === 0 ? 'lowpass' : 'bandpass', b.f, b.q);
      const g = ctx.createGain();
      g.gain.value = 0;
      fuente.connect(filtro).connect(g).connect(pan);

      // la envolvente: lo único que se mueve
      for (let t = 0; t < dur; t += PASO) {
        const s = swash(t / o.periodo + o.fase);
        // los agudos solo aparecen en la cresta; los graves están casi siempre
        const forma = j === 0 ? 0.35 + 0.65 * s : Math.pow(s, 1.5 + j * 0.6);
        g.gain.setValueAtTime(b.peso * forma, t);
      }
    });

    fuente.start();
  });

  /* ── 3 · la espuma ──────────────────────────────────────────────────
     Va en estéreo con dos buffers distintos: dos oídos que no oyen lo mismo es
     lo que hace que un ambiente envuelva en vez de sonar dentro de la cabeza. */
  [-0.6, 0.6].forEach((lado, i) => {
    const esp = enBucle(bufferEspuma(17 + i * 2.3, 5200, 0.055));
    const hp = banda('highpass', 1100, 0.5);
    const pan = ctx.createStereoPanner(); pan.pan.value = lado;
    const g = ctx.createGain(); g.gain.value = 0;
    esp.connect(hp).connect(g).connect(pan).connect(maestro);

    // la espuma solo suena cuando alguna ola está rompiendo
    for (let t = 0; t < dur; t += PASO) {
      let maxS = 0;
      for (const o of OLAS) {
        const s = swash(t / o.periodo + o.fase) * (1 - o.lejos * 0.6);
        if (s > maxS) maxS = s;
      }
      g.gain.setValueAtTime(Math.pow(maxS, 2.2) * 0.9, t);
    }
    esp.start();
  });
}
