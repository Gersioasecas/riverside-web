/* ============================================================================
   EL SONIDO DEL MAR — sintetizado, no grabado
   ----------------------------------------------------------------------------
   No hay archivo de audio. El sonido se fabrica con Web Audio a partir de ruido
   rosa filtrado, y lo modula LA MISMA ola que se está viendo: `marea.js` llama
   a `RiversideMar.pulso(s)` en cada cuadro con el valor del swash. Así la ola
   que ves romper es exactamente la que oyes — si fuera un mp3 en bucle, verías
   una cosa y oirías otra.

   Dos capas, como en la playa:
     · ROMPIENTE — ruido con un pasa-bajos que se abre al romper (600 → 3800 Hz)
       y se cierra al retirarse. Es el siseo de la espuma, y es lo que de
       verdad se oye.
     · FONDO — ruido grave y constante, el rumor del mar que nunca para.

   ⚠️ NIVELES MEDIDOS, no elegidos a ojo. La primera versión cortaba en 300 Hz
   y sonaba a −41 dBFS en la banda que un altavoz de laptop reproduce (>300 Hz):
   Sergio no la oyó en absoluto. El mar de verdad tiene su carácter entre 500 y
   4000 Hz, que es donde vive el siseo de la espuma. Esta versión mide −22 dBFS
   en esa banda con pico 0.58, o sea sin recorte. Si alguien vuelve a tocar
   estos números, que los MIDA: `~/.claude/skills/revisor/engine/_audio2.mjs`.

   Reglas:
     · NUNCA arranca solo. Los navegadores lo bloquean, y además sería una
       grosería. Hay un botón, y punto.
     · Recuerda la decisión en este navegador, para no volver a preguntar.
     · Se calla si la pestaña se va a segundo plano.
   ========================================================================== */

(() => {
  'use strict';

  const boton = document.querySelector('[data-mar]');
  if (!boton) return;

  const LLAVE = 'riverside:mar';
  let ctx = null, maestro = null, rompiente = null, filtroR = null, ganR = null;
  let sonando = false;
  let suave = 0;   // el swash, alisado, para que el filtro no chasquee

  /* ── ruido rosa: más natural que el blanco, pesa lo mismo (cero) ─────── */
  function bufferRuidoRosa(segundos) {
    const n = Math.floor(ctx.sampleRate * segundos);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    // filtro de Voss-McCartney simplificado (Paul Kellet): blanco → rosa
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.16;
      b6 = w * 0.115926;
    }
    return buf;
  }

  function fuenteEnBucle(buf) {
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    return s;
  }

  function construir() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    ctx = new Ctx();

    maestro = ctx.createGain();
    maestro.gain.value = 0;
    maestro.connect(ctx.destination);

    const ruido = bufferRuidoRosa(6);

    // capa 1 — la rompiente
    rompiente = fuenteEnBucle(ruido);
    filtroR = ctx.createBiquadFilter();
    filtroR.type = 'lowpass';
    filtroR.frequency.value = 800;
    filtroR.Q.value = 0.7;
    ganR = ctx.createGain();
    ganR.gain.value = 0.85;
    rompiente.connect(filtroR).connect(ganR).connect(maestro);
    rompiente.start();

    // capa 2 — el rumor de fondo, constante
    const fondo = fuenteEnBucle(ruido);
    const filtroF = ctx.createBiquadFilter();
    filtroF.type = 'lowpass';
    filtroF.frequency.value = 220;
    filtroF.Q.value = 0.5;
    const ganF = ctx.createGain();
    ganF.gain.value = 0.40;
    fondo.connect(filtroF).connect(ganF).connect(maestro);
    fondo.start();

    return true;
  }

  function subir() {
    if (!ctx) return;
    ctx.resume && ctx.resume();
    maestro.gain.cancelScheduledValues(ctx.currentTime);
    maestro.gain.setTargetAtTime(0.52, ctx.currentTime, 0.55);   // entra en ~2 s
  }
  function bajar() {
    if (!ctx) return;
    maestro.gain.cancelScheduledValues(ctx.currentTime);
    maestro.gain.setTargetAtTime(0, ctx.currentTime, 0.7);
  }

  /* ── lo que llama marea.js en cada cuadro ────────────────────────────── */
  window.RiversideMar = {
    pulso(s) {
      if (!sonando || !ctx || ctx.state !== 'running') return;
      suave += (s - suave) * 0.06;                 // sin chasquidos
      const f = 600 + suave * 3200;                // se abre al romper
      filtroR.frequency.setTargetAtTime(f, ctx.currentTime, 0.05);
      ganR.gain.setTargetAtTime(0.5 + suave * 0.7, ctx.currentTime, 0.08);
    },
  };

  function encender() {
    if (!ctx && !construir()) return;
    sonando = true;
    subir();
    boton.setAttribute('aria-pressed', 'true');
    boton.querySelector('.mar__texto').textContent = 'Silenciar el mar';
    try { localStorage.setItem(LLAVE, '1'); } catch (e) { /* sin almacenamiento, da igual */ }
  }

  function apagar() {
    sonando = false;
    bajar();
    boton.setAttribute('aria-pressed', 'false');
    boton.querySelector('.mar__texto').textContent = 'Oír el mar';
    try { localStorage.setItem(LLAVE, '0'); } catch (e) { /* nada */ }
  }

  boton.addEventListener('click', () => (sonando ? apagar() : encender()));

  document.addEventListener('visibilitychange', () => {
    if (!sonando) return;
    document.hidden ? bajar() : subir();
  });

  // Si ya lo había encendido antes, se deja listo pero MUDO hasta que toque
  // algo: los navegadores no permiten sonido sin un gesto, y forzarlo sería
  // pelear con el navegador en vez de con el problema.
  try {
    if (localStorage.getItem(LLAVE) === '1') {
      boton.querySelector('.mar__texto').textContent = 'Oír el mar';
      const alPrimerGesto = () => {
        encender();
        window.removeEventListener('pointerdown', alPrimerGesto);
        window.removeEventListener('keydown', alPrimerGesto);
      };
      window.addEventListener('pointerdown', alPrimerGesto, { once: true });
      window.addEventListener('keydown', alPrimerGesto, { once: true });
    }
  } catch (e) { /* sin almacenamiento, arranca apagado */ }
})();
