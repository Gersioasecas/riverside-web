/* ============================================================================
   LA MAREA — animación firma de Riverside Chachalacas
   ----------------------------------------------------------------------------
   DE DÓNDE SALE (lo dictó Sergio, no un catálogo de efectos):

     «el logo pretende ser una ola del mar debajo del triángulo, esto es porque
      literalmente todaaas las opciones tienen techos de dos aguas o mas,
      haciendo espacios coronados por triangulos siempre, entonces el triangulo
      representa claramente los espacios, y el flujo de abajo es una especie de
      movimiento de agua u ola del mar»

   Así que el logo es literalmente el negocio: triángulos = los techos de las
   cabañas, el hotel y la palapa; el trazo de abajo = el agua que los rodea.

   QUÉ HACE:
     · Siete láminas de azul casi transparente van cubriendo la página de
       arriba hacia abajo, hasta donde va leyendo el usuario.
     · No suben parejas: cada una avanza y se retira con su propio ritmo, y
       todas juntas nunca llegan al mismo sitio a la vez.
     · Al llegar, se quedan ahí respirando.

   (Hubo un segmento del trazo del logo que bajaba por delante empujándolas.
    Se quitó el 2026-08-24: Sergio lo vio y no se leía como una pieza del logo
    —«visualmente no es una piesa del logo ni sale del logo»—, así que sobraba.
    La marea sola ya cuenta la historia.)

   LA FÍSICA (el árbitro, como siempre):
     · Una ola que besa la playa NO es una sinusoide. Sube rápido (uprush,
       ~22 % del ciclo) y se retira despacio (backwash, el 78 % restante).
       Por eso `swash()` es asimétrica: es lo que separa "mar" de "gelatina".
     · El borde de la espuma es un PATRÓN DE INTERFERENCIA: varias ondas de
       distinta longitud sumándose. Aquí se suman tres senos con longitudes
       inconmensurables entre sí (razones irracionales), así que el dibujo
       nunca se repite exactamente — rítmico, pero no perfecto. Sergio lo pidió
       así: «como el patrón de interferencia que se genera el experimento de la
       doble rendija cuando la particula se comporta como onda, pero un poco
       mas caotico, menos perfecto».
     · El agua no rebota ni corrige su rumbo: llega hasta donde la lleva su
       energía y la fricción la detiene.
     · Y no puede acelerar sin límite. Si alguien se lanza al pie de la página,
       la marea se queda atrás y la alcanza a su propio paso (`TOPE`). Sin ese
       techo, seguir el scroll se veía frenético.
     · Nada se mueve sin causa: sin scroll, la marea solo respira en su sitio.
   ========================================================================== */

(() => {
  'use strict';

  const lienzo = document.querySelector('[data-marea]');
  if (!lienzo || !lienzo.getContext) return;

  const ctx = lienzo.getContext('2d', { alpha: true });
  const quieto = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ── el azul de la marca, en crudo, para poder componerlo con alfa ────── */
  const AZUL = [16, 128, 208];      // #1080d0
  const AZUL_CLARO = [127, 182, 214];

  /* ── las siete ondas ───────────────────────────────────────────────────
     Los periodos son primos entre sí a propósito: así el conjunto tarda
     muchísimo en repetir la misma combinación. Las opacidades van de 0.03 a
     0.11 — Sergio pidió «bajisima, abajo de 50 yo creo», y en la práctica
     siete capas de 0.05 ya suman un azul con cuerpo.                       */
  const ONDAS = [
    { retraso:  10, amplitud: 128, periodo:  8.3, fase: 0.00, alfa: 0.055, color: AZUL_CLARO, ondul: [[820, 15], [431, 8], [233, 4]] },
    { retraso:  46, amplitud: 104, periodo: 11.7, fase: 0.37, alfa: 0.050, color: AZUL_CLARO, ondul: [[677, 13], [389, 7], [211, 5]] },
    { retraso:  84, amplitud:  86, periodo:  6.9, fase: 0.71, alfa: 0.045, color: AZUL,       ondul: [[953, 17], [347, 9], [179, 4]] },
    { retraso: 128, amplitud:  70, periodo: 14.3, fase: 0.19, alfa: 0.042, color: AZUL,       ondul: [[733, 12], [293, 6], [157, 3]] },
    { retraso: 178, amplitud:  54, periodo:  9.7, fase: 0.83, alfa: 0.038, color: AZUL,       ondul: [[601, 11], [271, 6], [139, 3]] },
    { retraso: 236, amplitud:  40, periodo: 17.1, fase: 0.52, alfa: 0.034, color: AZUL,       ondul: [[887, 14], [313, 5], [127, 3]] },
    { retraso: 302, amplitud:  28, periodo: 12.1, fase: 0.08, alfa: 0.030, color: AZUL,       ondul: [[547,  9], [251, 4], [113, 2]] },
  ];

  /* Hasta dónde hacia atrás se ve el color de cada lámina de agua. Más corto
     y la marea parece una raya; más largo y vuelve a tapar la página. */
  const ALCANCE = 620;

  let W = 0, H = 0, dpr = 1;
  let frenteObjetivo = 0;     // dónde va leyendo el usuario (coords de documento)
  let frente = 0;             // dónde llegó el agua, con inercia
  let vel = 0;                // su velocidad actual, en px/s
  let msPrevio = null;

  /* El agua NO puede acelerar sin límite. Si el usuario se lanza al pie de la
     página, la marea se queda atrás y luego la alcanza a su propio paso: es lo
     que la separa de un elemento que "persigue el scroll" a tirones.
       RIGIDEZ  — con qué ganas responde (rad/s). Más alto = más pegado.
       TOPE     — su velocidad máxima. Es el número que produce el rezago.

     El tope NO es fijo: crece con la distancia, como crece la energía de una
     ola cuanto más lejos rompe. Leyendo normal (200-400 px/s) el agua va
     pegada; en un salto al pie de la página se queda muy atrás y luego viene
     fuerte, frenando sola al llegar porque el muelle la amortigua.
     Medido: con tope fijo de 780 px/s un salto de 4 000 px tardaba 5 s y
     dejaba media página seca; así tarda unos 2.5 s.                          */
  const RIGIDEZ = 2.1;
  const TOPE_BASE = 700;
  const TOPE_EXTRA = 950;
  let t0 = null;
  let rafId = null;
  let visible = true;
  let alturaDoc = 1;

  /* ── el perfil de una ola rompiendo ─────────────────────────────────────
     Devuelve 0 en reposo y 1 en el punto de máximo avance.
     22 % subiendo (rápido, ease-out cúbico) · 78 % retirándose (lento).     */
  const SUBIDA = 0.22;
  function swash(u) {
    u -= Math.floor(u);
    if (u < SUBIDA) {
      const p = u / SUBIDA;
      return 1 - Math.pow(1 - p, 3);
    }
    const p = (u - SUBIDA) / (1 - SUBIDA);
    // retirada: empieza a soltarse despacio y se va calmando
    return Math.pow(1 - p, 1.7);
  }

  function medir() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = document.documentElement.clientWidth;
    H = window.innerHeight;
    lienzo.width = Math.round(W * dpr);
    lienzo.height = Math.round(H * dpr);
    lienzo.style.width = W + 'px';
    lienzo.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    alturaDoc = Math.max(1, document.documentElement.scrollHeight);
  }

  /* ── hasta dónde ha leído ───────────────────────────────────────────────
     El agua persigue el punto donde está la mirada: algo por debajo del
     centro del viewport. Al final del documento se deja llegar del todo.    */
  function mirar() {
    const y = window.scrollY;
    const alcance = Math.max(1, alturaDoc - H);
    const avance = Math.min(1, y / alcance);
    frenteObjetivo = y + H * (0.58 + 0.42 * avance * avance);
  }

  function pintar(ms) {
    if (t0 === null) t0 = ms;
    if (msPrevio === null) msPrevio = ms;
    const t = (ms - t0) / 1000;
    // dt acotado: si la pestaña estuvo dormida, el salto no se convierte en un
    // tirón al volver
    const dt = Math.min(0.05, Math.max(0.001, (ms - msPrevio) / 1000));
    msPrevio = ms;

    /* Muelle con amortiguamiento crítico: llega y se detiene, nunca rebota.
       La aceleración la fija la distancia; la velocidad tiene techo, y de ahí
       sale el rezago cuando alguien baja de golpe. */
    const dist = Math.abs(frenteObjetivo - frente);
    const tope = TOPE_BASE + Math.min(TOPE_EXTRA, dist * 0.34);
    const acel = (frenteObjetivo - frente) * RIGIDEZ * RIGIDEZ - vel * 2 * RIGIDEZ;
    vel = Math.max(-tope, Math.min(tope, vel + acel * dt));
    frente += vel * dt;

    ctx.clearRect(0, 0, W, H);

    const paso = W < 640 ? 14 : 20;   // resolución del borde
    for (const o of ONDAS) {
      // el frente de ESTA onda: el general, menos su retraso, más su vaivén
      const s = swash(t / o.periodo + o.fase);
      const yDoc = frente - o.retraso + o.amplitud * (s - 0.42);
      const yBase = yDoc - window.scrollY;      // a coordenadas de pantalla

      if (yBase < -140) continue;               // esta onda aún no llega arriba
      const [r, g, b] = o.color;
      // la onda respira también en opacidad: al romper se ve un poco más
      const alfa = o.alfa * (0.72 + 0.5 * s);

      ctx.beginPath();
      ctx.moveTo(0, -2);

      for (let x = 0; x <= W + paso; x += paso) {
        // patrón de interferencia: tres senos de longitud inconmensurable
        let d = 0;
        for (let k = 0; k < o.ondul.length; k++) {
          const [lambda, amp] = o.ondul[k];
          d += amp * Math.sin((2 * Math.PI * x) / lambda + o.fase * 6.28 + t * (0.42 + k * 0.23));
        }
        // y una deriva lenta que hace que el dibujo nunca se repita igual
        d += 6 * Math.sin(x / 1597 + t * 0.11);
        ctx.lineTo(x, yBase + d);
      }

      ctx.lineTo(W + paso, -2);
      ctx.closePath();

      /* El agua NO es una mancha plana. Sobre la arena mojada el color vive
         en el borde —donde está la lámina y la espuma— y se va perdiendo
         hacia atrás. Sin este degradado, siete capas llenando hasta arriba
         acumulan un azul sólido en la cabecera que se come el texto. */
      const g0 = ctx.createLinearGradient(0, yBase - ALCANCE, 0, yBase + 40);
      g0.addColorStop(0.00, `rgba(${r},${g},${b},0)`);
      g0.addColorStop(0.55, `rgba(${r},${g},${b},${(alfa * 0.42).toFixed(4)})`);
      g0.addColorStop(0.94, `rgba(${r},${g},${b},${alfa.toFixed(4)})`);
      g0.addColorStop(1.00, `rgba(${r},${g},${b},${(alfa * 0.80).toFixed(4)})`);
      ctx.fillStyle = g0;
      ctx.fill();
    }

    // el sonido lo modula la primera onda, la que rompe más cerca
    if (window.RiversideMar) window.RiversideMar.pulso(swash(t / ONDAS[0].periodo + ONDAS[0].fase));

    rafId = requestAnimationFrame(pintar);
  }

  /* ── una sola imagen, para quien no quiere movimiento ───────────────── */
  function pintarQuieto() {
    medir();
    ctx.clearRect(0, 0, W, H);
    for (const o of ONDAS) {
      const [r, g, b] = o.color;
      ctx.beginPath();
      ctx.moveTo(0, -2);
      for (let x = 0; x <= W + 20; x += 20) {
        let d = 0;
        for (let k = 0; k < o.ondul.length; k++) {
          const [lambda, amp] = o.ondul[k];
          d += amp * Math.sin((2 * Math.PI * x) / lambda + o.fase * 6.28);
        }
        ctx.lineTo(x, H * 0.55 - o.retraso * 0.5 + d);
      }
      ctx.lineTo(W + 20, -2);
      ctx.closePath();
      ctx.fillStyle = `rgba(${r},${g},${b},${o.alfa})`;
      ctx.fill();
    }
  }

  /* ── arranque y ciclo de vida ───────────────────────────────────────── */
  function arrancar() {
    if (rafId !== null) return;
    t0 = null;
    rafId = requestAnimationFrame(pintar);
  }
  function parar() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  function iniciar() {
    if (quieto.matches) {
      parar();
      pintarQuieto();
      return;
    }
    medir();
    mirar();
    /* El agua NACE a la altura del logo, no en cualquier parte: el trazo de
       abajo del logotipo es la ola de la marca. Al cargar, el frente arranca
       ahí y desde ese punto empieza a perseguir la mirada. */
    const marca = document.querySelector('[data-nace]');
    if (marca) {
      const r = marca.getBoundingClientRect();
      frente = r.top + window.scrollY + r.height * 0.80;
    } else {
      frente = frenteObjetivo;
    }
    vel = 0;
    msPrevio = null;
    arrancar();
  }

  let retraso;
  const reMedir = () => {
    clearTimeout(retraso);
    retraso = setTimeout(() => { medir(); mirar(); if (quieto.matches) pintarQuieto(); }, 130);
  };

  window.addEventListener('scroll', mirar, { passive: true });
  window.addEventListener('resize', reMedir);
  window.addEventListener('load', reMedir);
  quieto.addEventListener('change', iniciar);

  // no gastar batería con la pestaña en segundo plano
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    if (visible && !quieto.matches) arrancar(); else parar();
  });

  iniciar();
})();
