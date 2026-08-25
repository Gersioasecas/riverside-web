/* ============================================================================
   LA SÍNTESIS DEL MAR
   ----------------------------------------------------------------------------
   Este archivo contiene la variante ganadora del banco de pruebas, tal cual, y
   un adaptador de tres líneas que la hace funcionar en tiempo real.

   EL ADAPTADOR. Las variantes se escriben como `construirMar(ctx, dur)`: dejan
   programados todos los eventos hasta el segundo `dur`. Eso vale para
   renderizar a WAV, pero un sitio no tiene final. En vez de reescribir la
   síntesis con un planificador —y arriesgarse a que la versión que suena no
   sea la que se midió—, se le pide que programe VENTANAS de cinco minutos y se
   encadenan. Unos trescientos eventos por ventana: barato, y el código que
   suena es exactamente el que pasó el banco.

   Por qué importa que sea el mismo código: cada número de aquí abajo salió de
   una medición (docs/ACUSTICA.md). Reescribirlo «para producción» es la mejor
   manera de perderlos por el camino.

   Documentación completa del porqué de cada capa: sonido/docs/ACUSTICA.md
   Banco de medición:                              sonido/banco/
   ========================================================================== */

(() => {
  'use strict';

  const VENTANA = 300;      // s de eventos que se programan de una vez
  const ANTES = 30;         // s de margen para encadenar sin costura

  window.sintetizarMar = function (ctx, salida) {
    let hasta = 0;
    let timer = null;

    const tejer = () => {
      const ahora = ctx.currentTime;
      if (hasta > ahora + ANTES) return;
      const desde = Math.max(ahora, hasta);
      construirTramo(ctx, salida, desde, VENTANA);
      hasta = desde + VENTANA;
    };

    tejer();
    timer = setInterval(tejer, 20000);

    return () => { if (timer) clearInterval(timer); };
  };

  /* ══════════════════════════════════════════════════════════════════════════
     LA VARIANTE. Se sustituye entera cuando el banco corone a otra.
     ═══════════════════════════════════════════════════════════════════════ */
  function construirTramo(ctx, salida, t0, dur) {
    const SR = ctx.sampleRate;

    // un polo: −6 dB/oct, sin pico resonante (un biquad da −12 y CON pico)
    const unPolo = (fc) => {
      const a1 = Math.exp((-2 * Math.PI * fc) / SR);
      return ctx.createIIRFilter([1 - a1], [1, -a1]);
    };
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
    const enBucle = (b, cuando) => {
      const s = ctx.createBufferSource();
      s.buffer = b; s.loop = true; s.start(cuando);
      return s;
    };
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
    maestro.connect(salida);

    /* ── EL LECHO ─────────────────────────────────────────────────────────
       ~85 % de la energía y todo fijo: no se mueve ni un filtro. Reproduce la
       suma estadística de la población de burbujas, que es lo que mide un
       micrófono en la playa: −3 dB/oct hasta 1.6 kHz, −9 dB/oct por encima.
       Buffers largos y distintos por canal — con 12 s y mono, la periodicidad
       medía 0.64 y el estéreo 0.98. */
    [-1, 1].forEach((lado, i) => {
      const src = enBucle(ruidoRosa(34 + i * 5), t0);
      const hp = biquad('highpass', 90, 0.7);            // debajo es viento
      const p1 = unPolo(1800 + i * 40);                  // la forma del surf
      const pico = biquad('peaking', 1000, 0.7, 2.5);    // pico del mar en calma
      const p2 = unPolo(4500);                           // distancia ~300 m
      const pan = ctx.createStereoPanner(); pan.pan.value = lado * 0.85;
      const g = ctx.createGain(); g.gain.value = 0.44;
      src.connect(hp).connect(p1).connect(pico).connect(p2).connect(g).connect(pan).connect(maestro);
      src.stop(t0 + dur + 8);
    });

    /* ── LAS OLAS ─────────────────────────────────────────────────────────
       4 voces (el rango físico es 2-6), cada una con SU buffer: compartirlo
       con retardos produce filtrado en peine y se oye.
       Tm02 = 3.64 s viene de la boya NDBC 42055, Bahía de Campeche — el mismo
       Golfo que Chachalacas. Los 8-26 s que se usaron al principio eran swell
       del Pacífico, y por eso no había olas superponiéndose. */
    const VOCES = 4;
    const PAN = [-0.78, 0.34, -0.22, 0.81];
    const picos = [];

    for (let v = 0; v < VOCES; v++) {
      const src = enBucle(ruidoRosa(11 + v * 1.6), t0);
      const hp = biquad('highpass', 90, 0.7);
      const p1 = unPolo(1700 + v * 90);
      const timbre = biquad('highshelf', 3000, 0.7, 0);
      const p2 = unPolo(4200 + v * 260);
      const gv = ctx.createGain(); gv.gain.value = 0.0001;
      const pan = ctx.createStereoPanner(); pan.pan.value = PAN[v];
      src.connect(hp).connect(p1).connect(timbre).connect(p2).connect(gv).connect(pan).connect(maestro);
      src.stop(t0 + dur + 8);

      let t = Math.random() * 3.6;
      while (t < dur) {
        /* Rayleigh × H^1.29. De aquí salen los «sets» de olas grandes y
           pequeñas, sin ningún LFO que el oído pueda cazar. */
        const u = Math.sqrt(-Math.log(1 - Math.random())) / 0.8326;
        const intervalo = normal(3.64, 1.05, 2.0, 7.0) * VOCES;

        if (u >= 0.45) {                                  // ~20 % no rompen
          const g = Math.min(1.6, Math.pow(u, 1.29)) * 0.62;
          const ataque = 0.4 + Math.random() * 0.5;
          const sosten = 1.0 + Math.random() * 1.0;
          const cae = 2.0 + Math.random() * 1.4;
          const T = t0 + t;

          gv.gain.setValueAtTime(0.0001, T);
          gv.gain.exponentialRampToValueAtTime(Math.max(0.0002, g), T + ataque);
          gv.gain.setValueAtTime(g, T + ataque + sosten);
          gv.gain.setTargetAtTime(0.0001, T + ataque + sosten, cae);

          /* el timbre cambia POR EVENTO y dentro del techo físico (la
             absorción atmosférica da 0.4 dB a 1 kHz y 5.5 dB a 8 kHz).
             Nunca se modula: modularlo es lo que producía el «bong». */
          timbre.gain.setValueAtTime(-5 + Math.random() * 7, T);

          picos.push({ t: t + ataque, g, pan: PAN[v] });
        }
        t += intervalo;
      }
    }

    /* ── LA ESPUMA, RETRASADA ─────────────────────────────────────────────
       1.5-3.0 s DESPUÉS del pico de su ola. Ese desfase es lo que hace que el
       oído reconozca agua en vez de ruido conformado. */
    [0, 1].forEach((lado) => {
      const src = enBucle(ruidoRosa(13 + lado * 2.7), t0);
      const hp = biquad('highpass', 2000, 0.6);
      const p = unPolo(6000);
      const g = ctx.createGain(); g.gain.value = 0.0001;
      const pan = ctx.createStereoPanner(); pan.pan.value = lado ? 0.5 : -0.5;
      src.connect(hp).connect(p).connect(g).connect(pan).connect(maestro);
      src.stop(t0 + dur + 8);

      picos
        .filter((p2) => (lado ? p2.pan > 0 : p2.pan <= 0))
        .forEach((p2) => {
          const retraso = 1.5 + Math.random() * 1.5;
          const T = t0 + p2.t + retraso;
          if (T >= t0 + dur) return;
          const nivel = p2.g * Math.pow(10, (-18 + Math.random() * 6) / 20) * 3.2;
          g.gain.setValueAtTime(0.0001, T);
          g.gain.exponentialRampToValueAtTime(Math.max(0.0002, nivel), T + 0.8);
          g.gain.setTargetAtTime(0.0001, T + 0.8, 1.2 + Math.random() * 0.7);
        });
    });
  }
})();
