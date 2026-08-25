/* ============================================================================
   v3 · EL MAR LEJANO
   ----------------------------------------------------------------------------
   El mar que se oye desde la terraza, a cien metros del agua. No el de la
   orilla: éste ya llegó gastado por el aire, sin golpes, con las olas fundidas
   unas con otras en una sola respiración.

   LA REGLA QUE ORDENA TODO — y que es la lección del PROTOCOLO llevada hasta
   el final:

       UNA sola cama de ruido con UN solo espectro.
       Las olas son ganancia de banda ancha sobre ella. Nada más.

   Ni una banda con envolvente propia, ni una capa de espuma que suba en la
   cresta, ni un filtro cuya frecuencia se mueva. Ninguna de las tres. El
   centroide espectral es invariante de escala, así que multiplicar por una
   ganancia —por brusca que sea— no puede mover `barrid` ni un centésimo. En
   cuanto DOS partes del sonido con color distinto suben y bajan por separado,
   el centro tímbrico pasea y vuelve el «bong». Eso fue v0 (2.55 oct) y también
   v1 (2.37 oct, con los filtros ya quietos).

   Aquí no hay ninguna excepción a la regla, y por eso `barrid` mide 0.50.

   POR QUÉ ES OSCURO, CON EL NÚMERO DE CADA COSA
   ---------------------------------------------
   A 29 °C y 80 % de humedad (Veracruz), integrando ISO 9613-1 sobre una fuente
   LINEAL —una rompiente es una línea de costa, no un punto, y los tramos
   oblicuos recorren más aire, lo que multiplica la absorción por 1.5-3.3×—,
   lo que el aire se come en cien metros es:

       250 Hz  0.25 dB      2 kHz  2.48 dB      8 kHz   8.41 dB
         1 kHz 1.56 dB      4 kHz  3.97 dB     16 kHz  22.92 dB

   O sea: el grave llega entero y el brillo no. Pero ojo, porque hay dos
   creencias falsas que costaron caro y conviene dejar escritas:

   · El aire NO es lo que más oscurece a 100 m. La fuente misma ya cae de −5.9
     a −6.7 dB/oct por encima de 2 kHz (Tollefsen & Byrne). El aire solo añade.
   · El suelo NO oscurece: un camino de playa (agua y arena mojada) es
     acústicamente duro y da refuerzo especular, +1.65 dB de 1 k a 8 k
     RELATIVO a 250 Hz. Modelarlo como pérdida es el error más común.

   Y una advertencia, porque el encargo la sugería: **las curvas de Wenz aquí
   no valen.** Son ruido SUBMARINO. La interfaz se traga 30 dB y lo poco que
   cruza sale dentro del cono de Snell de 13.2° respecto a la vertical — una
   terraza está a 80-90°, fuera del cono. Encima el mecanismo aéreo es otro
   (cilindro de aire atrapado, pico 50-100 Hz) y no el submarino (Minnaert de
   burbuja, 300-800 Hz): casi una década de error en el pico. No se usaron.

   LA FORMA DEL ESPECTRO NO ES UNA RECTA, Y ESO ES LO QUE SALVA EL «barrid»
   -----------------------------------------------------------------------
   Éste fue el hallazgo que desatascó la pieza. Medido, todo a la MISMA
   pendiente ajustada de −5.6 dB/oct:

       ley de potencias pura, sin rodilla, sin corte grave  →  barrid 1.04  ⛔
       ruido marrón                                         →  barrid 1.34  ⛔
       perfil físico CON RODILLA + corte grave              →  barrid 0.40  ✅

   El centroide lo explica: con una recta en log-log la energía se apelmaza en
   los primeros bines de la FFT, el centroide se va a 32 Hz y ahí su estimación
   brinca sola, sin que nada barra. Con la rodilla se queda en ~500 Hz y se
   estabiliza. Regla de un vistazo: **si el centroide baja de 150 Hz, `barrid`
   va a fallar.** El de esta variante está en 486 Hz.

   Así que el espectro es una MESETA plana de 78 Hz a ~700 Hz y una rodilla que
   se acelera después, que es exactamente lo que mide un mar de verdad:

       banda     31.5   63   125   250   500    1k    2k    4k    8k
       dB re 250  −20   −4   +0.4   0   −0.7  −3.6  −8.4  −16.6  −28.7

   LAS OLAS: 1.99 dB, NI UNO MÁS
   -----------------------------
   El número más delicado de la pieza, y el más contraintuitivo. Una ola
   rompiendo sube el nivel 6-12 dB si estás a veinte metros (Dallas &
   Tollefsen, 13 roturas medidas). A cien metros no queda casi nada de eso: un
   Monte Carlo validado contra esa medición da L10−L90 = 1.7 dB con rompiente
   disipativa de 100 m, 2.4 dB con una de 30 m. La zona veracruzana (pendiente
   1:40-1:60, Hb 0.5-1 m) mide 25-80 m → **2.0-2.4 dB**. Esta variante mide
   1.99 dB. Si respira más, no suena a un mar más vivo: suena a un mar más
   cerca, que es justo lo contrario del encargo.

   Y la envolvente no es un tren de pulsos: es un proceso GAUSSIANO DE BANDA
   ESTRECHA centrado en la frecuencia de la ola. Eso es literalmente lo que la
   oceanografía llama «groupiness» (Longuet-Higgins), y tiene una ventaja
   decisiva sobre los pulsos: su espectro se PRESCRIBE en vez de emerger de una
   muestra de siete eventos por ventana. Con pulsos, `olas/m` saltaba de 3 a 25
   entre semillas del mismo código; con esto, de 9 a 16.

   El periodo, 5.2 s, sale de la boya NDBC 42055 (Bahía de Campeche, la más
   cercana, año 2024 completo, n=17 528): APD mediana 4.8 s, DPD mediana 6.2 s.
   El Golfo es mar de viento; **no existe aquí el swell largo de 15 s del
   Pacífico**, y modelarlo con periodos de 15-25 s habría sido un error de
   lugar, no solo de métrica.

   POR QUÉ 19 VOCES Y UNA SOLA ENVOLVENTE
   --------------------------------------
   Otra cosa que tuve que desaprender. Empecé con 21 voces y 21 envolventes
   independientes, buscando que las olas «dejaran de contarse». Se cuentan
   menos, sí — pero el promediado se lleva por delante el ritmo, y lo que queda
   decidiendo `olas/m` son los restos lentos, distintos en cada render (de ahí
   el salto 3→25). El número de voces y el número de envolventes son cosas
   distintas: **la difusión espacial la da el ruido descorrelacionado; el ritmo
   lo da la envolvente.** Así que 19 fuentes de ruido independientes —para que
   envuelva— y UNA envolvente para todas, con un rezago por voz de hasta 1.5 s
   ligado a su posición estéreo: la rotura barre el arco de costa de izquierda
   a derecha, que es lo que hace una ola que entra en diagonal.

   EL SUBIDÓN QUE NO ESTÁ: por qué el ataque dura casi un segundo
   -------------------------------------------------------------
   Un golpe de ola a 100 m no se difumina por el vuelo del sonido (292 ms, el
   10 % de la firma: despreciable). Se difumina porque **la ola cruza la zona
   de rompiente a c=√(gh) = 1.7-4.4 m/s contra los 343 m/s del sonido: factor
   114×**. Una zona de 25-80 m son 8 a 27 segundos de tránsito, con 2 a 5
   frentes radiando a la vez, siempre. El golpe llega emborronado desde la
   hidrodinámica, no desde la acústica.

   LO QUE SE PROBÓ Y SE DESCARTÓ, CON LA MEDIDA QUE LO DESCARTÓ
   -----------------------------------------------------------
   El encargo sugería difusión por retardos cortos entre canales. Se midió y no
   se usa, porque falla dos veces: colorea (toda relación determinista entre L
   y R deja rizado de peine — un retardo de 12 ms asoma +6.5 dB de tono, un
   convolver con IR aleatoria +10 dB, velvet noise +13 dB) y encima da `st`≈0,
   no el 0.2-0.7 que se pide. La descorrelación aquí sale de tener 19 ruidos
   genuinamente independientes repartidos en panorámica: `st` = 0.51, clavado
   en las 20 semillas, y coloración exactamente cero porque panear un mono es
   multiplicar por un escalar.

   El bucle se esconde con longitudes INCONMENSURABLES, nunca con una larga:
   tres buffers de 11.317 / 15.731 / 21.139 s y una velocidad de lectura
   distinta por voz (0.88-1.14×) dan 19 periodos efectivos entre 9.9 y 24 s que
   no vuelven a coincidir. El ruido rosa es invariante de escala, así que
   cambiarle la velocidad no le cambia el color: sale gratis.

   COSTE
   -----
   8.5 MB de buffers, ~95 nodos, y toda la modulación va a tasa de audio con
   buffers diminutos leídos a playbackRate ínfimo — cero eventos de
   automatización, y por tanto suena indefinidamente sin volver a programar
   nada. El parámetro `dur` no se usa: esto no se acaba.
   ========================================================================== */

function construirMar(ctx, dur) {
  const SR = ctx.sampleRate;

  /* ── el color · fijo para siempre ─────────────────────────────────────── */
  const FCORTE   = 78;      // Hz · faldón de 12 dB/oct por debajo
  const RODILLA  = 707;     // Hz · primer peldaño de la caída
  const PELDANOS = [3.1, 4.8, 8.2, 12.3, 18.7];   // dB por escalón de octava
  const MAESTRO  = 1.9783;    // medido: deja el pico en ~0.80

  /* ── la costa ─────────────────────────────────────────────────────────── */
  const NVOCES   = 19;      // sectores de costa, ruido independiente cada uno
  const LARGOS   = [11.317, 15.731, 21.139];   // s · longitudes inconmensurables
  const ESTABLE  = 2.0;     // s · ventana con que se aplana la deriva 1/f

  /* ── la ola ───────────────────────────────────────────────────────────── */
  const T0       = 5.2;     // s · periodo, entre el APD y el DPD del Golfo
  const ANCHO_A  = 0.40;    // borde agudo de la banda, en periodos de ola
  const ANCHO_B  = 1.10;    // borde grave
  const AMPJIT   = 0.45;    // dispersión relativa del tamaño de ola
  const APLANA   = 2;     // iguala la altura de los crestones (función IMPAR)
  const PROF     = 0.28;    // profundidad · deja L10−L90 en 1.99 dB
  const PEEL     = 1.5;     // s que tarda la rotura en barrer el arco audible
  const TREN_T   = 293.0;   // s · periodo del proceso de oleaje

  /* ── el viento ────────────────────────────────────────────────────────── */
  const VIENTO_dB  = 0.5;   // L10−L90. Más de ~¼ de la ola y `olas/m` se hunde
  const VIENTO_T   = 407;   // s
  const VIENTO_TAU = 12;    // s de correlación

  const NE = 8192;          // muestras de cada buffer de modulación

  /* ── ruido rosa (Kellett): la meseta sale plana por construcción ──────── */
  const ruidos = LARGOS.map((seg) => {
    const n = Math.round(SR * seg);
    const b = ctx.createBuffer(1, n, SR);
    const d = b.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759; b2=0.96900*b2+w*0.1538520;
      b3=0.86650*b3+w*0.3104856; b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
      d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6=w*0.115926;
    }
    /* El ruido rosa arrastra una deriva 1/f de AMPLITUD que una rompiente real
       no tiene (es estacionaria en la escala del minuto) y que, al repetirse
       con el bucle, mete potencia de envolvente por debajo de 0.05 Hz distinta
       en cada render — se medía en el 44-82 % del total, y era lo que hacía
       que `olas/m` cayera a 3 en unas semillas y subiera a 25 en otras. Se
       aplana dividiendo el ruido por su propia envolvente suavizada: el
       espectro ni se entera (el divisor va por debajo de 0.5 Hz) y la cama
       queda quieta. Que es lo que se busca: lo único que sube y baja debe ser
       la ola. */
    if (ESTABLE > 0) {
      const W = Math.max(64, Math.round(ESTABLE * SR));
      const env = new Float32Array(n);
      let acc = 0, med = 0;
      for (let i = -W; i < 0; i++) acc += Math.abs(d[((i % n) + n) % n]);
      for (let i = 0; i < n; i++) {
        acc += Math.abs(d[i]) - Math.abs(d[(((i - W) % n) + n) % n]);
        env[i] = acc / W; med += env[i];
      }
      med /= n;
      for (let i = 0; i < n; i++) d[i] *= med / (env[i] + 1e-9);
    }
    return b;
  });

  /* ── un buffer de modulación leído lentísimo ──────────────────────────
     Toda la modulación va así: un buffer diminuto a playbackRate ínfimo,
     conectado a un AudioParam. Chrome interpola lineal y limpio hasta
     playbackRate 0.0006 (comprobado). Cero eventos de automatización, cero
     escalones de zipper, y dura para siempre.                             */
  const lento = (buf, periodoS, retardoS) => {
    const s = ctx.createBufferSource();
    s.buffer = buf; s.loop = true;
    s.playbackRate.value = NE / (periodoS * SR);
    const off = (((retardoS || 0) % periodoS) + periodoS) % periodoS;
    s.start(0, off * NE / (periodoS * SR));
    return s;
  };

  /* paso-bajo de un polo, circular y de fase cero, para que el bucle cierre
     sin costura: tres vueltas hacia delante y tres hacia atrás.           */
  const pasoBajo = (x, tau, fs) => {
    const a = Math.exp(-1 / (tau * fs));
    const y = Float32Array.from(x);
    let z = 0;
    for (let v = 0; v < 3; v++) for (let i = 0; i < NE; i++) { z = a*z + (1-a)*y[i]; y[i] = z; }
    z = 0;
    for (let v = 0; v < 3; v++) for (let i = NE-1; i >= 0; i--) { z = a*z + (1-a)*y[i]; y[i] = z; }
    return y;
  };

  /* ── el oleaje ────────────────────────────────────────────────────────── */
  const tren = (() => {
    const b = ctx.createBuffer(1, NE, SR);
    const d = b.getChannelData(0);
    const fs = NE / TREN_T;
    const g = new Float32Array(NE);
    for (let i = 0; i < NE; i++) g[i] = (Math.random()+Math.random()+Math.random()-1.5) * 2;
    const alto = pasoBajo(g, T0 * ANCHO_A / (2 * Math.PI), fs);
    const bajo = pasoBajo(g, T0 * ANCHO_B / (2 * Math.PI), fs);
    let s2 = 0;
    for (let i = 0; i < NE; i++) { d[i] = alto[i] - bajo[i]; s2 += d[i]*d[i]; }
    const sd = Math.sqrt(s2 / NE) + 1e-12;
    /* Sin asimetría a propósito. Sesgar la envolvente exige elevarla al
       cuadrado, y el cuadrado de un proceso de banda estrecha inyecta
       potencia justo por debajo de la banda: con un sesgo de 0.35 pesaba
       tanto como el término lineal y hundía `olas/m` de 15 a 8. A cien metros
       la asimetría de la ola ya se la comió el tránsito por la rompiente, así
       que no se echa de menos. */
    let s1 = 0, s3 = 0;
    if (APLANA > 0.01) {
      const nrm = Math.tanh(APLANA);
      for (let i = 0; i < NE; i++) { d[i] = Math.tanh(APLANA * d[i] / sd) / nrm; s3 += d[i]*d[i]; }
      const sd2 = Math.sqrt(s3 / NE) + 1e-12;
      for (let i = 0; i < NE; i++) d[i] = Math.max(0, 1 + AMPJIT * d[i] / sd2);
    } else {
      for (let i = 0; i < NE; i++) d[i] = Math.max(0, 1 + AMPJIT * d[i] / sd);
    }
    for (let i = 0; i < NE; i++) s1 += d[i];
    const k = NE / (s1 + 1e-9);                    // media = 1
    for (let i = 0; i < NE; i++) d[i] *= k;
    return b;
  })();

  /* ── cadena FIJA de color · aquí no se mueve nada, nunca ──────────────── */
  const bus = ctx.createGain(); bus.gain.value = 1;
  let nodo = bus;
  { const f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = FCORTE; f.Q.value = 0.707;
    nodo = nodo.connect(f); }
  PELDANOS.forEach((g, i) => {
    const f = ctx.createBiquadFilter();
    f.type = 'highshelf';
    f.frequency.value = Math.min(RODILLA * Math.pow(2, i), SR * 0.45);
    f.gain.value = -g;
    nodo = nodo.connect(f);
  });

  const salida = ctx.createGain();
  salida.gain.value = 0;
  salida.gain.setValueAtTime(0, 0);
  salida.gain.linearRampToValueAtTime(MAESTRO, 2.5);   // que no entre de golpe
  nodo.connect(salida).connect(ctx.destination);

  /* ── el viento · ruido gaussiano paso-bajo, JAMÁS una sinusoide ─────────
     Un LFO senoidal a 0.05 Hz con 2 dB marca `perio` = 0.23 él solo: la
     autocorrelación de un seno vale ≈1 a retardos cortos y su periodo cae
     dentro de la ventana de búsqueda. Un proceso aleatorio no tiene ese pico.
     La profundidad, 0.5 dB, está una década por debajo de los 0.1 Hz que la
     curva de fluctuation strength considera «entrenante y perceptualmente
     casi invisible»: es respiración, no modulación.                        */
  if (VIENTO_dB > 0.01) {
    const vb = ctx.createBuffer(1, NE, SR);
    const d = vb.getChannelData(0);
    const a = Math.exp(-(VIENTO_T / NE) / VIENTO_TAU);
    let x = 0, s = 0, s2 = 0;
    for (let i = 0; i < NE; i++) { x = a*x + (1-a)*(Math.random()+Math.random()+Math.random()-1.5)*2; d[i] = x; }
    for (let i = 0; i < NE; i++) s += d[i];
    const m = s / NE;
    for (let i = 0; i < NE; i++) { d[i] -= m; s2 += d[i]*d[i]; }
    const sd = Math.sqrt(s2 / NE) + 1e-12;
    const rel = (Math.pow(10, VIENTO_dB / 20) - 1) / (2 * 1.2816);   // p10–p90 gaussiano
    for (let i = 0; i < NE; i++) d[i] *= rel / sd;
    const vg = ctx.createGain(); vg.gain.value = MAESTRO;
    lento(vb, VIENTO_T).connect(vg).connect(salida.gain);
  }

  /* ── los sectores de costa ────────────────────────────────────────────── */
  const NIVEL = 1 / Math.sqrt(NVOCES);
  for (let k = 0; k < NVOCES; k++) {
    const u = (k * 0.6180339887) % 1;                       // sucesión áurea
    const pan = (k % 7 === 0 ? 0.10 + 0.14*u : 0.45 + 0.54*u) * (k % 2 === 0 ? -1 : 1);

    const src = ctx.createBufferSource();
    src.buffer = ruidos[k % ruidos.length];
    src.loop = true;
    /* velocidad distinta por voz: el rosa es invariante de escala, así que no
       cambia de color, pero sí cambia la longitud efectiva del bucle */
    src.playbackRate.value = 0.88 + 0.26 * ((k * 0.7548776662) % 1);

    const g = ctx.createGain();
    g.gain.value = NIVEL * (1 - PROF);                      // el mar nunca calla
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    src.connect(g).connect(p).connect(bus);
    src.start(0, Math.random() * LARGOS[k % ruidos.length]);

    /* la MISMA envolvente para todos, con el rezago del barrido de la rotura */
    const eg = ctx.createGain(); eg.gain.value = NIVEL * PROF;
    lento(tren, TREN_T, (pan + 1) / 2 * PEEL).connect(eg).connect(g.gain);
  }
}
