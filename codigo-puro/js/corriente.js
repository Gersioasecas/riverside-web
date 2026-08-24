/* ============================================================================
   LA CORRIENTE — animación firma de Riverside Chachalacas
   ----------------------------------------------------------------------------
   De dónde sale: el logo es una gota triangular con una ola enroscada cuya
   cresta escapa en dos trazos horizontales. Esos trazos SON el río. Aquí esa
   cresta se desenrosca al bajar y recorre la página entera, igual que el
   Actopan cruza Chachalacas antes de entregarse al mar.

   Cómo se traza:
     · Una onda continua, de periodo fijo, para que SIEMPRE se lea como río
       aunque la página sea corta y tenga un solo título.
     · Al pasar frente a un título marcado [data-moja], el cauce se desvía a
       pasar justo por debajo y le deja una marca de agua.
     · Al cruzar un bloque marcado [data-encajona] (la fila de estancias), el
       río se encajona contra el margen: se estrecha en vez de meterse entre
       las fotos, que es lo que hace un río cuando la orilla se cierra.

   Física (la física es el árbitro):
     · El agua baja porque el usuario baja. Sin scroll no hay caudal.
     · Tiene inercia: al soltar el scroll sigue un instante y la fricción la para.
     · No rebota nunca. Un río no rebota.
     · La cabeza va SIEMPRE sobre el trazo ya dibujado: causa y efecto no se
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
  const encajonan = [...document.querySelectorAll('[data-encajona]')];

  let largo = 0;
  let hitos = [];
  let objetivo = 0;
  let actual = 0;
  let rafId = null;
  let dormido = true;

  const arriba = (el) => el.getBoundingClientRect().top + window.scrollY;

  function trazar() {
    const W = document.documentElement.clientWidth;
    const H = document.documentElement.scrollHeight;
    const angosto = W < 900;

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);

    // El río nace en la cresta del logo del hero.
    const marca = document.querySelector('[data-nace]');
    let inicio = { x: W * 0.5, y: 0 };
    if (marca) {
      const r = marca.getBoundingClientRect();
      inicio = { x: r.left + r.width * 0.66, y: r.top + window.scrollY + r.height * 0.80 };
    }

    // Carril: por dónde corre de base, y cuánto se permite divagar.
    const margen = Math.max(18, (W - Math.min(W - 40, 1240)) / 2 - 26);
    const carril = angosto ? W * 0.08 : W * 0.5;
    const vaiven = angosto ? W * 0.045 : Math.min(W * 0.26, 330);
    const carrilEncajonado = angosto ? W * 0.05 : margen;

    // Tramos donde el río se encajona contra el margen.
    const gargantas = encajonan.map((el) => {
      const r = el.getBoundingClientRect();
      const y0 = r.top + window.scrollY;
      return { y0: y0 - 70, y1: y0 + r.height + 70 };
    });
    const enGarganta = (y) => gargantas.some((g) => y >= g.y0 && y <= g.y1);

    // Onda continua: el río existe aunque no haya títulos que visitar.
    const PERIODO = angosto ? 300 : 380;
    const puntos = [inicio];
    let y = inicio.y + PERIODO * 0.7;
    let i = 0;
    while (y < H - 70) {
      const fase = Math.sin(i * 1.05 + 0.6);
      const x = enGarganta(y) ? carrilEncajonado : carril + fase * vaiven;
      puntos.push({ x, y });
      y += PERIODO;
      i++;
    }
    puntos.push({ x: enGarganta(H - 40) ? carrilEncajonado : carril, y: H - 40 });

    // Los títulos desvían el cauce: el agua pasa justo por debajo de cada uno.
    anclas.forEach((el) => {
      const r = el.getBoundingClientRect();
      const yA = r.top + window.scrollY + r.height + 12;
      const xA = angosto
        ? carrilEncajonado
        : Math.min(Math.max(r.left + r.width * 0.55, W * 0.18), W * 0.82);
      // sustituye el punto de onda más próximo, para no romper el ritmo
      let mejor = -1, dist = Infinity;
      puntos.forEach((p, k) => {
        if (k === 0) return;
        const d = Math.abs(p.y - yA);
        if (d < dist) { dist = d; mejor = k; }
      });
      const nodo = { x: xA, y: yA, remanso: true, el };
      if (mejor > 0 && dist < PERIODO * 0.62) puntos[mejor] = nodo;
      else {
        const k = puntos.findIndex((p) => p.y > yA);
        puntos.splice(k < 0 ? puntos.length : k, 0, nodo);
      }
    });

    // Bézier suave (Catmull-Rom → cúbica). El agua no hace esquinas.
    let d = `M ${puntos[0].x.toFixed(1)} ${puntos[0].y.toFixed(1)}`;
    for (let k = 0; k < puntos.length - 1; k++) {
      const p0 = puntos[k - 1] || puntos[k];
      const p1 = puntos[k];
      const p2 = puntos[k + 1];
      const p3 = puntos[k + 2] || p2;
      const t = 0.3;
      const c1x = p1.x + (p2.x - p0.x) * t, c1y = p1.y + (p2.y - p0.y) * t;
      const c2x = p2.x - (p3.x - p1.x) * t, c2y = p2.y - (p3.y - p1.y) * t;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    cauce.setAttribute('d', d);
    agua.setAttribute('d', d);
    largo = agua.getTotalLength();
    agua.style.strokeDasharray = `${largo}`;
    agua.style.strokeDashoffset = `${largo}`;

    // ¿En qué fracción del recorrido queda cada título?
    hitos = [];
    const muestras = 300;
    const cache = [];
    for (let k = 0; k <= muestras; k++) cache.push(agua.getPointAtLength((largo * k) / muestras));
    puntos.forEach((p) => {
      if (!p.remanso) return;
      let mejor = 0, dist = Infinity;
      cache.forEach((c, k) => {
        const dd = (c.x - p.x) ** 2 + (c.y - p.y) ** 2;
        if (dd < dist) { dist = dd; mejor = k; }
      });
      hitos.push({ t: mejor / muestras, el: p.el });
    });
  }

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

    hitos.forEach((h) => {
      if (p >= h.t && !h.el.classList.contains('esta-mojado')) h.el.classList.add('esta-mojado');
    });
  }

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
