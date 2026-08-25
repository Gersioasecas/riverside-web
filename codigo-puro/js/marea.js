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
     · Un SEGMENTO del trazo del logo se desprende y baja con el usuario.
       Nace blanco (espuma) y al alejarse se tiñe del azul de la marca.
     · Ese segmento EMPUJA una marea: siete ondas superpuestas de azul casi
       transparente que van cubriendo la página de arriba hacia abajo.
     · La marea no sube pareja: cada onda avanza y se retira con su propio
       ritmo, y todas juntas nunca llegan al mismo sitio a la vez.
     · Sube hasta donde va leyendo el usuario, y ahí se queda respirando.

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
  const ESPUMA = [255, 255, 255];

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
    const t = (ms - t0) / 1000;

    // inercia: el agua alcanza a la mirada, nunca salta a ella
    frente += (frenteObjetivo - frente) * 0.055;

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

    dibujarSegmento(t);

    if (window.RiversideMar) window.RiversideMar.pulso(swash(t / ONDAS[0].periodo + ONDAS[0].fase));

    rafId = requestAnimationFrame(pintar);
  }

  /* ── el segmento desprendido ────────────────────────────────────────────
     Un arco tomado del trazo inferior del logo. Va delante de todas las
     ondas, empujándolas. Nace blanco (espuma recién rota) y se va tiñendo
     del azul de la marca conforme se aleja de su origen.                    */
  function dibujarSegmento(t) {
    const s = swash(t / ONDAS[0].periodo + ONDAS[0].fase);
    const yDoc = frente - ONDAS[0].retraso + ONDAS[0].amplitud * (s - 0.42);
    const y = yDoc - window.scrollY;
    if (y < -60 || y > H + 60) return;

    // recorrido del documento: 0 al nacer, 1 al final
    const viaje = Math.min(1, Math.max(0, window.scrollY / Math.max(1, alturaDoc - H)));
    const tinte = Math.min(1, viaje * 1.9);            // se tiñe en el primer tercio

    const col = ESPUMA.map((c, i) => Math.round(c + (AZUL[i] - c) * tinte));
    const ancho = Math.min(W * 0.38, 340);
    // deriva lateral: el segmento no baja en línea recta, lo lleva la corriente
    const cx = W * 0.5 + Math.sin(t * 0.21) * W * 0.22 + Math.sin(t * 0.07 + 1.3) * W * 0.08;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = `rgba(${col[0]},${col[1]},${col[2]},0.5)`;
    ctx.shadowBlur = 16;

    /* La forma sale del logo: el trazo de abajo son DOS líneas, una cresta
       que se enrosca y una corriente larga por debajo. Aquí van las dos, la
       segunda más tenue y desfasada, como el reflujo que sigue a la ola. */
    const trazo = (desfase, grosor, opacidad) => {
      ctx.beginPath();
      ctx.moveTo(cx - ancho / 2, y + 11 + desfase);
      ctx.bezierCurveTo(
        cx - ancho * 0.24, y - 12 + desfase,
        cx + ancho * 0.06, y - 16 + desfase,
        cx + ancho * 0.27, y + 1 + desfase
      );
      ctx.bezierCurveTo(
        cx + ancho * 0.38, y + 9 + desfase,
        cx + ancho * 0.45, y + 12 + desfase,
        cx + ancho / 2, y + 6 + desfase
      );
      ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${opacidad.toFixed(3)})`;
      ctx.lineWidth = grosor;
      ctx.stroke();
    };

    trazo(0, 3.4, 0.34 + 0.44 * s);          // la cresta
    trazo(9, 1.8, (0.34 + 0.44 * s) * 0.42); // la corriente que la sigue

    // la cresta rompiendo: el punto más brillante, justo donde el agua vuelca
    ctx.beginPath();
    ctx.arc(cx + ancho * 0.27, y + 1, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${(0.6 + 0.35 * s).toFixed(3)})`;
    ctx.fill();
    ctx.restore();
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
    frente = frenteObjetivo;   // al cargar, el agua ya está donde toca
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
