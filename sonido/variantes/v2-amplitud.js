/* ============================================================================
   v2 · LA OLA CAMBIA DE VOLUMEN, NO DE TIMBRE
   ----------------------------------------------------------------------------
   EL HALLAZGO QUE ORDENA TODO (medido, no supuesto):

     ruido puro          barrido del centroide = 0.06 octavas
     v0 (el «bong»)                             2.55 octavas
     v1 (bandas fijas)                          2.37 octavas

   El «bong» no era un tono: era el CENTRO TÍMBRICO paseando dos octavas y
   media. El oído lo sigue igual que seguiría una nota. Y v1 no lo arregló
   porque, aunque los filtros estaban quietos, subir el agudo mientras baja el
   grave desplaza el centroide exactamente igual.

   Lo que hace una ola de verdad: **sube y baja de VOLUMEN**. Su timbre apenas
   cambia — un poco más de brillo justo en la cresta, y ya. Así que aquí cada
   voz tiene sus tres bandas con pesos FIJOS, y lo que modula la envolvente es
   la ganancia de la voz ENTERA. El brillo extra de la cresta se queda en un
   ±30 %, no en un salto de octavas.

   CAPAS
     1. FONDO   — ruido marrón continuo, quieto. Timbre constante por diseño.
     2. OLAS    — 11 voces. Cada una: su ruido → tres bandas de peso fijo →
                  UNA ganancia con swash asimétrico → su panorámica.
     3. ESPUMA  — burbujas de Minnaert, en dos buffers distintos por canal.
   ========================================================================== */

function construirMar(ctx, dur) {
  const SR = ctx.sampleRate;

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

  /* Minnaert: una burbuja de aire en agua resuena a f ≈ 3.26/r (r en metros).
     0.15–2 mm de radio → 1.6 a 22 kHz. Al colapsar la frecuencia sube y la
     amplitud cae en milisegundos. Miles de ellas hacen el siseo de la espuma. */
  function bufferEspuma(segundos, cuantas, escala) {
    const n = Math.round(SR * segundos);
    const buf = ctx.createBuffer(1, n, SR);
    const d = buf.getChannelData(0);
    for (let k = 0; k < cuantas; k++) {
      const ini = Math.floor(Math.random() * (n - 2000));
      const r = 0.00015 + Math.random() * 0.0019;
      const f0 = 3.26 / r;
      if (f0 > SR * 0.45) continue;
      const durB = 0.0015 + Math.random() * 0.011;
      const largo = Math.floor(durB * SR);
      const amp = (0.2 + Math.random() * 0.8) * escala;
      const subida = 0.1 + Math.random() * 0.35;
      const amort = 3.2 / durB;
      let fase = Math.random() * 6.283;
      for (let i = 0; i < largo && ini + i < n; i++) {
        const t = i / SR;
        fase += (2 * Math.PI * f0 * (1 + subida * (t / durB))) / SR;
        d[ini + i] += Math.sin(fase) * amp * Math.exp(-amort * t);
      }
    }
    return buf;
  }

  const enBucle = (b) => { const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; return s; };
  const filtro = (tipo, f, q) => { const b = ctx.createBiquadFilter(); b.type = tipo; b.frequency.value = f; b.Q.value = q; return b; };

  const maestro = ctx.createGain();
  maestro.gain.value = 0.42;   // medido: a 0.55 el pico llegaba a 1.247 y recortaba
  maestro.connect(ctx.destination);

  /* ── 1 · fondo ──────────────────────────────────────────────────────── */
  const fondo = enBucle(ruidoMarron(23, 0.42));
  const fLP = filtro('lowpass', 500, 0.4);
  const gF = ctx.createGain(); gF.gain.value = 0.62;
  fondo.connect(fLP).connect(gF).connect(maestro);
  fondo.start();

  /* ── 2 · once olas ─────────────────────────────────────────────────────
     Periodos inconmensurables. Las lejanas suenan más oscuras y más bajas:
     el aire absorbe los agudos con la distancia.                           */
  const OLAS = [
    { periodo: 13.1, fase: 0.00, pan: -0.72, lejos: 0.88, nivel: 0.42 },
    { periodo: 17.9, fase: 0.29, pan:  0.58, lejos: 0.93, nivel: 0.36 },
    { periodo: 10.3, fase: 0.61, pan: -0.26, lejos: 0.62, nivel: 0.58 },
    { periodo: 21.7, fase: 0.11, pan:  0.85, lejos: 0.96, nivel: 0.30 },
    { periodo: 14.3, fase: 0.83, pan:  0.14, lejos: 0.47, nivel: 0.66 },
    { periodo: 25.9, fase: 0.44, pan: -0.90, lejos: 0.97, nivel: 0.27 },
    { periodo:  9.1, fase: 0.72, pan:  0.38, lejos: 0.70, nivel: 0.50 },
    { periodo: 23.3, fase: 0.18, pan: -0.50, lejos: 0.94, nivel: 0.32 },
    { periodo: 18.7, fase: 0.95, pan:  0.04, lejos: 0.78, nivel: 0.44 },
    { periodo: 11.9, fase: 0.37, pan:  0.70, lejos: 0.83, nivel: 0.40 },
    { periodo: 16.1, fase: 0.55, pan: -0.42, lejos: 0.90, nivel: 0.34 },
  ];

  const SUB = 0.22;
  const swash = (u) => {
    u -= Math.floor(u);
    return u < SUB ? 1 - Math.pow(1 - u / SUB, 2.2) : Math.pow(1 - (u - SUB) / (1 - SUB), 1.8);
  };

  const PASO = 0.05;

  OLAS.forEach((o, idx) => {
    const fuente = enBucle(ruidoRosa(15 + idx * 1.9, 0.5));
    const pan = ctx.createStereoPanner(); pan.pan.value = o.pan;

    /* LA GANANCIA DE LA VOZ ENTERA: esto es lo único con envolvente grande.
       La ola sube y baja de volumen; su timbre casi no cambia.             */
    const voz = ctx.createGain();
    voz.gain.value = 0;
    voz.connect(pan).connect(maestro);

    /* tres bandas de PESO FIJO. Cuanto más lejos la ola, menos agudos:
       eso es absorción atmosférica, y da la sensación de distancia.        */
    const agudos = 0.34 * Math.pow(1 - o.lejos, 1.1) + 0.03;
    const BANDAS = [
      { tipo: 'lowpass',  f: 260 + idx * 9,   q: 0.4,  peso: 1.00 },
      { tipo: 'bandpass', f: 850 + idx * 47,  q: 0.45, peso: 0.34 },
      { tipo: 'bandpass', f: 2600 + idx * 90, q: 0.4,  peso: agudos },
    ];
    const brillo = [];
    BANDAS.forEach((b, j) => {
      const f = filtro(b.tipo, b.f, b.q);
      const g = ctx.createGain();
      g.gain.value = b.peso;
      fuente.connect(f).connect(g).connect(voz);
      if (j === 2) brillo.push(g);
    });

    for (let t = 0; t < dur; t += PASO) {
      const s = swash(t / o.periodo + o.fase);
      voz.gain.setValueAtTime(o.nivel * (0.10 + 0.90 * s), t);
      /* el ÚNICO cambio de timbre: un poco más de brillo en la cresta.
         ±35 % sobre el peso fijo, no un salto de octavas. Ahí está la
         diferencia con v0 y v1. */
      brillo.forEach((g) => g.gain.setValueAtTime(agudos * (0.78 + 0.44 * s), t));
    }

    fuente.start();
  });

  /* ── 3 · espuma ─────────────────────────────────────────────────────────
     Dos buffers distintos, uno por canal: dos oídos que no oyen exactamente
     lo mismo es lo que hace que un ambiente envuelva.                      */
  [-0.55, 0.55].forEach((lado, i) => {
    const esp = enBucle(bufferEspuma(19 + i * 3.1, 6400, 0.05));
    const hp = filtro('highpass', 1400, 0.4);
    const lp = filtro('lowpass', 9000, 0.4);
    const pan = ctx.createStereoPanner(); pan.pan.value = lado;
    const g = ctx.createGain(); g.gain.value = 0;
    esp.connect(hp).connect(lp).connect(g).connect(pan).connect(maestro);

    for (let t = 0; t < dur; t += PASO) {
      let cerca = 0;
      for (const o of OLAS) {
        const s = swash(t / o.periodo + o.fase) * Math.pow(1 - o.lejos, 0.8);
        if (s > cerca) cerca = s;
      }
      g.gain.setValueAtTime(0.06 + Math.pow(cerca, 1.6) * 0.5, t);
    }
    esp.start();
  });
}
