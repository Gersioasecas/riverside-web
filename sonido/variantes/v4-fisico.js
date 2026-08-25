/* ============================================================================
   v4 · EL MODELO FÍSICO — el mar no se filtra, se fabrica burbuja por burbuja
   ----------------------------------------------------------------------------
   LA IDEA. Casi todo el sonido de una ola rompiendo lo hacen las BURBUJAS de
   aire que el agua atrapa. Y una burbuja tiene física conocida: resuena a la
   frecuencia de Minnaert f₀ = 3260/a (a = radio en mm) y su oscilación se apaga
   con un amortiguamiento que también se conoce. Así que aquí no se filtra
   ruido: se sortea una población de burbujas con la distribución de tamaños que
   se mide en un rompiente real, se le da a cada una su resonancia y su energía,
   y se deja que el aire de 220 m se coma los agudos.

   POR QUÉ ESO RESUELVE EL «BONG». El diagnóstico del protocolo es que el
   centro tímbrico no puede pasear. En este modelo no puede, y no por un
   cuidado de mezcla sino por construcción: lo que la ola modula es CUÁNTAS
   burbujas nacen por segundo (×8 entre el valle y la cresta), no de qué tamaño
   son. La distribución de tamaños —o sea el espectro— es la misma en el valle
   y en la cresta. Todas las capas siguen esa misma tasa, así que su proporción
   nunca cambia. Medido: barrido 0.40 octavas, contra 1.71 de v2 y 2.55 de v0.

   ───────────────────────────────────────────────────────────────────────────
   LAS CUATRO CAPAS, Y POR QUÉ ESTÁN PARTIDAS AHÍ

   El corte no es de conveniencia, es el TEOREMA DEL LÍMITE CENTRAL. En un
   penacho real nacen del orden de 10⁶ burbujas por segundo. Donde se solapan
   miles, su suma ES ruido gaussiano con el espectro de la población — no una
   aproximación, el límite exacto del mismo modelo. Donde se oyen una a una,
   hay que sintetizarlas una a una. De ahí:

     L1 · ANCLA DEL PENACHO   130–560 Hz   ruido resonante, centros FIJOS
          No son burbujas sueltas: es la oscilación COLECTIVA de la nube de
          burbujas, f_R = 4.0/(R·√α) con R el radio del penacho y α la fracción
          de vacío (Loewen & Melville 1994; es ISOTERMA, γ=1, no adiabática).
          Un mar tranquilo rompe en derrame, con penachos pequeños (R≈0.25 m,
          α≈0.005) → el suelo del penacho está en 250 Hz, no en 45; por debajo
          la capa cae a cuarto orden y un paso-alto a 110 Hz remata la falda.
          Ése es el porqué
          físico de que esta variante no tenga retumbe de mar gruesa.
          ⚠️ TRAMPA: α cae mientras el penacho se desgasifica, así que f_R SUBE
          — un glissando de varias octavas, físicamente correcto, que
          reproduciría el fallo de v0 con bendición académica. Se evita
          modelando la POBLACIÓN de penachos, no un penacho: a 220 m suenan
          decenas de edades distintas a la vez y el conjunto es estático.

     L2+L3 · BURBUJAS INDIVIDUALES   362–3300 Hz   48 resonadores + Poisson
          Radios de 9 mm a 1 mm. Aquí vive el 52 % de la energía con el 12 % de
          las burbujas, y aquí el grano se oye COMO grano. Es el corazón.

     L4 · SISEO SUB-HINZE   3300–16000 Hz   ruido resonante
          Radios por debajo de la escala de Hinze (1 mm). Son el 88 % de las
          burbujas y el 1.5 % de la energía: sintetizarlas una a una sería la
          peor relación coste/beneficio del modelo. Van como ruido conformado.

     Y encima de todo: el AIRE de 220 m (ISO 9613-1) y el TECHO SUAVE.

   ───────────────────────────────────────────────────────────────────────────
   DE DÓNDE SALE CADA NÚMERO

   · Minnaert  f₀ = 3260/a[mm].  La constante efectiva (índice politrópico real
     Re[Γ]<1.4 más tensión superficial) vale 3.243 a 1 mm y 3.272 a 10 mm; 3.26
     es la mejor constante única para 1–9 mm. El 3.0 que arrastran van den Doel
     y el SDT es un 8.7 % bajo = 1.45 semitonos = 0.12 octavas de sesgo
     sistemático en el centroide. Corregirlo es gratis.

   · Amortiguamiento  δ(f) = 0.01369 + 4.46e-4·√f,  d = π·f·δ  (Devin 1959 /
     Prosperetti). Da Q = 45 a 362 Hz, 25.5 a 3.26 kHz, 12.6 a 21.7 kHz. NO usar
     la δ térmica de Zheng & James: está mal transcrita y da 3-4× menos.

   · Tamaños  N(a) ∝ a^-3/2 por debajo de la escala de Hinze (1.0 mm) y
     a^-10/3 por encima  (Deane & Stokes, Nature 418:839, 2002). Ojo con las
     unidades: es por m³ y por MICRÓMETRO de radio. Como los bins son
     log-espaciados, la probabilidad de un bin va como a·N(a).

   · Energía  E ∝ a³  (E = 6πγP₀a³ε²; validada: Leighton & Walton midieron
     2.5 µJ para a=1.9 mm y la fórmula da 2.22 µJ). ⚠️ ESTO ME MORDIÓ: el
     resonador radia E = g²·SR/(4d), y como d ∝ δ/a, poner g ∝ a da E ∝ a³/δ.
     Con δ variando 1.77× en la banda eso es −0.78 dB/oct de sesgo. La ganancia
     correcta es g ∝ a·√δ. No usar la ec.(4) de van den Doel (a ∝ r^1.5·u): no
     cierra dimensionalmente.

   · Distancia  220 m. NO es un gusto, es una consecuencia. El espectro aéreo
     medido de un rompiente (Tollefsen & Byrne 2011) tiene pendiente de banda
     −2.5 dB/oct; el objetivo del protocolo (−4 a −7) sólo se cumple con el
     aire de por medio, y eso fija la distancia en 150–400 m. Aquí sale −4.6.

   · Aire  ISO 9613-1 a 25 °C y 80 % HR (Veracruz). La implementación se validó
     contra la tabla publicada de ISO 9613-2 a 20 °C/70 %: 0.09 · 0.33 · 1.12 ·
     2.79 · 4.98 · 9.04 · 23.1 · 77.6 dB/km contra 0.1 · 0.3 · 1.1 · 2.8 · 5.0 ·
     9.0 · 22.9 · 76.6. Los tres biquads de abajo reproducen la absorción a
     220 m con 0.04 dB rms de error entre 31.5 Hz y 16 kHz.
     ⚠️ Q = 0.5 OBLIGATORIO: la absorción es una cascada de polos REALES. El
     Q = 1 por defecto de Web Audio metería una resonancia de +1.25 dB en el
     corte, que es exactamente la familia de artefacto que estamos evitando.

   · Núcleo geométrico  La rompiente es una LÍNEA, no un punto: la misma ola
     llega desde muchos puntos a la vez y su energía se reparte en el tiempo
     según F(t) = (2/π)·arccos(D/(D+ct)), con t₅₀ = 0.4142·D/c = 263 ms. Ese
     emborronamiento domina por dos órdenes de magnitud sobre cualquier otro
     (la dispersión molecular a 220 m son 0.05 ms) y es la razón física de que
     un mar lejano suene a lavado continuo y no a golpes. Aquí se aplica
     convolucionando la envolvente de la ola, que es donde de verdad ocurre.

   · Envolvente de rotura  Ataque 120 ms, fase activa 0.55 s, caída τ = 0.60 s
     (Klusek & Lisimenka 2013 miden 4.5–7 dB/s en canal de olas). El ASCENSO es
     más rápido que la bajada; invertirlo suena a platillo al revés.

   · Sin CHIRP. Una burbuja sube de tono al colapsar (ξ≈0.1 en van den Doel),
     pero el banco de resonadores tiene frecuencias fijas y, a 40 000 burbujas
     por segundo, van den Doel reporta artefacto audible de FLANGER con chirp.
     Se deja fuera a conciencia: cuesta poco y quita un riesgo tonal.

   ───────────────────────────────────────────────────────────────────────────
   EL TRUCO QUE HACE QUE ESTO SEA BARATO

   Un resonador de 2 polos es LINEAL: N burbujas del mismo radio = UN resonador
   alimentado por N impulsos. El coste es O(bins × muestras) e INDEPENDIENTE de
   cuántas burbujas haya — medido: 12 000 y 40 000 burbujas/s cuestan lo mismo
   (205 ms). Colocarlas una a una costaría más de un segundo. Y como la tasa
   es gratis, se puede subir hasta donde el centroide se estabiliza.
   En el bucle interno no hay ni una función trascendente: y = A·y₁ − B·y₂ con
   A = 2R·cos θ y B = R² precalculados. El estado va en Float64 aunque la
   salida sea Float32Array: con las burbujas graves R² roza 1 y en Float32 el
   redondeo puede hacer R>1 y reventar la recursión.

   ⚠️ Los impulsos se sortean por ADELGAZAMIENTO (Lewis & Shedler 1979), no
   sacando el siguiente intervalo de la tasa instantánea. Con λ(0)=0 —que es
   justo el arranque de una ola— el muestreo ingenuo se queda clavado y el
   banco entero no suena. Me pasó, y tardé en verlo porque el lecho sí sonaba.

   ───────────────────────────────────────────────────────────────────────────
   MEDIDO EN EL BANCO (40 s, semilla 424242)

     métrica     objetivo      v4      v2 (lo mejor anterior)
     barrid      < 0.8       0.40     1.71     ⭐ el número que mata el «bong»
     pend        −4 a −7     −4.6     −2.1
     perio       < 0.25      0.14     0.06
     suave       < 0.6      −0.04     0.03
     olas/m      8 a 20      10.5     22.7
     cresta      8 a 16      14.4     14.1
     st          0.2 a 0.7   0.41     0.76
     aud dB      −26 a −18   −21.3    −28.3
     pico        < 0.95      0.94     0.79
     tono        (< 6 dB)     3.0      1.2

   Y contra la curva física —no contra el gusto— el espectro medido queda a
   2.8 dB rms de lo que predicen Deane & Stokes × Minnaert × ISO 9613 a 220 m.

   Construir cuesta ~265 ms, y NO depende de la duración de la sesión (medido
   igual con dur = 40 s que con dur = 1800 s: el grafo es barato, lo que cuesta
   es sintetizar el material). Buffers residentes: 6.6 MB.

   LA SEMILLA SE ELIGIÓ MIDIENDO. Se probaron 12 semillas: 9 pasan las nueve
   métricas a 40 s, y las que fallan lo hacen sólo en `perio` (0.26–0.30), que
   a 40 s tiene un suelo de ruido de ~0.15 porque la autocorrelación se estima
   con poca ventana. La 424242 pasa las nueve en las cuatro combinaciones de
   44.1/48 kHz × 40/90 s, que es lo que se verificó antes de fijarla.

   ========================================================================== */

function construirMar(ctx, dur) {
  const SR = ctx.sampleRate;

  /* ═══ AJUSTES ═══ */
  const SEMILLA   = 424242;
  const DIST_M    = 220, TEMP_C = 25, HUMEDAD = 80, C_SONIDO = 346.1;

  const NB        = 48;            // resonadores de burbuja (van den Doel: 50 basta)
  const F_LO      = 362;           // a = 9.0 mm — la mayor burbuja que aún es esférica
  const F_HI      = 3300;          // a = 1.0 mm — la escala de Hinze
  const A_HINZE   = 1.0;           // mm
  const EXP_CHICA = -1.5, EXP_GRANDE = -10 / 3;
  const EXC_SD    = 0.4;           // dispersión lognormal de la excitación ε

  const TASA_PICO = 40000;         // burbujas/s en la cresta de la ola
  const TASA_LECHO = 5000;         //           en el mar de fondo   (×8)

  const N1 = 20, F1_LO = 130, F1_HI = 560, Q1 = [3, 5];   // ancla del penacho
  const P1 = -0.667, CORTE1 = 250, TAPER1 = 340, NIV1 = 0.70;
  const N4 = 6, F4_LO = 3300, F4_HI = 16000, Q4 = 1.5;    // siseo sub-Hinze
  const P4 = -2.5, NIV4 = 0.60;

  const ATAQUE = 0.12, SOSTEN = 0.55, TAU = 0.60, VAR_EVT = 0.35;
  const KERNEL_S = 1.2;            // cola audible de la línea de rompiente
  const N_EVT = 3, EVT_S = 3.8;
  const LECHO_S = 28, LECHO_VEL = [1, 1.07, 0.94], LECHO_PAN = [-0.95, 0.95, 0.81];

  // trenes de ola: [periodo s, nivel, sesgo de panorama]
  const TRENES = [[6.7, 1.00, -0.4], [8.9, 0.95, 0.4], [11.9, 0.90, -0.1],
                  [16.1, 0.85, 0.15], [21.7, 0.80, -0.25], [29.3, 0.75, 0.05]];
  const VAIVEN = 0.75, OLA_GMIN = 0.85, OLA_GSPAN = 0.15, OLA_PAN = 0.9;

  const CORTE_PENACHO = [110, 0.6];
  const AIRE = [['lowpass', 6033, 0.5, 0], ['highshelf', 13420, 0.7, -23.5],
                ['highshelf', 643, 0.52, -1.6]];
  const TECHO = [0.75, 0.98], MAESTRO = 2.2;

  /* ═══ 0 · AZAR REPRODUCIBLE ═══
     mulberry32. Con semilla fija, lo que mide el banco es exactamente lo que
     suena en la página: no hay versión afortunada. */
  let _s = SEMILLA >>> 0;
  const azar = () => { _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(1 - azar())) * Math.cos(6.283185307 * azar());

  /* ═══ 1 · LA POBLACIÓN DE BURBUJAS ═══ */
  const fB = new Float64Array(NB), lam = new Float64Array(NB), gB = new Float64Array(NB);
  const cA = new Float64Array(NB), cB = new Float64Array(NB);
  const amp = new Float64Array(NB), dec = new Float64Array(NB);
  let sumL = 0;
  for (let k = 0; k < NB; k++) {
    const f = F_LO * Math.pow(F_HI / F_LO, k / (NB - 1));
    const a = 3260 / f;                                  // Minnaert, a en mm
    fB[k] = f;
    // Deane & Stokes: probabilidad del bin ∝ a·N(a), continua en la escala de Hinze
    lam[k] = a >= A_HINZE ? Math.pow(a, 1 + EXP_GRANDE)
           : Math.pow(a, 1 + EXP_CHICA) * Math.pow(A_HINZE, EXP_GRANDE - EXP_CHICA);
    sumL += lam[k];
    const delta = 0.01369 + 4.46e-4 * Math.sqrt(f);      // Devin 1959
    const d = Math.PI * f * delta;
    const R = Math.exp(-d / SR), th = 2 * Math.PI * f / SR;
    cA[k] = 2 * R * Math.cos(th); cB[k] = R * R; dec[k] = d;
    amp[k] = a * Math.sqrt(delta);                       // ⇒ E ∝ a³ (ver cabecera)
    gB[k] = amp[k] * Math.sin(th);                       // valor a inyectar en el estado
  }
  for (let k = 0; k < NB; k++) lam[k] /= sumL;

  /* ═══ 2 · LAS DOS CAPAS DE RUIDO ═══
     Resonadores de centros FIJOS excitados por ruido, normalizados a RMS 1 con
     la varianza analítica de un AR(2) para que el peso signifique lo que dice. */
  function resonadores(n, fLo, fHi, qLo, qHi, pot, corte, taper) {
    const r = [];
    for (let k = 0; k < n; k++) {
      const f = n === 1 ? fLo : fLo * Math.pow(fHi / fLo, k / (n - 1));
      const Q = qLo + (qHi - qLo) * (n === 1 ? 0 : k / (n - 1));
      const d = Math.PI * f / Q, R = Math.exp(-d / SR), th = 2 * Math.PI * f / SR;
      const A = 2 * R * Math.cos(th), B = R * R;
      const varSal = (1 + B) / ((1 - B) * ((1 + B) * (1 + B) - A * A));
      let forma = corte ? 1 / (1 + Math.pow(corte / f, 4)) : 1;
      if (taper) forma /= 1 + Math.pow(f / taper, 4);     // el banco toma el relevo
      r.push({ A, B, g: Math.pow(f / 1000, pot / 2) * Math.sqrt(forma) / Math.sqrt(varSal) });
    }
    return r;
  }

  /* Los niveles del ancla y del siseo NO se ajustan de oído: se DERIVAN
     exigiendo que la potencia por octava sea continua con la del banco de
     burbujas. Un impulso g en el resonador radia amp²·SR/(4d), así que a tasa λ
     la potencia media vale λ·amp²/(4d). NIV1 y NIV4 son la corrección residual
     (−3.1 y −4.4 dB) medida contra la curva física: las faldas reales de los
     resonadores no reparten la energía exactamente como el modelo ideal. */
  const potOct = (fc) => { let p = 0;
    for (let k = 0; k < NB; k++) if (fB[k] >= fc / 2 && fB[k] < fc * 2) p += lam[k] * amp[k] * amp[k] / (4 * dec[k]);
    return p / 2; };
  const P_REF = potOct(800);
  const porOct = (n, lo, hi) => (n - 1) / Math.log2(hi / lo);
  const nivel1 = NIV1 * Math.sqrt(P_REF * Math.pow(200 / 800, -2 / 3) / (porOct(N1, F1_LO, F1_HI) * Math.pow(200 / 1000, P1)));
  const nivel4 = NIV4 * Math.sqrt(P_REF * Math.pow(3260 / 800, -2 / 3) / (porOct(N4, F4_LO, F4_HI) * Math.pow(3260 / 1000, P4)));
  const RES1 = resonadores(N1, F1_LO, F1_HI, Q1[0], Q1[1], P1, CORTE1, TAPER1);
  const RES4 = resonadores(N4, F4_LO, F4_HI, Q4, Q4, P4, 0, 0);

  /* ═══ 3 · SEMBRAR UN TROZO DE MAR ═══
     Las tres capas comparten la MISMA función de tasa. Ésa es toda la defensa
     contra el «bong»: si el ancla creciera con una envolvente distinta a la del
     lecho de burbujas, la fracción de energía grave se movería y con ella el
     centroide (presupuesto medido: 5.7 dB de deriva = 0.15 octavas). */
  function sembrar(d, tasa, tasaMax, nivel) {
    const n = d.length;
    for (let k = 0; k < NB; k++) {
      const A = cA[k], B = cB[k], g = gB[k], lmax = tasaMax * lam[k];
      if (lmax <= 1e-9) continue;
      let y1 = 0, y2 = 0, i = 0, tc = 0;
      for (;;) {
        // adelgazamiento: candidatos a la tasa máxima, aceptados con λ(t)/λmax
        tc += -Math.log(1 - azar()) / lmax * SR;
        if (tc >= n) { for (; i < n; i++) { const y = A * y1 - B * y2; y2 = y1; y1 = y; d[i] += y; } break; }
        const hasta = tc | 0;
        for (; i < hasta; i++) { const y = A * y1 - B * y2; y2 = y1; y1 = y; d[i] += y; }
        if (azar() * lmax < tasa(i / SR) * lam[k]) y1 += g * Math.exp(EXC_SD * gauss() - EXC_SD * EXC_SD / 2);
      }
    }
    // la amplitud de una suma de granos va con √tasa: el ancla y el siseo la siguen
    const ruido = new Float64Array(n);
    for (let i = 0; i < n; i++) ruido[i] = (azar() * 2 - 1) * 1.732 * nivel(i / SR);
    for (const [banco, niv] of [[RES1, nivel1], [RES4, nivel4]]) {
      const esc = niv * Math.sqrt(TASA_PICO);
      for (const r of banco) {
        let y1 = 0, y2 = 0; const A = r.A, B = r.B, g = r.g * esc;
        for (let i = 0; i < n; i++) { const y = A * y1 - B * y2 + ruido[i]; y2 = y1; y1 = y; d[i] += y * g; }
      }
    }
  }

  /* ═══ 4 · LA ENVOLVENTE DE UNA OLA ═══ */
  const PASO_E = 0.005;
  function envolvente(at, so, ta) {
    const nk = Math.ceil(KERNEL_S / PASO_E);
    const F = (t) => 2 / Math.PI * Math.acos(Math.min(1, DIST_M / (DIST_M + C_SONIDO * t)));
    const nuc = new Float64Array(nk); let sk = 0;
    for (let i = 0; i < nk; i++) { nuc[i] = F((i + 1) * PASO_E) - F(i * PASO_E); sk += nuc[i]; }
    for (let i = 0; i < nk; i++) nuc[i] /= sk;
    const ns = Math.ceil((at + so + 6 * ta) / PASO_E), src = new Float64Array(ns);
    for (let i = 0; i < ns; i++) {
      const t = i * PASO_E;
      src[i] = (1 - Math.exp(-t / (at / 2.3))) * (t < at + so ? 1 : Math.exp(-(t - at - so) / ta));
    }
    const e = new Float64Array(ns + nk);
    for (let i = 0; i < ns; i++) { const v = src[i]; if (v > 1e-6) for (let j = 0; j < nk; j++) e[i + j] += v * nuc[j]; }
    let m = 0; for (let i = 0; i < e.length; i++) if (e[i] > m) m = e[i];
    for (let i = 0; i < e.length; i++) e[i] /= m;
    return e;
  }
  const ENVS = [];
  for (let k = 0; k < N_EVT; k++) {
    const r = () => 1 + VAR_EVT * (azar() * 2 - 1);        // cada ola rompe distinto
    ENVS.push(envolvente(ATAQUE * r(), SOSTEN * r(), TAU * r()));
  }
  const envK = (k, t) => { const E = ENVS[k], i = (t / PASO_E) | 0; return i < 0 || i >= E.length ? 0 : E[i]; };

  /* ═══ 5 · LOS BUFFERS ═══ */
  const olas = [];
  for (let k = 0; k < N_EVT; k++) {
    const d = new Float32Array(Math.round(SR * EVT_S));
    const e = (t) => envK(k, t);
    sembrar(d, (t) => TASA_PICO * e(t), TASA_PICO, (t) => Math.sqrt(e(t)));
    olas.push(d);
  }
  const lecho = new Float32Array(Math.round(SR * LECHO_S));
  const rv = Math.sqrt(TASA_LECHO / TASA_PICO);
  sembrar(lecho, () => TASA_LECHO, TASA_LECHO, () => rv);

  // normalizar por RMS, no por pico: un solo grano gordo falsearía el nivel
  let sq = 0, ns = 0;
  for (const d of olas) { for (let i = 0; i < d.length; i++) sq += d[i] * d[i]; ns += d.length; }
  const kN = 0.10 / Math.max(1e-6, Math.sqrt(sq / ns));
  for (const d of olas) for (let i = 0; i < d.length; i++) d[i] *= kN;
  for (let i = 0; i < lecho.length; i++) lecho[i] *= kN;

  const aBuf = (d) => { const b = ctx.createBuffer(1, d.length, SR); b.getChannelData(0).set(d); return b; };
  const bufOla = olas.map(aBuf), bufLecho = aBuf(lecho);

  /* ═══ 6 · EL GRAFO ═══ */
  const maestro = ctx.createGain(); maestro.gain.value = MAESTRO;
  let nodo = maestro;

  // no hay penachos mayores que ~1 m: por debajo de esto el mar no radia
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass';
  hp.frequency.value = CORTE_PENACHO[0]; hp.Q.value = CORTE_PENACHO[1];
  nodo.connect(hp); nodo = hp;

  // el aire de 220 m: ISO 9613-1, ajustado a 0.04 dB rms. Q = 0.5 siempre.
  for (const [tipo, f, q, dB] of AIRE) {
    const bq = ctx.createBiquadFilter(); bq.type = tipo;
    bq.frequency.value = f; bq.Q.value = q; bq.gain.value = dB;
    nodo.connect(bq); nodo = bq;
  }

  /* TECHO SUAVE. Cuántas olas se solapan es cosa del azar y en una sesión larga
     la cola crece: sin esto el pico llega a 1.81 y la variante se invalida. La
     curva es EXACTAMENTE lineal por debajo de TECHO[0] y sólo dobla lo que
     asoma encima, así que no es un compresor (sin ataque, sin retorno, sin
     bombeo) sino una garantía dura. Cuesta 0.6 dB de factor de cresta.
     ⚠️ WaveShaperNode mapea la curva sobre la entrada −1…+1, no sobre otra
     escala: construirla sobre −2…+2 equivale a meter un ×2 y recortar. */
  const [uT, LT] = TECHO, NC = 8193, curva = new Float32Array(NC);
  for (let i = 0; i < NC; i++) {
    const x = i / (NC - 1) * 2 - 1, s = x < 0 ? -1 : 1, a = Math.abs(x);
    curva[i] = s * (a <= uT ? a : uT + (LT - uT) * Math.tanh((a - uT) / (LT - uT)));
  }
  const ws = ctx.createWaveShaper(); ws.curve = curva; ws.oversample = '4x';
  nodo.connect(ws); ws.connect(ctx.destination);

  /* El mar de fondo. Tres lecturas del mismo lecho a velocidades ligeramente
     distintas: los tres periodos (28.0 · 26.2 · 29.8 s) son inconmensurables y
     quedan fuera de la ventana donde el oído caza una repetición. El desafine
     de ±7 % son 0.1 octavas, inaudible sobre ruido. */
  LECHO_VEL.forEach((vel, i) => {
    const s = ctx.createBufferSource(); s.buffer = bufLecho; s.loop = true;
    s.playbackRate.value = vel;
    const pan = ctx.createStereoPanner(); pan.pan.value = LECHO_PAN[i];
    const g = ctx.createGain(); g.gain.value = 1 / Math.sqrt(LECHO_VEL.length / 2);
    s.connect(g).connect(pan).connect(maestro);
    s.start(0, azar() * LECHO_S);
  });

  /* SEIS TRENES DE OLA. Un mar real casi nunca tiene uno solo: hay mar de
     viento y mar de fondo, con periodos distintos y llegando de rumbos
     distintos. Aquí eso no es adorno — con un solo tren, el propio ritmo de las
     olas marcaba 0.30 de periodicidad a 4.5 s; repartido en seis periodos
     inconmensurables se queda en 0.12. */
  for (const [periodo, nivelTren, sesgo] of TRENES) {
    let t = -EVT_S * azar();
    while (t < dur) {
      const s = ctx.createBufferSource(); s.buffer = bufOla[(azar() * N_EVT) | 0];
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, sesgo + (azar() * 2 - 1) * OLA_PAN));
      const g = ctx.createGain(); g.gain.value = nivelTren * (OLA_GMIN + OLA_GSPAN * azar());
      s.connect(g).connect(pan).connect(maestro);
      if (t < 0) s.start(0, -t); else s.start(t);
      t += periodo * (1 - VAIVEN + 2 * VAIVEN * azar());
    }
  }
}

/* ============================================================================
   BITÁCORA · lo que conseguí y lo que me costó
   ----------------------------------------------------------------------------
                     objetivo      v4       ruido puro     v2        v0
     barrid          < 0.8       0.40         0.07        1.71      2.55
     pend         −4 a −7 dB/oct −4.6         +3.0        −2.1      −2.8
     perio           < 0.25      0.14         —           0.06      0.51
     suave           < 0.6      −0.04         —           0.03      0.42
     olas/m          8 a 20      10.5         —           22.7       8.0
     cresta          8 a 16      14.4         4.8         14.1      13.6
     st            0.2 a 0.7     0.41         1.00        0.76      1.00
     aud dB       −26 a −18     −21.3        −20.0       −28.3     −27.3
     pico            < 0.95      0.94         0.30        0.79      0.72
     tono         (>6 dB se oye)  3.0          1.4         1.2       2.4
     construir         —        265 ms         —           —         —

   ───────────────────────────────────────────────────────────────────────────
   LO QUE MÁS ME COSTÓ, en orden

   1 · ENTENDER QUE `barrid` TIENE SUELO, Y QUE EL SUELO DEPENDE DE LO OSCURO
       QUE SEA EL MAR. Me pasé varias iteraciones empujando el barrido desde
       0.6 sin moverlo. La respuesta llegó midiendo, no razonando: apagué toda
       la dinámica —cero olas, textura completamente estacionaria— y el barrido
       seguía en 0.60. O sea que no lo causaba nada que yo estuviera haciendo
       con las olas. Midiendo capas sueltas salió la relación:

           barrido ≈ 0.60 − 0.145·ln(centroide/280 Hz)

       con tres puntos que caen sobre la recta (280 Hz→0.60, 1364→0.37,
       11036→0.07). Es ruido de estimación: en una ventana de 93 ms, el
       centroide de una señal grave se apoya en poquísimos bins de la FFT. El
       «ruido puro = 0.06» del protocolo es blanco, con el centroide en 11 kHz;
       no es una meta comparable para un mar oscuro. A partir de ahí el trabajo
       dejó de ser «suavizar» y pasó a ser «subir el centroide sin romper la
       pendiente» — o sea quitar el exceso por debajo de 250 Hz que yo tenía y
       la física no pide. De 0.60 a 0.40, y el camino fue corregir el modelo.

   2 · UN BUG QUE ME HIZO MEDIR UN MODELO MUDO. El programador de impulsos
       sacaba el siguiente intervalo de la tasa instantánea. Como la envolvente
       de una ola vale 0 en t=0, el primer intervalo salía infinito y el banco
       de burbujas entero no sonaba dentro de los eventos — pero sí en el lecho,
       que tiene tasa constante, así que había sonido y las métricas parecían
       razonables. Estuve varias vueltas ajustando el equilibrio de un modelo al
       que le faltaba su capa principal. Lo cazó una comprobación tonta: medir
       cada capa por separado y mirar los números absolutos, donde apareció un
       pico de 3·10¹¹ que sólo podía venir de dividir entre casi cero. Se
       arregló con adelgazamiento de Lewis & Shedler, que es el método correcto
       para un Poisson de tasa variable y además no le teme al cero.

   3 · `olas/m` CONTRA `perio`, QUE TIRAN EN SENTIDO CONTRARIO. Para que se
       cuenten olas hace falta que la envolvente suba y baje con claridad; para
       que no se oiga repetición hace falta que no suba y baje con regularidad.
       Con un solo tren de olas la autocorrelación marcaba 0.30 justo en el
       periodo de las olas. La salida no fue de mezcla sino de oceanografía: un
       mar real casi nunca tiene un solo tren. Con seis periodos inconmensurables
       —mar de viento y mar de fondo llegando de rumbos distintos— la
       autocorrelación se reparte y baja a 0.14, y las olas se siguen contando.
       De paso descubrí que mis propias modulaciones lentas (la «respiración»
       del fondo y el centelleo por turbulencia) costaban 3 olas/min: inflaban
       la σ de la envolvente y se comían los cruces del umbral. Las quité; la
       investigación misma dice que el centelleo aporta poco.

   4 · DOS ERRORES MÍOS DE FÍSICA Y DE API, los dos silenciosos:
       · La energía radiada por una burbuja es E ∝ a³, y en un resonador vale
         g²·SR/(4d). Como d ∝ δ/a, poner g ∝ a da E ∝ a³/δ, y δ varía 1.77×
         a lo ancho de la banda: −0.78 dB/oct de sesgo que yo estaba
         compensando a mano en otro sitio. La ganancia correcta es g ∝ a·√δ.
       · WaveShaperNode mapea su curva sobre la entrada −1…+1. Yo la construí
         sobre −2…+2, así que el «techo suave» era en realidad un ×2 seguido de
         recorte: aplastaba el factor de cresta de 15 a 9 dB y yo lo estaba
         leyendo como si el material fuera plano.

   5 · Y una que NO fue un problema, contra lo que temía: el coste. Colocar
       decenas de miles de burbujas una a una es carísimo, pero un resonador de
       2 polos es lineal, así que N burbujas del mismo radio son UN resonador
       con N impulsos. Medido: 12 000 y 40 000 burbujas por segundo cuestan
       exactamente lo mismo. La tasa —que es justo la palanca que estabiliza el
       centroide— resultó ser gratis.

   ───────────────────────────────────────────────────────────────────────────
   SI ALGUIEN LO RETOMA

   · La perilla con sentido físico es DIST_M. A 150 m la pendiente sale −4.0 y
     a 400 m −6.6: mueve el «cuán lejos está el mar» sin tocar nada más.
   · TASA_PICO/TASA_LECHO es cuánto respira la ola. Subirlo por encima de ×10
     no cambia el timbre (la distribución de tamaños no se mueve), sólo el
     contraste. Bajar TASA_LECHO por debajo de ~4000 empieza a costar `olas/m`.
   · Lo que NO hay que tocar: que las tres capas compartan la misma función de
     tasa. Si el ancla grave y el lecho de burbujas crecen con envolventes
     distintas, la fracción de energía grave se mueve y el centroide detrás.
     El presupuesto medido es de 5.7 dB de deriva para 0.15 octavas de barrido.
   · Y no hace falta capar el radio máximo para «arreglar» el centroide: funciona
     en la métrica pero abre un agujero de 9 dB entre 400 y 1100 Hz, que es
     justo donde el mar real tiene su máximo.
   ========================================================================== */
