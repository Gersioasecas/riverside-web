/* ============================================================================
   SITIO — comportamiento mínimo. Todo lo que se puede hacer con CSS, se hace
   con CSS. Aquí solo vive lo que necesita saber dónde está el usuario.
   ========================================================================== */

(() => {
  'use strict';

  /* --- la barra se posa al salir del hero ------------------------------- */
  const nav = document.querySelector('[data-nav]');
  const hero = document.querySelector('.hero');
  if (nav && hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      ([e]) => nav.classList.toggle('esta-posada', !e.isIntersecting),
      { rootMargin: '-72px 0px 0px 0px', threshold: 0 }
    ).observe(hero);
  }

  /* --- lo que entra en cuadro se asienta -------------------------------- */
  const suben = document.querySelectorAll('[data-sube]');
  if (suben.length) {
    if (!('IntersectionObserver' in window)) {
      suben.forEach((el) => el.classList.add('esta-dentro'));
    } else {
      const ojo = new IntersectionObserver(
        (entradas) => entradas.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('esta-dentro');
          ojo.unobserve(e.target);   // se asienta una vez y se queda
        }),
        { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
      );
      suben.forEach((el) => ojo.observe(el));
    }
  }

  /* --- el año del pie no se escribe a mano ------------------------------ */
  const anio = document.querySelector('[data-anio]');
  if (anio) anio.textContent = String(new Date().getFullYear());
})();
