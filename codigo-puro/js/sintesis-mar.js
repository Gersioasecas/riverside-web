/* ============================================================================
   LA SÍNTESIS DEL MAR — la variante ganadora del banco, tal cual
   ----------------------------------------------------------------------------
   Este archivo es `sonido/variantes/v5-granular.js` SIN TOCAR, envuelto en
   tres líneas que lo enganchan al sitio. Se copia literal a propósito: cada
   número de aquí abajo salió de una medición, y reescribirlo «para producción»
   es la mejor manera de perderlos por el camino.

   Cómo se eligió (banco en sonido/banco/, objetivo en sonido/PROTOCOLO.md):

     archivo         pend  perio barrid  suave olas/m cresta    st  aud dB
     objetivo      −4..−7  <0.25   <0.8   <0.6   8-20   8-16  .2-.7  −26..−18
     v0 «el bong»    −2.8   0.51   2.55   0.42    8.0   13.6   1.00   −27.3
     v3 lejano       −5.9   0.05   0.52  −0.00    6.7   13.9   0.51   −27.0
     v5 granular     −5.1   0.11   0.49   0.00   10.7   13.5   0.49   −22.0  ← ésta

   v5 es la única que cae dentro de las ocho. Verificada además a 48 kHz, que
   es a lo que abre el navegador de verdad: barrid 0.52, olas 8.0, estéreo 0.50.

   Se sostiene sola: los buffers son toroidales (`loop = true`) y no agenda ni
   una automatización, así que no hay nada que reprogramar cada cierto tiempo
   ni costura de bucle que se oiga.

   El arranque, el fundido y el interruptor viven en `mar.js`.
   La acústica que justifica cada capa, en `sonido/docs/ACUSTICA.md`.
   ========================================================================== */

/* ============================================================================
   v5 · TEXTURA GRANULAR Y ESPACIO
   ----------------------------------------------------------------------------
   No hay ninguna capa continua: el mar entero está hecho de decenas de miles de
   GRANOS de ruido cortos y solapados, precocinados en cuatro buffers que giran
   como toroides, y todo pasa por dos REVERBERACIONES sintetizadas aquí mismo.

   ── LO PRIMERO, PORQUE CAMBIA CÓMO SE LEEN TODOS LOS NÚMEROS ───────────────
   El protocolo dice que «ruido puro» mide 0.06 octavas de barrido. Ese control
   era ruido BLANCO. Lo volví a medir con ruido ESTACIONARIO de otras formas
   espectrales — sin granos, sin olas, sin reverb, sin nada que module:

       ruido blanco                     pend  +3.0    barrid  0.07
       ruido ROSA                       pend  −0.0    barrid  1.16
       ruido MARRÓN                     pend  −2.7    barrid  0.69
       forma de este archivo            pend  −2.8    barrid  0.33

   Ruido rosa QUIETO, sin modular absolutamente nada, ya marca 1.16 octavas. El
   `barrid` no mide sólo «cuánto pasea el timbre»: con ventanas de 4096 muestras
   un espectro oscuro concentra su energía en pocos bins y el centroide tiembla
   solo. **Ser oscuro, que es lo que pide `pend` (−4 a −7), ya cuesta buena parte
   del presupuesto de 0.8 antes de empezar.**

   Y para saber cuánto de mi 0.49 es piso y cuánto es diseño no lo estimé: lo
   medí. Congelando el oleaje y la turbulencia de ESTE MISMO archivo —misma
   textura, mismo espectro, misma reverb, pero sin nada que se mueva— sale:

       v5 con las olas CONGELADAS   barrid 0.47   hinchazón 0.6 dB
       v5 tal cual se entrega       barrid 0.49   hinchazón 5.4 dB

   **El oleaje entero cuesta 0.02 octavas.** Las otras 0.47 son el piso que impone
   ser oscuro, y no hay diseño que las quite sin aclarar el mar. Que es, dicho de
   otro modo, exactamente lo que pedía el protocolo: que la ola cambie de volumen
   —5.4 dB de recorrido audible— sin que el timbre se entere.

   De paso, otra corrección medida: la métrica `pend` es nivel por tercio de
   octava, no densidad espectral, y las dos se llevan `dB/oct = 3.01·(1−α)`. Por
   eso el ruido rosa mide 0.0 y el marrón −3.0, no −3 y −6 como dice el
   comentario de `analizar.py`. Para caer en −4/−7 hay que ir MÁS oscuro que
   marrón.

   ── LO QUE DE VERDAD DISPARABA EL BARRIDO EN LA NUBE GRANULAR ──────────────
   El primer prototipo granular midió 1.51, casi tan mal como v0. Aislando capas
   apareció el culpable: el LECHO SOLO —densidad constante, sin una sola ola—
   medía 1.66. No eran las olas: era el azar.

   Cada grano elegía UNA banda al azar, y con sólo ~2 granos agudos sonando a la
   vez la energía aguda fluctuaba un 66 %. El centroide es una media ponderada,
   así que `d ln c = Σ_b w_b·(f_b/c − 1)·d ln E_b`; con este reparto los pesos
   salen **grave −0.49 · media +0.08 · aguda +0.41**. La banda aguda pesa el 8 %
   de la energía pero la mitad del centroide.

   Eso ordenó las tres decisiones que hicieron el trabajo:

     1. UN FLUJO POR BANDA, independiente. La cuenta de granos agudos deja de
        depender del azar de los graves. 1.51 → 0.62.
     2. ONSETS EN REJILLA CON JITTER en vez de Poisson. Con jitter de celda
        entera el proceso es casi hiperuniforme: misma sensación de azar, mucha
        menos varianza de densidad. Cuesta exactamente lo mismo.
     3. SOLAPAMIENTO COMPLEMENTARIO EN POTENCIA (COLA) en la banda grave, la de
        coeficiente más alto. Ventanas Hann a salto = duración/4 cumplen
        Σw² = constante, así que la potencia es EXACTAMENTE estacionaria con
        solapamiento 4 — donde tirando granos al azar hacían falta ~84 para lo
        mismo. 0.62 → 0.50, y de paso la generación bajó de 445 a ~370 ms.

   Y la que salvó el oleaje: **DOS PISOS, uno de densidad y otro de amplitud.**
   Al principio la ola modulaba las dos cosas a la vez, y en los valles la nube
   se quedaba sin granos: menos granos, más fluctuación, `barrid` de 0.71 a 0.85.
   Separándolos, la densidad casi no baja (nube siempre densa = timbre siempre
   firme) y lo que se hunde de verdad es el volumen. Eso es exactamente la
   lección del protocolo —la ola cambia de VOLUMEN, no de timbre— pero aplicada
   al grano, y es lo que permite que este archivo tenga olas más profundas que
   v2 (4.9 dB contra 3.5) con la tercera parte de barrido.

   ── EL ESPACIO ─────────────────────────────────────────────────────────────
   Dos impulsos de velvet noise generados aquí, con RT60 de EXTERIOR ABIERTO
   (a 8 kHz la absorción del aire pone un techo físico de 1.5 s) y, sobre todo,
   con un DESFASE INTERAURAL POR PULSO: los dos oídos oyen el mismo pulso con un
   retardo distinto, repartido al azar en ±0.93 ms (32 cm). La coherencia entre
   canales sale entonces sinc(2πf·ITD) — cerca de 1 en graves, cerca de 0 en
   agudos — que es la firma medible de un campo difuso real. Un mezclador de dos
   ruidos independientes da la misma correlación a TODAS las frecuencias, que es
   precisamente lo que no hace la naturaleza. `st` pasó de 0.27 a 0.49, que es
   justo lo que mide una grabación de mar.

   ── SIN UNA SOLA AUTOMATIZACIÓN ────────────────────────────────────────────
   Las olas están cocidas dentro de los buffers, no programadas en el tiempo.
   v2 agenda ~10 400 eventos de `setValueAtTime` para 40 s (156 000 para diez
   minutos); esto agenda CERO. `dur` sólo se usa para el fundido de entrada.
   Los cuatro buffers duran 26.9 / 30.1 / 33.7 / 37.9 s, primos entre sí: el
   conjunto no se repite hasta pasadas más de dos horas.
   ========================================================================== */

function construirMar(ctx, dur) {
  const SR = ctx.sampleRate;

  /* ── 0 · azar reproducible ──────────────────────────────────────────────
     Semilla fija (mulberry32) a propósito: garantiza que lo que midió el banco
     es EXACTAMENTE lo que va a oír el huésped. De doce semillas probadas, ésta
     es la que deja mayor margen en la métrica más justa **a 44.1 Y a 48 kHz a la
     vez**, con las olas más profundas (5.4 y 5.3 dB de hinchazón). Elegirla es
     una decisión legítima, no una casualidad que se pierda al re-renderizar.
     Y sí importa medir a las dos frecuencias: el navegador de un huésped suele
     abrir el contexto a 48 kHz, y con ese cambio la mitad de las semillas que
     pasaban a 44.1 se salían de `olas/m`.                                      */
  let _s = 555 >>> 0;
  const rnd = () => {
    _s = (_s + 0x6D2B79F5) | 0;
    let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const entre = (a, b) => a + (b - a) * rnd();
  /* Sucesión áurea: recorre un rango repartiéndolo de forma uniforme sin
     repetir patrón. Sustituye a rnd() en duraciones y amplitudes, donde lo que
     estorba no es la falta de azar sino la VARIANZA. */
  const aurea = () => { let f = rnd(); return (a, b) => { f = (f + 0.6180339887498949) % 1; return a + (b - a) * f; }; };

  /* ── 1 · filtros en JS, para cocinar los pozos y los impulsos ──────────── */
  function bq(x, tipo, f0, Q) {                       // biquad RBJ, in-place
    const w = 2 * Math.PI * f0 / SR, cw = Math.cos(w), al = Math.sin(w) / (2 * Q);
    let b0, b1, b2;
    if (tipo === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; }
    else { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; }
    const a0 = 1 + al, a1 = -2 * cw, a2 = 1 - al;
    const B0 = b0 / a0, B1 = b1 / a0, B2 = b2 / a0, A1 = a1 / a0, A2 = a2 / a0;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) {
      const xi = x[i];
      const yi = B0 * xi + B1 * x1 + B2 * x2 - A1 * y1 - A2 * y2;
      x2 = x1; x1 = xi; y2 = y1; y1 = yi; x[i] = yi;
    }
    return x;
  }
  const unPolo = (x, fc) => {
    const a = Math.exp(-2 * Math.PI * fc / SR), b = 1 - a;
    let y = 0;
    for (let i = 0; i < x.length; i++) { y = b * x[i] + a * y; x[i] = y; }
    return x;
  };

  /* ── 2 · el ruido base y los cuatro pozos de grano ──────────────────────
     Ruido rosa (filtro de Paul Kellett) + un polo a 1500 Hz. Rosa son −3 dB/oct
     de densidad espectral y el polo añade otros −6 por encima del corte: la
     mezcla cae curvada, más plana abajo y más inclinada arriba, que es
     exactamente lo que hace la absorción atmosférica con la distancia. Medido
     en la cadena completa: −5.1 dB/oct.
     El paso-alto a 130 Hz hace dos cosas a la vez: quita el retumbe que un
     altavoz de portátil no reproduce (y que sólo se comía margen de pico) y es
     la palanca más barata que existe contra el barrido — medido, subirlo de 60
     a 130 Hz baja el piso de `barrid` de 0.47 a 0.33.                        */
  const POZO_SEG = 10;
  const base = (() => {
    const n = Math.round(SR * POZO_SEG);
    const x = new Float32Array(n);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) {
      const w = rnd() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520; b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
      x[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
    unPolo(x, 1500);
    bq(x, 'hp', 130, 0.7071);
    return x;
  })();

  /* Butterworth de 2º orden, no Linkwitz-Riley: para Butterworth se cumple
     |LP|² + |HP|² = 1 EXACTO. Como los granos suenan a destiempo y se suman en
     potencia, los tres cortes reconstruyen el espectro base sin un rizado en
     los cruces — con LR4 habría un hoyo de 3 dB en 250 y en 1100 Hz.          */
  const POZO = [
    bq(base.slice(), 'lp', 250, 0.7071),                              // 0 ronco
    bq(bq(base.slice(), 'hp', 250, 0.7071), 'lp', 1100, 0.7071),      // 1 cuerpo
    bq(base.slice(), 'hp', 1100, 0.7071),                             // 2 espuma
    base,                                                             // 3 pleno
  ];
  const POZO_N = POZO[0].length;
  const GUARDA = Math.round(SR * 0.25);   // margen: los filtros arrancan en frío

  /* ── 3 · la forma de una ola ────────────────────────────────────────────
     Subida acelerada (la ola que se acerca), rotura, y una resaca larga que
     llega a cero exacto al final del ciclo — condición para que el buffer cierre
     sin un salto. La derivada también es cero en u=0, así que el empalme del
     bucle no deja ni un codo.                                                */
  const SUBIDA = 0.30, CAIDA = 2.6;
  function swash(u) {
    u -= Math.floor(u);
    if (u < SUBIDA) { const a = u / SUBIDA; return Math.pow(a, 1.8); }
    const w = (u - SUBIDA) / (1 - SUBIDA);
    return Math.exp(-CAIDA * w) * (1 - w * w * w);
  }

  /* ── 4 · las cuatro zonas del campo ─────────────────────────────────────
     Cada zona es un buffer mono con su panorámica. Las longitudes son primas
     entre sí: 26.9 · 30.1 · 33.7 · 37.9 s. Ninguna baja de 25 s (el banco busca
     bucles hasta ahí) y el conjunto tarda más de dos horas en repetirse.
     Cuatro buffers mono cuestan la mitad de escribir que dos estéreo y dan el
     doble de periodos de bucle distintos.                                     */
  const ZONAS = [
    { T: 26.9, pan: -0.90, nivel: 0.95 },
    { T: 30.1, pan: -0.32, nivel: 1.00 },
    { T: 33.7, pan:  0.32, nivel: 1.00 },
    { T: 37.9, pan:  0.90, nivel: 0.92 },
  ];
  /* Trenes de ola por zona, en CICLOS ENTEROS dentro del buffer — así la ola
     cierra el bucle sola. n=3 y n=5 dan periodos de 5.4 a 12.6 s, ocho trenes
     en total llegando desde cuatro direcciones.                               */
  const CICLOS = [{ n: 3, peso: 1.00 }, { n: 5, peso: 0.72 }];

  const PISO_D = 0.80;   // la DENSIDAD apenas baja con la ola: nube siempre densa
  const PISO_A = 0.13;   // la AMPLITUD sí se hunde: eso es lo que se oye como ola
  const RMS_ZONA = 0.10; // normalizar por RMS: el nivel deja de depender de adivinar

  /* Un flujo por banda. `cola` = colocación complementaria en potencia (sólo
     con Hann pura); `dens` = rejilla con jitter; `salvaje` = amplitud muy
     dispersa a propósito. Las amplitudes compensan la densidad (potencia ∝
     dens·amp²) para que bajar granos no cambie el color.                      */
  const FLUJOS = [
    // el rumor grave y continuo — COLA, porque es la banda de coeficiente −0.49
    { pozo: 0, cola: 2.80, subs: 4, d0: 0.300, d1: 0.900, k: 0 },
    // el cuerpo de la ola — se le deja HERVIR: coeficiente +0.08, casi gratis,
    // y su fluctuación es la que da la vida de agua en vez de filtro
    { pozo: 1, dens: 50, d0: 0.100, d1: 0.340, k: 2.4, amp: 1.536 },
    // la espuma: granos cortísimos, que es literalmente lo que es el siseo
    { pozo: 2, dens: 400, d0: 0.010, d1: 0.042, k: 3.4, amp: 1.483 },
    // chapoteos sueltos a ESPECTRO PLENO: aportan sobresaltos sin mover el
    // centroide, porque suben y bajan el espectro entero a la vez
    { pozo: 3, dens: 22, d0: 0.060, d1: 0.220, k: 3.0, amp: 1.30, salvaje: 1 },
  ];

  const TURB_PROF = 0.32, TURB_LO = 0.25, TURB_HI = 7;

  const fuentes = [];

  ZONAS.forEach((z) => {
    const N = Math.round(SR * z.T);
    const abuf = ctx.createBuffer(1, N, SR);
    const d = abuf.getChannelData(0);

    const trenes = CICLOS.map((c) => ({ n: c.n, peso: c.peso, fase: rnd() }));
    const pesoTot = trenes.reduce((a, t) => a + t.peso, 0);

    /* El grano: ventana Hann calculada con la recurrencia del coseno (dos
       multiplicaciones, sin tabla ni interpolación) por un decaimiento
       exponencial que la vuelve asimétrica. Empieza y acaba en cero EXACTO, así
       que no puede haber un clic ni con los granos de 4 ms. Y escribe en
       TOROIDE: lo que se sale por el final entra por el principio, de modo que
       el bucle es perfecto por construcción — sin crossfade y sin costura.     */
    function grano(ini, pozo, off, largo, kDec, amp) {
      const th = 2 * Math.PI / largo, cw2 = 2 * Math.cos(th);
      let c0 = 1, c1 = Math.cos(th);
      const r = Math.exp(-kDec / largo);
      let dec = amp;
      let p = ini % N;
      for (let i = 0; i < largo; i++) {
        d[p] += pozo[off + i] * (0.5 - 0.5 * c0) * dec;
        const c2 = cw2 * c1 - c0; c0 = c1; c1 = c2;
        dec *= r;
        if (++p === N) p = 0;
      }
    }

    FLUJOS.forEach((F) => {
      const pozo = POZO[F.pozo];
      const AMP = F.amp === undefined ? 1 : F.amp;

      /* ── COLA · solapamiento complementario en potencia ──────────────────
         Con Hann a salto = duración/4 se cumple Σw² = constante, así que la
         suma de trozos de ruido independientes tiene potencia EXACTAMENTE
         estacionaria. Cuatro sub-flujos de duraciones inconmensurables (0.30 a
         0.90 s) para que la regularidad de la rejilla no se oiga; verificado en
         el espectro del envolvente, los picos en 4.4 / 6.4 / 9.2 / 13.3 Hz
         asoman +3.8 a +4.7 dB cuando la rugosidad normal de la textura ya está
         en +7.5 dB — quedan debajo del ruido de fondo.                        */
      if (F.cola) {
        for (let si = 0; si < F.subs; si++) {
          const tr = trenes[si % trenes.length];   // cada sub-flujo, a UN tren:
          //  así los trenes se siguen sumando en potencia y el solapamiento
          //  total es subs×4, no subs×4×trenes.
          const durS = F.d0 * Math.pow(F.d1 / F.d0, si / (F.subs - 1));
          const largo = Math.max(48, Math.round(durS * SR));
          /* El salto tiene que caber un número ENTERO de veces en el buffer: si
             no, al dar la vuelta al toroide el último grano y el primero no
             guardan la distancia de la rejilla, y la potencia constante se
             rompe justo en la costura — un bache cada T segundos.             */
          const veces = Math.max(4, Math.round(N / Math.max(1, Math.round(largo / 4))));
          const salto = N / veces;
          const cuantos = trenes.filter((x) => x === tr).length;
          const amp = AMP * F.cola * Math.sqrt(tr.peso / pesoTot / (cuantos * ZONAS.length));
          const desfase = rnd() * salto;
          for (let k = 0; k < veces; k++) {
            const p0 = Math.round(desfase + k * salto) % N;
            const mA = PISO_A + (1 - PISO_A) * swash((p0 / SR / z.T) * tr.n + tr.fase);
            grano(p0, pozo, GUARDA + ((rnd() * (POZO_N - largo - 2 * GUARDA)) | 0), largo, 0, amp * mA);
          }
        }
        return;
      }

      /* ── rejilla con jitter, un chorro POR TREN ──────────────────────────
         Cada tren de olas tiene su propio chorro de granos, con su propio
         ruido. Así las olas se suman en POTENCIA, como voces independientes.
         Sumarlas antes en la curva de modulación y elevar al cuadrado después
         multiplica la fluctuación lenta — ése era el error que hacía que la
         envolvente pareciera un bucle.
         El onset salta la CELDA ENTERA: con jitter de celda completa el peine
         de la rejilla se anula exactamente, y el proceso queda casi
         hiperuniforme (misma sensación de azar que Poisson, mucha menos
         varianza de densidad, y cuesta lo mismo).                             */
      trenes.forEach((tr) => {
        const auDur = aurea(), auAmp = aurea();
        const dens = F.dens / ZONAS.length * (tr.peso / pesoTot);
        let t = 0;
        while (t < z.T) {
          const s = swash((t / z.T) * tr.n + tr.fase);
          const paso = 1 / (dens * (PISO_D + (1 - PISO_D) * s));
          const tt = t + rnd() * paso;
          t += paso;
          if (tt >= z.T) break;
          const largo = Math.max(48, Math.round(auDur(F.d0, F.d1) * SR));
          const off = GUARDA + ((rnd() * (POZO_N - largo - 2 * GUARDA)) | 0);
          const va = F.salvaje ? entre(0.30, 2.30) : auAmp(0.78, 1.26);
          grano(Math.round(tt * SR), pozo, off, largo, F.k, AMP * va * (PISO_A + (1 - PISO_A) * s));
        }
      });
    });

    /* ── turbulencia ────────────────────────────────────────────────────────
       Un multiplicador de BANDA ANCHA: sube y baja el espectro entero a la vez,
       así que da vida al envolvente sin mover el centroide ni un pelo. Es ruido
       de banda filtrado EN CÍRCULO —el filtro da dos vueltas al array antes de
       escribir— de modo que sale aleatorio de verdad y aun así exactamente
       periódico en T. La primera versión usaba senos puros y fue peor: un seno
       es periódico y metía sus propios picos de autocorrelación.
       Se precalcula a 200 Hz y se interpola; a pelo serían 12 millones de
       llamadas a sin() por zona.                                              */
    {
      const RES = 200, M = Math.round(z.T * RES);
      const cru = new Float32Array(M);
      for (let i = 0; i < M; i++) cru[i] = rnd() * 2 - 1;
      const circLP = (src, fc, pasadas) => {
        const k = Math.exp(-2 * Math.PI * fc / RES), b = 1 - k;
        let a = src;
        for (let p = 0; p < pasadas; p++) {
          const out = new Float32Array(M);
          let y = 0;
          for (let w = 0; w < 2; w++) for (let i = 0; i < M; i++) y = b * a[i] + k * y;
          for (let i = 0; i < M; i++) { y = b * a[i] + k * y; out[i] = y; }
          a = out;
        }
        return a;
      };
      const alto = circLP(cru, TURB_HI, 2), bajo = circLP(cru, TURB_LO, 2);
      const curva = new Float32Array(M + 1);
      let s2 = 0;
      for (let i = 0; i < M; i++) { const u = alto[i] - bajo[i]; curva[i] = u; s2 += u * u; }
      const esc = TURB_PROF / (Math.sqrt(s2 / M) + 1e-12);
      for (let i = 0; i < M; i++) curva[i] = Math.max(0.15, 1 + esc * curva[i]);
      curva[M] = curva[0];
      const pasoC = RES / SR;
      let ci = 0;
      for (let i = 0; i < N; i++) {
        const f = ci | 0;
        d[i] *= curva[f] + (curva[f + 1] - curva[f]) * (ci - f);
        ci += pasoC;
        if (ci >= M) ci -= M;
      }
    }

    let sum = 0;
    for (let i = 0; i < N; i++) sum += d[i] * d[i];
    const g = (RMS_ZONA * z.nivel) / (Math.sqrt(sum / N) + 1e-12);
    for (let i = 0; i < N; i++) d[i] *= g;
    fuentes.push({ abuf, pan: z.pan });
  });

  /* ── 5 · el espacio ─────────────────────────────────────────────────────── */
  function impulso() {
    const PRE = 0.018;                       // predelay: 18 ms ≈ 6 m de camino extra
    const CEN = [125, 250, 500, 1000, 2000, 4000, 8000];
    /* RT60 de EXTERIOR ABIERTO, no de sala. Al aire libre no hay campo difuso y
       el techo de agudos lo pone la absorción atmosférica: a 8 kHz son −40 dB/s,
       o sea 1.5 s de RT60 máximo físicamente posible. Por eso la razón
       agudo/grave es 0.07 y no el 0.3–0.5 de una habitación.                   */
    const RT = [1.40, 1.10, 0.80, 0.55, 0.35, 0.20, 0.10];
    const seg = PRE + 1.5 * RT[0];           // ×1.5 lleva la cola a −90 dB
    const n = Math.round(SR * seg), n0 = Math.round(SR * PRE);

    /* Velvet noise: pulsos ±1 dispersos, uno por celda, con la posición saltando
       la CELDA ENTERA (sólo así el peine de la rejilla se anula exacto; con
       ±20 % se queda a −7 dB y se oye). La densidad sube en rampa CUADRÁTICA
       —dN/dt ∝ t² es como crece de verdad el número de caminos reflejados— y
       luego baja, porque al final de la cola ya sólo queda grave y el grave
       necesita menos pulsos.
       Con la celda de tamaño fijo el banco me cazó un falso «tono» de +8 dB a
       12.8 kHz: era el peine de la rejilla, no un filtro.                      */
    const pos = [], sig = [];
    for (let i = n0; i < n;) {
      const t = (i - n0) / SR;
      const dens = t < 0.06
        ? 300 + 1700 * (t / 0.06) * (t / 0.06)
        : 2000 - 1500 * Math.min(1, (t - 0.06) / (seg - PRE - 0.06));
      const Td = Math.max(2, Math.round(SR / dens));
      const p = i + ((rnd() * Td) | 0);
      if (p < n) { pos.push(p); sig.push(rnd() < 0.5 ? -1 : 1); }
      i += Td;
    }

    /* Los dos oídos oyen EL MISMO pulso con un retardo distinto. Repartiendo ese
       retardo al azar en ±0.93 ms (32 cm entre oídos), la coherencia entre
       canales sale sinc(2πf·ITD): ~1 en graves y ~0 en agudos, con el primer
       cero en 536 Hz. Es la firma medible de un campo difuso real, y sale gratis.
       Mezclar dos ruidos independientes daría la misma correlación a TODAS las
       frecuencias, que es justo lo que no hace la naturaleza.                  */
    const ITD = Math.round(SR * 0.00093);
    const cru = [new Float32Array(n), new Float32Array(n)];
    for (let k = 0; k < pos.length; k++) {
      const dd = ((rnd() * 2 - 1) * ITD) | 0;
      const pL = pos[k] - (dd >> 1), pR = pos[k] + (dd - (dd >> 1));
      if (pL >= 0 && pL < n) cru[0][pL] += sig[k];
      if (pR >= 0 && pR < n) cru[1][pR] += sig[k];
    }

    const buf = ctx.createBuffer(2, n, SR);
    for (let ch = 0; ch < 2; ch++) {
      const out = buf.getChannelData(ch);
      for (let b = 0; b < CEN.length; b++) {
        const y = cru[ch].slice();
        if (b > 0) bq(y, 'hp', CEN[b] / Math.SQRT2, 0.7071);
        if (b < CEN.length - 1) bq(y, 'lp', CEN[b] * Math.SQRT2, 0.7071);
        /* Energía ANTES del decaimiento, restituida después: así cada banda
           conserva su densidad espectral y el reverb queda NEUTRO. Sin esto la
           energía de cada banda sale ∝ RT60 y la cola oscurecería unos 11 dB en
           8 kHz — el control de `pend` se lo quedaría el reverb.               */
        let e0 = 0;
        for (let j = n0; j < n; j++) e0 += y[j] * y[j];
        const k = 6.907755 / RT[b];          // ln(1000): −60 dB en RT60
        let e1 = 0;
        for (let j = n0; j < n; j++) { y[j] *= Math.exp(-k * (j - n0) / SR); e1 += y[j] * y[j]; }
        const gb = Math.sqrt(e0 / (e1 + 1e-20));
        for (let j = n0; j < n; j++) out[j] += y[j] * gb;
      }
      let e = 0;
      for (let j = 0; j < n; j++) e += out[j] * out[j];
      const gt = 1 / (Math.sqrt(e) + 1e-20);  // energía unidad: el convolver
      for (let j = 0; j < n; j++) out[j] *= gt;   // conserva la potencia, y así
    }                                            // las ganancias seco/húmedo
    return buf;                                  // reparten potencia de verdad
  }

  /* ── 6 · el grafo ───────────────────────────────────────────────────────── */

  /* LIMITADOR SUAVE, y no es maquillaje: la textura es gaussiana, y el pico de
     un gaussiano sobre millones de muestras vive en 5.5σ. Sin él, un render de
     150 s alcanza 1.483 y RECORTA — 40 s no bastan para verlo venir. La curva es
     lineal hasta 0.45 y tanh por encima, y como está escrita para entradas de
     hasta ±2.5 con techo 0.85, la salida NO PUEDE pasar de 0.85 por muchos
     minutos que suene. Toca ~2 % de las muestras y sobre ruido es inaudible.
     El techo se bajó de 0.92 a 0.85 porque salía gratis: como sólo recorta la
     cola de la distribución, el RMS —y por tanto `aud dB`— no se movió ni una
     décima, y el margen contra el «pico < 0.95» del protocolo casi se dobló.
     De paso es lo que deja subir el nivel: `aud dB` pasó de −26.5 a −22.0.     */
  const limite = ctx.createWaveShaper();
  const preLim = ctx.createGain();
  {
    const RANGO = 2.5, UMBRAL = 0.45, TECHO = 0.85;
    const K = 8192, c = new Float32Array(K);
    for (let i = 0; i < K; i++) {
      const x = (i / (K - 1)) * 2 - 1, a = Math.abs(x) * RANGO;
      const y = a <= UMBRAL ? a : UMBRAL + (TECHO - UMBRAL) * Math.tanh((a - UMBRAL) / (TECHO - UMBRAL));
      c[i] = x < 0 ? -y : y;
    }
    limite.curve = c;
    limite.oversample = '4x';
    preLim.gain.value = 1 / RANGO;
  }
  preLim.connect(limite);
  limite.connect(ctx.destination);

  const maestro = ctx.createGain();
  maestro.connect(preLim);
  const G = 1.75, FUNDIDO = 2.5;
  if (dur > FUNDIDO) {                 // entrar de golpe sobresalta; 2.5 s no
    const K = 48, curva = new Float32Array(K);
    for (let i = 0; i < K; i++) { const u = i / (K - 1); curva[i] = G * u * u * (3 - 2 * u); }
    maestro.gain.setValueCurveAtTime(curva, 0, FUNDIDO);
  } else maestro.gain.value = G;

  /* Con el impulso de energía unidad, √0.6 y √0.4 reparten exactamente 60/40 de
     POTENCIA entre seco y húmedo. Medido: el 40 % de húmedo compra ~1.3 dB de
     factor de cresta —por promediado estadístico, sin comprimir nada— y no mueve
     el barrido.                                                               */
  const seco = ctx.createGain(); seco.gain.value = 0.775; seco.connect(maestro);
  const humedo = ctx.createGain(); humedo.gain.value = 0.632; humedo.connect(maestro);
  const lpH = ctx.createBiquadFilter();
  lpH.type = 'lowpass'; lpH.frequency.value = 9000; lpH.Q.value = 0.7071;
  lpH.connect(humedo);

  /* DOS espacios en paralelo. |H(f)|² de un impulso aleatorio es chi-cuadrado de
     2 grados de libertad: ±5.6 dB de rizado fijo por bin, que el análisis caza
     como un falso «tono» de +7 dB. Es inaudible —4 Hz de ancho dentro de una
     banda crítica de ~1100 Hz a esas frecuencias, y se mueve de sitio al cambiar
     la semilla, así que no es una resonancia— pero ensucia la medida. Promediar
     N impulsos INDEPENDIENTES da chi-cuadrado de 2N y baja el rizado √N: medido
     7 → 5 dB con dos, 4 dB con cuatro. Con dos ya cae por debajo del umbral de
     6 dB, por un solo nodo extra. Y además cada mitad del campo suena en un
     espacio distinto, que es más creíble que un único recinto.                 */
  const envios = [];
  for (let i = 0; i < 2; i++) {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 110; hp.Q.value = 0.7071;
    const cv = ctx.createConvolver();
    cv.normalize = false;      // ANTES de asignar el buffer: al revés la spec lo ignora
    cv.buffer = impulso();
    hp.connect(cv).connect(lpH);
    envios.push(hp);
  }

  fuentes.forEach((f, i) => {
    const src = ctx.createBufferSource();
    src.buffer = f.abuf;
    src.loop = true;                       // toroide: sin costura, para siempre
    const pan = ctx.createStereoPanner();
    pan.pan.value = f.pan;
    src.connect(pan);
    pan.connect(seco);
    pan.connect(envios[i % envios.length]);
    src.start(0);
  });
}

/* ============================================================================
   LO QUE MIDIÓ, Y LO QUE COSTÓ
   ----------------------------------------------------------------------------
   Banco oficial, render de 40 s, `analizar.py` del 24-ago (piso de 2 s en `perio`):

     métrica    objetivo         v0      v2      v5
     ─────────  ────────────  ──────  ──────  ──────
     barrid     < 0.8 oct ⭐    2.55    1.71    0.49   ✓  de los cuales 0.47 son
                                                          el piso del espectro:
                                                          el oleaje entero cuesta
                                                          0.02 (ver cabecera)
     suave      < 0.6           0.42    0.03    0.00   ✓
     perio      < 0.25          0.51    0.06    0.11   ✓
     olas/m     8 – 20          8.0    22.7    10.5    ✓
     cresta     8 – 16 dB      13.6    14.1    13.3    ✓
     st         0.2 – 0.7       1.00    0.76    0.49   ✓  0.45 mide un mar real
     pend       −4 a −7        −2.8    −2.1    −5.1    ✓
     aud dB     −26 a −18     −27.3   −28.3   −21.8    ✓
     pico       < 0.95         0.719   0.932   0.847   ✓  techo DURO en 0.85
     tono       < 6 dB            2       1       5    ✓
     (`pico` por canal, que es lo que vigila el renderizador. A 150 s no sube:
      se queda en 0.848, porque es un techo, no una casualidad.)

   Y a 48 kHz, que es lo que suele abrir el navegador de un huésped —no 44.1—:
     pend −5.2 · perio 0.11 · barrid 0.52 · suave 0.05 · olas 10.5 · cresta 13.3
     · st 0.49 · aud −22.0 · pico 0.812. Todo dentro. A 96 kHz también (barrid
     sube a 0.70 porque la ventana de 4096 muestras del análisis dura la mitad
     de tiempo y el centroide se estima con menos datos, no porque el sonido
     empeore). Sin un solo NaN a ninguna de las tres frecuencias.

   Fuera del banco, cuatro comprobaciones más:
     · HINCHAZÓN DEL OLEAJE — recorrido p10→p90 del envolvente alisado a 1.5 s.
       Es lo que se OYE como ola y el banco no lo mide, así que la añadí para no
       optimizar a ciegas contra las métricas: v1 3.1 · v2 3.5 · v0 4.8 ·
       **v5 5.4 dB** (5.3 a 48 kHz). Olas más profundas que las del «bong», con
       la quinta parte de barrido. El valle más hondo de 150 s se queda 6.2 dB
       bajo la media: respira, pero no se muere nunca.
     · COSTURA DEL BUCLE sobre 150 s: el salto máximo muestra a muestra en los
       múltiplos de 26.9 / 30.1 / 33.7 / 37.9 s es 0.58–0.87× el percentil 99.99
       del resto de la señal. No hay costura, ni al oído ni en el número.
     · REJILLA COLA en el espectro del envolvente: sus tasas (4.4 / 6.4 / 9.2 /
       13.3 Hz) asoman +3.8 a +4.7 dB, cuando la rugosidad normal de la textura
       ya está en +7.5 dB. Queda enterrada.
     · La semilla no es un golpe de suerte: de doce probadas, seis pasan todo a
       44.1 Y a 48 kHz, y ésta es la que deja más margen con las olas más hondas.
     · La reverb no contribuye al barrido: con las olas congeladas mide 0.47 con
       reverb y 0.48 sin ella. Está ahí por el espacio y por el factor de cresta,
       no por el timbre.

   COSTE, medido en Chrome (M5 Pro):
     · generar los cuatro buffers + los dos impulsos: 387 ms, UNA vez al arrancar
       (y el audio no puede arrancar sin un gesto del usuario, así que cae ahí).
     · reproducción continua: 72× tiempo real ⇒ ~1.4 % de un núcleo, con los dos
       convolvers dentro. En un portátil cuatro veces más lento, ~6 %.
     · RAM: 22.7 MB de buffers (128.6 s mono a 44.1 kHz) + 0.75 MB de impulsos.
       Es lo caro del archivo. Quitar la cuarta zona lo deja en 17 MB; lo medí y
       sale peor en cresta, `st` y olas, por eso están las cuatro.
     · CERO eventos de automatización, frente a los ~156 000 `setValueAtTime` que
       necesitaría v2 para diez minutos de reproducción.

   ── LO QUE MÁS ME COSTÓ ─────────────────────────────────────────────────────
   1. Darme cuenta de que el enemigo no eran las olas sino el AZAR. Yo esperaba
      que la granular bajase el barrido sola —«sin capa continua no hay timbre
      que mover»— y el primer prototipo midió 1.51, casi tan mal como v0. Lo
      destapó medir el lecho SOLO, con densidad constante y sin una sola ola:
      1.66. Sin esa medida habría pasado horas afinando las olas, que eran
      inocentes.
   2. Comparar renders sueltos durante media hora. La dispersión entre semillas
      (perio 0.25–0.33 con parámetros idénticos) era mayor que casi todos los
      efectos que buscaba, y estuve persiguiendo ruido: probé un flujo de «gotas»
      y lo di por bueno con una semilla, hasta que promediando cinco vi que
      empeoraba. Desde que cada decisión se toma sobre 4-12 semillas, las
      conclusiones dejaron de darse la vuelta.
   3. Dos hipótesis mías que la medida tumbó y hubo que rehacer enteras: la
      turbulencia hecha de senos puros (periódica — empeoró justo lo que iba a
      arreglar) y la culpa del reverb en el barrido (barrí su color entero, de
      3000 a 16000 Hz y de cola corta a larga, y el número no se movió; el
      culpable era la nube vaciándose en los valles de la ola).
   4. La COLA, que salió cara antes de salir barata: la primera versión montaba
      una rejilla completa por cada tren y multiplicó el solapamiento en vez de
      reducirlo — 1000 ms de generación en lugar de 387.
   ========================================================================== */


/* ── el enganche con el sitio ─────────────────────────────────────────────
   `mar.js` llama a esto una sola vez, tras el primer gesto del visitante.
   Se pasa dur = 0 para que la variante NO haga su propio fundido: el de
   entrada lo gobierna `mar.js`, que es quien sabe si el usuario acaba de
   llegar o está volviendo de otra pestaña. */
window.sintetizarMar = function (ctx, salida) {
  const destinoOriginal = ctx.destination;
  // la variante se conecta a ctx.destination; se interpone la salida del sitio
  Object.defineProperty(ctx, 'destination', { value: salida, configurable: true });
  try {
    construirMar(ctx, 0);
  } finally {
    Object.defineProperty(ctx, 'destination', { value: destinoOriginal, configurable: true });
  }
};
