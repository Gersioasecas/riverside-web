/* ============================================================================
   EL MAR — sonido sintetizado, sin un solo archivo de audio
   ----------------------------------------------------------------------------
   ESTE ARCHIVO ES LA CAPA DE ARRANQUE. La síntesis vive en `js/sintesis-mar.js`,
   aparte, para poder cambiarla sin tocar nada de esto.

   ── EL ARRANQUE (lo que Sergio pidió, y lo que el navegador permite) ──────

   Pidió que sonara al entrar, con el botón para apagarlo y no para encenderlo.
   Eso choca con una restricción que no es negociable: **un AudioContext creado
   antes de que el documento reciba un gesto nace en estado `suspended`**, y no
   suena hasta que se llama `resume()` desde un gesto. Es política de Chrome
   desde la 71, y Safari y Firefox hacen lo mismo. No hay forma de saltarla, y
   apoyarse en el Media Engagement Index de Chrome —que sí la relaja para
   visitantes recurrentes— daría un sitio que suena para unos y para otros no.

   Así que: arranca al PRIMER gesto, sea el que sea. Un scroll, un clic, una
   tecla, un toque. En la práctica se oye a los dos segundos de llegar, sin
   haber buscado nada. Es lo más cerca de «suena al entrar» que permite la
   plataforma.

   ── LA NORMA ─────────────────────────────────────────────────────────────
   WCAG 2.2 SC 1.4.2 (nivel A): si un audio suena automáticamente más de 3 s,
   tiene que haber un mecanismo para pausarlo o detenerlo. El botón lo es, y
   está siempre visible, es enfocable y funciona con teclado. Incumplirlo no
   rompería solo el audio: rompería la conformidad de la página entera por el
   Requisito 5 (No Interferencia). Por eso el botón no se esconde nunca.

   ── Y SI LO APAGA ────────────────────────────────────────────────────────
   Se recuerda. Quien lo silencia una vez no vuelve a oírlo al regresar.
   ========================================================================== */

(() => {
  'use strict';

  const boton = document.querySelector('[data-mar]');
  if (!boton) return;

  const LLAVE = 'riverside:mar';
  const quieto = window.matchMedia('(prefers-reduced-motion: reduce)');

  let ctx = null;
  let maestro = null;
  let sonando = false;
  let arrancado = false;

  const texto = () => boton.querySelector('.mar__texto');

  function pintar() {
    boton.setAttribute('aria-checked', sonando ? 'true' : 'false');
    if (texto()) texto().textContent = sonando ? 'Silenciar el mar' : 'Oír el mar';
    boton.setAttribute('title', sonando ? 'Silenciar el sonido del mar' : 'Escuchar el sonido del mar');
  }

  function recordar(v) {
    try { localStorage.setItem(LLAVE, v ? '1' : '0'); } catch (e) { /* sin almacenamiento, da igual */ }
  }
  function recordado() {
    try { return localStorage.getItem(LLAVE); } catch (e) { return null; }
  }

  function construir() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx || typeof window.sintetizarMar !== 'function') return false;
    ctx = new Ctx();
    maestro = ctx.createGain();
    maestro.gain.value = 0.0001;
    maestro.connect(ctx.destination);
    window.sintetizarMar(ctx, maestro);
    return true;
  }

  /* El fade de entrada es largo a propósito. Un ambiente que aparece de golpe
     sobresalta, que es justo lo contrario de lo que este sonido debe hacer. */
  const NIVEL = 0.5;
  function subir() {
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    maestro.gain.cancelScheduledValues(ctx.currentTime);
    maestro.gain.setValueAtTime(Math.max(0.0001, maestro.gain.value), ctx.currentTime);
    maestro.gain.setTargetAtTime(NIVEL, ctx.currentTime, 1.35);   // ~4 s hasta el nivel
  }
  function bajar() {
    if (!ctx) return;
    maestro.gain.cancelScheduledValues(ctx.currentTime);
    maestro.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.55);
  }

  function encender() {
    if (!ctx && !construir()) return;
    sonando = true;
    subir();
    pintar();
    recordar(true);
  }

  function apagar() {
    sonando = false;
    bajar();
    pintar();
    recordar(false);
  }

  boton.addEventListener('click', () => (sonando ? apagar() : encender()));

  /* ── el primer gesto lo enciende ──────────────────────────────────────
     Salvo que ya lo hubiera apagado antes, o que pida menos movimiento.   */
  const GESTOS = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'];
  function alPrimerGesto() {
    if (arrancado) return;
    arrancado = true;
    GESTOS.forEach((g) => window.removeEventListener(g, alPrimerGesto));
    if (recordado() === '0') return;      // lo silenció antes: se respeta
    if (quieto.matches) return;           // pidió menos estímulo
    encender();
  }
  GESTOS.forEach((g) => window.addEventListener(g, alPrimerGesto, { passive: true }));

  // si la pestaña se va a segundo plano, se calla; al volver, regresa
  document.addEventListener('visibilitychange', () => {
    if (!sonando) return;
    document.hidden ? bajar() : subir();
  });

  pintar();
})();
