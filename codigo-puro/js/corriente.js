/* ============================================================================
   LA CORRIENTE — animación firma de Riverside Chachalacas
   ----------------------------------------------------------------------------
   De dónde sale: el logo es una gota triangular con una ola enroscada cuya
   cresta escapa en dos trazos horizontales. Esos trazos SON el río. Aquí esa
   cresta se desenrosca al bajar y recorre la página, pasando por debajo de cada
   título — igual que el Actopan cose Chachalacas antes de entregarse al mar.

   Física (la física es el árbitro):
     · El agua baja porque el usuario baja. Sin scroll no hay caudal.
     · Tiene inercia: al soltar el scroll sigue un instante y la fricción la para.
     · No rebota nunca. Un río no rebota.
     · La cabeza va SIEMPRE sobre el trazo ya dibujado — causa y efecto no se
       desfasan.
     · Lo que ya mojó se queda mojado. El agua no se despinta al subir.
   ========================================================================== */

(() => {
  'use strict';

  const svg = document.querySelector('[data-corriente]');
  if (!svg) return;

  const quieto = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cauce = svg.querySelector('.corriente__cauce');
  const agua = svg.querySelector('.corriente__agua');
  const cabeza = svg.querySelector('.corriente__cabeza');
  const anclas = [...document.querySelectorAll('[data-moja]')];

  let largo = 0;
  let hitos = [];        // { t: 0..1 sobre el path, el: elemento }
  let objetivo = 0;      // progreso crudo del scroll
  let actual = 0;        // progreso con inercia
  let rafId = null;
  let dormido = true;

  /* --- trazar el cauce -----------------------------------------------------
     El path no está dibujado a mano: se calcula de las posiciones REALES de los
     títulos, así el agua pasa por debajo de cada uno en cualquier pantalla.   */
  function trazar() {
    const W = document.documentElement.clientWidth;
    const H = document.documentElement.scrollHeight;
    const angosto = W < 900;

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);

    // Punto de partida: la cresta del logo en el hero.
    const marca = document.querySelector('[data-nace]');
    const inicio = marca
      ? (() => {
          const r = marca.getBoundingClientRect();
          return { x: r.left + r.width * 0.62, y: r.top + window.scrollY + r.height * 0.78 };
        })()
      : { x: W * 0.5, y: 0 };

    // En pantallas angostas el río corre pegado al margen; en anchas serpentea.
    const carril = angosto ? W * 0.085 : W * 0.5;
    const vaiven = angosto ? W * 0.05 : Math.min(W * 0.30, 380);

    const puntos = [inicio];
    anclas.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const y = r.top + window.scrollY + r.height + 14;   // justo debajo del título
      const lado = i % 2 === 0 ? -1 : 1;
      // el remanso queda del lado del título, para que el trazo lo subraye
      const x = angosto ? carril : Math.min(Math.max(r.left + r.width * 0.5, W * 0.2), W * 0.8);
      puntos.push({ x, y, remanso: true, el });
      // punto de fuga entre secciones: aquí el río se aleja y vuelve
      puntos.push({ x: carril + lado * vaiven, y: y + Math.max(160, (r.height + 220)) });
    });
    puntos.push({ x: carril, y: H - 40 });

    // Bézier suave (Catmull-Rom → cúbica). Sin picos: el agua no hace esquinas.
    let d = `M ${puntos[0].x.toFixed(1)} ${puntos[0].y.toFixed(1)}`;
    for (let i = 0; i < puntos.length - 1; i++) {
      const p0 = puntos[i - 1] || puntos[i];
      const p1 = puntos[i];
      const p2 = puntos[i + 1];
      const p3 = puntos[i + 2] || p2;
      const k = 0.32;
      const c1x = p1.x + (p2.x - p0.x) * k, c1y = p1.y + (p2.y - p0.y) * k;
      const c2x = p2.x - (p3.x - p1.x) * k, c2y = p2.y - (p3.y - p1.y) * k;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    cauce.setAttribute('d', d);
    agua.setAttribute('d', d);
    largo = agua.getTotalLength();
    agua.style.strokeDasharray = `${largo}`;
    agua.style.strokeDashoffset = `${largo}`;

    // ¿A qué fracción del recorrido cae cada título? Se mide sobre el path real.
    hitos = [];
    const muestras = 340;
    const cache = [];
    for (let i = 0; i <= muestras; i++) cache.push(agua.getPointAtLength((largo * i) / muestras));
    puntos.forEach((p) => {
      if (!p.remanso) return;
      let mejor = 0, dist = Infinity;
      cache.forEach((c, i) => {
        const dd = (c.x - p.x) ** 2 + (c.y - p.y) ** 2;
        if (dd < dist) { dist = dd; mejor = i; }
      });
      hitos.push({ t: mejor / muestras, el: p.el });
    });
  }

  /* --- cuánto río lleva ya corrido ---------------------------------------- */
  function medir() {
    const alcance = document.documentElement.scrollHeight - window.innerHeight;
    objetivo = alcance > 0 ? Math.min(1, Math.max(0, window.scrollY / alcance)) : 0;
    despertar();
  }

  function despertar() {
    if (rafId === null) { dormido = false; rafId = requestAnimationFrame(correr); }
  }

  function correr() {
    // Inercia: el agua alcanza al scroll, no salta a él. Fricción constante.
    const delta = objetivo - actual;
    actual += delta * 0.11;
    if (Math.abs(delta) < 0.0004) { actual = objetivo; dormido = true; }

    pintar(actual);

    if (dormido) { rafId = null; return; }
    rafId = requestAnimationFrame(correr);
  }

  function pintar(p) {
    agua.style.strokeDashoffset = `${largo * (1 - p)}`;

    if (cabeza && largo) {
      const pt = agua.getPointAtLength(largo * p);
      cabeza.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
      cabeza.style.opacity = p > 0.004 && p < 0.999 ? '1' : '0';
    }

    // Lo que el agua ya tocó se queda mojado — no se despinta al subir.
    hitos.forEach((h) => {
      if (p >= h.t && !h.el.classList.contains('esta-mojado')) {
        h.el.classList.add('esta-mojado');
      }
    });
  }

  /* --- arranque ------------------------------------------------------------ */
  function iniciar() {
    if (quieto.matches) {
      svg.setAttribute('hidden', '');
      anclas.forEach((el) => el.classList.add('esta-mojado'));
      return;
    }
    svg.removeAttribute('hidden');
    trazar();
    medir();
    pintar(actual);
  }

  let retraso;
  const reTrazar = () => {
    clearTimeout(retraso);
    retraso = setTimeout(() => { trazar(); medir(); pintar(actual); }, 140);
  };

  window.addEventListener('scroll', medir, { passive: true });
  window.addEventListener('resize', reTrazar);
  quieto.addEventListener('change', iniciar);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(reTrazar);
  window.addEventListener('load', reTrazar);

  iniciar();
})();
