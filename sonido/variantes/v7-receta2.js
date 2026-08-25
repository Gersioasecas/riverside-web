/* ============================================================================
   v7 · LA RECETA MEDIDA, CON EL LECHO ARREGLADO
   ----------------------------------------------------------------------------
   Ya no es diseño de oído: esto sigue lo que salió de investigar la acústica
   real (docs/ACUSTICA.md, 13 agentes con verificación adversarial).

   LOS CINCO ERRORES QUE CORRIGE, cada uno con su número:

   1. EL PERIODO ESTABA MAL POR UN FACTOR DE 3.
      Se usaban periodos de 9-26 s, que son swell del Pacífico. La boya NDBC
      42055 —Bahía de Campeche, el MISMO Golfo que Chachalacas— mide
      Tm02 = 3.64 s (p10 3.27, p90 4.10) con Hm0 < 0.8 m. Son 16.5 olas/min.
      Con caídas de 4-9 s, eso deja 2-6 olas sonando a la vez: exactamente las
      «multiples olas suavemente superponiendose» que faltaban.

   2. EL BARRIDO DEL TIMBRE ERA ~10× EL TECHO FÍSICO.
      La variación real de timbre entre olas (absorción atmosférica) es de
      0.4 dB a 1 kHz, 1.9 dB a 4 kHz y 5.5 dB a 8 kHz. Aquí el timbre solo
      cambia con un highshelf de −5 a +2 dB SORTEADO POR EVENTO, nunca
      modulado. Cero LFOs sobre ninguna frecuencia.

   3. FALTABA LA ESPUMA RETRASADA.
      La cola brillante llega 1.5-3.0 s DESPUÉS del pico de su ola. Ese
      desfase es lo que hace que el oído diga «agua» en vez de «ruido
      filtrado». Sin ella, cualquier ruido conformado suena a máquina.

   4. UN BIQUAD NO ES EL FILTRO CORRECTO.
      `lowpass` de Web Audio es −12 dB/oct CON pico resonante. El surf medido
      cae −9 dB/oct SIN pico. Eso es un solo polo: IIRFilterNode.

   5. LA AMPLITUD DE CADA OLA SIGUE UNA RAYLEIGH, NO UN LFO.
      Sortear cada ola de una Rayleigh^1.29 genera «sets» de olas grandes y
      pequeñas por sí solo, sin ninguna periodicidad que el oído pueda cazar.
      Y ~20 % de las olas no rompen: silencios naturales.

   Y el hallazgo de fondo (Nature 2018): el sonido NO lo hace el impacto del
   agua, lo hacen las burbujas de aire atrapadas. Si se impide la burbuja, no
   hay sonido en absoluto. Por eso el lecho reproduce la SUMA ESTADÍSTICA de
   una población de burbujas, y no «agua filtrada».

   ── LO QUE v7 ARREGLA DE v6 ──────────────────────────────────────────────
   v6 clavó el barrido (2.55 → 0.40 oct) pero rompió otras tres cosas, y las
   tres eran el mismo culpable: el lecho.
     · periodicidad 0.64 — su buffer de 12 s en bucle dominaba la
       autocorrelación. Ahora son 34 s, y dos buffers distintos.
     · estéreo 0.98 — el lecho era MONO y se lleva el 85 % de la energía, así
       que arrastraba todo al centro. Ahora es estéreo de verdad.
     · 2.7 olas/min — las olas quedaban tan por debajo del lecho que no se
       percibían como eventos. Se sube su peso y se baja un poco el del lecho.
   ========================================================================== */

function construirMar(ctx, dur) {
  const SR = ctx.sampleRate;

  /* ── un polo: −6 dB/oct, sin pico ────────────────────────────────────
     Los coeficientes se calculan para ESTE sample rate; los de la receta
     estaban a 48 kHz y aquí puede venir 44.1. */
  function unPolo(fc) {
    const a1 = Math.exp((-2 * Math.PI * fc) / SR);
    return ctx.createIIRFilter([1 - a1], [1, -a1]);
  }
  const biquad = (tipo, f, q, gain) => {
    const b = ctx.createBiquadFilter();
    b.type = tipo; b.frequency.value = f; b.Q.value = q;
    if (gain !== undefined) b.gain.value = gain;
    return b;
  };

  function ruidoRosa(segundos) {
    const n = Math.round(SR * segundos);
    const buf = ctx.createBuffer(1, n, SR);
    const d = buf.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759; b2=0.96900*b2+w*0.1538520;
      b3=0.86650*b3+w*0.3104856; b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
      d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.16; b6=w*0.115926;
    }
    return buf;
  }
  const enBucle = (b) => { const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; return s; };

  // normal truncada, por Box-Muller
  function normal(media, sigma, min, max) {
    let v;
    do {
      const u1 = Math.max(1e-9, Math.random()), u2 = Math.random();
      v = media + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    } while (v < min || v > max);
    return v;
  }

  const maestro = ctx.createGain();
  maestro.gain.value = 0.62;
  maestro.connect(ctx.destination);

  /* ══ CAPA 0 · EL LECHO ══════════════════════════════════════════════════
     ~85 % de la energía. Todo FIJO: no se mueve ni un filtro. Reproduce la
     suma estadística de la población de burbujas, que es lo que mide un
     micrófono en la playa: −3 dB/oct hasta 1.6 kHz y −9 dB/oct por encima. */
  [-1, 1].forEach((lado, i) => {
    /* 34 s por canal, y DOS buffers distintos. Con 12 s mono, la
       autocorrelación del bucle salía a 0.64 y el estéreo a 0.98. */
    const src = enBucle(ruidoRosa(34 + i * 5));
    const hp = biquad('highpass', 90, 0.7);          // debajo es viento, no olas
    const p1 = unPolo(1800 + i * 40);                 // la forma del surf
    const pico = biquad('peaking', 1000, 0.7, 2.5);   // el pico del mar en calma
    const p2 = unPolo(4500);                          // distancia ~300 m
    const pan = ctx.createStereoPanner(); pan.pan.value = lado * 0.85;
    const g = ctx.createGain(); g.gain.value = 0.44;
    src.connect(hp).connect(p1).connect(pico).connect(p2).connect(g).connect(pan).connect(maestro);
    src.start();
  });

  /* ══ CAPA 1 · LAS OLAS ══════════════════════════════════════════════════
     4 voces (el rango físico es 2-6), cada una con SU PROPIO buffer: usar el
     mismo con retardos produce filtrado en peine, y se oye. */
  const VOCES = 4;
  const PAN = [-0.78, 0.34, -0.22, 0.81];
  const picos = [];   // cuándo revienta cada ola, para que la espuma la siga

  for (let v = 0; v < VOCES; v++) {
    const src = enBucle(ruidoRosa(11 + v * 1.6));
    const hp = biquad('highpass', 90, 0.7);
    const p1 = unPolo(1700 + v * 90);
    const timbre = biquad('highshelf', 3000, 0.7, 0);   // se sortea por evento
    const p2 = unPolo(4200 + v * 260);
    const gv = ctx.createGain(); gv.gain.value = 0.0001;
    const pan = ctx.createStereoPanner(); pan.pan.value = PAN[v];
    src.connect(hp).connect(p1).connect(timbre).connect(p2).connect(gv).connect(pan).connect(maestro);
    src.start();

    // los eventos de esta voz, repartidos en el tiempo
    let t = Math.random() * 3.6;
    while (t < dur) {
      /* Rayleigh × H^1.29: percentiles p10 −10.5 dB, p50 0 dB, p90 +6.7 dB.
         De aquí salen los «sets» de olas, sin ningún LFO. */
      const u = Math.sqrt(-Math.log(1 - Math.random())) / 0.8326;
      const intervalo = normal(3.64, 1.05, 2.0, 7.0) * VOCES;

      if (u >= 0.45) {                                  // ~20 % no rompen
        const g = Math.min(1.6, Math.pow(u, 1.29)) * 0.62;   // v6 las dejaba en 0.30 y no se percibían
        const ataque = 0.4 + Math.random() * 0.5;       // 0.4-0.9 s
        const sosten = 1.0 + Math.random() * 1.0;       // 1-2 s
        const cae = 2.0 + Math.random() * 1.4;          // constante de caída

        gv.gain.setValueAtTime(Math.max(0.0001, gv.gain.value), t);
        gv.gain.exponentialRampToValueAtTime(Math.max(0.0002, g), t + ataque);
        gv.gain.setValueAtTime(g, t + ataque + sosten);
        gv.gain.setTargetAtTime(0.0001, t + ataque + sosten, cae);

        // el timbre cambia POR EVENTO, dentro del techo físico. Nunca se modula.
        timbre.gain.setValueAtTime(-5 + Math.random() * 7, t);

        picos.push({ t: t + ataque, g, pan: PAN[v] });
      }
      t += intervalo;
    }
  }

  /* ══ CAPA 2 · LA ESPUMA, RETRASADA ══════════════════════════════════════
     1.5-3.0 s DESPUÉS del pico de su ola. Este desfase es el detalle que hace
     que el oído reconozca agua. Va en dos canales con buffers distintos. */
  [0, 1].forEach((lado) => {
    const src = enBucle(ruidoRosa(13 + lado * 2.7));
    const hp = biquad('highpass', 2000, 0.6);
    const p = unPolo(6000);
    const g = ctx.createGain(); g.gain.value = 0.0001;
    const pan = ctx.createStereoPanner(); pan.pan.value = lado ? 0.5 : -0.5;
    src.connect(hp).connect(p).connect(g).connect(pan).connect(maestro);
    src.start();

    picos
      .filter((p2) => (lado ? p2.pan > 0 : p2.pan <= 0))
      .forEach((p2) => {
        const retraso = 1.5 + Math.random() * 1.5;      // 1.5-3.0 s
        const t0 = p2.t + retraso;
        if (t0 >= dur) return;
        const nivel = p2.g * Math.pow(10, (-18 + Math.random() * 6) / 20) * 3.2;
        g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, nivel), t0 + 0.8);
        g.gain.setTargetAtTime(0.0001, t0 + 0.8, 1.2 + Math.random() * 0.7);
      });
  });
}
