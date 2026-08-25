# La acústica del mar, medida

> Workflow de 13 agentes con verificación adversarial (2026-08-24). Cada dato tuvo que sobrevivir
> a otro agente que intentaba refutarlo.
>
> ⭐ **Las recetas están al final.** Son la especificación del sintetizador.

## Los cinco números que cambiaron el diseño

1. **El periodo estaba mal por un factor de 3.** Se usaron periodos de 9-26 s, que son swell del
   Pacífico. La boya **NDBC 42055 (Bahía de Campeche, el mismo Golfo que Chachalacas)** mide
   **Tm02 = 3.64 s** con Hm0 < 0.8 m: son **16.5 olas/min**, no 7.
2. **El barrido del timbre era ~10× el techo físico.** La variación real entre olas por absorción
   atmosférica es de 0.4 dB a 1 kHz, 1.9 dB a 4 kHz y 5.5 dB a 8 kHz. Barrer 600→3800 Hz mueve el
   centroide 2.7 octavas, y un centroide que se desplaza de forma continua ES una altura para el oído.
3. **La espuma va RETRASADA 1.5-3.0 s respecto al pico de su ola.** Esa cola brillante desfasada es
   lo que hace que el oído diga «agua» y no «ruido filtrado».
4. **Un biquad lowpass es −12 dB/oct con pico resonante; el surf medido cae −9 dB/oct sin pico.**
   Hay que usar **un solo polo** (`IIRFilterNode`), no un biquad.
5. **La amplitud de cada ola sigue una Rayleigh, no un LFO.** Eso genera «sets» de olas grandes y
   pequeñas de forma natural, sin ninguna periodicidad que el oído pueda cazar.


## Hallazgos verificados

**MODELO DE BURBUJA DE VAN DEN DOEL (la fuente primaria que Farnell simplifica). Respuesta al impulso de una burbuja: ι(t) = a·sin(2πf·t)·e^(−d·t). Frecuencia por Minnaert: f = 3/r con r el radio EN METROS (r=1mm → 3000 Hz; r=3mm → 1000 Hz; r=10mm → 300 Hz). Amortiguamiento acoplado a la frecuencia: d = 0.043·f + 0.0014·f^(3/2) (d en s⁻¹). Subida de tono de la burbuja que emerge: f(t) = f₀·(1 + σ·t) con σ = ξ·d, y ξ ≈ 0.1 para gotas de agua.**

> ι(t) = a sin(2πft)e−dt, (1) ... f = 3/r, (2) with r the bubble radius in meters ... d = 0.043f + 0.0014f 3/2. (5) ... f(t) = f0(1 + σt) ... By writing σ = ξd, we take the effect of damping into account and ξ roughly parameterizes the audible rise. For sounds associated with drops a value of roughly ξ = 0.1 seems right.

*Cómo se aplica:* Esta es LA fórmula que pediste. Se implementa en un bucle JS que escribe un Float32Array (no con nodos de Web Audio: son miles por segundo). Cada burbuja son 3 líneas: f0 = 3/r; d = 0.043*f0 + 0.0014*Math.pow(f0,1.5); y muestra a muestra s += a*Math.sin(2*Math.PI*f0*(t + 0.5*xi*d*t*t))*Math.exp(-d*t).

<sub>confianza alta · https://www.cs.ubc.ca/~kvdoel/publications/tap05.pdf</sub>

**TABLA DERIVADA de las ecuaciones 2 y 5 (radio → frecuencia → amortiguamiento → duración audible τ=1/d). r=0.3mm→10000Hz, d=1830, τ=0.55ms · r=0.5mm→6000Hz, d=908, τ=1.1ms · r=1mm→3000Hz, d=359, τ=2.8ms · r=2mm→1500Hz, d=146, τ=6.9ms · r=3mm→1000Hz, d=87, τ=11.5ms · r=4mm→750Hz, d=61, τ=16.4ms · r=7mm→429Hz, d=31, τ=32ms · r=10mm→300Hz, d=20, τ=50ms. La subida de tono real con ξ=0.1 durante 3τ es de +10% a +30% (0.14–0.38 octavas), NO una octava.**

> The results suggest that bubbles with radii in the range 2 −7mm are most readily associated with the sound of a water drop.

*Cómo se aplica:* Rango útil para espuma de mar: radios de 0.2mm a 8mm → 375 Hz a 15 kHz, con duraciones de 0.5 a 40 ms. Es una tabla de granos: precalcula 50 tamaños log-distribuidos una sola vez.

<sub>confianza alta · https://www.cs.ubc.ca/~kvdoel/publications/tap05.pdf</sub>

**CUÁNTAS BURBUJAS POR SEGUNDO (el número que convierte granos en 'agua'). Hasta 1000/s = goteo o arroyo íntimo o lluvia ligera. Hasta 10000/s = denso pero aún se distinguen gotas. Hasta 100000/s = masa mezclada tipo lluvia fuerte o catarata; por encima de eso ya no cambia nada. Para espuma de mar lejano el punto está entre 2500 y 5000/s.**

> Bubble creation rates of up to 1000/s produce sounds ranging from dripping to intimate streaming or light rain. Rates up to 10000/s produce sounds which are quite dense but still allow some individual droplets to be heard. Rates up to 100000/s produce blended soundscapes where individual droplets are not heard except occasionally, such as heavy rain or waterfalls. Yet higher bubble creation rates produce no appreciable difference anymore.

*Cómo se aplica:* Tasa total Λ. Cada burbuja se dispara como proceso de Poisson: dt = -Math.log(Math.random())/lambda. Con Λ=3000/s y duración media 8ms hay ~24 burbujas sonando a la vez: trivial de prerenderizar en un buffer de 25 s.

<sub>confianza alta · https://www.cs.ubc.ca/~kvdoel/publications/tap05.pdf</sub>

**ESTADÍSTICA DE LA POBLACIÓN DE BURBUJAS. N=50 tamaños log-distribuidos entre rmin y rmax (rango total útil 0.2–50 mm). Amplitud a = D·r^α con α=1.5 predicho por la física. Factor de profundidad D = rnd^β con β=10 como mejor valor. Distribución de tasas ∝ 1/r^γ: γ de 0 a 3 suena a corriente/arroyo, γ ≥ 5 suena a LLUVIA. Quitar las burbujas más pequeñas (0.2 mm) siempre degrada el realismo. α más grande = sensación de LEJANÍA; α más chico = sensación de estar cerca del agua.**

> For distributions of the form 1/rγ (see Eq. 8) values from γ = 0 to γ = 3 produce sounds of streaming whereas values above approximately γ = 5 sound very much like rain. ... Removing the smallest bubbles from the population (.2mm) always reduces the quality of streaming and dripping sounds and seems to play an essential role. ... Smaller values of α, which inject more energy into smaller bubbles, create the illusion of moving close to the water, whereas larger values create a feeling of distance. ... A value of β =

*Cómo se aplica:* Para MAR LEJANO usa α ALTO (1.8–2.2 en vez de 1.5): eso mismo te da la lejanía sin necesidad de un lowpass extra. γ=2, β=10, rmin=0.2mm, rmax=8mm. Es literalmente la perilla de 'distancia' del paper.

<sub>confianza alta · https://www.cs.ubc.ca/~kvdoel/publications/tap05.pdf</sub>

**ADVERTENCIA DEL PAPER: si le pones subida de tono (ξ alto) a TODAS las burbujas en una textura densa, aparece un artefacto de FLANGING y deja de sonar realista. La solución del autor es el 'riseCutoff' ≈ 0.9: solo el ~10% de las burbujas (las más fuertes, las más superficiales) suben de tono.**

> The rise factor ξ improves the realism of sparse sounds somewhat for riseCutoffs of about 0.9. ... Denser sounds with a large ξ value produce a flanging artifact and do not sound realistic.

*Cómo se aplica:* En el generador de espuma: if (D > 0.9) xi = 0.1; else xi = 0. Evita que la capa granular suene a chorus/phaser, que es el otro modo clásico de 'suena a sintetizador'.

<sub>confianza alta · https://www.cs.ubc.ca/~kvdoel/publications/tap05.pdf</sub>

**POR QUÉ EL AGUA SUENA: el agua por sí sola casi no hace ruido; TODO el sonido del agua es aire atrapado en forma de burbujas. Las olas rompiendo son un caso explícito de este mecanismo.**

> It has been known for a long time [Bragg 1921] that water by itself hardly makes any sound at all. It is only when air is trapped by water in the form of bubbles that sounds are heard. ... Bubble formation is usually accompanied by an energy injection into the bubble at creation time. This can happen for example when a surface wave breaks and traps bubbles

*Cómo se aplica:* Éste es el diagnóstico de fondo del 'bong': ruido filtrado NO tiene el mecanismo físico del agua. Sin una capa granular de burbujas el oído no tiene ninguna pista de que eso es agua, y entonces solo oye el filtro. La capa granular no es adorno: es la firma.

<sub>confianza alta · https://www.cs.ubc.ca/~kvdoel/publications/tap05.pdf</sub>

**MODELO DE BURBUJA DE FARNELL, patch real del libro (bubblesound.pd). Oscilador: phasor~ → cos~ (seno puro). Envolvente de FRECUENCIA: expcurve~ 100 = una rampa 0→1 en 100 ms pasada por e^x, o sea multiplicador de frecuencia que va de 1.0 a 2.718 → la burbuja sube ×2.718 = +1.44 octavas en 100 ms. Envolvente de AMPLITUD: adenv~ 10 80 = ataque 10 ms, caída 80 ms, retrasada 3 ms respecto del disparo. Salida ×0.1 y hip~ 40 (paso-altos a 40 Hz). Frecuencias base usadas en el libro: 600 Hz para una burbuja sola; 240, 250, 260 y 270 Hz en la 'fábrica' de 4 voces, sumadas y ×0.25.**

> #X obj 0 46 expcurve~ 100;  #X obj 56 91 adenv~ 10 80;  #X obj 56 70 del 3;  #X obj 0 161 *~ 0.1;  #X obj 0 184 hip~ 40;

*Cómo se aplica:* Ésta es la versión 'caricatura' (sube 1.44 oct): perfecta para burbujas aisladas del río, EXCESIVA para espuma de mar. Para la espuma usa van den Doel (subida 10–30%). Total de la burbuja de Farnell: 90-100 ms.

<sub>confianza alta · http://web.archive.org/web/20241105004430/http://aspress.co.uk/sd/practical12.html</sub>

**FARNELL, texto verbatim del rango del agua: 3 kHz para una burbuja de 1 mm, y las burbujas son 'senoides que suben exponencialmente en el rango de 1–4 kHz'. Además: la burbuja está tan amortiguada que canta un seno casi perfecto (nada de armónicos).**

> experiments give us a value of 3kHz for a 1mm bubble. The bubble is actually strongly damped so it sings an almost perfect sinewave ... we need to make some exponentially rising sinewaves in the 1-4KHz range, fortunately we have PureData so the rest should be easy.

*Cómo se aplica:* Confirma Minnaert (3/r con r en metros) desde otra fuente. Usa OscillatorNode tipo 'sine' o Math.sin: nada de sawtooth ni triangle.

<sub>confianza alta · http://web.archive.org/web/2010id_/http://www.obiwannabe.co.uk/tutorials/html/tutorial_bubbles.html</sub>

**PATRÓN TEMPORAL ANTI-PERIODICIDAD DE FARNELL (bubblepattern.pd): un contador a metro 15 ms módulo 200 (ciclo de 3.0 s) y disparos SOLO en los índices PRIMOS 29, 37, 47, 67, 89, 113, 157, 197 → eventos a los 435, 555, 705, 1005, 1335, 1695, 2355 y 2955 ms. Encima, cada evento se descarta con probabilidad 50% (random 100 → moses 50). Su razón explícita: los humanos detectan periodicidad si escuchan lo suficiente; los primos crean la ilusión de una fuente no periódica.**

> They are small primes in a mildly diverging ascendency. Why? Well as humans we are very good at picking out patterns, we tend to notice any periodicity in a sequence if we listen to it long enough, but the primes create the illusion of a non-periodic source. That's not the same as a random source ... Removing one in every two events is sufficient for a realistic bubbling pattern, however we don't just want to remove each alternate event, we want to cull them randomly.

*Cómo se aplica:* Aplícalo a la longitud de los BUFFERS de ruido y a los playbackRate: si todas las voces usan buffers de la misma longitud, el bucle se oye. Longitudes primas (p.ej. 7.3 s, 11.1 s, 13.7 s) y descarte aleatorio de eventos.

<sub>confianza alta · http://web.archive.org/web/20241105004430/http://aspress.co.uk/sd/practical12.html</sub>

**CÓDIGO PÚBLICO QUE YA HACE 'OLAS Y ROMPIENTE' Y SUENA BIEN — SuperCollider, A. Broz 2020: 10 voces INDEPENDIENTES (wave!10), cada una con SU PROPIO ruido blanco a 0.04 + LFNoise1 a 0.3 Hz con ±0.03 (la amplitud vaga entre 0.01 y 0.07), su propio modulador LFNoise1 a 0.2 Hz mapeado EXPONENCIALMENTE de 100 a 2000 Hz, un HPF a 50 Hz antes del LPF, LPF SIN resonancia, .tanh (saturación suave) por voz y otra vez en la suma, Splay con spread 0.6, fade-in de 10 s y LeakDC al final.**

> ~waves = {
	var noise = { WhiteNoise.ar(0.04 + LFNoise1.kr(0.3, 0.03)) };
	var motion = { LFNoise1.kr(0.2).exprange(100, 2000) };
	var hps = { HPF.ar(noise.value, 50) };
	var wave = { LPF.ar(hps.value, motion.value).tanh };
	var sig = wave!10;
	sig = Splay.ar(sig, 0.6).tanh;
	sig = sig * Line.kr(0, 1, 10); // fade in
	LeakDC.ar(sig);
}.play;

*Cómo se aplica:* Es el esqueleto exacto que le falta a tu v0. Traducción directa a Web Audio: 10 × (AudioBufferSourceNode con ruido PROPIO → BiquadFilter highpass 50 Hz → BiquadFilter lowpass con Q=0.0001 → WaveShaper con tanh → GainNode con envolvente → StereoPanner). Nota crítica: LFNoise1, no un OscillatorNode.

<sub>confianza alta · https://sccode.org/1-5ec</sub>

**QUÉ ES LFNoise1 (el generador que sustituye al LFO senoidal, y es la diferencia entre 'ola' y 'bong'): 'genera valores aleatorios interpolados LINEALMENTE a una tasa dada'. O sea: rampas rectas entre puntos aleatorios, no una senoide. Un seno tiene una velocidad predecible y una excursión fija; LFNoise1 no repite nunca ni el destino ni el momento.**

> Ramp noise ... Generates linearly interpolated random values at a rate given by the nearest integer division of the sample rate by the freq argument.

*Cómo se aplica:* En Web Audio: un AudioParam con linearRampToValueAtTime a un valor aleatorio cada 1/freq segundos, programados por adelantado en bloques de 20-30 s. Para 0.2 Hz: un destino nuevo cada 5 s. Es 5 líneas de código y es el cambio de mayor impacto.

<sub>confianza alta · https://doc.sccode.org/Classes/LFNoise1.html</sub>

**PANEO ESTÉREO EXACTO (Splay de SuperCollider). Fórmula documentada: pos_i = ((i·(2/(n−1))) − 1)·spread + center. Con n=10 y spread=0.6 → los diez pans son −0.600, −0.467, −0.333, −0.200, −0.067, +0.067, +0.200, +0.333, +0.467, +0.600. Compensación de nivel equal-power por defecto = 1/√n (para n=10 → 0.316; para n=8 → 0.354).**

> Splay spreads an array of channels across the stereo field. Optional arguments are spread and center, and equal power levelCompensation. The formula for the stereo position is ((0 .. (n - 1)) * (2 / (n - 1)) - 1) * spread + center

*Cómo se aplica:* StereoPannerNode.pan = ese valor, fijo por voz (no lo animes: el movimiento estéreo lo dan las envolventes descorrelacionadas). Master gain = 1/√N. Nunca uses un solo ruido dividido en L/R con delay: eso se cancela en mono.

<sub>confianza alta · https://doc.sccode.org/Classes/Splay.html</sub>

**OLEAJE REAL MEDIDO FRENTE A VERACRUZ (boya NDBC 42055, Bahía de Campeche, sur del Golfo de México; ~2100–3400 muestras de los últimos ~45 días). Periodo dominante DPD: mediana 5.0 s, p10 4.0 s, p90 6.0 s, rango 2–7 s, media 5.06 s. Periodo promedio APD: mediana 3.8 s, p10 3.3, p90 4.4, media 3.82 s. Altura significativa: mediana 0.7 m (p10 0.4, p90 1.1). Boya 42002 (oeste del Golfo): DPD mediana 5.0 s, APD mediana 4.0 s. Boya 42056: DPD mediana 7.0 s.**

> DPD  Dominant wave period (seconds) is the period with the maximum wave energy. ... APD  Average wave period (seconds) of all waves during the 20-minute period.

*Cómo se aplica:* ⭐ EL NÚMERO QUE MÁS CAMBIA TU CÓDIGO: el mar del Golfo frente a Chachalacas tiene periodo dominante de 4–6 s, mediana 5 s → 10 a 15 olas por minuto. Tu LFO de 8.3 s es casi el DOBLE de lento que el mar real de ahí. Y con 5 s entre olas y una envolvente de 6-8 s, SIEMPRE hay 2 o 3 olas encimadas: eso es exactamente el 'múltiples olas suavemente superponiéndose' que pidió el dueño.

<sub>confianza alta · https://www.ndbc.noaa.gov/data/realtime2/42055.txt</sub>

**CONTRASTE: el Golfo NO es swell largo de Pacífico. La tabla de mar completamente desarrollado da: viento 19 km/h → periodo 3.0 s; 37 km/h → 5.7 s; 56 km/h → 8.6 s; 74 km/h → 11.4 s; 92 km/h → 14.3 s. Las olas de aguas profundas llegan a ~20 s como máximo.**

> Wind waves (deep-water waves) have a period up to about 20 seconds.

*Cómo se aplica:* Descarta la receta genérica de '14 a 20 segundos por ola' que circula en foros: eso es groundswell de Hawái/California, no el Golfo. Para Chachalacas: 4–6 s.

<sub>confianza alta · https://en.wikipedia.org/wiki/Wind_wave</sub>

**CÓMO HACE FARNELL LOS MODULADORES LENTOS EN EL VIENTO (windspeed/gust/squall del practical 18) — es el generador que hay que copiar en vez de un seno. GUST: noise~ → lop~ 0.5 → lop~ 0.5 (DOS paso-bajos de un polo a 0.5 Hz en cascada) → ×50. SQUALL: noise~ → lop~ 3 → lop~ 3 → ×20, y solo se activa cuando la 'velocidad del viento' pasa de 0.4 (max~ 0.4, −~ 0.4, ×8). Encima de todo, un osc~ 0.1 (0.1 Hz = ciclo de 10 s) como 'clima' base, escalado a 0–0.5 y sumado, con clip~ 0 1 al final.**

> #X obj 0 42 lop~ 0.5;  #X obj 0 21 lop~ 0.5;  #X obj 0 84 *~ 50;  ...  #X obj 63 41 lop~ 3;  #X obj 63 62 lop~ 3;  #X obj 63 104 *~ 20;  ...  #X obj 0 0 osc~ 0.1;

*Cómo se aplica:* Ruido blanco pasado por DOS lowpass de un polo a 0.5 Hz = un contorno lento, orgánico y no periódico. En Web Audio se hace en el mismo bucle que genera el buffer: y += (x−y)*k con k = 1−exp(−2π·0.5/SR), aplicado dos veces. Es más barato y más creíble que cualquier LFO.

<sub>confianza alta · http://web.archive.org/web/20241105004430/http://aspress.co.uk/sd/practical18.html</sub>

**FARNELL, DECORRELACIÓN POR LÍNEA DE RETARDO: escribe UN solo ruido en delwrite~ a 3000 (3 segundos) y lo lee en tres puntos distintos con vd~ a 0, vd~ a 100 y vd~ a 1000 (0 ms, 100 ms, 1000 ms). Cada capa además va a un pan distinto: fcpan 0.28, fcpan 0.51 y fcpan 0.64. Filtros del cuerpo: bp~ 800 1 (bandpass a 800 Hz, Q=1) para el silbido, y vcf~ 1000 60 (Q=60) SOLO para el aullido resonante, con centro barriendo 600→1000 Hz y 1000→2000 Hz.**

> #X obj -2 106 delwrite~ a 3000;  #X obj 156 -2 vd~ a 0;  ...  #X obj 14 -41 vd~ a 100;  #X obj 149 -16 vd~ a 1000;  ...  #X obj 213 19 bp~ 800 1;  ...  #X obj 133 75 vcf~ 1000 60;  #X obj -2 143 fcpan 0.28;  #X obj 132 143 fcpan 0.64;

*Cómo se aplica:* Truco barato para tener N voces sin generar N buffers: UN buffer de 30 s y N AudioBufferSourceNode arrancados en offsets distintos (0, 3.1, 7.3, 11.7, 17.3, 23.9 s — primos). Nota: Q=60 es exclusivamente para el aullido del viento; para el CUERPO del agua nunca pases de Q=1.

<sub>confianza alta · http://web.archive.org/web/20241105004430/http://aspress.co.uk/sd/practical18.html</sub>

**CONTRAEJEMPLO PÚBLICO — un generador de 'Ocean Waves' en Web Audio muy difundido usa exactamente la arquitectura que te falló: UNA fuente de ruido blanco, UN lowpass a 500 Hz con Q=0.3, y UN OscillatorNode a 0.15 Hz (ciclo 6.7 s) con ganancia 200 conectado a filter.frequency → el corte barre 300–700 Hz, que son 1.22 octavas. Aun así es la MITAD de barrido que tu v0 (600→3800 Hz = 2.66 octavas).**

> if(type==='ocean'){
      filter.type='lowpass';filter.frequency.value=500;filter.Q.value=0.3;
      const lfo=ctx.createOscillator();const lfoGain=ctx.createGain();
      lfo.frequency.value=0.15;lfoGain.gain.value=200;lfo.connect(lfoGain);lfoGain.connect(filter.frequency);lfo.start();

*Cómo se aplica:* Confirma tu diagnóstico con un tercer dato: hasta las implementaciones ingenuas mantienen el barrido por debajo de 1.3 octavas. Tu v0 se pasó 2× de ese techo. Y aun así ésta tampoco 'suena a mar', porque le falta lo demás: N voces, envolventes por evento y capa granular.

<sub>confianza alta · https://github.com/mahtxx/ambient-sound-generator/blob/HEAD/index.html</sub>

**LEY CUANTITATIVA DE LA DECORRELACIÓN (derivada, y es la que te deja pasar el gate de barrid<0.8). El centroide espectral de la SUMA de N voces independientes es el promedio ponderado por energía de los centroides individuales; su desviación estándar cae como 1/√N. Con un barrido por voz de B octavas y N voces con moduladores independientes, el barrido del conjunto ≈ B/√N. Números: B=1.3 oct y N=8 → 0.46 oct ✅. B=1.3 y N=4 → 0.65 oct ✅ justo. B=2.66 (tu v0) y N=1 → 2.66 oct ❌. B=4.32 (el patch de A. Broz, 100→2000 Hz) y N=10 → 1.37 oct ⚠️.**

*Cómo se aplica:* Da la receta de dos perillas para el banco: sube N y baja B hasta que B/√N < 0.8. La combinación segura es B ≤ 1.3 octavas y N ≥ 8. Si el banco mide más de 0.8 con esos valores, la causa es que las envolventes de las voces están correlacionadas (mismo LFO, mismo offset de buffer) — no es el filtro.

<sub>confianza media · https://sccode.org/1-5ec</sub>

**SATURACIÓN SUAVE COMO PEGAMENTO: el patch de referencia aplica .tanh DOS veces — una por voz después del lowpass y otra sobre la suma estéreo — más un LeakDC (bloqueo de continua) al final. En el patch de rain de Farnell aparece el mismo principio en otra forma: se toma ruido, se le pasa un bandpass, se recorta con clip~ 0 1 y se eleva al cuadrado (*~ dos veces contra sí mismo) para convertir ruido continuo en impulsos dispersos.**

> var wave = { LPF.ar(hps.value, motion.value).tanh };  ...  sig = Splay.ar(sig, 0.6).tanh;  ...  LeakDC.ar(sig);

*Cómo se aplica:* WaveShaperNode con curva Math.tanh(k*x) (k = 1.5 a 2.5), oversample:'2x', uno por voz y uno en el master. Y un highpass a 20-30 Hz al final como LeakDC. La saturación rellena los huecos espectrales cuando la envolvente baja el corte, que es justo cuando el filtro se delata.

<sub>confianza alta · https://sccode.org/1-5ec</sub>

**COEFICIENTES DE RUIDO ROSA que ya usa tu v0 (filtro de Paul Kellett): b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759; b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856; b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980; out=(b0+b1+b2+b3+b4+b5+b6+w*0.5362); b6=w*0.115926. Alternativa de 2º orden con error ±0.9 dB de 20 Hz a 20 kHz a 44.1 kHz: num=[0.04957526213389, -0.06305581334498, 0.01483220320740], den=[1, -1.80116083982126, 0.80257737639225].**

> 2nd order, ~ +/- 0.9 dB error
num = [ 0.04957526213389  -0.06305581334498   0.01483220320740 ]
den = [ 1.00000000000000  -1.80116083982126   0.80257737639225 ]

*Cómo se aplica:* Los que ya tienes están bien (−3 dB/oct). Para el fondo del mar conviene ruido MARRÓN (−6 dB/oct): basta integrar el blanco con y += 0.02*w; y *= 0.998. El rosa es para la capa de olas; el marrón para el retumbo de fondo.

<sub>confianza alta · https://www.musicdsp.org/en/latest/Filters/85-1st-and-2nd-order-pink-noise-filters.html</sub>

**ANATOMÍA DE LA ENVOLVENTE DE OLA de tu propio banco, ya validada: 'una ola de verdad sube y baja de VOLUMEN; su timbre apenas cambia. Cualquier cosa que mueva el centroide más de ~0.8 octavas vuelve a sonar a filtro.' Medido: ruido puro 0.06 oct; v0 ('bong') 2.55 oct; v1 (bandas moduladas por separado) 2.37 oct; v2 (envolvente sobre la voz entera) 1.52 oct.**

> La lección: una ola de verdad sube y baja de VOLUMEN; su timbre apenas cambia. Cualquier cosa que mueva el centroide más de ~0.8 octavas vuelve a sonar a filtro.

*Cómo se aplica:* v2 ya iba en la dirección correcta (1.52 oct) pero con UNA voz. Aplicando la ley B/√N: v2 con 8 voces independientes daría 1.52/2.83 = 0.54 oct. O sea: la variante v2 replicada 8 veces con moduladores y buffers independientes YA pasa el gate, sin cambiar nada más.

<sub>confianza alta · file:///Users/gersioasecas/Developer/riverside-web/sonido/PROTOCOLO.md</sub>

**LA CAUSA RAÍZ DEL 'BONG': la TONALIDAD es el predictor que destruye la percepción de un paisaje sonoro natural. En 443 evaluaciones sobre 28 puntos en 4 áreas naturales protegidas (ISO 12913), la tonalidad tuvo coeficiente −2.241 (p<0.001) sobre la Placidez ISO y +1.943 (p<0.001) sobre la 'eventfulness'. El umbral de tonalidad que ya hace percibir un paisaje como CAÓTICO 'puede ser tan bajo como 0.021 tu' (unidades de tonalidad, ECMA-74). Un BiquadFilter con resonancia barriendo 600→3800 Hz genera un pico espectral móvil = tonalidad pura.**

> "higher tonality in the acoustic environment of PNAs included in this study is related to higher perceived sense of chaos" / "a tonality threshold indicating chaotic soundscapes...could be as low as 0.021 tu" / ISO Pleasantness coefficient: "− 2.241" (p < 0.001)

*Cómo se aplica:* REGLA DURA: cero resonancia. Si usas BiquadFilterNode 'lowpass', Q = 0.707 FIJO (Butterworth, máximamente plano) y NUNCA modules su frequency con un LFO. El barrido de filtro es literalmente la variable que la ciencia mide como 'caos percibido'. Sustituye el filtro barrido por N bandpass FIJOS (Q=0.5) cuyas GANANCIAS se modulan independientemente.

<sub>confianza alta · https://pmc.ncbi.nlm.nih.gov/articles/PMC12328657/</sub>

**POR QUÉ SU LFO DE 8.3 s NO APORTA TEXTURA DE AGUA: la fuerza de fluctuación (fluctuation strength) tiene característica pasa-banda con máximo en 4 Hz de modulación. Modelo de Fastl: F ≈ ΔL / ((f_mod/4 Hz) + (4 Hz/f_mod)). Con su LFO de periodo 8.3 s (f_mod = 0.12 Hz) el denominador vale 33.36 contra 2.0 en el máximo → la MISMA profundidad de modulación produce solo ~6% de la fuerza de fluctuación. Es decir: su modulación no se oye como 'textura de agua en movimiento', se oye como UN gesto lento único. Tabla relativa al máximo (4 Hz = 100%): 0.12 Hz = 6% · 0.25 Hz = 12% · 0.5 Hz = 25% · 1 Hz = 47% · 2 Hz = 80% · 4 Hz = 100% · 8 Hz = 80%.**

> "Fluctuation strength shows, as a function of modulation frequency, a bandpass characteristic with a maximum around 4 Hz... F approximately delta L/((fmod/4 Hz)+(4 Hz/fmod))"

*Cómo se aplica:* Tu error NO fue el periodo de 8.3 s — fue que era la ÚNICA modulación del sistema. Usa DOS regímenes separados: (a) macro-oleaje 0.09–0.29 Hz (periodos 3.5–11 s) que aporta forma sin aportar 'wobble' molesto, y (b) micro-textura de espuma con energía repartida entre 1 y 20 Hz. Nunca una modulación coherente única centrada en 4 Hz (ahí está el pico de molestia).

<sub>confianza alta · https://doi.org/10.1016/0378-5955(82)90034-x</sub>

**LÍMITE DURO DE MOLESTIA POR FLUCTUACIÓN: fuerza de fluctuación con coeficiente −14.009 (p<0.001) sobre la Placidez ISO — el efecto negativo MÁS GRANDE de todas las variables psicoacústicas medidas. Umbral: F > 1.78 vacil produce placidez negativa. En contraste, la SHARPNESS (brillo/contenido agudo) resultó NO significativa sobre la placidez (p = 0.980), y la rugosidad tampoco (p = 0.418).**

> "fluctuation strength higher than F > 1.78 vacil is likely to be causing negative ISO Pleasantness" / Sharpness: no significant effect on pleasantness (p = 0.980)

*Cómo se aplica:* DOS consecuencias directas: (1) profundidad de modulación de cada capa ≤ 4–6 dB (gain oscilando 0.6→1.0, nunca a 0) — la modulación profunda es lo que molesta, no la lenta; (2) NO oscurezcas de más el sonido buscando 'lejanía': el brillo no penaliza la placidez. Puedes conservar contenido hasta 6–8 kHz sin costo perceptual.

<sub>confianza alta · https://pmc.ncbi.nlm.nih.gov/articles/PMC12328657/</sub>

**EL RUIDO CORRECTO ES MARRÓN, NO ROSA. Estudio con n=84 y n=1280 (GEMS-9): el ruido marrón fue calificado consistentemente como el MÁS 'sublime' y el MENOS 'inquietante' de los tres; el blanco fue el más inquietante en ambos estudios. Medianas Estudio 1 — sublimidad: marrón 2, rosa 1.8, blanco 1. Inquietud: blanco 3, rosa 2, marrón 1.5. Estudio 2 inquietud: blanco 5, rosa 4, marrón 3. Espectros: blanco 0 dB/oct · rosa −3 dB/oct (1/f) · marrón −6 dB/oct = 20 dB/década (1/f²).**

> "Brown noise was rated consistently as more sublime than the other noises in both studies" / "white noise had the highest ratings of unease across both studies" / marrón: "decreases in intensity by 6 dB per octave (20 dB per decade)"

*Cómo se aplica:* Cambia la base de ruido ROSA a ruido MARRÓN (−6 dB/oct). Web Audio no lo trae: genera blanco en un AudioBuffer y aplica el integrador con fuga estándar `b = (last + 0.02*white)/1.02; out = b*3.5`. Es la corrección de una línea con mayor impacto de toda esta investigación.

<sub>confianza alta · https://pmc.ncbi.nlm.nih.gov/articles/PMC12062116/</sub>

**EL RUIDO MARRÓN LITERALMENTE SUENA A AGUA PARA LA GENTE. En un experimento de Ganzfeld multimodal (3 experimentos, N=27/41/66), las alucinaciones auditivas relacionadas con AGUA se concentraron en la condición de ruido marrón: en el Experimento 3, 7 de las 9 reportadas fueron en marrón. Reportes textuales de participantes: 'el ruido se convirtió en sonidos reconocibles de agua'.**

> "brown noise evokes more auditory hallucinations" because of its "lower frequency and therefore increased resemblance to water and waves sounds, this could potentially reflect the suggestibility of the brown noise sounding similar to water, or ocean waves" / "noise changed into recognizable sounds of water so I imagined a very vivid image of waterfall with nature around"

*Cómo se aplica:* Confirma el punto anterior desde otro ángulo: el cerebro YA interpreta −6 dB/oct como agua sin ayuda. Tu trabajo no es 'imitar olas' encima de un ruido neutro; es partir de un ruido que ya se lee como agua y solo darle estructura temporal. Esto baja mucho la exigencia sobre el resto del diseño.

<sub>confianza alta · https://pmc.ncbi.nlm.nih.gov/articles/PMC12457770/</sub>

**HONESTIDAD SOBRE LOS 'COLORES DE RUIDO': el efecto es AFECTIVO/PERCEPTUAL, no fisiológico. Pupilometría con 38 participantes (31 analizados), 10 s de cada ruido: no hubo modulación significativa del diámetro pupilar entre blanco, rosa y marrón. Además, en el estudio GEMS-9 los TRES ruidos puntuaron por encima de 3/7 en inquietud — ninguno es emocionalmente neutro. Volumen de evidencia en Europe PMC: 'white noise'+sleep = 265 artículos, 'pink noise'+sleep = 58, 'brown noise'+sleep = 7.**

> "The results showed no significant modulation of pupil size across noise conditions... despite widespread claims about the distinct arousing or calming properties of coloured noises, they do not differentially affect sustained pupil-linked arousal in naïve listeners"

*Cómo se aplica:* No vendas 'relajación científicamente probada' al hotel. El argumento válido es: el marrón es el que la gente PREFIERE y el que asocia con agua. Es una decisión estética informada, no un tratamiento. También implica que el ruido a secas no basta — la estructura de oleaje es lo que convierte 'ruido agradable' en 'mar'.

<sub>confianza alta · https://doi.org/10.1016/j.ijpsycho.2025.113271</sub>

**AGUA vs AVES — la respuesta a las gaviotas. Metaanálisis de 36 publicaciones (18 en el metaanálisis) en PNAS: los sonidos de AGUA tuvieron el mayor tamaño de efecto para salud y afecto positivo (g = 2.01, IC95% 0.35–3.67); los sonidos de AVES el mayor para estrés y molestia (g = −1.11, IC95% −1.82 a −0.4). La comparación sonido natural vs ruido dio g = 1.7 (salud/afecto) y g = −0.81 (estrés/molestia). Advertencia de los autores: 'relatively few studies tested bird sounds explicitly (11 effect sizes in 2 studies)'.**

> "water sounds had the largest mean effect size for health and positive affect outcomes (2.01, 95% CI = 0.35, 3.67)" / "bird sounds had the largest mean effect size for stress and annoyance (1.11, 95% CI = −1.82, −0.4)"

*Cómo se aplica:* El AGUA sola ya es la capa con mayor efecto — no necesitas aves para que funcione. Mi recomendación es SIN GAVIOTAS (razonamiento en el hallazgo siguiente). Si el hotel las pide, van a ≤1 evento cada 3–4 min y 18–24 dB bajo la cama, nunca dos veces igual.

<sub>confianza alta · https://pmc.ncbi.nlm.nih.gov/articles/PMC8040792/</sub>

**POR QUÉ NO GAVIOTAS (derivado, no citado directamente): el grito de gaviota es armónico, de ataque rápido y espectro tonal — exactamente el perfil que el estudio ISO 12913 mide como TONALIDAD, la variable que dispara la percepción de 'caótico' desde 0.021 tu. Además, en ese mismo estudio el factor que más deterioró la experiencia en áreas naturales fue la presencia de sonidos identificables con tonalidad elevada (0.1–0.4 tu). Sumado a eso: un evento discreto y reconocible en un loop se convierte en el delator del loop ('ahí va la gaviota otra vez').**

> "presence of human sounds, associated with increased tonality, was the major factor driving the perception of chaotic soundscapes" / "higher tonality (between 0.1 and 0.4 tu) seems to be associated with higher perceived dominance of human sounds"

*Cómo se aplica:* Cero gaviotas en la v1. El razonamiento sobre tonalidad es sólido; la extrapolación específica a gaviotas es mía. Es además la decisión barata: no tienes que sintetizar un grito convincente, que es de lo más difícil que hay.

<sub>confianza media · https://pmc.ncbi.nlm.nih.gov/articles/PMC12328657/</sub>

**NIVEL OBJETIVO: 'un umbral para un paisaje sonoro calmo y agradable está en algún punto por debajo de LAeq < 48 dB'. Rango medido en el estudio: 31.2 a 76.1 dB, media 48.4 dB. Los modelos basados en tipo de fuente y en variables psicoacústicas predijeron MEJOR que los basados en nivel de presión sonora — es decir, el nivel importa menos que la textura.**

> "a threshold for a calm and pleasant soundscape lies somewhere above LAeq < 48 dB" / "Perceived sound source type data- and psychophysical data-based models demonstrated higher predictive power than those based on sound pressure level metrics"

*Cómo se aplica:* Apunta a ~42–46 dB LAeq en el oído del visitante. Pero OJO al segundo dato: si la textura es mala, bajarle el volumen no la salva. Arregla el espectro y la modulación PRIMERO; el nivel es el ajuste fino.

<sub>confianza alta · https://pmc.ncbi.nlm.nih.gov/articles/PMC12328657/</sub>

**NIVELES TOLERADOS TODA LA NOCHE: en estudios polisomnográficos, ruido rosa continuo a 40 o 50 dBA se usó durante noches completas de sueño (25 adultos, 7 noches). En otro estudio cruzado (N=12), ruido rosa de banda ancha continuo a 45 dB durante toda la noche mitigó la fragmentación del sueño por tráfico. Referencia complementaria: las WHO Night Noise Guidelines definen cuatro rangos de Lnight con distinto riesgo — < 30, 30-40, 40-55 y > 55 dBA.**

> "pink noise (40 or 50 dBA)" / "one night with continuous 45 dB broadband pink noise" / "the WHO Night Noise Guideline for Europe (NNG) defines four Lnight, outside ranges associated with different risk levels of sleep disturbance and other health effects ( < 30, 30-40, 40-55, and> 55 dBA)"

*Cómo se aplica:* 40–50 dBA es un ruido continuo que la gente aguanta DORMIDA una noche entera. Una web se visita 2–5 minutos despierto: 42–46 dBA es holgadamente seguro. Confirma que el objetivo de nivel no es 'apenas audible'.

<sub>confianza alta · https://pmc.ncbi.nlm.nih.gov/articles/PMC12901012/</sub>

**EL NIVEL DE 50 dB ES EL QUE SE USA EN LOS ESTUDIOS DE RECUPERACIÓN DE ESTRÉS. Alvarsson, Wiens & Nilsson (2010): el sonido natural se presentó a 'nivel de presión sonora medio fijado en 50 dB (LAeq,4min)' durante periodos de recuperación de 4 minutos tras inducción de estrés. Resultado: vida media de recuperación de la conductancia de la piel 101.3 s con sonido natural, contra 159.8 s con ruido alto (80 dB), 111.4 s con ruido bajo (50 dB) y 121.3 s con ambiente (40 dB) — 9-37% más rápido. La HF-HRV no mostró diferencias significativas.**

> "A mixture of sounds from a fountain and tweeting birds. The average sound pressure level was set to 50 dB (LAeq,4min)."

*Cómo se aplica:* Dos cosas: (1) 50 dB LAeq y 4 minutos de exposición es la dosis que produce recuperación medible — el tiempo típico en una landing de hotel; (2) el sonido de los estudios es AGUA CERCANA (fuente), no mar lejano. Ojo: el efecto es sobre el sistema simpático (conductancia), no sobre el parasimpático.

<sub>confianza alta · https://pmc.ncbi.nlm.nih.gov/articles/PMC2872309/</sub>

**⚖️ WCAG 2.2 SC 1.4.2 Audio Control — NIVEL A (la obligación normativa que preguntaste), texto normativo íntegro: audio que suena automáticamente por MÁS DE 3 SEGUNDOS exige mecanismo para pausar/detener O control de volumen independiente del volumen del sistema. Y la Nota es lo verdaderamente severo: incumplirlo rompe la conformidad de TODA la página vía el Requisito de Conformidad 5 (No Interferencia), no solo del audio.**

> "If any audio on a web page plays automatically for more than 3 seconds, either a mechanism is available to pause or stop the audio, or a mechanism is available to control audio volume independently from the overall system volume level." — Note: "Since any content that does not meet this success criterion can interfere with a user's ability to use the whole page, all content on the web page (whether or not it is used to meet other success criteria) must meet this success criterion. See Conformance Requirement 5: No

*Cómo se aplica:* Es Nivel A (el mínimo) y es de no-interferencia: si el hotel presume accesibilidad y esto falla, TODA la página deja de conformar. El motivo declarado: quien usa lector de pantalla no puede oír su tecnología asistiva con audio de fondo encima, y comparten el mismo control de volumen del sistema.

<sub>confianza alta · https://www.w3.org/TR/WCAG22/</sub>

**QUÉ EXIGE EXACTAMENTE EL CONTROL (Técnica G170): debe estar 'cerca del inicio de la página', 'temprano en el orden de tabulación y de lectura', ser OPERABLE POR TECLADO y 'claramente etiquetado para indicar que apagará los sonidos que están sonando'. El procedimiento de prueba tiene 3 pasos. La técnica G171 ('reproducir sonidos solo cuando el usuario los solicita') es la vía alterna que evita el problema de raíz. F93 es el fallo documentado.**

> G170: "a control that makes it possible for users to turn off any sounds that are played automatically" ... "located near the beginning of the page" ... "early in the tab and reading order" ... "clearly labeled to indicate that it will turn off the sounds that are playing" / F93: "...and no controls or commands have been provided to pause or stop the media resource"

*Cómo se aplica:* El toggle va en el header, entre los primeros elementos enfocables, con etiqueta textual explícita ('Sonido del río' / 'Silenciar'), `role="switch"` + `aria-checked`, y operable con Enter/Space. NO vale un icono flotante sin etiqueta al final del DOM. La ruta limpia es G171: default APAGADO y que el usuario lo encienda — cumples sin discusión.

<sub>confianza alta · https://www.w3.org/WAI/WCAG22/Techniques/general/G170</sub>

**LA CIFRA DE 20 dB (SC 1.4.7 Low or No Background Audio, Nivel AAA): 'los sonidos de fondo deben estar al menos 20 decibeles por debajo del contenido de voz en primer plano, con excepción de sonidos ocasionales que duren solo uno o dos segundos'. El propio W3C traduce eso perceptualmente: 'aproximadamente cuatro veces más silencioso'.**

> "The background sounds are at least 20 decibels lower than the foreground speech content, with the exception of occasional sounds that last for only one or two seconds." / "Background sound that meets this requirement will be approximately four times quieter than the foreground speech content."

*Cómo se aplica:* Es la ÚNICA cifra en dB que da una norma web para audio de fondo. Aplica formalmente solo a audio pregrabado con voz, pero es el número de referencia defendible: si algún día el sitio tiene un video con narración, la cama debe quedar 20 dB debajo. Úsalo como criterio de mezcla desde ahora.

<sub>confianza alta · https://www.w3.org/WAI/WCAG22/Understanding/low-or-no-background-audio.html</sub>

**REFERENCIA DE LOUDNESS DIGITAL (EBU R 128, nov 2023): nivel objetivo de programa −23.0 LUFS con tolerancia ±1.0 LU; True Peak máximo −1 dBTP. Para STREAMING (R 128 s2), cuando el emisor quiere controlar el tratamiento dinámico: 'el valor provisional para el Nivel de Loudness de Distribución debería estar en el rango de −20.0 a −16.0 LUFS'.**

> "that the Programme Loudness Level shall be normalised to a Target Level of −23.0 LUFS" / "the True Peak Level of a programme shall not exceed −1 dBTP" / "the interim value for the Distribution Loudness Level should be in the range of −20.0 to −16.0 LUFS"

*Cómo se aplica:* Si el 'primer plano' de una web moderna vive alrededor de −16 LUFS, una cama ambiental 20 dB debajo cae en ≈ −36 LUFS (demasiado bajo en la práctica). Mi recomendación operativa: mide 60 s de tu salida con `ffmpeg -af loudnorm=print_format=summary` y ajusta el master GainNode hasta que el integrado quede entre −30 y −26 LUFS, con true peak ≤ −18 dBTP. Marcado como derivación mía, no como norma.

<sub>confianza alta · https://tech.ebu.ch/docs/r/r128s2.pdf</sub>

**FADE-IN — PISO ABSOLUTO POR REFLEJO DE SOBRESALTO: en humanos, 100 participantes con estímulos de 105 dB en cinco condiciones de tiempo de subida (0, 24, 48, 96 y 240 ms) mostraron que el tiempo de subida afecta el parpadeo de sobresalto. Modelos en mamíferos estiman que se necesitan tiempos de subida de 141–220 ms para MITIGAR COMPLETAMENTE la respuesta de sobresalto; las respuestas decrecen monótonamente al pasar de 2 a 100 ms. Principio general: 'estímulos acústicos intensos de inicio súbito provocan un reflejo de sobresalto, mientras que estímulos de intensidad similar pero con tiempos de subida más largos solo causan una respuesta cardiaca de defensa'.**

> "Startle responses decreased with increasing rise times from 2 to 100 ms. Models suggested that rise times of 141-220 ms were necessary to completely mitigate startle responses." / "Intense acoustic stimuli with sudden onsets elicit a startle reflex while stimuli of similar intensity but with longer rise times only cause a cardiac defence response."

*Cómo se aplica:* Piso duro: ningún cambio de ganancia audible por debajo de ~220 ms. Esto también mata los clicks: todo encendido, apagado y cambio de nivel usa rampa ≥ 250 ms. Nota: a 45 dB el sobresalto no es el riesgo real; este número define el mínimo técnico, no el fade-in cómodo.

<sub>confianza alta · https://pmc.ncbi.nlm.nih.gov/articles/PMC7075047/</sub>

**POR QUÉ EL FADE-IN DEBE TERMINAR Y QUEDARSE PLANO — sesgo perceptual por intensidad creciente ('looming'): el sistema auditivo privilegia los sonidos que suben de intensidad porque señalan objetos que se aproximan. Los oyentes SOBRESTIMAN los aumentos de intensidad frente a disminuciones equivalentes, y responden más rápido a ellos. Neuroimagen: la intensidad creciente activa una red distribuida de reconocimiento espacial, movimiento auditivo y ATENCIÓN (surcos temporales superiores, unión temporoparietal derecha, cortezas motora y premotora, mesencéfalo) mucho más que la intensidad constante.**

> "Human listeners typically overestimate increasing compared to equivalent decreasing sound intensity" / "Rising compared to falling intensity activated a distributed neural network subserving space recognition, auditory motion perception, and attention" (Neuhoff 1998, Nature 395:123-124; Bach et al. 2002)

*Cómo se aplica:* Esto es OTRA parte del diagnóstico del 'bong': tu barrido sube y baja = una rampa de intensidad percibida = el cerebro lo clasifica como UN OBJETO QUE SE ACERCA Y SE ALEJA. Por eso suena a un evento y no a un ambiente. Reglas: (1) el fade-in llega al objetivo y AHÍ SE QUEDA — nada de 'respiración' global de volumen; (2) ninguna capa individual debe tener una rampa ascendente larga y coherente; el ascenso de cada ola debe ser corto (25-35% del ciclo) y descorrelacionado entre capas.

<sub>confianza alta · https://doi.org/10.1016/s0960-9822(02)01356-8</sub>

**⚠️ BUG ABIERTO EN FIREFOX QUE ROMPE FADE-INS: `linearRampToValueAtTime` y `exponentialRampToValueAtTime` 'a veces saltan al valor inmediatamente'. Bug 2011524, estado NEW (sin resolver), reportado 2026-01-20. MDN marca ambos métodos como `partial_implementation` en Firefox 25+. En cambio `setTargetAtTime` y `setValueCurveAtTime` están soportados sin nota desde Chrome 24 / Firefox 25 / Safari 6.**

> Bugzilla summary: "linearRampToValueAtTime/exponentialRampToValueAtTime increase sometimes instantly changes to value" — STATUS: NEW

*Cómo se aplica:* NO uses linearRamp/exponentialRamp como único mecanismo del fade. Usa `gain.setTargetAtTime(objetivo, ctx.currentTime, tau)`: con tau = 1.6 s llegas al 95% en 4.8 s (3·tau) y al 99% en 7.4 s. Bonus: setTargetAtTime es exponencial por definición, que es la curva perceptualmente correcta (la sonoridad crece como potencia de la intensidad, así que una rampa LINEAL de ganancia se oye como un salto rápido seguido de un arrastre).

<sub>confianza alta · https://bugzilla.mozilla.org/show_bug.cgi?id=2011524</sub>

**🔴 CHROME — política de autoplay exacta. Permitido sin gesto: 'el autoplay silenciado siempre está permitido'. Con sonido, solo si: el usuario ha interactuado con el dominio (clic, tap); o en escritorio se cruzó el umbral del Media Engagement Index; o el usuario instaló el sitio (PWA / pantalla de inicio). El MEI cuenta: consumo de medios > 7 segundos, audio presente y NO silenciado, pestaña activa, video > 200x140 px. Se consulta en `about://media-engagement`. WEB AUDIO desde Chrome 71: 'si un AudioContext se crea antes de que el documento reciba un gesto del usuario, se creará en estado suspended, y tendrás que llamar resume() después del gesto'. Existe una lista pre-cargada de sitios con MEI alto para perfiles nuevos.**

> "Muted autoplay is always allowed." / "The user has interacted with the domain (click, tap)." / "Consumption of the media (audio/video) must be greater than seven seconds." / "If an AudioContext is created before the document receives a user gesture, it will be created in the 'suspended' state, and you will need to call resume() after the user gesture."

*Cómo se aplica:* SÍ: un visitante recurrente con MEI alto PUEDE obtener audio automático en Chrome escritorio. Y precisamente por eso NO debes construir sobre esa base: el mismo código sonaría solo para unos usuarios y para otros no, comportamiento impredecible que además te mete de lleno en el 1.4.2. Trátalo como imposible y diseña para el gesto.

<sub>confianza alta · https://developer.chrome.com/blog/autoplay/</sub>

**🔴 SAFARI — el más restrictivo, y con un estado extra que casi nadie maneja. macOS: 'Safari usa un motor de inferencia automática para bloquear por defecto los elementos multimedia con sonido en la mayoría de los sitios' y la guía explícita es 'los sitios web deberían asumir que cualquier uso de <video> o <audio> requiere un clic del usuario para reproducir'. iOS: solo autoplay si el medio no tiene pista de audio o está `muted`. ADEMÁS: el estado `AudioContextState = "interrupted"` existe en Safari desde la versión 9 (llamada telefónica, otra app, Siri); Chrome apenas lo soporta desde la 136 y Firefox no lo soporta.**

> "Safari in macOS High Sierra uses an automatic inference engine to block media elements with sound from auto-playing by default on most websites." / "Websites should assume any use of <video> or <audio> requires a user gesture click to play."

*Cómo se aplica:* En Safari, `new AudioContext()` y `ctx.resume()` deben ocurrir DENTRO del handler del gesto, síncronamente. Y hay que escuchar `statechange` y manejar `'interrupted'` explícitamente, o el sonido se queda muerto tras una llamada en iPhone y el toggle mentirá diciendo que está encendido. En un sitio de hotel el tráfico móvil iOS es alto: esto no es un caso de borde.

<sub>confianza alta · https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/</sub>

**🔴 FIREFOX — bloquea audio audible por defecto desde Firefox 66 (19 marzo 2019), y Web Audio también: la preferencia `media.autoplay.block-webaudio` viene en `true` por defecto — 'los contextos de audio solo pueden sonar en páginas una vez que ha habido activación pegajosa (sticky activation)'. El permiso por sitio se recuerda entre visitas si el usuario lo concede desde la barra de URL.**

> "Firefox will block audible audio and video by default" / `media.autoplay.block-webaudio`: "If true, audio contexts are only able to play on pages once there has been Sticky activation." Default: true.

*Cómo se aplica:* Los tres motores coinciden: sin gesto, no hay Web Audio audible. Ninguna excepción sirve de base de diseño. La única arquitectura que funciona igual en los tres es: toggle explícito + resume dentro del handler.

<sub>confianza alta · https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay</sub>

**LO QUE DICE LA ESPECIFICACIÓN (normativo, no política de navegador): 'Un AudioContext se dice que está allowed to start si el agente de usuario permite que el estado del contexto transicione de suspended a running. Un agente de usuario puede prohibir esta transición inicial, y permitirla solo cuando el objeto global relevante del AudioContext tenga activación pegajosa.' Y: 'Un AudioContext recién creado SIEMPRE comenzará en estado suspended, y se disparará un evento statechange cada vez que el estado cambie.'**

> "An AudioContext is said to be allowed to start if the user agent allows the context state to transition from 'suspended' to 'running'. A user agent may disallow this initial transition, and to allow it only when the AudioContext's relevant global object has sticky activation." / "A newly-created AudioContext will always begin in the suspended state, and a state change event will be fired whenever the state changes to a different state."

*Cómo se aplica:* Nunca asumas `running` tras `resume()`. Patrón correcto: `await ctx.resume()`, luego verifica `ctx.state === 'running'`; si no, la UI debe reflejar 'apagado' y esperar otro gesto. Y suscríbete a `statechange` siempre.

<sub>confianza alta · https://www.w3.org/TR/webaudio-1.1/</sub>

**DETECCIÓN CROSS-BROWSER: `navigator.getAutoplayPolicy()` solo existe en Firefox 112+. Chrome: NO soportado. Safari / iOS Safari: NO soportado (datos de compatibilidad MDN, verificados hoy).**

> getAutoplayPolicy — chrome: {version_added: false} · firefox: {version_added: '112'} · safari: {version_added: false}

*Cómo se aplica:* No pierdas tiempo con esa API. La detección universal y fiable es leer `audioCtx.state` y escuchar el evento `statechange`. Si vas a usar getAutoplayPolicy, solo como enriquecimiento opcional con feature-detection.

<sub>confianza alta · https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getAutoplayPolicy</sub>

**LOS SONIDOS NATURALES SON DE BANDA ANCHA EN MODULACIÓN Y PASO-BAJAS EN EL ESPECTRO DE MODULACIÓN: análisis de conjuntos de sonidos naturales muestra que 'los sonidos naturales, en general, son paso-bajas, mostrando la mayor parte de su energía de modulación en modulaciones temporales y espectrales BAJAS', y que los sonidos no pueden tener modulaciones temporales y espectrales rápidas simultáneamente. Los sonidos naturales tienen una firma característica dentro de ese espacio restringido.**

> "Natural sounds, in general, are low-passed, showing most of their modulation energy for low temporal and spectral modulations." / "sounds cannot have rapid temporal and spectral modulations simultaneously"

*Cómo se aplica:* Confirma la arquitectura correcta: modulación temporal LENTA (tu instinto del oleaje era bueno) pero repartida en muchas bandas espectrales independientes, no una modulación ESPECTRAL rápida (que es exactamente lo que hace un filtro barriendo 600→3800 Hz). Tu diseño hacía modulación espectral cuando debía hacer modulación de amplitud por bandas.

<sub>confianza alta · https://doi.org/10.1121/1.1624067</sub>

**CADENCIA FÍSICA DEL OLEAJE COSTERO: mediciones costeras vinculan el ruido asociado a olas a la banda de 0.1–0.3 Hz, con fuerte correlación con la amplitud de las olas. Eso corresponde a periodos de 3.3 a 10 segundos entre eventos.**

> "we recorded wave-related seismic noise (WRSN) in the 0.1-0.3 Hz band, which showed a strong correlation with wave amplitude"

*Cómo se aplica:* Traduce a números de código: 6 a 18 eventos de ola por minuto. Con 5–7 generadores independientes de periodo aleatorio entre 3.5 y 11 s y fases desalineadas, siempre hay 2–4 olas solapadas — que es exactamente lo que el dueño echó de menos ('no hay múltiples olas suavemente superponiéndose'). Confianza media: la medición es de ruido sísmico submarino, no de sonido aéreo en playa; sirve como anclaje de la cadencia física, no del timbre.

<sub>confianza media · https://doi.org/10.1016/j.marpolbul.2026.119700</sub>

**El sonido NO lo hace el impacto del agua: lo hacen las burbujas de aire atrapadas. En el experimento controlado de una gota de 4.0 mm a 1.29 m/s, cuando se impide mecánicamente (varilla) o químicamente (tensoactivo) que se atrape la burbuja, NO se produce sonido alguno — ni aéreo ni submarino — pese a que el impacto y la cavidad sí ocurren. El sonido se inicia exactamente en el fotograma en que la burbuja se desprende de la cavidad. Reparto práctico: ~0% impacto, ~100% burbuja a escala de gota.**

> The recorded sound signals demonstrate that no sound is produced when bubble entrainment is prevented, confirming the earlier conclusion that this bubble-entrainment mechanism underpins production of the characteristic 'plink' sound.

*Cómo se aplica:* El generador base NO debe ser 'agua filtrada'. Debe ser una POBLACIÓN de osciladores amortiguados (burbujas). Cualquier síntesis que empiece por 'ruido + filtro' está modelando el mecanismo equivocado; solo funciona si el filtro reproduce la SUMA ESTADÍSTICA de esas burbujas (ver hallazgo del espectro medido, −3/−9 dB/oct).

<sub>confianza alta · https://www.nature.com/articles/s41598-018-27913-0</sub>

**En la zona de rompiente real (mar, no laboratorio): por ENCIMA de 500 Hz el sonido es enteramente radiación de oscilaciones de burbujas individuales. Por DEBAJO de 500 Hz entran otros mecanismos (oscilación colectiva del penacho de burbujas, ruido de impacto, burbujas reventando en la espuma). Además: la región acústicamente activa dentro de una ola SE DESPLAZA hacia la playa; el sonido se produce donde se están FORMANDO burbujas nuevas, no donde ya hay aire. Fracción de vacío medida en el penacho: 0.30–0.40. Solo una cáscara delgada exterior del penacho radia (el interior está fuertemente amortiguado).**

> The acoustic data show an acoustically active region within a wave which propagates shoreward. The production of sound within the active region is associated with the formation of bubble plumes. Above 500 Hz, the sound is consistent with the radiation from individual bubble oscillations. […] total void fractions of 0.3–0.4 were measured.

*Cómo se aplica:* Dos capas con corte en 500 Hz: >500 Hz = capa de burbujas (banda ancha, sin resonancia); <500 Hz = capa de 'cuerpo' de la ola (oscilación colectiva). Y clave para la ENVOLVENTE: el nivel es proporcional a la TASA DE CREACIÓN de burbujas, no a la cantidad de agua ni de espuma. Por eso la ola ataca rápido (colapso de la cresta = pico de entrainment) y decae lento (el rodillo se satura y entrena cada vez menos aire).

<sub>confianza alta · https://doi.org/10.1121/1.420321</sub>

**Resonancia de Minnaert: f0 = (1/2πa)·√(3γp_A/ρ). A presión atmosférica y agua a nivel del mar se reduce a la constante f0·a ≈ 3.26 m/s, es decir f0 = 3.26/a con a = radio en metros. Consecuencia: la banda audible 20 Hz–20 kHz corresponde a radios de 163 mm a 0.163 mm. Mapa útil: a=20 mm→163 Hz; 10 mm→326 Hz; 6.5 mm→502 Hz; 3.26 mm→1000 Hz; 2 mm→1630 Hz; 1 mm→3260 Hz; 0.5 mm→6520 Hz; 0.33 mm→10 kHz; 0.16 mm→20 kHz.**

> For a single bubble in water at standard pressure (p_A=100 kPa, ρ=1000 kg/m³), this equation reduces to fa ≈ 3.26 m/s

*Cómo se aplica:* Si sintetizas granos de burbuja: sorteas un radio a y de ahí sale la frecuencia, no al revés. El pico de ~1 kHz de un mar tranquilo corresponde EXACTAMENTE a burbujas de 3.26 mm de radio (6.5 mm de diámetro) — que es justo el tamaño que los sujetos humanos califican como 'más sonido de agua' (2–7 mm en el estudio de van den Doel).

<sub>confianza alta · https://en.wikipedia.org/wiki/Minnaert_resonance</sub>

**Distribución de tamaños de burbuja medida bajo rompientes en la zona de surf (fotografía de penachos, La Jolla Shores): la densidad de burbujas escala como a^−2.5 para a<1 mm y a^−4.5 para a>1 mm (el quiebre en a≈1 mm es la escala de Hinze). Medición independiente en canal de oleaje con sonda de fracción de vacío: ley de potencias d^−1.5 a d^−1.7 en diámetro, independiente de la posición y la profundidad.**

> The density of bubbles scales as a−2.5 for a<1 mm and a−4.5 for a>1 mm, where a is bubble radius

*Cómo se aplica:* Si sorteas radios para granos de burbuja, usa PDF ∝ a^−2.5 entre 0.5 y 8 mm (→ 6.5 kHz a 400 Hz). El quiebre a −4.5 por encima de 1 mm significa que las burbujas GRANDES (las graves, las 'glu') son raras: no las metas seguido o suena a arroyo/cascada, no a mar.

<sub>confianza alta · https://doi.org/10.1121/1.420321</sub>

**Ring de una burbuja individual: respuesta impulsional ι(t) = a·sin(2πf t)·e^(−d t). Amortiguamiento (viscoso + radiativo + térmico) d = 0.13/r + 0.0072·r^(−3/2) con r en metros; equivalentemente d = 0.043·f + 0.0014·f^(3/2) con f en Hz. Números calculados: f=500 Hz → d=37 s⁻¹, τ(1/e)=26.9 ms, T60=186 ms, 13.5 ciclos, Q≈42. f=1000 Hz → d=87 s⁻¹, τ=11.5 ms, T60=79 ms, 11.5 ciclos, Q≈36. f=3000 Hz → d=359 s⁻¹, τ=2.8 ms, T60=19 ms, 8.4 ciclos, Q≈26. f=8000 Hz → d=1346 s⁻¹, τ=0.74 ms, T60=5.1 ms, 5.9 ciclos, Q≈19. Además la burbuja SUBE de tono mientras suena si nace cerca de la superficie: f(t)=f0(1+σt) con σ=ξ·d y ξ≈0.1 para burbujas de gota (subida audible ≈ media octava o menos).**

> The energy loss of a resonating bubble due to viscous, radiative, and thermal processes […] results in a damping parameter d given by d = 0.13/r + 0.0072 r^−3/2 […] From Eq. 2 and Eq. 3 it follows that the relation between frequency and damping is given by d = 0.043f + 0.0014 f^3/2.

*Cómo se aplica:* Grano de burbuja en Web Audio: OscillatorNode sinusoidal + GainNode con gain.setValueAtTime(A,t0) y gain.exponentialRampToValueAtTime(A*0.001, t0+6.9/d). Duración total del grano = T60 = 6.9/d (de 5 ms a 190 ms según la frecuencia). Añade el chirp: frequency.linearRampToValueAtTime(f0*(1+0.1*d*T60), t0+T60). Nunca uses un ring 'plano': el amortiguamiento DEPENDE de la frecuencia y ése es el sello de que es agua y no un instrumento.

<sub>confianza alta · https://www.cs.ubc.ca/~kvdoel/publications/tap05.pdf</sub>

**Densidad de eventos y el umbral de 'se disuelve en ruido': tasas de creación de burbujas de hasta 1000/s suenan a goteo o arroyo íntimo; hasta 10 000/s suenan densas pero aún se distingue alguna burbuja suelta; a partir de 100 000/s el resultado es un paisaje continuo donde ya NO se oyen burbujas individuales (lluvia fuerte, cascada) y subir más no cambia nada. Además: bajar el exponente α (que reparte energía hacia burbujas pequeñas) 'crea la ilusión de estar cerca del agua', y subirlo 'crea sensación de distancia'.**

> Bubble creation rates of up to 1000/s produce sounds ranging from dripping to intimate streaming or light rain. Rates up to 10000/s produce sounds which are quite dense but still allow some individual droplets to be heard. Rates up to 100000/s produce blended soundscapes where individual droplets are not heard except occasionally

*Cómo se aplica:* Para un mar LEJANO estás por encima del umbral de fusión: no gastes CPU en granos individuales para el lecho — un ruido conformado ES matemáticamente la suma. Reserva los granos discretos (2–8/s, a −20 dB) solo para el pico de una ola cercana. Si oyes 'glugluteo' individual, tu mar dejó de estar lejos.

<sub>confianza alta · https://www.cs.ubc.ca/~kvdoel/publications/tap05.pdf</sub>

**ESPECTRO AÉREO MEDIDO de surf real (micrófono B&K a 20 m de la línea de marea alta, Hs 0.4–1.5 m): el Leq en tercios de octava se mantiene PLANO ±3 dB entre 100 Hz y 1600 Hz, y a partir de 2000 Hz cae entre 5 y 6 dB/octava. Traducción a densidad espectral: bandas de tercio de octava planas ⇔ ruido ROSA (PSD −3.01 dB/oct); bandas cayendo 5.5 dB/oct ⇔ PSD cayendo 8.5 dB/oct. Es decir: el mar = ruido rosa hasta ~1.6 kHz + una pendiente extra de solo −6 dB/oct por encima.**

> The spectrum above 100 Hz for Leq has the same general shape for most wave heights: it remains reasonably flat (±3 dB) between 100 Hz and 1600 Hz, and it then drops off more steeply (between 5-6 dB/octave) for frequencies above 2000 Hz.

*Cómo se aplica:* ESTE ES EL NÚMERO QUE ARREGLA EL BUG. Ruido rosa → filtro de UN POLO (−6 dB/oct) con corte fijo en 1.6–1.8 kHz. Un BiquadFilterNode 'lowpass' es −12 dB/oct CON pico resonante: es el doble de abrupto que el mar y por eso 'canta'. Usa IIRFilterNode con feedforward=[0.2099], feedback=[1,-0.7901] (one-pole a 1800 Hz @48 kHz) o [0.1783]/[1,-0.8217] (1500 Hz). Y el corte NO SE MUEVE.

<sub>confianza alta · https://jcaa.caa-aca.ca/index.php/jcaa/article/view/2485</sub>

**Nivel y pico espectral del surf aéreo en función de la altura de ola: SPL sube de 60 dB (Hs=0.4 m) a 78 dB (Hs=2.0 m) — 18 dB por un factor 5 en Hs, es decir SPL ∝ Hs^2.57 y AMPLITUD ∝ Hs^1.29. El espectro de tercio de octava depende del tipo de rompiente: pico ancho cerca de 1000 Hz para Hs<1.0 m, y el pico se desplaza a 250–400 Hz para Hs>1.0 m.**

> Results showed that the sound pressure level increased from 60 dB at 0.4 m wave height to 78 dB at 2.0 m wave height. The 1/3 octave spectrum was dependent on the surf type. […] for significant wave heights less than 1.0 m, their spectra show a distinct broad peak near 1000 Hz, with a shifting of the peak to 250-400 Hz for significant wave heights greater than 1.0 m.

*Cómo se aplica:* Chachalacas en calma tiene Hs=0.56 m mediana (< 1 m SIEMPRE) → el pico se queda clavado en ~1 kHz para TODAS las olas. Añade un peaking a 1000 Hz, Q=0.7, +2 a +3 dB, y déjalo FIJO. El pico NO se mueve de ola a ola. Y la ganancia por evento sigue amplitud ∝ H^1.29.

<sub>confianza alta · https://doi.org/10.1121/1.3327815</sub>

**Chachalacas rompe SPILLING (derramante), no plunging, con enorme margen. Parámetro de Iribarren ξ0 = tanβ/√(H0/L0); umbrales de Battjes (1974): ξ0<0.5 spilling, 0.5<ξ0<3.3 plunging, ξ0>3.3 surging. Con los datos reales del Golfo (Hs=0.7 m, Tp=5.1 s → L0=40.6 m, H0/L0=0.0172) y pendientes de playa arenosa 1:20 a 1:60, sale ξ0 = 0.38 (1:20), 0.25 (1:30), 0.19 (1:40), 0.15 (1:50), 0.13 (1:60). Todos MUY por debajo de 0.5.**

*Cómo se aplica:* Spilling significa: NO hay un golpe único y fuerte (el 'crash' del plunging con su cavidad grande y su componente grave). Hay una emisión CONTINUA, distribuida y suave que viaja con el frente durante segundos. Prohibido meter un transitorio percusivo tipo 'crash' — eso es plunging y no corresponde a este mar. El ataque es rápido pero no percusivo.

<sub>confianza alta · https://doi.org/10.9753/icce.v14.26</sub>

**PERIODO REAL del oleaje frente a Veracruz en calma — datos medidos, no supuestos. Boya NOAA/NDBC 42055 (Bahía de Campeche), espectro 1D, 1443 registros con Hm0<0.8 m durante 45 días (jul–ago 2026): Hm0 mediana 0.56 m (p10 0.34, p90 0.75); Tp mediana 4.76 s (p10 3.85, p90 5.56; el 50% del tiempo Tp≈5 s, el 24% ≈4 s, el 18% ≈6 s); Tm02 (paso por cero, = intervalo real entre crestas) mediana 3.64 s (p10 3.27, p90 4.10); anchura espectral ν mediana 0.29 (p10 0.25, p90 0.33). Boya 42002 (Golfo E) confirma: Hs 0.60 m, DPD medio 5.4 s. ⇒ 16.5 olas/min por Tm02, 12.6 olas/min por Tp.**

*Cómo se aplica:* MATA EL LFO DE 8.3 s. El periodo de 8–14 s es swell del Pacífico; el Golfo de México es una cuenca chica y su mar de calma tiene Tm02 = 3.6 s ± 1.05 s. Sortea el intervalo entre eventos de una Normal(3.64, 1.05) truncada a [2.0, 7.0] s. Y ν=0.29 significa espectro ANCHO: casi no hay 'sets' definidos — nada de una modulación lenta bonita y periódica de grupos; la irregularidad es el sonido.

<sub>confianza alta · https://www.ndbc.noaa.gov/data/realtime2/42055.data_spec</sub>

**CUÁNTAS OLAS SUENAN A LA VEZ (derivado de geometría + datos medidos). El sonido de una ola dura lo que tarda su frente en cruzar la zona de rompiente, porque la región activa viaja con el bore (Deane 1997). Con hb = 1.1·Hs/0.78 = 0.99 m y c̄ = √(g·0.55·hb) = 2.31 m/s: pendiente 1:20 → ancho 20 m, cruce 8.6 s → 2.3 olas simultáneas; 1:30 → 30 m, 12.8 s → 3.4; 1:40 → 39 m, 17.1 s → 4.5; 1:50 → 49 m, 21.4 s → 5.6; 1:60 → 59 m, 25.7 s → 6.8 (usando Tm02=3.8 s). Rango físico honesto: 2 a 6 olas superponiéndose; valor central 3–4. Dato independiente de campo: con olas de 7 s, un promedio de 5 minutos contiene 43 eventos de rotura (8.6/min).**

> Assuming 7-s period waves, the 5-minute averaging period for Leq would include 43 breaking wave events averaged into one quantity.

*Cómo se aplica:* ESTA ES LA QUEJA LITERAL DEL DUEÑO ('no hay múltiples olas suavemente superponiéndose'). Necesitas 4 voces independientes (rango 2–6), cada una con su propia fuente de ruido DECORRELACIONADA (4 buffers distintos, no el mismo buffer con delays: eso hace comb filtering audible) y su propio disparo asíncrono. Cada evento dura 5–12 s y arrancan cada ~3.6 s → siempre hay 2–4 sonando encimadas.

<sub>confianza media · https://jcaa.caa-aca.ca/index.php/jcaa/article/view/2485</sub>

**AMPLITUD POR EVENTO: las alturas de ola siguen Rayleigh, y la amplitud acústica va como H^1.29. Percentiles de ganancia por evento respecto a la ola MEDIANA: p5 = −14.6 dB, p10 = −10.5 dB, p25 = −4.9 dB, p50 = 0 dB, p75 = +3.9 dB, p90 = +6.7 dB, p95 = +8.2 dB, p99 = +10.6 dB. Solo el 13.5% de las olas supera Hs. La ola más fuerte esperada en 5 minutos (82 olas a Tm02=3.64 s) está +10.3 dB sobre la mediana; en 20 olas, +8.2 dB.**

*Cómo se aplica:* La ganancia de cada evento se sortea, no se fija: g = (u/0.833)^1.29 con u = √(−ln(1−rand())). Rango práctico −11 a +11 dB, mediana en el centro. Esto es lo que produce la sensación de 'sets' SIN necesidad de un LFO de grupos: la estadística de Rayleigh sola genera rachas fuertes y calmas. Descarta (silencio) el ~20% más bajo: esas olas no rompen.

<sub>confianza media · https://doi.org/10.1121/1.3327815</sub>

**ABSORCIÓN ATMOSFÉRICA a 28 °C y 80 % HR (clima de Chachalacas), calculada con la formulación ISO 9613-1 / Bass et al. 1995 e implementación validada contra la Tabla 2 de ISO 9613-2 (mi código reproduce exactamente las filas 10 °C/70 % = 0.1/0.4/1.0/1.9/3.7/9.7/33/118 dB/km y 20 °C/70 % = 0.1/0.3/1.1/2.8/5.0/9.0/23/78 dB/km): 125 Hz 0.02 dB/100 m · 250 Hz 0.09 · 500 Hz 0.29 · 1 kHz 0.70 · 2 kHz 1.22 · 4 kHz 2.22 · 8 kHz 5.75 · 16 kHz 19.5 dB/100 m. En dB/km: 1 kHz 7.0 · 4 kHz 22.2 · 8 kHz 57.5. Nota contraintuitiva: el aire cálido y húmedo absorbe MENOS a 4–8 kHz que el aire de referencia a 15 °C/70 % (22 vs 27 dB/km a 4 kHz) pero MÁS a 1–2 kHz (7.0 vs 4.1 dB/km a 1 kHz), porque el pico de relajación del oxígeno se desplaza hacia arriba con la humedad.**

*Cómo se aplica:* Filtro de distancia (relativo a 500 Hz) a 300 m: 1 kHz −1.2 dB, 2 kHz −2.8, 4 kHz −5.8, 8 kHz −16.4, 12 kHz −33.7. A 1 km: 4 kHz −19.2, 8 kHz −54.5. Implementación: un SEGUNDO one-pole en cascada con corte en ~4.5 kHz reproduce bien el tramo de 300 m; para 1 km baja el corte a ~2.2 kHz. Es un ladeo suave, no una pared.

<sub>confianza alta · https://doi.org/10.1121/1.412989</sub>

**LA DISTANCIA NO ES UN LOWPASS FUERTE — y esto es la trampa conceptual del intento fallido. A 300 m la absorción atmosférica solo quita 1.2 dB a 1 kHz y 5.8 dB a 4 kHz respecto a 500 Hz; la pendiente equivalente de densidad espectral pasa de −3.0 dB/oct (fuente) a solo −3.4 dB/oct entre 125 y 500 Hz. Es decir: entre una ola que rompe a 200 m y otra a 300 m, la diferencia de INCLINACIÓN espectral es de 0.4 dB a 1 kHz, 1.9 dB a 4 kHz y 5.5 dB a 8 kHz. Ese es el techo físico del 'movimiento espectral' permitido.**

*Cómo se aplica:* REGLA DURA que explica el 'bong': la variación de timbre permitida entre olas es ±0 dB por debajo de 1 kHz, ±2 dB a 4 kHz y ±5 dB a 8 kHz — un highshelf sutil, nada más. Barrer un corte de 600 a 3800 Hz mueve el centroide espectral 2.7 octavas: eso son ~30 dB de cambio en la región de 2–4 kHz, entre 6 y 15 veces más de lo que la física permite. Un centroide que se desplaza de forma continua y periódica ES una altura tonal para el oído: por eso suena a gong. La distancia se comunica con MENOS transitorios resueltos y MÁS continuo, no con un filtro que se mueve.

<sub>confianza alta · https://doi.org/10.1121/1.412989</sub>

**El sonido de la ola es proporcional a la TASA de creación de burbujas, no a la cantidad de aire o espuma presente (corolario directo de Deane 1997: 'la producción de sonido está asociada a la FORMACIÓN de penachos de burbujas'). Las burbujas ya formadas no vuelven a sonar salvo que se re-exciten; además, dentro de un penacho denso la radiación está fuertemente amortiguada y solo emite una cáscara exterior delgada. Mecanismos que Bolin & Åbom enumeran para el surf aéreo, en orden de frecuencia decreciente: burbujas individuales oscilando (>500 Hz), burbujas reventando en la superficie (agudo, cola de espuma), oscilación colectiva del penacho (grave), ruido de impacto (grave).**

> They proposed several mechanisms for sound generation, including impact noise, single oscillating bubbles, collective bubble oscillation, and bursting bubbles.

*Cómo se aplica:* Envolvente por ola: ATAQUE rápido (0.4–0.9 s: el colapso de la cresta es el pico de entrainment) → CAÍDA larga (4–9 s: el rodillo se satura y entrena cada vez menos aire), asimetría ≈1:8. Y una TERCERA capa retrasada 1.5–3 s: la espuma reventando, ruido rosa con highpass a 2 kHz y one-pole a 6 kHz, a −12/−18 dB — es el 'shhh' del retroceso. Esa cola brillante y retrasada es lo que hace que el oído diga 'agua' y no 'ruido filtrado'.

<sub>confianza alta · https://jcaa.caa-aca.ca/index.php/jcaa/article/view/2485</sub>

**Las burbujas dominan también energéticamente el proceso físico de la rotura: en simulación LES de dos fases, la disipación inducida por burbujas es más del 50 % de la disipación total en la región de rotura, y las burbujas dispersas amortiguan la energía cinética turbulenta integrada entre ~20 % (plunging grande) y ~50 % (spilling).**

> We find that the total bubble-induced dissipation accounts for more than 50 % of the total dissipation in the breaking region. […] the integrated TKE in the breaking region is damped by the dispersed bubbles by approximately 20 % for a large plunging breaker to 50 % for spilling breakers.

*Cómo se aplica:* Refuerza que en un spilling (nuestro caso) la fenomenología está aún MÁS dominada por burbujas que en un plunging: menos golpe, más nube. Justifica dedicar el 85 % del presupuesto sonoro al lecho de burbujas y ~15 % a la envolvente de la ola.

<sub>confianza alta · https://doi.org/10.1017/jfm.2014.637</sub>

**Contexto de fondo (marco general de ruido ambiental): la banda media 500 Hz–25 kHz del ruido ambiente oceánico está dominada por la agitación de la superficie del mar: rompientes, spray, formación y colapso de burbujas y lluvia. Es la misma familia de fuentes en aire.**

> Ambient noise in the mid-frequency band is primarily due to sea-surface agitation: breaking waves, spray, bubble formation and collapse, and rainfall.

*Cómo se aplica:* Confirma que la banda perceptualmente crítica del mar es 500 Hz–8 kHz. Debajo de 100 Hz, en grabaciones reales de playa, lo que hay suele ser ruido de VIENTO en el micrófono, no olas — por eso conviene un highpass de 2.º orden a 80–100 Hz: quita un rumble que el oyente no asocia a mar y que en móviles solo consume headroom.

<sub>confianza alta · https://doi.org/10.3354/meps08353</sub>

**EL Q NO ES EL CULPABLE — y esto hay que decirlo primero para no perder un ciclo arreglando lo que no está roto. En Web Audio, el atributo Q de un BiquadFilterNode tipo lowpass/highpass está EN dB, no es el Q clásico: el motor usa 10^(Q/20). El código actual usa Q=0.7 → Q_cookbook = 1.084 → pico de resonancia de solo +1.74 dB. Medí el impulso de ese biquad exacto a 1000 Hz: T60 de ring-down = 2.6 ms (teoría T60 = 2.2·Q/f0). Un filtro que suena 2.6 ms NO puede producir un «bong». La tabla medida: Q=0.7dB→+1.7dB/2.6ms · Q=6dB→+6.3dB/4.5ms · Q=12dB→+12.1dB/8.9ms · Q=20dB→+20.0dB/22.3ms · Q=24dB→+24.0dB/34.8ms. El umbral donde el barrido empieza a cantar como tono es alrededor de Q=15-20 dB (T60 12-22 ms, ~12-22 ciclos de ring). Sergio está a 2.6 ms de ahí.**

> For `lowpass` and `highpass`, the `Q` value is interpreted to be in dB. For these filters the value range is [-Q, Q] where Q is the largest value for which 10^(Q/20) does not overflow the bound above.

*Cómo se aplica:* NO tocar el Q. Ya está prácticamente plano. Cualquier tiempo invertido en bajarlo es tiempo perdido. Si algún día se usa un bandpass, ojo: en bandpass/notch/peaking el Q SÍ es el Q clásico (no dB), o sea que Q=7 en un bandpass es un filtro auditivo, mientras Q=7 en un lowpass son 7 dB de pico.

<sub>confianza alta · https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/Q</sub>

**LA CAUSA REAL #1 — COMODULACIÓN TOTAL. Medí la señal actual (mismo buffer rosa de 6 s compartido por las dos capas + un lowpass barrido + una ganancia) descompuesta en 14 bandas ERB de 150 a 8000 Hz, extrayendo el sobre de cada banda con compresión coclear 0.3: la correlación media entre los sobres de bandas distintas es +0.659. Una versión con 14 bandas de ruido independientes da +0.137, y ruido rosa plano da +0.003. McDermott & Simoncelli midieron exactamente esta estadística en texturas reales y encontraron que la comodulación alta es la firma de EVENTOS DE BANDA ANCHA (aplausos, fuego, impactos), mientras que el agua da respuestas de canal casi independientes. Con 0.66 de comodulación el oído aplica «destino común» (common fate) y funde los 30 canales cocleares en UN SOLO objeto sonoro. Un objeto con ataque lento y caída larga = una cosa golpeada. El dueño no se equivocó: identificó correctamente la causa física.**

> The cochlear correlations (C) distinguish textures with broadband events that activate many channels simultaneously (e.g., applause), from those that produce nearly independent channel responses (many water sounds...). ... Cross-band correlation, or "comodulation," is common in natural sounds, and we found it to be to be a major source of variation among sound textures. The stream, for instance, contains much weaker comodulation.

*Cómo se aplica:* MÉTRICA OBJETIVA para el banco de audio: comodulación media entre bandas < 0.35. Se calcula igual que la medí (14 bandas ERB → sobre analítico → suavizar a 30 Hz → env^0.3 → corrcoef → media del triángulo superior). Es la prueba de aceptación: si sale >0.5, sigue sonando a UNA cosa. Implicación de arquitectura: nunca un solo buffer de ruido para varias capas, y nunca un solo filtro para todo el espectro.

<sub>confianza alta · https://mcdermottlab.mit.edu/papers/McDermott_Simoncelli_2011_sound_texture_synthesis.pdf</sub>

**LA CAUSA REAL #2 — CONSTRUYÓ LA ENVOLVENTE DE UN IDIÓFONO GOLPEADO. Medí la trayectoria del barrido actual sobre ruido rosa: cuando el corte va de 600 a 3800 Hz, el centroide espectral perceptual (escala ERB) sube de 194 a 558 Hz y el nivel sube 1.57 dB — las dos cosas MONÓTONAMENTE y con la MISMA variable escalar (`suave`). Eso es literalmente la firma acústica de un cuerpo resonante golpeado: en un gong o un tam-tam los modos agudos se amortiguan más rápido que los graves, así que el brillo cae junto con la amplitud durante toda la caída. Además la envolvente `swash()` es 22% subida (1.83 s) + 78% caída (6.47 s) = perfil de golpe: ataque rápido, cola larga. Sergio no sintetizó agua: sintetizó, con precisión física, un objeto golpeado que se apaga en 6.5 s.**

> The moments of the modulation bands, particularly the variance, indicate the rates at which cochlear envelopes fluctuate, allowing distinction between rapidly modulated sounds (e.g., insect vocalizations) and slowly modulated sounds (e.g., ocean waves).

*Cómo se aplica:* REGLA DURA: el brillo y el nivel NO pueden moverse con la misma variable. Solución concreta: que las bandas graves lleven la subida de nivel y las bandas agudas entren DESFASADAS 0.3-0.8 s (en el mar real primero llega el retumbo grave del rompiente y después el siseo de la espuma). Ese desfase temporal por sí solo rompe el destino común y mata el «bong». Alternativa complementaria: que el brillo suba en la SUBIDA pero se mantenga alto durante parte de la retirada (el siseo de la espuma escurriendo persiste después de que el retumbo bajó) — así deja de ser una caída monótona correlacionada.

<sub>confianza alta · https://mcdermottlab.mit.edu/papers/McDermott_Simoncelli_2011_sound_texture_synthesis.pdf</sub>

**LA CAUSA REAL #3 — QUÉ DELATA A UN FILTRO AL OÍDO: modula el TIMBRE sin modular el NIVEL. Medí: en el barrido 600→3800 Hz sobre ruido rosa, la energía total sube solo 1.57 dB mientras el centroide ERB se mueve 1.5 octavas y el porcentaje de energía sobre 1 kHz pasa de 0.98% a 33.9%. Un cambio de color enorme con un cambio de volumen casi nulo, aplicado idénticamente a todo el espectro a la vez. Ninguna fuente física del mundo hace eso: una fuente que se pone más brillante se pone más fuerte, porque el brillo viene de que se agregaron eventos nuevos (más burbujas pequeñas), no de que un velo se corrió. Eso es la definición literal de un pedal wah. Los 5.6 dB de dinámica que reporta MISION.md salen casi todos de la rampa de ganancia (0.5→1.2 = 7.6 dB), no del filtro.**

> the salient properties of water sounds are conveyed by sparsely distributed, independent, bandpass acoustic events

*Cómo se aplica:* Prohibir el barrido de corte. El brillo se cambia moviendo las GANANCIAS RELATIVAS de bandas fijas (más energía en las bandas altas = más burbujas pequeñas = un evento nuevo), nunca corriendo una frecuencia de corte. Y la ola debe hinchar el NIVEL de banda ancha: apuntar a 6-10 dB de excursión broadband, no 5.6 dB de los cuales 1.6 son color.

<sub>confianza alta · https://mcdermottlab.mit.edu/papers/McDermott_Simoncelli_2011_sound_texture_synthesis.pdf</sub>

**EL «TONO» AUDIBLE DE UN LOWPASS TIENE NOMBRE Y NÚMEROS: noise edge pitch (NEP). Un ruido de banda ancha con un borde espectral marcado genera una altura tonal audible cerca de la frecuencia de corte, desplazada típicamente 2-5% HACIA DENTRO de la banda (o sea, un lowpass a 1000 Hz canta ~950-980 Hz). Oyentes entrenados reconocen intervalos musicales entre dos NEP. La altura DESAPARECE cuando el borde se acerca a 5000 Hz. En un experimento separado sobre la pendiente del borde, los efectos de borde en ruido lowpass fueron fuertes con faldas de 96 y 72 dB/oct y desaparecieron con 36 dB/oct.**

> Monaural noise edge pitch (NEP) is evoked by a broadband noise with a sharp falling edge in the power spectrum. The pitch is heard near the spectral edge frequency but shifted slightly into the frequency region of the noise. Thus, the pitch of a lowpass (LP) noise is matched by a pure tone typically 2%-5% below the edge... pitch tends to disappear as the edge frequency approaches 5000 Hz

*Cómo se aplica:* MATIZ IMPORTANTE: medí que el biquad de Sergio tiene pendiente de solo −13.6 dB/oct (−11.0 dB a +1 oct, −24.2 a +2 oct, −37.7 a +3 oct), muy por debajo de los 36 dB/oct donde el efecto de borde ya se apaga. Así que el edge pitch NO explica su «bong» — pero SÍ es la razón por la que NUNCA hay que llegar a una solución de «pongo un lowpass más empinado para que suene más lejos». Dos reglas: (1) para «lejanía» usar una INCLINACIÓN suave sin rodilla, no un lowpass; (2) si alguna vez hace falta un corte duro, ponerlo arriba de 5 kHz, donde el edge pitch ya no existe.

<sub>confianza alta · https://pmc.ncbi.nlm.nih.gov/articles/PMC7112715/</sub>

**LA PERIODICIDAD SE DETECTA BRUTALMENTE FÁCIL — los regímenes clásicos de ruido congelado repetido (Guttman & Julesz 1963, resumidos verbatim por Warren et al. 2001): período <50 ms → se oye como ALTURA TONAL; 50-250 ms → «motorboating»; 250 ms-1 s → «whooshing». Y lo más letal para un loop de ambiente: al seguir escuchando un ruido congelado en el rango del «whooshing», el oyente empieza a oír componentes breves recurrentes —«clanks and thumps»— que son característicos de ESA forma de onda concreta. Warren et al. demostraron además reconocimiento de la recurrencia de porciones de ruido congelado con intervalos de 10 segundos o más.**

> listeners can hear iteration of these stochastic signals effortlessly as "motorboating" for repetition periods ranging from 50 to 250 msec and as "whooshing" from 250 msec to 1 sec. ... with continued listening to whooshing (but not motorboating) RFNs, individuals hear recurrent brief components such as clanks and thumps that are characteristic of the particular waveform.

*Cómo se aplica:* El buffer actual es de 6 s, en loop, y —peor— es el MISMO objeto para las dos capas (`const ruido = bufferRuidoRosa(6)` se pasa a `rompiente` y a `fondo`). 6 s cae de lleno en la zona donde el oído aprende «clanks and thumps» identificables. La corrección no es alargar el loop: es ELIMINARLO. Un AudioWorklet que genera ruido muestra a muestra no tiene período, pesa lo mismo (cero) y cierra el tema para siempre. Si por compatibilidad hay que usar buffers, usar uno distinto por banda, con `playbackRate` en razones irracionales y offsets de arranque aleatorios.

<sub>confianza alta · https://doi.org/10.3758/bf03200511</sub>

**CUÁNTAS VUELTAS TARDA EL OÍDO EN APRENDERSE EL LOOP: ~5. McDermott, Wrobleski & Oxenham demostraron que el sistema auditivo extrae una fuente sonora identificándola como el patrón que SE REPITE dentro de mezclas cambiantes; el rendimiento ya mejora significativamente con DOS repeticiones y satura alrededor de CINCO. Crucialmente, el beneficio depende del número de mezclas DISTINTAS, no del número total de presentaciones: cuando la misma mezcla se repite 10 veces, se oye como una sola fuente y el objetivo no emerge. En paralelo, Agus, Thorpe & Pressnitzer midieron detección de repeticiones dentro de ruidos de hasta 4 s de largo: el aprendizaje es no supervisado, aparece de golpe («abruptly near-perfect») y los ruidos se recuerdan durante varias semanas.**

> Performance was significantly improved even with two mixtures [t(9)=3.66, P = 0.005] and appeared to asymptote with about five mixtures. ... The ability to hear the target sound thus appears to depend on the number of different mixtures that a listener hears, not on the total number of target presentations.

*Cómo se aplica:* Con buffer de 6 s: a los 30 segundos de escucha el visitante ya tiene el loop memorizado y a partir de ahí el sitio suena a máquina. Y con la ley de las 'mezclas distintas': como las dos capas comparten el mismo buffer, no hay mezclas distintas — es la misma mezcla repitiéndose, que es justo la condición donde todo se funde en un solo objeto. Regla: el ruido no se repite nunca, y cada banda tiene su propia realización estocástica.

<sub>confianza alta · https://mcdermottlab.mit.edu/papers/McDermott_Wrobleski_Oxenham_2011_source_repetition.pdf</sub>

**CUÁNTOS EVENTOS SIMULTÁNEOS HACEN FALTA PARA QUE SEA «TEXTURA» — hay dos escalas y hay que respetar las dos. (a) Límite superior de lo contable: la percepción de objetos concurrentes se satura en 2-3. En el estudio de ERP de objetos concurrentes los oyentes reportaban predominantemente DOS sonidos, y solo con manipulaciones aplicadas a elementos distintos reportaban dos y tres con igual probabilidad; el clásico «cocktail party» simulado llega hasta tres fuentes. (b) Escala del agua, medida por van den Doel con síntesis física de burbujas: hasta 1.000 burbujas/s se oye de goteo a arroyo íntimo o lluvia ligera; hasta 10.000/s es denso pero todavía se distinguen gotas individuales; hasta 100.000/s ya es un paisaje fundido donde no se oyen gotas salvo ocasionalmente (lluvia fuerte, cascada); y por encima de eso no hay diferencia audible.**

> Bubble creation rates of up to 1000/s produce sounds ranging from dripping to intimate streaming or light rain. Rates up to 10000/s produce sounds which are quite dense but still allow some individual droplets to be heard. Rates up to 100000/s produce blended soundscapes where individual droplets are not heard except occasionally, such as heavy rain or waterfalls. Yet higher bubble creation rates produce no appreciable difference anymore.

*Cómo se aplica:* El hueco entre 3 y 100.000 es lo que hace imposible resolver esto agendando nodos: Web Audio no programa 10^5 eventos/s. La conclusión de arquitectura es que la capa densa se alcanza ESTADÍSTICAMENTE (ruido por banda con sobres independientes = el límite estadístico de infinitas burbujas), y solo la capa rala se agenda como eventos reales, a 2-6 eventos/s y a −25/−35 dB del lecho, para que nunca haya más de ~3 objetos contables a la vez.

<sub>confianza alta · http://persianney.com/kvdoelcsubc/publications/tap05.pdf</sub>

**EL ANCHO DE BANDA DE CADA EVENTO IMPORTA, Y ES ~1 ERB. McDermott encontró que el agua se sintetiza convincentemente con solo las estadísticas marginales por canal coclear (media, varianza, asimetría, curtosis del sobre) — pero SOLO si el banco de filtros tiene los anchos de banda del oído biológico. Con filtros más estrechos o más anchos que los auditivos, el percepto de agua desaparece. Su banco: 30 filtros espaciados en ERB de 52 a 8844 Hz. Calculé sus Q equivalentes (Q = fc/ERB, con ERB = 24.7·(4.37·f/1000+1) de Glasberg & Moore): el Q sube de 1.7 a 60 Hz hasta 9.0 a 8844 Hz, y ya está entre 7 y 9 desde los 700 Hz. Centros de un banco práctico de 16 bandas de 60 Hz a 9 kHz: 60, 135, 230, 349, 499, 688, 926, 1226, 1604, 2080, 2680, 3435, 4387, 5586, 7097, 9000 Hz.**

> It thus seems that the bandwidths of biological auditory filters are comparable to those of the acoustic events produced by water, and that water sounds often have remarkably simple structure in peripheral auditory representations.

*Cómo se aplica:* Números directos al código: 14-16 BiquadFilterNode tipo 'bandpass' en esos centros, con Q≈7 (en bandpass el Q SÍ es el Q clásico, no dB — a diferencia del lowpass). No usar menos de ~12 bandas ni bandas más anchas de una octava: un banco de 3 bandas anchas no produce el percepto de agua, produce un ecualizador.

<sub>confianza alta · https://mcdermottlab.mit.edu/papers/McDermott_Simoncelli_2011_sound_texture_synthesis.pdf</sub>

**LOS TRANSITORIOS SON LA ESTADÍSTICA QUE FALTA Y ES LA MÁS DETERMINANTE. McDermott aisló la estadística C2 (correlaciones entre bandas de modulación DENTRO de un canal), que codifica las relaciones de fase que producen ataques o caídas abruptas. Para los sonidos con asimetría temporal (explosiones, golpes de tambor), la preferencia por el set completo de estadísticas frente al set sin C2 fue mayor que en el 99.96% de los subconjuntos aleatorios. También encontraron que forzar los sobres a NO ser dispersos (tomando varianza, asimetría y curtosis del ruido rosa) degrada la realidad: el ruido rosa está en el extremo inferior de dispersión.**

> The preference for the full set of statistics was larger in the asymmetric sounds than in 99.96% of other subsets, confirming that the C2 correlations were particularly important for capturing asymmetric structure.

*Cómo se aplica:* El archivo actual tiene C2 = cero (ruido rosa continuo por un filtro suave: no hay un solo ataque en toda la pieza) y dispersión de sobre en el extremo malo. Ésa es exactamente la razón de que suene a «sonido sostenido». Corrección: los sobres por banda no deben ser ruido gaussiano suavizado sino ruido suavizado ELEVADO A UNA POTENCIA (3ª o 4ª) para volverlo disperso — picos separados por valles, no una ondulación. Y encima, una capa rala de transitorios reales con ataque <1 ms.

<sub>confianza alta · https://mcdermottlab.mit.edu/papers/McDermott_Simoncelli_2011_sound_texture_synthesis.pdf</sub>

**FÍSICA DE LA BURBUJA, PARA FABRICAR LOS TRANSITORIOS CON NÚMEROS REALES (van den Doel, derivado de Minnaert 1933 y Leighton). Frecuencia: f = 3/r con r en metros. Amortiguamiento en función de la frecuencia: d = 0.043·f + 0.0014·f^(3/2). Impulso: ι(t) = a·sin(2πft)·e^(−dt). Chirp ascendente (la burbuja que sube): f(t) = f0·(1+σt) con σ = ξ·d, y ξ = 0.1 es el valor que sonó más real para gotas de agua en su estudio con 19 sujetos. Tabla que calculé con esas fórmulas — radio → f0 → T60: 0.5 mm→6000 Hz→7.6 ms · 1 mm→3000 Hz→19 ms · 2 mm→1500 Hz→47 ms · 3 mm→1000 Hz→79 ms · 6 mm→500 Hz→186 ms · 10 mm→300 Hz→343 ms · 15 mm→200 Hz→550 ms. Con ξ=0.1 cada burbuja sube +909 cents (casi una sexta mayor) a lo largo de su vida. Los sujetos calificaron como más realistas los radios de 2-7 mm (= 430-1500 Hz).**

> f = 3/r, with r the bubble radius in meters. ... d = 0.043f + 0.0014f^{3/2}. ... For sounds associated with drops a value of roughly ξ = 0.1 seems right. ... The results suggest that bubbles with radii in the range 2−7mm are most readily associated with the sound of a water drop.

*Cómo se aplica:* Cada transitorio en Web Audio = un OscillatorNode senoidal con frecuencia rampeada (setValueAtTime + linearRampToValueAtTime a f0·1.68 al final) y una GainNode con setTargetAtTime de constante de tiempo τ = 1/d. Para mar lejano y tranquilo: poblar radios de 2 a 10 mm (300-1500 Hz), τ de 7 a 50 ms. IMPORTANTE: van den Doel encontró que quitar las burbujas más pequeñas (0.2 mm) SIEMPRE degrada la calidad — hay que dejar una cola fina de burbujas chiquitas aunque sean muy tenues.

<sub>confianza alta · http://persianney.com/kvdoelcsubc/publications/tap05.pdf</sub>

**CÓMO SE SINTETIZA LA «LEJANÍA», SEGÚN EL PROPIO MODELO FÍSICO: no es un filtro, es la DISTRIBUCIÓN DE TAMAÑOS. van den Doel controla con un exponente α cuánta energía se inyecta a las burbujas según su tamaño, y reporta que valores pequeños de α (más energía a las burbujas pequeñas) crean la ilusión de estar CERCA del agua, mientras que valores grandes crean sensación de DISTANCIA — porque en la naturaleza los componentes agudos del agua se atenúan más con la distancia. Y la distribución de tamaños 1/r^γ con γ entre 0 y 3 da sonidos de corriente, mientras que por encima de γ≈5 suena a lluvia.**

> Smaller values of α, which inject more energy into smaller bubbles, create the illusion of moving close to the water, whereas larger values create a feeling of distance. This is probably due to the fact that in nature the higher pitched components of water sounds are more attenuated by the environment at a distance than the low frequency components.

*Cómo se aplica:* Para «mar lejano»: pesar la población de burbujas hacia radios grandes (200-1500 Hz) y dejar la cola de burbujas pequeñas MUY tenue pero presente. En la implementación por bandas esto se traduce en las ganancias estáticas del banco: las bandas de 200-1500 Hz llevan el cuerpo, las de 3-9 kHz quedan 15-25 dB por debajo. Mantener γ bajo (0-3): mar/corriente, no lluvia.

<sub>confianza alta · http://persianney.com/kvdoelcsubc/publications/tap05.pdf</sub>

**LA CURVA DE «LEJOS» ES UNA INCLINACIÓN, NO UN CORTE — y tiene números exactos. Implementé la fórmula de absorción atmosférica de la ISO 9613-1 para aire de Chachalacas (25 °C, 80% HR, 1 atm). Atenuación en dB/km: 63 Hz→0.07 · 125→0.26 · 250→0.95 · 500→2.94 · 1k→6.35 · 2k→10.71 · 4k→21.24 · 8k→60.54 · 16k→213.24. A 300 m del rompiente eso es: 250 Hz −0.3 dB · 1 kHz −1.9 dB · 2 kHz −3.2 dB · 4 kHz −6.4 dB · 8 kHz −18.2 dB · 16 kHz −64.0 dB. Entre 1 y 8 kHz eso equivale a una pendiente promedio de −5.4 dB/octava, CONTINUA y sin ninguna rodilla.**

*Cómo se aplica:* El «filtro de distancia» correcto son ganancias estáticas por banda que reproduzcan esa inclinación: sobre el rosa (−3 dB/oct) hay que añadir −5 dB/oct arriba de 1 kHz, total ≈ −8 dB/oct en la parte alta. Cero rodillas, cero barridos, cero riesgo de edge pitch. Y ojo: por debajo de 1 kHz el aire casi no atenúa (−0.3 dB a 250 Hz en 300 m), así que la lejanía NO significa quitar graves — significa quitar SOLO agudos y de forma gradual.

<sub>confianza alta · https://www.iso.org/standard/17426.html</sub>

**LA MODULACIÓN LENTA QUE YA TIENE ES SEGURA — el peligro está en 4 Hz. La fuerza de fluctuación (fluctuation strength) tiene característica de paso-banda con máximo alrededor de 4 Hz, y Fastl da el modelo F ≈ ΔL / ((f_mod/4 Hz) + (4 Hz/f_mod)). El swash actual tiene fundamental 0.1205 Hz (período 8.3 s) con armónicos a 0.241 (−8 dB), 0.361 (−15 dB), 0.482 (−21 dB) y 0.602 Hz (−24 dB). Evaluando el modelo: peso 0.030 a 0.12 Hz y 0.089 a 0.36 Hz, contra el máximo de 0.500 a 4 Hz. O sea, la ola lenta aporta ~6-18% de la molestia que aportaría la misma modulación a 4 Hz.**

> Fluctuation strength shows, as a function of modulation frequency, a bandpass characteristic with a maximum around 4 Hz. ... F approximately delta L/((fmod/4 Hz)+(4 Hz/fmod))

*Cómo se aplica:* El período de 8.3 s no es el problema y no hay que tocarlo. PERO: al añadir el «grano» por banda (los sobres dispersos), hay que limitarlos en banda para que NO metan energía en 2-8 Hz, que es donde la fluctuación se vuelve molesta y donde el oído la lee como algo que le habla (es el ritmo silábico del habla). Rango seguro para los sobres de grano: 0.3-1.5 Hz de contenido dominante, con la cola de transitorios por arriba de 20 Hz donde ya es rugosidad y no fluctuación.

<sub>confianza alta · https://doi.org/10.1016/0378-5955(82)90034-x</sub>

**MÁS ALLÁ DE ~1 SEGUNDO EL OYENTE YA NO OYE DETALLE, OYE PROMEDIOS. McDermott, Schemitsch & Simoncelli probaron fragmentos de textura de 40, 91, 209, 478, 1093 y 2500 ms. Cuando los fragmentos tenían estadísticas de largo plazo DISTINTAS, el rendimiento MEJORÓ con la duración. Cuando tenían las mismas estadísticas pero distinto detalle temporal, el rendimiento fue alto en fragmentos breves y DECAYÓ paradójicamente con la duración, pese a recibir más información. Conclusión: pasada una longitud moderada, la representación del cerebro se limita a estadísticas promediadas en el tiempo.**

> when listeners discriminated different examples of the same texture, performance declined with duration, a paradoxical result given that the information available for discrimination grows with duration. These results indicate that once these sounds are of moderate length, the brain's representation is limited to time-averaged statistics

*Cómo se aplica:* Esto es liberador para el presupuesto de CPU: no hace falta que cada milisegundo sea físicamente correcto. Lo que tiene que estar bien son las ESTADÍSTICAS sobre ventanas de ~1-2 s: comodulación baja, sobres dispersos, potencia de modulación por banda. Es la justificación teórica de por qué se puede sustituir 100.000 burbujas/s por ruido con el sobre correcto. Y también dice que el barrido de 8.3 s es demasiado lento para «esconderse» en el promedio: cae en la escala donde el oyente sigue percibiendo el gesto como un evento.

<sub>confianza alta · https://mcdermottlab.mit.edu/papers/McDermott_Schemitsch_Simoncelli_2013_summary_statistics.pdf</sub>

**LO QUE HACE RELAJANTE A UN AMBIENTE NO ES EL NIVEL, ES QUÉ RECONOCE EL OYENTE. El modelo de componentes principales de percepción de paisajes sonoros (100 oyentes, 50 grabaciones binaurales, 116 escalas de atributos) arroja tres dimensiones: Placidez (Pleasantness, 50% de la varianza), Vivacidad (eventfulness, 18%) y Familiaridad (6%). Los paisajes dominados por sonidos tecnológicos resultan desagradables y los dominados por sonidos naturales resultan agradables — y estas relaciones se mantuvieron DESPUÉS de controlar por el volumen total (N10 de Zwicker), lo que demuestra que las propiedades «informacionales» contribuyen sustancialmente.**

> Soundscape excerpts dominated by technological sounds were found to be unpleasant, whereas soundscape excerpts dominated by natural sounds were pleasant... These relationships remained after controlling for the overall soundscape loudness (Zwicker's N(10)), which shows that 'informational' properties are substantial contributors to the perception of soundscape.

*Cómo se aplica:* Traducción directa: bajarle el volumen a un sonido que se oye artificial no lo vuelve relajante. Mientras el visitante reconozca «un filtro barriendo», el efecto es el de un sonido tecnológico — desagradable — sin importar a qué dBFS esté. El objetivo del rediseño es cambiar la CATEGORÍA que el oyente reconoce, no el nivel. Segunda lectura: hay que mantener la Vivacidad BAJA — nada de eventos salientes, sorpresas ni picos; un mar tranquilo es placentero y poco vivaz.

<sub>confianza alta · https://doi.org/10.1121/1.3493436</sub>

**LA TONALIDAD ES UN PREDICTOR DIRECTO DE MOLESTIA — y el «bong» es exactamente tonalidad emergente. En los estudios de molestia de ruido con métricas psicoacústicas, reducir los niveles de sonoridad, sharpness, TONALIDAD y rugosidad/fuerza de fluctuación mejora la molestia; y en el estudio de laboratorio de molestia a corto plazo, el análisis de parámetros psicoacústicos destacó el vínculo significativo entre molestia y tonalidad, sharpness y sonoridad.**

> The findings indicate that reducing the levels of loudness, sharpness, tonality, and roughness or fluctuation strength led to an improvement in annoyance.

*Cómo se aplica:* Cuatro métricas a vigilar en el banco de audio del sitio, todas hacia abajo: sonoridad, sharpness (energía en agudos ponderada — otra razón para la inclinación de lejanía), TONALIDAD (cero picos espectrales estables, cero alturas emergentes) y fluctuación (nada de energía de modulación en 2-8 Hz). La tonalidad es la que se le coló a Sergio sin que hubiera ni un oscilador en el código: emergió del objeto único con brillo correlacionado.

<sub>confianza media · https://doi.org/10.1121/10.0028514</sub>

**EL EFECTO FISIOLÓGICO DE LOS SONIDOS NATURALES ESTÁ MEDIDO, PERO ES MODESTO Y AUTONÓMICO. Alvarsson, Wiens & Nilsson (40 sujetos, exposición tras una tarea estresante de aritmética mental): la recuperación del nivel de conductancia de la piel (índice de activación SIMPÁTICA) TENDIÓ a ser más rápida con sonido de naturaleza que con entornos ruidosos; la variabilidad de frecuencia cardiaca de alta frecuencia (HF HRV, índice PARASIMPÁTICO) no mostró efectos. Gould van Praag et al. (2017) sí encontraron un aumento del pico de HF HRV, indicando aumento de actividad parasimpática, escuchando sonidos naturalistas frente a artificiales, junto con un desplazamiento del acoplamiento funcional anterior→posterior en la red por defecto.**

> Although HF HRV showed no effects, SCL recovery tended to be faster during natural sound than noisy environments. These results suggest that nature sounds facilitate recovery from sympathetic activation after a psychological stressor.

*Cómo se aplica:* Sirve para calibrar expectativas ante el dueño: el efecto existe y es real (parasimpático, recuperación de estrés), pero es sutil y depende de que el sonido se reconozca como NATURAL. Refuerza el punto de Axelsson: si suena sintético, no hay efecto que medir. No prometer más que «entra en la categoría correcta y ayuda a recuperarse», y no diseñar para un efecto dramático.

<sub>confianza alta · https://pmc.ncbi.nlm.nih.gov/articles/PMC2872309/</sub>

**LA INTEGRACIÓN TEMPORAL DE SONORIDAD MARCA LA FRONTERA ENTRE «EVENTO» Y «TEXTURA» EN ~200 ms. La sonoridad crece con la duración del sonido hasta una constante de tiempo de aproximadamente 100-200 ms, y luego se satura. La cantidad de integración temporal —la diferencia de nivel entre estímulos de 5 y 200 ms igualmente sonoros— promedia 10-12 dB cerca del umbral y llega a un pico de 18-19 dB a niveles medios.**

> Loudness increases with increasing sound duration for durations up to a time constant about 100 ~ 200 ms, and then loudness becomes saturated with more duration increase.

*Cómo se aplica:* Números de diseño para la capa de transitorios: un evento de burbuja de <50 ms necesita estar ~10-15 dB por encima de lo que necesitaría un evento largo para pesar lo mismo en sonoridad. Consecuencia práctica: los transitorios pueden ir MUY bajos en amplitud de pico (−25/−35 dB del lecho) y aun así aportar toda la textura, sin generar picos que rompan la calma. Y al revés: cualquier evento de más de 200 ms empieza a contar como un objeto separado y a hacerse contable — por eso las burbujas de 15 mm (T60 550 ms) suenan a «blooink» aislado y no a mar.

<sub>confianza alta · https://doi.org/10.1121/1.415236</sub>

**EL SONIDO ES MONO Y ESO LO CONVIERTE EN UN ALTAVOZ, NO EN UN LUGAR. El código actual crea un buffer de 1 canal y lo conecta a `ctx.destination`: coherencia interaural = 1.0. La investigación sobre coherencia interaural muestra que los sonidos con IAC alta se perciben hacia el frente y como una fuente única compacta, mientras que la IAC baja produce el percepto difuso/envolvente; los oyentes ni siquiera pueden distinguir de forma fiable dos sonidos interauralmente coherentes de un solo sonido con IAC reducida.**

> listeners cannot reliably distinguish two completely interaurally coherent sounds from a single sound with reduced IAC. Pairs of sounds heard toward the front were readily confused with single sounds with high IAC, whereas those heard to the sides were confused with single sounds with low IAC.

*Cómo se aplica:* Un mar es una fuente de cientos de metros de ancho: su IACC real es baja. Corrección trivial y de altísimo retorno: generar DOS instancias independientes del banco de bandas (semillas de ruido distintas) y mandarlas a L y R por un ChannelMergerNode. Coste: cero. Efecto: el sonido deja de estar dentro de la cabeza y pasa a envolver. Es probablemente la mejora de mayor relación impacto/esfuerzo de toda la lista, y es independiente de todo lo demás.

<sub>confianza alta · https://pmc.ncbi.nlm.nih.gov/articles/PMC9051632/</sub>

**EL SITIO YA TIENE LA SOLUCIÓN DIBUJADA EN LA PANTALLA Y NO LA ESTÁ USANDO. `marea.js` define SIETE ondas con períodos deliberadamente inconmensurables (8.3, 11.7, 6.9, 14.3, 9.7, 17.1, 12.1 s), cada una con su fase y su patrón de interferencia propio — exactamente la estructura decorrelacionada que el sonido necesita. Pero la línea 205 hace `RiversideMar.pulso(swash(t / ONDAS[0].periodo + ONDAS[0].fase))`: colapsa las siete a UN escalar tomado solo de la primera onda, y ese escalar único maneja la frecuencia de corte Y la ganancia. El comentario del propio archivo dice que las láminas «no suben parejas: cada una avanza y se retira con su propio ritmo, y todas juntas nunca llegan al mismo sitio a la vez» — el ojo recibe siete olas descorrelacionadas y el oído recibe una sola, perfectamente periódica.**

> In some sounds (e.g., wind, or waves) the C1 correlations are large only for low modulation-frequency bands, whereas in others (e.g., fire) they are present across all bands.

*Cómo se aplica:* Repartir las 7 ondas entre las 14-16 bandas en round-robin, de modo que bandas adyacentes nunca compartan período. El mínimo común múltiplo de esos siete períodos es de horas: la combinación no se repite nunca en una visita. Esto conserva intacta la promesa de MISION.md («la ola que ves romper es exactamente la que oyes») y de hecho la cumple MEJOR que ahora, porque hoy solo se oye una de las siete olas que se ven.

<sub>confianza alta · https://mcdermottlab.mit.edu/papers/McDermott_Simoncelli_2011_sound_texture_synthesis.pdf</sub>

**El espectro de tercios de octava del sonido AÉREO de una playa es PLANO dentro de ±3 dB entre 100 Hz y 1600 Hz, y recién ahí cae a 5–6 dB/octava por encima de 2000 Hz. Medido con sonómetro B&K 2260 a 73 cm de altura, 20 m de la marca de pleamar, Osborne Head (Nueva Escocia), promedios de 5 min, Hs de 0.4 a 1.5 m.**

> The spectrum above 100 Hz for Leq has the same general shape for most wave heights: it remains reasonably flat (±3 dB) between 100 Hz and 1600 Hz, and it then drops off more steeply (between 5-6 dB/octave) for frequencies above 2000 Hz.

*Cómo se aplica:* ⭐ EL DATO CLAVE. Bandas de tercio de octava PLANAS ≡ ruido ROSA exacto (la banda de 1/3 oct tiene ancho 0.2316·fc; si el nivel de banda es constante, la densidad espectral cae 3 dB/oct = 1/f). O sea: el cuerpo del mar ES ruido rosa de 100 Hz a 1.6 kHz. Tu ruido rosa era correcto; lo que sobraba era el barrido.

<sub>confianza alta · https://jcaa.caa-aca.ca/index.php/jcaa/article/view/2485</sub>

**Digitalicé la Fig. 1(a) de ese paper para Hs = 0.4 m (mar tranquilo) y calculé las pendientes: banda 100→1600 Hz = +0.00 dB/oct (PSD −3.00 dB/oct, ruido rosa exacto); banda 2000→8000 Hz = −6.00 dB/oct (PSD −9.00 dB/oct). Niveles de banda: 100 Hz=46, 250 Hz=44, 400 Hz=43.5 (mínimo), 800–1250 Hz=46.5 (máximo), 2000 Hz=45, 4000 Hz=38, 8000 Hz=33, 10 kHz=31.5 dB re 20 µPa.**

*Cómo se aplica:* Curva objetivo directa. Ruido rosa plano hasta ~1.6 kHz, con un realce ANCHO de +3 dB centrado en 800–1250 Hz y una depresión suave de −3 dB en 315–400 Hz. Arriba de 2 kHz necesitas −9 dB/oct de PSD, o sea rosa + un lowpass de 2 polos (12 dB/oct) fijo alrededor de 1.2–1.5 kHz.

<sub>confianza alta · https://jcaa.caa-aca.ca/index.php/jcaa/article/view/2485</sub>

**El PICO de energía de un mar tranquilo está en ~1000 Hz, y SE MUEVE HACIA GRAVES cuando crece el oleaje: pico ancho cerca de 1000 Hz para Hs < 1.0 m, que se desplaza a 250–400 Hz para Hs > 1.0 m (Bolin & Åbom, 10 sitios del Báltico). Mi digitalización lo confirma independientemente: banda máxima en 800 Hz para Hs=0.4 m, y en 200 Hz para Hs=1.5 m.**

> for significant wave heights less than 1.0 m, their spectra show a distinct broad peak near 1000 Hz, with a shifting of the peak to 250-400 Hz for significant wave heights greater than 1.0 m

*Cómo se aplica:* Tu rango 600–3800 Hz está desplazado hacia agudos y encima se MUEVE. El mar tranquilo se centra en 800–1000 Hz y NO se mueve; lo que se mueve entre olas es el TAMAÑO de cada ola. Implementación: cada evento-ola lleva su propio lowpass FIJO cuya fc va de 1500 Hz (ola chica) a 700 Hz (ola grande), correlacionada con su amplitud. Nunca barras dentro del evento.

<sub>confianza alta · https://jcaa.caa-aca.ca/index.php/jcaa/article/view/2485</sub>

**Nivel absoluto medido del sonido aéreo del mar: sube de 60 dB con olas de 0.4 m a 78 dB con olas de 2.0 m (Bolin & Åbom 2010, JASA 127, 2771–2779, costas del Báltico con distintas pendientes y sedimentos). Mi integración de los tercios de octava de Tollefsen da 60.3 dB (≈55.4 dBA) para Hs=0.4 m y 75.1 dB (≈65.9 dBA) para Hs=1.5 m a 20 m de la orilla — coincidencia notable entre dos experimentos independientes.**

> Results showed that the sound pressure level increased from 60 dB at 0.4 m wave height to 78 dB at 2.0 m wave height. The 1/3 octave spectrum was dependent on the surf type.

*Cómo se aplica:* Calibración: mar tranquilo ≈ 60 dB / 55 dBA cerca de la orilla; oleaje fuerte ≈ 75–78 dB. Diferencia calma→fuerte ≈ 15–18 dB. Para el sitio esto fija que el ambiente debe sonar como algo suave, no como una tormenta.

<sub>confianza alta · https://doi.org/10.1121/1.3327815</sub>

**La diferencia espectral calma→fuerte NO es plana: entre Hs=0.4 m y Hs=1.5 m el nivel sube +17.5 dB en 125 Hz, +14.5 dB en 250 Hz, +12 dB en 500 Hz, +10.5 dB en 1 kHz, +9 dB en 2 y 4 kHz, +8 dB en 8 kHz.**

*Cómo se aplica:* Cuando una ola grande pasa, no sube todo por igual: suben MUCHO más los graves-medios que los agudos. En código: la ganancia del evento y su fc de lowpass deben estar CORRELACIONADAS inversamente (más fuerte ⇒ más grave), con ~+8 dB extra en 125 Hz respecto de 4 kHz.

<sub>confianza alta · https://jcaa.caa-aca.ca/index.php/jcaa/article/view/2485</sub>

**Por DEBAJO de 100 Hz, un mar tranquilo BAJA de nivel, no sube. El aumento de graves que aparece con oleaje fuerte los propios autores lo atribuyen a turbulencia del aire en el micrófono, no al mar.**

> Below 100 Hz, the spectral levels decrease for the 0.4-m and 0.6-m wave heights, and increase for the 1.0-m and 1.5-m wave heights. […] The fact that the spectral levels increase at low frequencies and higher wave heights (which are associated with higher wind speeds) for Leq and Lmax suggests that the low-frequency component is caused by the inherent turbulence in the airflow that is observed at higher wind speeds outdoors

*Cómo se aplica:* NO pongas repisa de sub-graves ni ruido marrón hasta DC. Un highpass de 12 dB/oct en 100 Hz es fiel a la medición y además evita el retumbe que en laptop/celular solo suena a lodo. El mar aéreo está esencialmente limitado a 100 Hz – 3 kHz.

<sub>confianza alta · https://jcaa.caa-aca.ca/index.php/jcaa/article/view/2485</sub>

**MODULACIÓN DE NIVEL (el hallazgo que explica la queja). El paper reporta que el sonido consiste en 'crashes' fuertes seguidos de 'lulls'; Lmin lo forman las olas lejanas y Lmax las olas cercanas. Calculando de la Fig. 1 para Hs=0.4 m, la diferencia Lmax−Lmin por banda es: 31.5 Hz=18 dB, 63 Hz=20 dB, 125 Hz=23 dB, 250 Hz=21 dB, 500 Hz=19 dB, 1 kHz=19.5 dB, 2 kHz=19.5 dB, 4 kHz=18 dB, 8 kHz=8 dB. En banda ancha: Lmax−Leq = 10 dB y Leq−Lmin = 9 dB → excursión total ≈ 19 dB (ponderación temporal Fast, 125 ms, sobre 5 min).**

> The nature of breaking waves, which consist of louder "crashes" followed by "lulls" between breaking wave events, suggests that the noise spectrum observed for Lmin may be a superposition of the noise from more distant waves and the wind through the grass, whereas the observed spectrum for Lmax is likely dominated by nearby wave breaking events.

*Cómo se aplica:* ⭐ AQUÍ ESTÁ EL ERROR DE FONDO. El mar modula el NIVEL ~19 dB, no el TIMBRE. Un LFO sobre la fc de un filtro mueve el nivel apenas 2–3 dB y en cambio pasea un formante — eso es el 'bong'. Corrección: filtro FIJO, y toda la vida en envolventes de GANANCIA con ~19 dB de recorrido. Además da la proporción de capas: el lecho (Lmin) está 9 dB bajo el Leq ⇒ el lecho aporta ~12% de la energía y los eventos ~88%.

<sub>confianza alta · https://jcaa.caa-aca.ca/index.php/jcaa/article/view/2485</sub>

**CUÁNTAS OLAS POR MINUTO: con olas de periodo 7 s, una ventana de 5 minutos contiene 43 eventos de rotura → 8.6 eventos/minuto. Para periodos de 8–12 s (mar de fondo más calmo) salen 5.0–7.5 eventos/minuto.**

> Assuming 7-s period waves, the 5-minute averaging period for Leq would include 43 breaking wave events averaged into one quantity.

*Cómo se aplica:* Tasa de disparo del scheduler: 6–8 eventos/min ⇒ intervalo medio 8–10 s. Tu LFO de 8.3 s tenía el RITMO correcto pero la FORMA equivocada. Agrega jitter de ±35% al intervalo: un mar real no es periódico, y la periodicidad exacta es lo que delata a un sintetizador.

<sub>confianza alta · https://jcaa.caa-aca.ca/index.php/jcaa/article/view/2485</sub>

**La envolvente del sonido del oleaje CONTIENE el periodo de rotura de las olas: medido en Polihale beach, Kauai, marzo 2005, con micrófono infrasónico + video + altura de ola sincronizados en la banda 0.5–20 Hz.**

> The envelope of surf infrasound signals yields breaking wave periods comparable to those derived from nearshore sea surface elevation measurements. Our analysis confirms that individual plunging waves are partly responsible for the generation of surf infrasound.

*Cómo se aplica:* Confirma que el portador de la identidad 'mar' es la ENVOLVENTE (dominio del tiempo), no el barrido espectral. La frecuencia de modulación relevante es 1/T = 0.08–0.14 Hz (periodos 7–12 s), es decir modulación MUY lenta, tres órdenes de magnitud por debajo del audio.

<sub>confianza alta · https://doi.org/10.1029/2005GL025086</sub>

**SEGUNDA CAPA DE MODULACIÓN, mucho más lenta: el 'surf beat'. Se midieron ondas largas de 2 a 3 minutos de periodo (rango publicado 1 a 5 min) causadas directamente por la variación de altura de los GRUPOS de olas que rompen en la orilla.**

> Long sea waves with periods of 2 to 3 min. and a few inches in amplitude have been measured. It has been shown that they are due to the varying height of groups of waves breaking on the shore. The amplitude of the long waves is found to be approximately proportional to the amplitude of the ordinary waves and independent of their period.

*Cómo se aplica:* Segundo LFO, este sí legítimo pero solo sobre GANANCIA GLOBAL: periodo 60–180 s (0.006–0.017 Hz), profundidad ±1.5 dB. Es lo que hace que el mar 'respire' en escala de minutos y que el loop nunca suene a loop. Nunca sobre un filtro.

<sub>confianza alta · https://doi.org/10.1098/rspa.1950.0120</sub>

**POR QUÉ SE OYEN VARIAS OLAS A LA VEZ (derivado, no medido). Tras romper, la ola sigue sonando como un 'bore' durante toda la región interior de la zona de rompiente, hasta la orilla, más el swash. Con celeridad de aguas someras c=√(g·h) e índice de rotura γ=Hb/hb≈0.78, para Hs=0.4–0.8 m sobre pendiente 1:50–1:60 la zona de rompiente mide 31–51 m y una sola ola tarda 18–23 s en recorrerla, mientras las olas llegan cada 8–10 s.**

> Shoreward of the transition region, the waves will change much more slowly. In this region, the broken waves have many features in common with bores. This is the so-called "inner" or "bore region" which stretches all the way to the shore

*Cómo se aplica:* ⭐ ESTO ES LITERALMENTE LO QUE PIDIÓ EL DUEÑO ('múltiples olas suavemente superponiéndose'). Si cada evento DURA 15–20 s y llegan cada 8–10 s, entonces SIEMPRE hay 2–3 eventos sonando simultáneamente. Un LFO no puede producir eso jamás: hace falta un scheduler que dispare fuentes independientes con envolventes largas y solapadas. Ratio de solape objetivo: duración/intervalo ≈ 2.0–2.4.

<sub>confianza media · https://repository.tudelft.nl/file/File_5695cd9a-df9e-4d67-8661-5dcf95a4d8db</sub>

**FÍSICA DE LA FUENTE, que explica por qué el pico está cerca de 1 kHz: arriba de 500 Hz el sonido corresponde a oscilaciones de burbujas individuales; en las plumas de burbujas bajo la rompiente la densidad escala como a^−2.5 para a<1 mm y a^−4.5 para a>1 mm, con fracción de vacío 0.3–0.4 (medido con hidrófonos y fotografía en 2 m de agua, La Jolla Shores). Por la relación de Minnaert f₀ ≈ 3.26/a (a en metros), burbujas de 1 a 4 mm de radio radian entre 3.3 kHz y 0.8 kHz.**

> Above 500 Hz, the sound is consistent with the radiation from individual bubble oscillations. […] The density of bubbles scales as a−2.5 for a<1 mm and a−4.5 for a>1 mm

*Cómo se aplica:* El mar NO es un filtro barriendo: es la suma de miles de osciladores independientes de vida corta. Por eso el espectro promedio es estacionario y lo que fluctúa es cuántos hay sonando. La caída brutal de la densidad de burbujas grandes (a^−4.5) es exactamente lo que produce el hombro por debajo de 800 Hz. Justificación física para: forma espectral FIJA + densidad de eventos variable.

<sub>confianza alta · https://doi.org/10.1121/1.420321</sub>

**El nivel del ruido de rompiente escala aproximadamente con el CUADRADO de la altura de ola (un año de observaciones horarias, La Jolla Shores, 360 m mar adentro en 8 m de agua). El cociente entre energía sonora y flujo de energía del oleaje varía a lo sumo un factor 3 en el rango 100–3000 W por metro.**

> The analysis shows that surf noise is primarily determined by wave height, and scales approximately with the wave height squared.

*Cómo se aplica:* Nivel_dB = 20·log10(H) + k. Como las alturas de ola individuales siguen Rayleigh, la amplitud de pico de cada evento debe sortearse de una Rayleigh y convertirse a dB con 20·log10 → distribución de picos con ~12 dB de rango y cola larga hacia arriba (pocas olas notablemente más fuertes). Eso es lo que hace que un mar suene 'vivo' en vez de a máquina.

<sub>confianza alta · https://doi.org/10.1121/1.428259</sub>

**CURVAS DE WENZ / ESPECTROS DE KNUDSEN (referencia submarina que pediste): pendiente uniforme de 5 a 6 dB por octava entre 1 y 20 kHz, extendida en las tablas de Wenz hasta 25 kHz. Un ajuste con ley de potencias 3/2 en la densidad de burbujas reproduce una pendiente oceánica de 5.7 dB/octava. Estas pendientes son de NIVEL ESPECTRAL (dB re 1 µPa²/Hz), no de nivel de banda.**

> A characteristic feature of the oceanic spectra is the uniform slope of 5 to 6 dB per octave for frequencies between 1 and 20 kHz. […] The Knudsen curves reevaluated and compiled by Wenz define tabular deep-water ambient noise curves that fall off at a rate of 5 to 6 dB per octave up to 25 kHz.

*Cómo se aplica:* ⚠️ TRAMPA DE UNIDADES que puede arruinar el patch: −5/−6 dB/oct de Wenz es PSD, así que en esa banda el mar SUBMARINO sí se parece al ruido MARRÓN (−6 dB/oct). Pero el mar AÉREO en la playa da −3 dB/oct de PSD (rosa) hasta 1.6 kHz y −9 dB/oct arriba de 2 kHz. Son cosas distintas: no uses Wenz para el sonido que oye una persona en la orilla.

<sub>confianza alta · https://doi.org/10.1121/1.3555767</sub>

**VEREDICTO ROSA vs MARRÓN, con los números: ruido rosa = −3 dB/oct de PSD; marrón = −6 dB/oct. El mar aéreo medido da −3.00 dB/oct de PSD entre 100 y 1600 Hz (rosa EXACTO), −9.0 dB/oct entre 2 y 8 kHz (más oscuro que el marrón) y por debajo de 100 Hz DEJA de subir (el marrón seguiría subiendo 6 dB/oct hasta DC). Nivel mínimo de fondo oceánico medido: 55 dB re 1 µPa²/Hz a 10 Hz cayendo a ~6 dB/octava.**

> The minimum noise level is 55 dB re 1 µPa2/Hz at 10 Hz, decreasing at about 6 dB/octave at higher frequencies.

*Cómo se aplica:* Respuesta directa a tu pregunta: ROSA en el cuerpo (100 Hz–1.6 kHz), pero ni rosa ni marrón sirven solos en los extremos. Receta correcta = rosa + highpass 100 Hz (12 dB/oct) + lowpass FIJO ~1.2 kHz (12 dB/oct). El marrón puro suena a avión/viento porque tiene 3 dB/oct de más en graves y le falta todo el hombro de 800–1600 Hz.

<sub>confianza alta · https://escholarship.org/content/qt9310k3sp/qt9310k3sp.pdf</sub>

**MAR LEJANO — absorción atmosférica (ISO 9613-1, calculada para 25 °C y 80% HR, clima costero de Veracruz): a 300 m se pierden 0.3 dB @125 Hz, 0.9 @500 Hz, 1.9 @1 kHz, 3.2 @2 kHz, 6.4 @4 kHz, 18.2 @8 kHz, 26.9 @10 kHz. A 500 m: 30.3 dB @8 kHz y 44.8 dB @10 kHz. Además, una línea de rompientes a lo largo de la playa se comporta como fuente LINEAL: −3 dB por duplicación de distancia, no −6.**

*Cómo se aplica:* Combinando la fuente medida + −3 dB/duplicación + absorción, el objetivo para un mar CALMO OÍDO A 300 m es: bandas planas de 125 Hz a 1 kHz (−0.11 dB/oct), luego −6.5 dB/oct hasta 4 kHz y −13.5 dB/oct entre 2 y 8 kHz (en PSD: −3, −9.5 y −16.5 dB/oct). Traducción: arriba de 4–5 kHz NO DEBE HABER NADA. Un solo lowpass de 2 polos en 1.2 kHz sobre ruido rosa reproduce esa curva casi exactamente.

<sub>confianza alta · https://www.iso.org/standard/17426.html</sub>


---

## Receta 1

```
RECETA CONCRETA — «mar tranquilo y lejano de Chachalacas» en Web Audio, sin archivos.

Diagnóstico en una línea: te faltan TRES cosas, no una. (1) N voces independientes, (2) la ola es una ENVOLVENTE DE GANANCIA por evento y no un LFO de filtro, (3) una capa GRANULAR de burbujas — sin ella el oído no tiene ninguna pista física de que eso es agua y solo oye el filtro.

═══ CAPA 0 · FONDO (nunca se modula, nunca hay silencio) ═══
Ruido MARRÓN generado en buffer (y += 0.02*w; y *= 0.998), 30 s, longitud en muestras prima.
→ BiquadFilter lowpass, frequency 180 Hz, Q = 0.0001 (Butterworth, CERO resonancia)
→ Gain 0.28. Fijo. Este es el «cuerpo» del mar y el que evita el hueco entre olas.

═══ CAPA 1 · LAS OLAS · N = 8 VOCES INDEPENDIENTES ═══ (esto mata el «bong»)
Por cada voz i = 0..7:
  · Su PROPIO buffer de ruido rosa (Kellett), longitudes distintas y primas: 7.3, 11.1, 13.7, 17.3, 19.9, 23.1, 29.3, 31.7 s. playbackRate 0.97 + i*0.009 (nunca 1.000 en todas).
  · → highpass 50 Hz (quita el retumbo que se suma mal entre 8 voces)
  · → lowpass, Q = 0.0001, cutoff MODULADO POCO: 950 → 2350 Hz = 1.31 octavas.
       El modulador NO es un seno: es LFNoise1 a 0.17 Hz → cada 5.9 s programa
       lowpass.frequency.linearRampToValueAtTime(950*Math.pow(2.475, Math.random()), t)
       (rampa recta a un destino aleatorio; programa 30 s por delante y reprograma en un timer).
       Dale a cada voz una frecuencia de modulador distinta: 0.13, 0.15, 0.17, 0.19, 0.21, 0.23, 0.26, 0.29 Hz.
  · → WaveShaper con curva Math.tanh(1.8*x), oversample '2x'
  · → GainNode  ← AQUÍ va la envolvente de ola (abajo)
  · → StereoPanner con pan FIJO (fórmula Splay, spread 0.6, N=8):
       −0.600, −0.429, −0.257, −0.086, +0.086, +0.257, +0.429, +0.600
  · Master de la capa: gain = 1/√8 = 0.354

ENVOLVENTE DE OLA (por evento, por voz — programa 60 s por delante):
  · intervalo entre olas de UNA voz: Poisson con media 5.0 s ← periodo dominante MEDIDO en la boya
    NDBC 42055 (Bahía de Campeche): mediana 5.0 s, p10 4.0, p90 6.0.
       dt = -Math.log(Math.random()) * 5.0, recortado a [3.0, 8.0]
  · piso 0.10, pico 1.00
  · ataque:  g.setTargetAtTime(1.00, t, 0.45)   → llega al 95% en ~1.35 s
  · caída:   g.setTargetAtTime(0.10, t+1.6, 1.50) → cae en ~4.5 s
  · duración audible total ≈ 6.1 s
  · Solapamiento: 6.1 s de envolvente / 5.0 s de intervalo × 8 voces ≈ 9.8 olas sonando
    simultáneamente en distinta fase. ESO es «múltiples olas suavemente superponiéndose».
  · Descarta el 25% de los eventos al azar (truco de Farnell: cull aleatorio, no alterno)
    para que aparezcan huecos largos y rachas — el mar no es regular.

═══ CAPA 2 · ESPUMA GRANULAR DE BURBUJAS (la que hace que suene a AGUA) ═══
Prerenderiza UNA VEZ, al cargar, un Float32Array de 25 s con el modelo de van den Doel:
  N = 50 radios log-distribuidos:  r_k = 0.0002 * (0.008/0.0002)^(k/49)   [0.2 mm → 8 mm]
  Por cada burbuja:
     f0 = 3 / r                                  // Minnaert, r en metros → 375 a 15000 Hz
     d  = 0.043*f0 + 0.0014*Math.pow(f0, 1.5)    // amortiguamiento, s⁻¹
     D  = Math.pow(Math.random(), 10)            // profundidad, β = 10
     a  = D * Math.pow(r, 2.0)                   // α = 2.0 (α alto = LEJANÍA; 1.5 = cerca)
     xi = (D > 0.9) ? 0.1 : 0                    // riseCutoff 0.9 — solo el 10% sube de tono
     muestra: a * Math.sin(2*Math.PI*f0*(t + 0.5*xi*d*t*t)) * Math.exp(-d*t)
     dura hasta 4/d segundos (0.5 ms a 40 ms según el tamaño)
  Tasas: proporcionales a 1/r^2 (γ = 2 → régimen «streaming»; γ ≥ 5 ya suena a lluvia).
  Tasa total Λ = 3000 burbujas/s. Poisson: dt = -Math.log(Math.random())/λ_k.
  Coste: ~75.000 burbujas × ~300 muestras = 22 M operaciones, <1 s en el hilo principal.
Ese buffer:
  → highpass 700 Hz → lowpass 4500 Hz (Q = 0.0001 en ambos)
  → Gain con la MISMA envolvente de la capa 1 pero RETRASADA 0.45 s (la espuma llega después
     del cuerpo de la ola) y a −14 dB respecto de ella.
  → dos AudioBufferSourceNode con offsets de lectura 0 s y 11.3 s → pan −0.75 y +0.75.
     Decorrelación real: NUNCA el mismo ruido en L y R con un delay (se cancela en mono).

═══ LEJANÍA ═══
· highshelf fijo a 3000 Hz con gain −9 dB. FIJO — nunca lo modules.
· α = 2.0 en la capa granular (el paper: «larger values create a feeling of distance»).
· Sin reverb: no hace falta convolución.

═══ MASTER ═══
suma → WaveShaper tanh(1.4x) → highpass 25 Hz (bloqueo de continua) → gain 0.5 → destination
Fade-in de 10 s al arrancar (Line.kr(0,1,10) del patch de referencia).

═══ NÚMEROS PARA EL BANCO (sonido/banco) ═══
· barrid esperado = barrido por voz / √N = 1.31 / √8 = 0.46 oct  ✅ (objetivo < 0.8)
· Si mide > 0.8 la causa NO es el filtro: es que las voces están correlacionadas
  (mismo buffer, mismo playbackRate, mismo modulador o mismo instante de arranque).
· suave debe caer solo: LFNoise1 da un recorrido de rectas quebradas, no una curva lisa.
· Prueba de aislamiento barata: renderiza la MISMA voz con N=1, 2, 4 y 8. Si barrid no
  cae como 1/√N, las voces no son independientes de verdad.

═══ LAS TRES PROHIBICIONES ═══
1. Q > 0.707 en cualquier filtro que se mueva. El «bong» es un pico resonante barriendo.
   Usa Q = 0.0001 en todos los lowpass y highpass del cuerpo (Web Audio: Q en dB, 0.0001 ≈ plano).
2. Un OscillatorNode conectado a filter.frequency. El seno es predecible y el oído lo sigue
   como una nota. Todo modulador lento se hace con rampas a destinos aleatorios.
3. Un solo generador de ruido compartido entre voces o entre canales. Es la causa #1 de que
   suene «plano» y de que se peine en mono.

═══ ATAJO SI QUIERES VALIDAR EN 20 MINUTOS ═══
Toma tu v2-amplitud.js (el que ya midió 1.52 oct), envuélvelo en una función que lo instancie
8 veces con buffer propio, playbackRate propio, frecuencia de modulador propia y pan de Splay,
y divide el master entre √8. Predicción: 1.52/2.83 = 0.54 oct — pasa el gate sin tocar nada más.
Luego agrega la capa granular, que es lo que le va a dar la textura de agua.
```


---

## Receta 2

```
RECETA CONCRETA — «Mar tranquilo y lejano» en Web Audio, desde la lente de relajación + entrega web.

═══ DIAGNÓSTICO DE TU VERSIÓN, EN NÚMEROS ═══
Cometiste DOS errores medibles, no uno:
1) TONALIDAD. Un lowpass resonante barrido crea un pico espectral móvil. La tonalidad tiene coeficiente −2.241 sobre la placidez percibida y basta con 0.021 tu para que un paisaje se lea como «caótico». Eso ES el «bong de la filarmónica»: tu oído lo clasifica como un tono, no como agua.
2) MODULACIÓN ESPECTRAL EN LUGAR DE AMPLITUD, Y UNA SOLA. A 0.12 Hz (tu periodo de 8.3 s) el modelo de Fastl da apenas ~6% de la fuerza de fluctuación máxima → no aporta textura de agua, solo un gesto lento. Y como es la ÚNICA fuente de movimiento, el cerebro la lee como un objeto que se acerca y se aleja (sesgo de looming, red de atención completa activada). De ahí «no hay múltiples olas superponiéndose»: literalmente había UNA.

═══ CAPA 0 · CAMA (lo que se oye el 100% del tiempo) ═══
· Ruido MARRÓN (−6 dB/oct = 20 dB/década), no rosa. Es el que la gente califica como más «sublime» y menos «inquietante» (n=1280) y el que espontáneamente se oye como agua.
· Web Audio no lo trae. AudioBufferSource en loop, buffer de 30 s @44.1 kHz (con 8-10 s ya se detecta la periodicidad):
    let last = 0;
    for (let i = 0; i < N; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
· Highpass 1er orden a 40 Hz (quita DC y retumbe que solo come headroom).
· Si añades un lowpass: type='lowpass', Q = 0.707 EXACTO, frequency FIJA en 1200–1800 Hz. Jamás automatizada. Jamás Q > 0.707.
· No oscurezcas de más: la sharpness no penaliza la placidez (p = 0.980). Deja contenido hasta 6–8 kHz.

═══ CAPA 1 · OLEAJE (la macro-estructura que faltaba) ═══
· 6 generadores INDEPENDIENTES. Cada uno con periodo aleatorio entre 3.5 y 11 s (0.09–0.29 Hz), re-aleatorizado en cada ciclo, con fase inicial descorrelacionada.
· Cada generador modula GANANCIA, nunca frecuencia de filtro.
· Profundidad 4–6 dB: gain oscila 0.6 → 1.0. NUNCA baja a 0 (eso reintroduce fuerza de fluctuación; el límite de molestia es F > 1.78 vacil y el coeficiente es −14.009, el más destructivo de todos).
· Envolvente ASIMÉTRICA: ataque 25–35% del ciclo, decaimiento 65–75%. El agua sube rápido y se retira lento. Un ataque largo activa el sesgo de looming.
· Cada generador alimenta un bandpass FIJO con Q = 0.5 centrado en: 250 · 400 · 700 · 1100 · 1800 · 2800 Hz.
· Resultado: 6–18 eventos/min, siempre 2–4 solapados. Nunca existe el instante «una sola ola».

═══ CAPA 2 · ESPUMA (lo que lo hace sonar a AGUA y no a un filtro) ═══
· Ruido rosa (−3 dB/oct) con highpass a 1200 Hz.
· Modulado por RUIDO de baja frecuencia (no un LFO senoidal — la periodicidad es lo que delata la síntesis), con energía repartida entre 1 y 20 Hz.
· Profundidad ≤ 3 dB. Nivel 12–16 dB bajo la cama.
· ⚠️ Evita cualquier modulación coherente centrada en 4 Hz: ahí está el máximo exacto de la fuerza de fluctuación, el pico de molestia.

═══ CAPA 3 · ESTÉREO ═══
· Dos cadenas COMPLETAS y descorrelacionadas (semillas de ruido distintas), una a L y otra a R, con un delay de 8–15 ms entre ellas. Nunca mono duplicado — un mar en mono suena a máquina.

═══ SIN GAVIOTAS ═══
El agua sola ya es la capa con mayor tamaño de efecto (g = 2.01). Un grito de gaviota es tonal y de ataque rápido: mete exactamente la variable que dispara «caótico», y además delata el loop. Si el hotel insiste: ≤1 evento cada 3–4 min, 18–24 dB bajo la cama, nunca dos veces la misma muestra.

═══ NIVEL ═══
· Objetivo perceptual: 42–46 dB LAeq en el oído (umbral de «calmo y agradable»: LAeq < 48 dB; los estudios de recuperación de estrés usan 50 dB; el ruido rosa continuo a 40–50 dBA se tolera una noche entera dormido).
· Objetivo digital medible: captura 60 s y corre `ffmpeg -i cap.wav -af loudnorm=print_format=summary -f null -`. Ajusta el master GainNode hasta integrado −30 a −26 LUFS, true peak ≤ −18 dBTP.
· Slider de volumen 0–100%, default 60%, persistido en localStorage.
· Si algún día hay video con narración: la cama 20 dB debajo de la voz (SC 1.4.7).

═══ ARRANQUE — LEGAL Y POSIBLE ═══
Los tres motores coinciden: sin gesto del usuario NO hay Web Audio audible. Chrome puede permitirlo por MEI a visitantes recurrentes, pero eso hace el comportamiento impredecible entre usuarios — no construyas sobre esa base.

Arquitectura única que funciona igual en Chrome, Safari y Firefox:
1. Toggle en el header, entre los primeros elementos enfocables, `role="switch"` + `aria-checked`, etiqueta textual visible («Sonido del río»). Operable con teclado. Default APAGADO → cumples 1.4.2 por la vía G171 sin discusión posible, y de paso evitas el Requisito de Conformidad 5 (No Interferencia), que tumbaría la conformidad de TODA la página.
2. Recuerda la elección en localStorage. Si estaba encendido, el toggle aparece «apagado» hasta el primer gesto y entonces se restaura solo — nunca mientas en la UI.
3. Dentro del handler del gesto, síncronamente:
     if (!ctx) ctx = new AudioContext();
     await ctx.resume();
     if (ctx.state !== 'running') { ui.setOff(); return; }   // nunca asumas éxito
4. Fade-in:
     master.gain.setValueAtTime(0.0001, ctx.currentTime);
     master.gain.setTargetAtTime(objetivo, ctx.currentTime, 1.6);
   tau = 1.6 s → 95% a los 4.8 s, 99% a los 7.4 s. Curva exponencial = perceptualmente uniforme (una rampa lineal de ganancia se oye como un salto seguido de un arrastre).
   ⚠️ NO uses linearRampToValueAtTime / exponentialRampToValueAtTime como único mecanismo: bug abierto de Firefox 2011524, «a veces salta al valor inmediatamente».
5. Fade-out: setTargetAtTime(0.0001, now, 0.15) ≈ 0.45 s, y `ctx.suspend()` a los 600 ms. Nunca corte instantáneo (click) — piso duro de 220 ms para cualquier cambio audible.
6. Escucha `statechange` y maneja el estado `'interrupted'` (Safari 9+, Chrome 136+, Firefox nunca): llamada telefónica, Siri u otra app dejan el contexto muerto y el toggle mintiendo. En un sitio de hotel el tráfico iOS es alto — esto no es caso de borde.
7. `navigator.getAutoplayPolicy()` es solo Firefox 112+. Ignórala; lee `ctx.state`.

═══ PRUEBA DE ACEPTACIÓN, SIN INSTRUMENTOS ═══
Exporta 60 s y abre el espectrograma. Si ves UNA línea o cresta que se desplaza → tienes tonalidad y el diseño está mal, no importa lo que oigas. Un mar real es una nube que respira, no una curva que viaja.
```


---

## Receta 3

```
RECETA DE SÍNTESIS — "mar tranquilo y lejano, Chachalacas" (Web Audio, todo generado)

════ POR QUÉ FALLÓ EL PRIMER INTENTO (5 causas, con el número de cada una) ════
1. FILTRO DEMASIADO ABRUPTO. BiquadFilterNode 'lowpass' = −12 dB/oct con pico resonante en fc. El surf aéreo MEDIDO cae −9 dB/oct (PSD) por encima de 1.6 kHz, sin pico. Necesitas −6 dB/oct sobre rosa, es decir UN POLO.
2. EL BARRIDO ES ~10× MAYOR DE LO QUE LA FÍSICA PERMITE. Barrer 600→3800 Hz mueve el centroide 2.7 octavas. El techo físico de variación de timbre entre olas (absorción atmosférica, olas separadas 100 m) es: 0.4 dB a 1 kHz, 1.9 dB a 4 kHz, 5.5 dB a 8 kHz. Un centroide que se desplaza de forma continua y periódica ES una altura para el oído humano → "bong".
3. EL PERIODO ESTABA MAL. 8.3 s es swell del Pacífico. Boya NDBC 42055 (Bahía de Campeche, 1443 registros con Hm0<0.8 m): Tm02 = 3.64 s (p10 3.27, p90 4.10), Tp = 4.76 s. Son 16.5 olas/min, no 7.
4. UNA SOLA VOZ = UNA SOLA OLA. La geometría dice 2–6 olas emitiendo simultáneamente (el frente tarda 9–26 s en cruzar la rompiente, y llega una nueva cada 3.6 s).
5. UN LFO ES PERIÓDICO; EL MAR NO. Anchura espectral ν = 0.29 → jitter de periodo σ/media = 0.29 y grupos débiles.

════ CAPA 0 — EL LECHO CONTINUO (≈85% de la energía) ════
• Fuente: ruido ROSA (Voss-McCartney en AudioWorklet, o buffer de 12 s con crossfade de 1 s).
• Filtro (FIJO, nunca se mueve): IIRFilterNode one-pole, −6 dB/oct.
    fs=48000 → fc=1800 Hz: feedforward=[0.2099], feedback=[1, -0.7901]
                fc=1500 Hz: feedforward=[0.1783], feedback=[1, -0.8217]
  Resultado: PSD −3 dB/oct hasta 1.6 kHz, −9 dB/oct arriba = espectro medido de surf.
• Pico del mar en calma: Biquad 'peaking', f=1000 Hz, Q=0.7, gain=+2.5 dB. FIJO (Hs<1 m siempre → el pico no se mueve).
• Highpass 2.º orden a 90 Hz (lo de abajo es viento en el micro, no olas).
• Distancia (~300 m): segundo one-pole en cascada, fc=4500 Hz → feedforward=[0.4453], feedback=[1,-0.5547]. Para 1 km baja a fc=2200 Hz.

════ CAPA 1 — LAS OLAS (la que faltaba) ════
4 voces independientes (rango físico 2–6), cada una con su PROPIO buffer de ruido (decorrelacionado; usar el mismo con delays produce comb filtering audible).
Por evento:
• Intervalo: 4 × T, T ~ Normal(3.64 s, σ=1.05 s) truncada a [2.0, 7.0]. Las 4 voces con fases iniciales aleatorias → intervalo global ≈3.6 s.
• Envolvente (asimetría ≈1:8):
    ataque   0.4–0.9 s  → gain.exponentialRampToValueAtTime(g, t0+0.6)
    sostén   1–2 s
    caída    4–9 s      → gain.setTargetAtTime(0.001, t0+2.0, 2.2)
• Ganancia por evento (Rayleigh × H^1.29):
    u = Math.sqrt(-Math.log(1 - Math.random()));  g = Math.pow(u/0.8326, 1.29);
    if (u/0.8326 < 0.45) return;   // ~20% no rompen → silencio
  Da percentiles p10 −10.5 dB, p50 0 dB, p90 +6.7 dB, p99 +10.6 dB. Esto genera "sets" SIN LFO.
• Variación de timbre PERMITIDA por evento (techo físico): Biquad 'highshelf', f=3000 Hz, gain aleatorio entre −5 y +2 dB. NADA MÁS. Cero movimiento por debajo de 1 kHz. Cero LFOs sobre frequency.

════ CAPA 2 — LA ESPUMA / EL RETROCESO (el "shhh") ════
Retrasada 1.5–3.0 s respecto al pico de cada ola:
• Ruido rosa → highpass 2 kHz → one-pole 6 kHz.
• Ataque 0.8 s, caída 3–5 s, nivel −12 a −18 dB respecto al pico de esa ola.
Esta cola brillante y RETRASADA es lo que hace que el oído diga "agua" y no "ruido filtrado". Sin ella, cualquier ruido conformado suena a máquina.

════ CAPA 3 — BURBUJAS DISCRETAS (opcional; MUY escasa a 300 m) ════
Solo durante el pico de una ola, 2–8 granos/s, a −20 dB:
• Radio a ~ ley de potencias a^−2.5 en [0.5 mm, 8 mm]:
    a = aMin * Math.pow(1 - Math.random()*(1 - Math.pow(aMax/aMin, -1.5)), -1/1.5);
• f0 = 3.26 / a         (a en metros)   → 400 Hz a 6.5 kHz
• d  = 0.043*f0 + 0.0014*Math.pow(f0,1.5)
• T60 = 6.907 / d       (5 ms a 190 ms)
• OscillatorNode('sine') f=f0, gain.setValueAtTime(A,t0) + exponentialRampToValueAtTime(A*0.001, t0+T60)
• Chirp de burbuja que sube: osc.frequency.linearRampToValueAtTime(f0*(1 + 0.1*d*T60), t0+T60)
ADVERTENCIA: si estos granos se oyen individualmente, tu mar dejó de estar lejos y suena a arroyo. A 300 m casi no deberían distinguirse.

════ TABLA DE REFERENCIA (radio → frecuencia → ring) ════
  a=10 mm   →  326 Hz  d=20 s⁻¹    τ=49.5 ms  T60=342 ms  16 ciclos
  a=6.5 mm  →  502 Hz  d=34 s⁻¹    τ=29.6 ms  T60=205 ms  15 ciclos
  a=3.26 mm → 1000 Hz  d=87 s⁻¹    τ=12.7 ms  T60= 88 ms  12.7 ciclos  ← el pico del mar tranquilo
  a=2 mm    → 1630 Hz  d=146 s⁻¹   τ= 6.9 ms  T60= 48 ms  11 ciclos
  a=1 mm    → 3260 Hz  d=358 s⁻¹   τ= 2.8 ms  T60= 19 ms   9 ciclos
  a=0.5 mm  → 6520 Hz  d=904 s⁻¹   τ= 1.1 ms  T60=7.6 ms   7 ciclos

════ OBJETIVO ESPECTRAL PARA VERIFICAR (tercios de octava, dB rel. 1 kHz, a 300 m) ════
  100 Hz +2.1 · 250 +1.8 · 500 +1.2 · 1000 0.0 · 1600 −1.0 · 2000 −3.3 · 3150 −8.5 · 4000 −11.8 · 6300 −20.7 · 8000 −27.9
Mide con un AnalyserNode y compara. Si tu espectro tiene un pico que se mueve, no es mar.

════ REGLAS DURAS ════
⛔ Ningún filtro con Q>1 en el lecho.  ⛔ Ninguna frecuencia de corte modulada por LFO.
⛔ Ningún intervalo periódico.          ⛔ Ninguna capa que use el mismo buffer de ruido que otra.
✅ Lo que se modula es la GANANCIA, y se modula con estadística (Rayleigh), no con senoidales.
```


---

## Receta 4

```
RECETA DE SÍNTESIS — MAR TRANQUILO Y LEJANO (Riverside Chachalacas)

REGLA CERO: se elimina el barrido de frecuencia de corte. No se baja, no se suaviza: se elimina. El «bong» no viene del Q (medido: +1.74 dB de pico, 2.6 ms de ring — el filtro no resuena) sino de que un solo ruido, un solo filtro y una sola ganancia, movidos por un solo escalar, producen un ÚNICO objeto sonoro cuyo brillo y volumen caen juntos durante 6.5 s. Eso es, con precisión física, un idiófono golpeado.

1) FUENTE — sin loop, nunca.
   AudioWorklet que genera ruido blanco muestra a muestra, una instancia INDEPENDIENTE por banda y por canal (L/R). Cero buffers, cero `loop = true`. Un buffer de 6 s en loop queda memorizado por el oyente en ~5 vueltas = 30 s (McDermott 2011) y a partir de ahí se oyen «clanks and thumps» identificables (Guttman & Julesz vía Warren 2001).

2) BANCO — 16 bandpass, un ERB de ancho cada uno.
   Centros (Hz): 60, 135, 230, 349, 499, 688, 926, 1226, 1604, 2080, 2680, 3435, 4387, 5586, 7097, 9000.
   type = 'bandpass', Q = 7 (en bandpass el Q SÍ es Q clásico, no dB).
   Menos de 12 bandas, o bandas más anchas de una octava, y el percepto de agua desaparece (McDermott: el ancho de los eventos del agua coincide con el de los filtros auditivos).

3) COLOR ESTÁTICO DE «LEJOS» — inclinación, sin rodilla.
   Ganancias fijas por banda que reproduzcan rosa (−3 dB/oct) + la atenuación del aire a ~300 m calculada con ISO 9613-1 a 25 °C / 80 % HR: 250 Hz −0.3 · 1 k −1.9 · 2 k −3.2 · 4 k −6.4 · 8 k −18.2 dB ⇒ ≈ −8 dB/oct total por encima de 1 kHz. Cuerpo en 200-1500 Hz; las bandas de 3-9 kHz quedan 15-25 dB abajo pero PRESENTES (van den Doel: quitar las burbujas pequeñas siempre degrada). Ningún corte duro por debajo de 5 kHz — ahí es donde nace el noise edge pitch (2-5 % por debajo del borde).

4) SWELL — las siete olas que ya están en pantalla.
   Repartir en round-robin los períodos de `marea.js` (6.9, 8.3, 9.7, 11.7, 12.1, 14.3, 17.1 s) entre las 16 bandas, de forma que bandas adyacentes nunca compartan período, cada una con fase propia. El MCM es de horas: la combinación no se repite en una visita. Hoy solo se oye la onda [0] de las siete que se ven; esto cumple mejor la promesa de MISION.md, no peor.

5) EL DESFASE QUE MATA EL «BONG» — bajos primero, agudos después.
   Las bandas por debajo de 700 Hz llevan la subida; las bandas por encima de 2 kHz entran DESFASADAS 0.3-0.8 s (en el mar real primero llega el retumbo y después el siseo de la espuma), y su brillo se sostiene durante parte de la retirada en vez de caer en paralelo. Este desfase, solo, rompe el destino común.

6) GRANO — sobres independientes y DISPERSOS por banda.
   Cada banda multiplica su swell por un sobre propio: ruido limitado a 0.3-1.5 Hz, rectificado, normalizado y ELEVADO AL CUBO (picos separados por valles, no una ondulación). Prohibido meter energía de modulación en 2-8 Hz: ahí la fuerza de fluctuación es máxima (pico en 4 Hz, F ≈ ΔL/((f/4)+(4/f))) y el oído lo lee como algo que le habla.

7) TRANSITORIOS — burbujas Minnaert, ralas y bajas.
   2-6 eventos/s. Cada uno: OscillatorNode senoidal, f0 = 3/r con r ∈ [2, 10] mm ⇒ 300-1500 Hz. Decaimiento exponencial con d = 0.043·f0 + 0.0014·f0^1.5 (τ = 1/d: 7 ms a 1500 Hz, 50 ms a 300 Hz). Chirp ascendente f(t) = f0(1+σt) con σ = 0.1·d (+909 cents a lo largo de su vida; ξ=0.1 fue el más realista con 19 sujetos). Nivel: −25 a −35 dB respecto al lecho — la integración temporal de sonoridad (~200 ms) permite que aporten toda la textura sin generar un solo pico. Nunca más de ~3 audibles a la vez: por encima de eso el oído deja de contarlos, pero por debajo de 10⁴/s los sigue oyendo como gotas, y ese rango no se puede agendar en Web Audio — por eso la densidad se consigue estadísticamente en los pasos 2-6, no con nodos.

8) ESTÉREO — dos bancos independientes.
   Instanciar el banco completo dos veces con semillas distintas y unir con ChannelMergerNode. Coherencia interaural ≈ 0 en vez de 1.0. Coste cero, y es la mejora de mayor impacto por esfuerzo de toda la lista: saca el sonido de dentro de la cabeza.

9) DINÁMICA — que la ola hinche el VOLUMEN, no solo el color.
   Objetivo 6-10 dB de excursión broadband (hoy: 5.6 dB, de los cuales solo 1.6 vienen del filtro y el resto de la rampa de ganancia). Timbre que se mueve sin que el nivel se mueva es la definición de un pedal wah.

PRUEBA DE ACEPTACIÓN (medible, para meter en `_audio2.mjs`):
  · Comodulación media entre bandas < 0.35. Método: 14 bandas ERB de 150-8000 Hz → sobre analítico → suavizar a 30 Hz → elevar a 0.3 → corrcoef → media del triángulo superior. Medido hoy en el archivo actual: +0.659. Referencia de una versión con bandas independientes: +0.137. Si sale > 0.5, sigue sonando a UNA cosa.
  · Cero picos espectrales estables (tonalidad) en un promedio de 30 s.
  · Cero energía de modulación entre 2 y 8 Hz.
  · Excursión de nivel broadband entre 6 y 10 dB.
  · Ninguna repetición: dos ventanas de 30 s tomadas con 5 minutos de diferencia no deben correlacionar.
```


---

## Receta 5

```
RECETA DE SÍNTESIS — «mar tranquilo y lejano» en Web Audio. Todo derivado de las mediciones citadas.

═══ DIAGNÓSTICO DE POR QUÉ FALLÓ TU PRIMER INTENTO ═══
El mar modula el NIVEL ~19 dB (Lmax−Leq=10 dB, Leq−Lmin=9 dB, medido) y deja el TIMBRE prácticamente quieto. Tu patch hace lo contrario: mueve el timbre 600→3800 Hz (2.7 octavas de formante deslizante) y el nivel apenas 2-3 dB. Un solo polo móvil = una resonancia que se pasea = exactamente «el bong de la filarmónica». Y con UNA sola fuente es imposible que haya «múltiples olas superponiéndose»: hacen falta N fuentes independientes con envolventes largas y solapadas.

═══ OBJETIVO ESPECTRAL (mar calmo Hs=0.4 m, oído a ~300 m) ═══
Niveles de banda de 1/3 oct, relativos a la banda de 1 kHz:
  125 Hz  +0.3 | 250 Hz −0.9 | 500 Hz −0.5 | 1 kHz  0.0 | 2 kHz −2.8 | 4 kHz −13.0 | 8 kHz −29.8
Pendientes: banda 125→1k = −0.1 dB/oct (PSD −3, ruido ROSA) ; banda 1k→4k = −6.5 (PSD −9.5) ; banda 2k→8k = −13.5 (PSD −16.5).
⇒ Se reproduce con: RUIDO ROSA → highpass 100 Hz (12 dB/oct) → lowpass 2 polos FIJO en 1200 Hz, Q=0.5.

═══ ARQUITECTURA: 3 CAPAS, CERO FILTROS BARRIDOS ═══

CAPA A — LECHO CONTINUO (≈12% de la energía; RMS 9 dB bajo el total)
  pinkNoise → BiquadFilter highpass 100 Hz Q=0.7 → BiquadFilter lowpass 1200 Hz Q=0.5 → GainNode
  Única modulación permitida: la GANANCIA, ±1.5 dB, LFO senoidal de 0.008 Hz (periodo 125 s) — el
  «surf beat» de Munk (grupos de olas, 1-5 min). ⛔ filter.frequency NUNCA cambia. Ni una vez.
  (Este lecho es el Lmin del paper: las olas lejanas que nunca callan.)

CAPA B — EVENTOS-OLA (≈88% de la energía) — 6 a 8 por minuto
  Un scheduler dispara cada evento con su PROPIO BufferSource de ruido rosa, su PROPIO lowpass y su
  PROPIA envolvente de ganancia. Nada se comparte entre eventos.
    · Intervalo: 9 s con jitter ±35% → uniforme en [6, 12] s ⇒ 6.7 eventos/min
    · Envolvente (setValueCurveAtTime o rampas exponenciales):
        ataque   0.6 – 1.2 s   (la rompiente CRECE, no es un click)
        meseta   1.5 – 3.0 s
        decaimiento 8 – 15 s   (el «bore» viaja hasta la orilla + swash)
        DURACIÓN TOTAL 12 – 20 s
      ⭐ Como 12-20 s > 9 s de intervalo, SIEMPRE hay 2-3 olas sonando a la vez. Ése es
        literalmente el «múltiples olas suavemente superponiéndose» que pidió el dueño.
        Ratio objetivo duración/intervalo = 2.0 – 2.4.
    · Amplitud pico: sortea H ~ Rayleigh, y usa dB = 20·log10(H) (el nivel escala con H², medido).
      Rango práctico de picos ≈ 12 dB, con cola larga: pocas olas claramente más fuertes.
    · fc del lowpass del evento, ligada INVERSAMENTE a su amplitud:
        ola chica → 1500 Hz ; ola media → 1100 Hz ; ola grande → 700 Hz
      (Bolin & Åbom: el pico baja de 1000 Hz a 250-400 Hz cuando la ola pasa de 1 m.)
      fc FIJA durante todo el evento. El «movimiento» sale de que cada ola es distinta, no de barrer.
    · Paneo estéreo aleatorio por evento, ±0.6 (las olas rompen a lo largo de la playa, no en un punto).
    · Extra de graves en las olas grandes: +8 dB en 125 Hz respecto de 4 kHz (diferencia medida
      calma→fuerte). Un lowshelf fijo en 200 Hz por evento, con ganancia ligada a la amplitud.

CAPA C — ESPUMA (solo dentro de los eventos; −14 dB respecto del pico del evento)
  pinkNoise → bandpass 2500 Hz Q=0.7 → gain con la MISMA envolvente del evento pero
  ataque 0.15 s y decaimiento 3-5 s. Es el «shhh» de la espuma; nunca suena en los silencios.
  Si quieres el mar MÁS lejano, baja esta capa a −20 dB: a 500 m la absorción del aire se lleva
  30 dB a 8 kHz (ISO 9613-1, 25 °C / 80% HR).

═══ RELACIÓN DE NIVELES (medida, no inventada) ═══
  pico de ola (Lmax) = Leq + 10 dB
  lecho (Lmin)       = Leq −  9 dB
  excursión total ≈ 19 dB   →   si el pico de un evento es ganancia 1.0, el lecho va en 0.11.
  Energía: eventos ≈ 88% / lecho ≈ 12%.

═══ LISTA NEGRA ═══
  ⛔ Barrer filter.frequency con un LFO. Es la causa raíz del «bong».
  ⛔ Usar 600-3800 Hz como rango: el pico medido de un mar calmo está en 800-1000 Hz y la banda
     100-1600 Hz es PLANA en tercios de octava.
  ⛔ Refuerzo por debajo de 100 Hz: en un mar calmo los niveles BAJAN ahí, y lo poco que se mide
     es viento en el micrófono, no mar.
  ⛔ Contenido por encima de ~5 kHz para un mar «lejano»: a 300 m ya se perdieron 18 dB en 8 kHz.
  ⛔ Ruido marrón como base: −6 dB/oct es 3 dB/oct de más en graves y le falta el hombro de
     800-1600 Hz. Marrón describe el mar SUBMARINO (Wenz/Knudsen, 1-20 kHz), no el que se oye.
  ⛔ Periodicidad exacta. Sin jitter en el intervalo, el oído detecta la máquina en ~30 segundos.

═══ CÓMO VERIFICARLO SIN OÍDO EXPERTO ═══
  Corre un AnalyserNode, promedia 60 s y comprueba: (1) que las bandas de 1/3 oct entre 125 Hz y
  1 kHz queden dentro de ±1.5 dB entre sí; (2) que de 2 a 8 kHz caiga ~13 dB/oct; (3) que el nivel
  RMS con ventana de 125 ms recorra ~19 dB entre su mínimo y su máximo a lo largo de 5 minutos.
  Si las tres se cumplen, coincide con la playa real medida.
```


---

# ⭐ ESPECIFICACIÓN FINAL

# ESPECIFICACIÓN TÉCNICA — sintetizador «mar tranquilo y lejano» (Riverside Chachalacas)

**Estado de los números:** los que llevan ✅ MEDIDO los verifiqué en este banco (`sonido/banco/render.mjs` + `analizar.py`, Chrome headless, OfflineAudioContext 44 100 Hz, renders de 40 s). Los demás vienen de las cinco lentes y están marcados con su fuente. Donde dos lentes se contradecían, resuelvo y digo por qué (§16).

---

## 0. La tesis, en tres líneas

1. **Una ola real modula el NIVEL ~10-19 dB y deja el TIMBRE casi quieto.** El v0 hacía lo contrario: movía el timbre 2.55 octavas y el nivel 2-3 dB. Eso es, literalmente, la definición de un pedal wah — o de un gong.
2. **El agua no es un objeto, es una POBLACIÓN.** Un ruido + un filtro + una ganancia movidos por un solo escalar producen un único objeto sonoro cuyo brillo y volumen caen juntos: destino común = un idiófono golpeado. Se necesitan N fuentes independientes.
3. **La forma espectral es FIJA y estática. Lo único que se mueve es la ganancia, y se mueve con estadística (Rayleigh + Poisson), nunca con senoidales.**

---

## 1. Diagnóstico del v0: siete errores, cada uno con su número

| # | Error del primer intento | Número | Lo corrige |
|---|---|---|---|
| **E1** | **Una sola voz.** Un ruido → un filtro → una ganancia. | 1 objeto sonoro | §6 (6 voces) + §9 (lecho) |
| **E2** | **Barrido del corte 600→3800 Hz.** El centroide paseaba 2.55 oct; el techo físico de variación de timbre entre olas a esa distancia es 0.4 dB @1k, 1.9 dB @4k, 5.5 dB @8k. El barrido pedía ~30 dB en 2-4 kHz: **6 a 15× más de lo que la física permite.** | 2.55 oct vs 0.8 permitidas | §5 (cadena FIJA) + §6.5 (techo ±2 dB) |
| **E3** | **La dinámica estaba en el filtro, no en el nivel.** Un LFO de corte mueve el broadband 2-3 dB. El mar mueve 19 dB (Lmax−Leq=10, Leq−Lmin=9, Bolin & Åbom / Tollefsen). | 2-3 dB vs 10-12 dB objetivo | §6.4 (envolventes) |
| **E4** | **Periodo 8.3 s con un LFO senoidal.** 8-14 s es swell del Pacífico. La boya NDBC 42055 (Bahía de Campeche, 1443 registros con Hm0<0.8 m) da **Tp mediana 5.0 s** (p10 3.85, p90 5.56) y Tm02 3.64 s. Y un seno es predecible: el oído lo sigue como una nota. | 8.3 s periódico vs 5.2 s estocástico | §6.3 (Poisson/Normal) |
| **E5** | **Sin capa retardada de espuma.** El «shhh» del retroceso llega 1.5-3 s DESPUÉS del cuerpo de la ola. Sin ese desfase entre graves y agudos, el destino común no se rompe y el oído no tiene pista de que es agua. | — | §7 |
| **E6** | **Sin micro-estructura de burbujas.** El sonido del agua es 100 % aire atrapado (van den Doel: bloqueando mecánica o químicamente la burbuja, el impacto NO produce sonido alguno). Ruido conformado sin transitorios = máquina. | — | §8 |
| **E7** | **Un solo buffer en bucle.** ✅ MEDIDO: un buffer de 9 s en loop da `perio` **0.77** (el gate es <0.25). El oído memoriza un bucle de ruido en ~5 vueltas (McDermott 2011). | 0.77 vs <0.25 | §4 (8 buffers inconmensurables → `perio` **0.06** ✅) |

**Lo que NO era el problema — no gastes un ciclo ahí:** el `Q` del biquad. En Web Audio el `Q` de un `lowpass`/`highpass` **está en dB**, no es Q clásico: el v0 con `Q=0.7` daba Q_cookbook = 1.084, pico de resonancia **+1.74 dB** y ring-down T60 de **2.6 ms**. Un filtro que suena 2.6 ms no puede hacer un «bong». El bong era el barrido, no la resonancia.

---

## 2. Arquitectura — 5 capas, presupuesto de energía

```
                                        ┌──────────────────────────────────────┐
 CAPA 1 · 6 VOCES DE OLA  ──────────────┤ cada una: buffer propio → cadena de  │
   2 cerca (≈300 m)  61.8 % de las olas │ color FIJA → highshelf/evento →      │──┐
   2 media (≈600 m)  28.0 %             │ GainNode (envolvente) → StereoPanner │  │
   2 lejos (≈1200 m) 10.2 %             └──────────────────────────────────────┘  │
                                                                                  │  CORRELADO
 CAPA 2 · ESPUMA  ─── ligada al evento, retrasada 1.8-2.4 s, HP 2 kHz ────────────┤  67 %
                                                                                  │
 ─────────────────────────────────────────────────────────────────────────────────┤
                                                                                  │
 CAPA 3 · LECHO CONTINUO ── 2 generadores independientes L/R, nunca calla ────────┤  DECORRELADO
 CAPA 4 · LECHO DE BURBUJAS ── prerenderizado Minnaert, 2 renders independientes ─┘  33 %  ← F_dec
                                                                                     ✅ st = 0.45
 ─────────────────────────────────────────────────────────────────────────────────
 CAPA 5 · MAESTRO ── surf-beat (Ornstein-Uhlenbeck) → tanh → HP 25 Hz → fade-in 10 s
```

**Reparto de energía (fracción del total):**

| capa | % | dB rel. total | por qué ese número |
|---|---|---|---|
| voces cerca (2) | 41.4 % | −3.8 | llevan la dinámica: los picos son las olas cercanas |
| voces media (2) | 18.8 % | −7.3 | |
| voces lejos (2) | 6.8 % | −11.7 | forman el suelo junto al lecho |
| espuma | ~1.5 % | −18 | poca energía broadband, mucha presencia en 2-6 kHz |
| **lecho continuo** | **24 %** | **−6.2** | es el Lmin del paper: las olas lejanas que nunca callan |
| **lecho de burbujas** | **9 %** | **−10.5** | la firma de «agua» |

`F_dec` = (lecho + burbujas) / total = **0.33**. Este número **NO es libre**: fija el estéreo (§10).

---

## 3. Constantes globales (parametriza así — son las perillas de §14)

```js
const F_DEC        = 0.33;   // fracción de energía decorrelada L/R  → st ≈ 0.45
const POLO_FUENTE  = 2000;   // Hz — la forma espectral del surf
const POLO_DIST    = 3000;   // Hz — absorción del aire, tramo medio (≈300 m)
const POLO_AIRE    = 7000;   // Hz — absorción del aire, tramo alto
const PICO_1K_dB   = 2.5;    // realce ancho del mar en calma
const HP_Hz        = 80;     // el mar aéreo no tiene sub-graves
const ESPUMA_dB    = -13;    // rel. al pico del evento (voces cerca)
const RAY_EXP      = 1.29;   // amplitud ∝ H^1.29 (nivel ∝ H^2.57)
const RAY_CULL     = 0.55;   // ~19 % de olas no rompen → silencio
const RAY_TOPE     = 2.4;    // recorta el 8 % superior de la cola
const MAESTRO      = /* calíbralo: 10^((-21 - aud_dB_medido)/20) */;
```

---

## 4. CAPA 0 — Generadores de ruido, y la política anti-bucle

**Tipo de ruido: ROSA, no marrón, no blanco.**
✅ MEDIDO: ruido rosa Kellett da bandas de tercio de octava **planas dentro de ±0.5 dB** de 63 Hz a 16 kHz — es decir `pend = 0.0` en este banco.

> ⚠️ **Errata del banco que hay que conocer:** el docstring de `analizar.py` dice «Rosa es −3, marrón −6». **Es falso para esta métrica.** `tercios_de_octava()` mide ENERGÍA DE BANDA, no densidad espectral: para ruido rosa la energía por tercio de octava es constante → **pendiente 0**. El objetivo `pend = −4 a −7` significa que la cadena de color debe quitar **4-7 dB/oct sobre el rosa**, no sobre el blanco.

```js
// Paul Kellett, ±0.05 dB de 10 Hz a 20 kHz. Después NORMALIZAR a RMS conocido.
let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
const w = Math.random()*2-1;
b0=0.99886*b0+w*0.0555179;  b1=0.99332*b1+w*0.0750759;
b2=0.96900*b2+w*0.1538520;  b3=0.86650*b3+w*0.3104856;
b4=0.55000*b4+w*0.5329522;  b5=-0.7616*b5-w*0.0168980;
out = b0+b1+b2+b3+b4+b5+b6+w*0.5362;   b6 = w*0.115926;
// luego: escalar todo el buffer para RMS = 0.1
```

**Política anti-bucle — 8 buffers de longitudes mutuamente inconmensurables:**

```
LARGOS = [11.3, 13.1, 15.7, 17.3, 19.7, 23.9, 29.3, 31.7]   // segundos
```
Cada voz/lecho toma un buffer distinto, arranca en un `offset` distinto (`(i*3.7) % largo`) y corre a un `playbackRate` distinto (0.959 … 1.031, nunca 1.000 en todas).

✅ **MEDIDO, y es el hallazgo que más sorprende:**

| configuración | `perio` | veredicto |
|---|---|---|
| 1 buffer de 9 s, 2 fuentes | **0.77** | ❌ el bucle se oye |
| 4 buffers 13.1/17.3/19.7/23.9, 6 fuentes, mismo rate | 0.09 | ✅ |
| 4 buffers + rates destemplados | **0.06** | ✅ |

→ **corrige E7.** Memoria: 8 buffers × ~20 s × 48 kHz × 4 B ≈ **6.5 MB**. Aceptable para una web.

> **No uses AudioWorklet.** `render.mjs` llama `construirMar(ctx, dur)` **sin `await`** y arranca el render inmediatamente; `audioWorklet.addModule()` es asíncrono y llegaría tarde. `ScriptProcessorNode` está deprecado. Buffers pre-generados es la vía correcta y además la más barata.

---

## 5. CADENA DE COLOR — **FIJA, idéntica en todas las capas, jamás se modula**

Es el corazón de la corrección de **E2**. Ni un solo `AudioParam` de frecuencia se toca nunca.

```js
const onePole = (fc) => {                       // −6 dB/oct, UN polo, cero resonancia
  const a = Math.exp(-2*Math.PI*fc/ctx.sampleRate);
  return ctx.createIIRFilter(new Float64Array([1-a]), new Float64Array([1,-a]));
};

ruidoRosa
  → biquad 'highpass',  f=80 Hz,    Q = -3.0103 dB   // Butterworth EXACTO (ver nota)
  → biquad 'lowshelf',  f=300 Hz,   gain = +1.5 dB
  → biquad 'peaking',   f=1000 Hz,  Q = 0.7, gain = +2.5 dB
  → onePole(2000)     // FUENTE   : rosa −3 dB/oct → −9 dB/oct de PSD sobre 1.6 kHz
  → onePole(3000)     // DISTANCIA: absorción del aire a ~300 m, tramo medio
  → onePole(7000)     // AIRE     : 8 kHz pierde 18-19 dB a 300 m (ISO 9613-1, 28 °C/80 % HR)
```

**Por qué UN polo y no un `lowpass` biquad (esto es lo que arregla el bug):**
El surf aéreo medido cae **−5 a −6 dB/oct de nivel de banda** por encima de 2 kHz (⇔ PSD −9 dB/oct), y es **plano ±3 dB entre 100 y 1600 Hz** (⇔ rosa exacto). Un `BiquadFilterNode` `lowpass` es **−12 dB/oct con pico resonante**: el doble de abrupto que el mar. Un polo real solo se consigue con `IIRFilterNode`.

**El `Q` de Butterworth, con el número exacto:** en Web Audio el `Q` de `lowpass`/`highpass` está **en dB** y el motor usa `10^(Q/20)`. Butterworth (máximamente plano) es Q_lineal = 1/√2 → **Q = −3.0103 dB**. `Q = 0.0001` (que circula en los ejemplos) da Q_lineal ≈ 1.0, que ya tiene **+1.25 dB de pico**. Usa −3.0103.

**Coeficientes del one-pole** (`b0 = 1 − e^(−2πfc/fs)`, `a1 = e^(−2πfc/fs)`; `feedforward=[b0]`, `feedback=[1,−a1]`). **Calcúlalos en runtime con `ctx.sampleRate`** — el banco renderiza a 44 100 y el navegador casi siempre a 48 000:

| fc | 44 100 Hz `[b0] / [1, −a1]` | 48 000 Hz `[b0] / [1, −a1]` |
|---|---|---|
| 2000 | `[0.247949] / [1, −0.752051]` | `[0.230335] / [1, −0.769665]` |
| 2400 | `[0.289611] / [1, −0.710389]` | `[0.269597] / [1, −0.730403]` |
| 3000 | `[0.347815] / [1, −0.652185]` | `[0.324768] / [1, −0.675232]` |
| 3800 | `[0.418072] / [1, −0.581928]` | `[0.391902] / [1, −0.608098]` |
| 5000 | `[0.509524] / [1, −0.490476]` | `[0.480297] / [1, −0.519703]` |
| 6000 | `[0.574655] / [1, −0.425345]` | `[0.544062] / [1, −0.455938]` |
| 7000 | `[0.631137] / [1, −0.368863]` | `[0.600003] / [1, −0.399997]` |

### 5.1 Curva espectral objetivo — ✅ MEDIDA, no predicha

Renderé esta cadena sola (ruido rosa estático, sin olas) y la medí con el banco. Predicción analítica vs medición:

| banda (Hz) | predicho | ✅ **MEDIDO** | Tollefsen (20 m) | Bolin & Åbom (300 m) |
|---|---|---|---|---|
| 125 | −0.3 | **−0.4** | +0.3 | +2.1 |
| 250 | +0.2 | **0.0** | −0.9 | +1.8 |
| 500 | +0.2 | **−0.2** | −0.5 | +1.2 |
| 1000 | 0.0 | **0.0** | 0.0 (ref) | 0.0 (ref) |
| 2000 | −4.6 | **−4.6** | −2.8 | −3.3 |
| 4000 | −13.2 | **−13.0** | −13.0 | −11.8 |
| 8000 | −25.9 | **−24.4** | −29.8 | −27.9 |
| 16000 | — | **−35.9** | — | — |

**Predicción vs medición coincide dentro de 0.5 dB en todas las bandas.** La cadena queda entre las dos referencias medidas casi en todas partes (ellas discrepan entre sí hasta 2.7 dB).

✅ **`pend` medido = −4.7 / −4.8 dB/oct** → justo en el centro del objetivo (−4 a −7). **No hace falta ruido marrón ni cascadas de highshelf.**

✅ **`barrid` medido de la cadena estática = 0.36-0.38 oct.** Es el **piso** de la métrica para ruido conformado. Presupuesto: gate 0.8 → **quedan solo ~0.42 oct para todo lo demás** (§6.5 depende de esto).

✅ **`tono` medido = +2 dB máximo.** Ningún pico asoma. El `peaking` de 1000 Hz con Q=0.7 tiene 1.91 octavas de ancho — el detector de tonalidad lo absorbe en su línea base.

---

## 6. CAPA 1 — Las seis voces de ola

### 6.1 Por qué seis y por qué en tres distancias

Cada voz es **un tramo distinto de la línea de rompiente**, no «una ola». A 300 m se oye un arco enorme de playa: por eso hay varias emitiendo a la vez y por eso la dinámica se comprime respecto de lo medido a 20 m.

| voz | distancia | pan | pico | ataque | sostén | decaimiento τ | polo extra | espuma |
|---|---|---|---|---|---|---|---|---|
| C1 | ≈300 m | **−0.55** | **0 dB** | 0.8 s | 1.5 s | **2.6 s** | — | −13 dB @1.8 s |
| C2 | ≈300 m | **+0.55** | 0 dB | 0.8 s | 1.5 s | 2.6 s | — | −13 dB @1.8 s |
| M1 | ≈600 m | **−0.30** | **−5 dB** | 1.2 s | 1.8 s | **3.4 s** | onePole(5000) | −19 dB @2.4 s |
| M2 | ≈600 m | **+0.30** | −5 dB | 1.2 s | 1.8 s | 3.4 s | onePole(5000) | −19 dB @2.4 s |
| L1 | ≈1200 m | **−0.80** | **−10 dB** | 1.8 s | 2.2 s | **4.5 s** | onePole(2600) | **ninguna** |
| L2 | ≈1200 m | **+0.80** | −10 dB | 1.8 s | 2.2 s | 4.5 s | onePole(2600) | **ninguna** |

Añade ±0.04 aleatorio a cada `pan` al inicializar, para romper el espejo perfecto.

**Las voces lejanas NO llevan espuma** — a 1200 m la absorción del aire se lleva ~69 dB en 8 kHz (5.75 dB/100 m a 28 °C/80 % HR). La espuma allá arriba sencillamente no llega. → **corrige E2** por la vía correcta: la distancia se comunica con **menos transitorios resueltos**, no con un filtro que se mueve.

### 6.2 Un chain persistente por voz — NO crear nodos por evento

Cada voz es **una sola cadena que vive toda la sesión**: `BufferSource(loop) → color fija → highshelf/evento → GainNode → StereoPanner → bus`. Un evento es **solo automatización de `AudioParam`** sobre ese `GainNode`. Total ≈ **60 nodos** para todo el sintetizador. (PROTOCOLO regla 4: «sin miles de nodos».)

Programa los eventos **60 s por delante**; en el navegador re-programa con un `setInterval` de 30 s.

### 6.3 Ritmo — el número que más cambia el código

**Intervalo por voz** (segundos), mutuamente inconmensurables para que `perio` no vea nada:

```
C1 24.4    C2 28.7    M1 21.1    M2 26.5    L1 23.0    L2 30.9
```

Sorteo por evento: `T = μ · (1 + 0.30·gauss())`, recortado a `[0.5μ, 1.8μ]`.

**Aritmética que lo justifica:** Σ(1/μ) = 0.2368 eventos/s = 14.2/min. Tras descartar el 19 % que no rompe → **11.5 eventos/min ⇒ intervalo agregado 5.21 s**, que es exactamente el **Tp mediano medido en la boya NDBC 42055 (5.0 s, p10 3.85, p90 5.56)**. → **corrige E4.**

**Simultaneidad:** 11.5/min × ~13 s de vida audible media = **2.5 olas sonando a la vez**, nunca menos de 1, desde 6 posiciones estéreo y 3 distancias. Eso es, literalmente, el *«múltiples olas suavemente superponiéndose»* que pidió el dueño.

> **Por qué Tp (5.0 s) y no Tm02 (3.64 s):** Tm02 cuenta *toda* ola que cruza el cero; solo las energéticas rompen con cresta audible. Descartando ~20 % y con la cola Rayleigh, el tren de 3.64 s se convierte en un tren de **eventos audibles** de ~5.2 s. Los dos datos son ciertos y describen cosas distintas.

### 6.4 Envolvente y amplitud — aquí vive TODA la dinámica (corrige E1 y E3)

```js
// asimetría ≈ 1:8 — el ataque es el colapso de la cresta (pico de entrainment
// de burbujas); la caída larga es el rodillo saturándose y entrenando cada vez menos aire.
g.setValueAtTime(PISO, t0);
g.exponentialRampToValueAtTime(PISO + A, t0 + ataque);        // 0.8 / 1.2 / 1.8 s
g.setValueAtTime(PISO + A, t0 + ataque + sosten);             // 1.5 / 1.8 / 2.2 s
g.setTargetAtTime(PISO, t0 + ataque + sosten, tau);           // 2.6 / 3.4 / 4.5 s
// PISO = 0.06 · A  (la voz nunca cae a cero absoluto)
```
`setTargetAtTime(τ)` llega a −20 dB en 2.3τ y a −40 dB en 4.6τ ⇒ vida audible **≈11 s (cerca), 13 s (media), 16 s (lejos)**.

**Amplitud por evento — Rayleigh, no aleatorio uniforme.** Las alturas de ola siguen Rayleigh y la amplitud sonora escala como H^1.29 (SPL ∝ H^2.57, medido: 60 dB con Hs 0.4 m → 78 dB con Hs 2.0 m).

```js
const u = Math.sqrt(-Math.log(1 - Math.random())) / 0.8326;   // Rayleigh, mediana = 1
if (u < 0.55) return;                                          // 19 % no rompen → silencio
const A = Math.min(Math.pow(u, 1.29), 2.4);                    // tope: recorta el 8 % superior
```
Percentiles verificados: **p10 −10.5 dB · p50 0 dB · p90 +6.7 dB · p99 +10.6 dB**.
**Esto genera los «sets» SIN NINGÚN LFO.** El agrupamiento aparente sale de la cola de la distribución, no de una modulación lenta.

**Excursión de nivel objetivo: 9-12 dB** (Lmax−Lmin de la envolvente Fast de 125 ms). Los 19 dB medidos en la playa se comprimen por dos razones independientes, y las dos hay que respetar:
- **Física:** a 300 m se oyen simultáneamente muchos más rompientes que a 20 m; la suma se alisa estadísticamente.
- **El banco:** ✅ MEDIDO, `cresta` de ruido conformado estático **ya es 13.0-13.5 dB**, y el gate es 16. Solo hay ~3 dB de margen. 19 dB de excursión lenta + el crest propio del ruido = ~18 dB → **falla el gate y recorta**.

### 6.5 La ÚNICA variación de timbre permitida (el techo físico de E2)

Entre una ola que rompe a 200 m y otra a 300 m, la diferencia de inclinación espectral es de **0.4 dB @1 kHz, 1.9 dB @4 kHz, 5.5 dB @8 kHz**. Ese es el techo.

```js
// UN highshelf por voz, valor ESTÁTICO durante todo el evento,
// cambiado 0.2 s ANTES del onset (con la envolvente en su piso, no hace click)
shelf.gain.setTargetAtTime(-2 + 4*Math.random(), t0 - 0.2, 0.06);   // f = 3000 Hz, ±2 dB
```
⛔ **Cero movimiento por debajo de 1 kHz. Cero LFOs sobre `frequency`. Cero rampas dentro del evento.**

> ✅ **Restricción MEDIDA:** el piso de `barrid` de la cadena estática es 0.37 oct y el gate es 0.8. Empieza con ±2 dB. **Mide.** Si `barrid > 0.65`, baja a ±1 dB o quita el shelf del todo — es un adorno, no un requisito.

---

## 7. CAPA 2 — Espuma / retroceso (corrige E5)

Esta capa es la que hace que el oído diga «agua» y no «ruido filtrado», y lo hace por el **desfase**: en el mar real primero llega el retumbo y **después** el siseo, y el brillo se sostiene durante parte de la retirada en vez de caer en paralelo con los graves. Ese desfase, solo, rompe el destino común que produce el «bong».

```
buffer de ruido PROPIO (distinto del de su voz)
  → biquad 'highpass', f=2000 Hz, Q=-3.0103
  → onePole(6000)
  → GainNode con envolvente PROPIA
```
- **Retraso:** 1.8 s (cerca) / 2.4 s (media) tras el onset del evento, más `±0.5 s` aleatorio.
- **Envolvente:** ataque 0.8 s, sin sostén, `setTargetAtTime` con τ = 1.6 s.
- **Nivel:** `ESPUMA_dB = −13` (cerca) / `−19` (media), relativo al pico de **ese** evento.
- **Pan:** el **mismo** que su voz (viene del mismo tramo de playa → es contenido correlacionado).

> ⚠️ La espuma vive en 2-6 kHz, donde la capa de olas ya está 13-26 dB abajo: **poca energía broadband, mucho efecto sobre `pend`**. Es la perilla #1 cuando `pend` se va por encima de −4 (§14).

---

## 8. CAPA 3 — Lecho de burbujas Minnaert (corrige E6)

El agua por sí sola casi no suena: **todo** el sonido del agua es aire atrapado. En el experimento controlado, impidiendo la burbuja (varilla o tensoactivo) **no se produce sonido alguno** pese a que el impacto sí ocurre. Por encima de 500 Hz, en la rompiente real, el sonido es **enteramente** radiación de burbujas individuales.

**Prerenderiza UNA VEZ un `Float32Array` de 30 s (dos veces: L y R con semillas distintas).**

```js
const LAMBDA = 400;                       // burbujas/s  ← ver nota de densidad
const rMin = 0.0008, rMax = 0.008;        // 0.8 – 8 mm  →  408 Hz – 4075 Hz
// 50 radios log-espaciados; tasa de cada tamaño ∝ 1/r^2 (γ=2, régimen "streaming")
const f0 = 3.26 / r;                              // Minnaert (r en metros)
const d  = 0.043*f0 + 0.0014*Math.pow(f0, 1.5);   // amortiguamiento, s⁻¹
const D  = Math.pow(Math.random(), 10);           // profundidad, β = 10
const a  = D * Math.pow(r, 2.0);                  // α = 2.0  ← α ALTO = LEJANÍA
const xi = (D > 0.9) ? 0.1 : 0;                   // riseCutoff: solo el 10 % sube de tono
// muestra a muestra, hasta t = 4/d :
s += a * Math.sin(2*Math.PI*f0*(t + 0.5*xi*d*t*t)) * Math.exp(-d*t);
```

**Tabla radio → frecuencia → duración** (derivada, no supuesta):

| radio | f₀ | d (s⁻¹) | τ = 1/d | T60 = 6.9/d |
|---|---|---|---|---|
| 8 mm | 408 Hz | 29 | 34 ms | 238 ms |
| **3.26 mm** | **1000 Hz** | **87** | **11.5 ms** | **79 ms** ← el pico del mar en calma |
| 2 mm | 1630 Hz | 146 | 6.9 ms | 47 ms |
| 1 mm | 3260 Hz | 359 | 2.8 ms | 19 ms |
| 0.8 mm | 4075 Hz | 461 | 2.2 ms | 15 ms |

**Tres decisiones no obvias, y su porqué:**
1. **`riseCutoff` 0.9 es obligatorio.** Si TODAS las burbujas suben de tono, aparece un artefacto de **flanging** y la textura deja de sonar realista (advertencia explícita de van den Doel). Solo el ~10 % más superficial sube.
2. **`α = 2.0`, no 1.5.** α más alto reparte energía a burbujas grandes y **«crea sensación de distancia»**; α bajo «crea la ilusión de estar cerca del agua». Es literalmente la perilla de distancia del modelo.
3. **La constante de Minnaert es 3.26, no 3.** `f₀·a = √(3γp_A/ρ)/2π = 3.287 m/s`. El «3» que circula es un redondeo del 8 %.

**Densidad — resuelvo el conflicto entre lentes.** Una lente pedía 2-8 granos/s (audibles), otra 3000/s (fundidos). **Λ = 400/s con β = 10** es la síntesis correcta: se generan 400, pero el peso de profundidad hace que **solo ~4-6/s asomen sobre el lecho**. Se cumplen las dos cosas: micro-estructura densa + transitorios resueltos raros.
⚠️ **Si en un espectrograma de 10 s cuentas más de ~5 transitorios por segundo, tu mar dejó de estar lejos y suena a arroyo.**

**Reproducción:** el buffer se lee con **dos `AudioBufferSourceNode` en offsets 0 s y 13.7 s, a `playbackRate` 1.000 y 0.993** → el batido de la repetición cae en 30/0.007 ≈ **71 minutos**. Banda: `highpass 700 Hz` → `onePole(4500)`.
**Ganancia:** 60 % fija + 40 % siguiendo la suma de envolventes de las voces cerca+media, **retrasada 0.5 s**. Nunca desaparece del todo.

**Coste:** 400/s × 30 s × ~10 ms ≈ 3.6 M escrituras por canal ≈ **80-150 ms de JS**. En el banco hazlo síncrono. En el sitio, difiérelo: arranca las capas 1-3, construye el buffer 1.5 s después y **entra con un crossfade de 4 s**.

---

## 9. CAPA 4 — El lecho continuo (corrige E1)

Es el Lmin del paper: las olas lejanas que nunca callan. **Sin él hay huecos entre olas, y un hueco delata al sintetizador antes que cualquier otra cosa.**

- **Dos generadores INDEPENDIENTES**, uno a L y uno a R (buffers distintos, offsets distintos). Nunca el mismo buffer con un delay: eso se cancela en mono y produce comb filtering audible.
- Cadena de color idéntica (§5), sin polo extra.
- Nivel: **24 % de la energía total** (−6.2 dB rel. total), fijo.
- **Sin modulación propia.** Toda la respiración viene del surf-beat maestro (§11).

---

## 10. Estéreo — el reparto exacto, con fórmula validada

> ⚠️ **Corrección importante a una de las lentes.** Recomendaba «dos bancos totalmente independientes, coherencia ≈ 0». Eso da `st ≈ 0.0-0.1` y **FALLA el gate del banco (0.2-0.7)**: suena a dos océanos distintos, uno en cada oreja. El estéreo del mar es **parcialmente** correlacionado.

`StereoPannerNode` es equal-power: una voz en `pan = p` va a los dos canales con `cos θ` y `sin θ`, θ = (p+1)·π/4. Correlación de la suma:

```
st  ≈  [ Σ wᵢ·cosθᵢ·sinθᵢ / Σ (wᵢ/2) ] · (1 − F_dec)
```

Con el reparto de §6.1 (pesos por voz: cerca 0.309, media 0.140, lejos 0.051 de la energía de olas) el corchete vale **0.70**.

✅ **MEDIDO** (renders de 40 s, barriendo `F_dec`):

| `F_dec` | `st` predicho | ✅ `st` MEDIDO |
|---|---|---|
| 0.00 | 0.70 | **0.68** |
| 0.20 | 0.56 | **0.54** |
| **0.33** | **0.47** | **0.45** ✅ |
| 0.45 | 0.39 | **0.38** |

→ **`F_dec = 0.33` es el valor de diseño.** La fórmula es tu perilla: `st` sube bajando `F_dec`, baja subiéndolo.

**Reglas duras del estéreo:**
- Nunca panees más allá de ±0.80. Hard-pan = el oyente localiza una fuente puntual y la ilusión de línea de rompiente muere.
- Nunca animes el `pan`. El movimiento estéreo lo dan las envolventes descorrelacionadas de las 6 voces, no un auto-panner.
- El bus de olas lleva compensación `1/√6 = 0.408`.

---

## 11. CAPA 5 — Surf-beat: la única modulación lenta permitida

El «surf beat» de Munk es real: ondas largas de **1 a 5 minutos** causadas por la variación de altura de los **grupos** de olas. Se aplica **solo a la ganancia maestra**, ±1.5 dB.

**Pero NO con un `OscillatorNode`.** Un seno tiene velocidad predecible y excursión fija; el oído lo sigue. Usa un proceso de Ornstein-Uhlenbeck (paseo aleatorio con retorno a la media):

```js
// cada 2.0 s:
x = x*(1 - 0.06) + gauss()*0.35;        // dB, retorno a la media 0.06
x = Math.max(-1.5, Math.min(1.5, x));
master.gain.linearRampToValueAtTime(base * Math.pow(10, x/20), t + 2.0);
```
Tiempo de correlación ≈ 33 pasos ≈ **66 s**, dentro del rango medido (60-300 s). El recorrido son rectas quebradas hacia destinos aleatorios, no una curva lisa → mantiene `suave` bajo. → **corrige E4.**

---

## 12. Maestro

```
bus_olas (×0.408) ─┐
bus_espuma        ─┤
bus_lecho         ─┼→ ganancia surf-beat → WaveShaper tanh(1.15·x), oversample '2x'
bus_burbujas      ─┘        → biquad 'highpass' 25 Hz (bloqueo de continua)
                            → MAESTRO → destination
```

- **`tanh`**: rellena los huecos y **recupera 2-3 dB de `cresta`**, que es lo que da margen contra el gate de 16 dB y contra el recorte. Con `k = 1.15` la distorsión es inaudible.
- **Fade-in de 10 s** al arrancar: `gain.setValueAtTime(0.0001, 0)` + `exponentialRampToValueAtTime(MAESTRO, 10)`. Un mar que aparece de golpe suena a que alguien le dio play.
- **Nivel del banco:** RMS ≈ **−21 dBFS** → `aud dB` cae en −26/−18 con pico ≈ 0.45 (holgadísimo contra el 0.95). Calibra con una pasada: `MAESTRO_nuevo = MAESTRO · 10^((−21 − aud_dB_medido)/20)`.
- **Nivel del sitio:** envuelve todo en un gain de usuario de **0.35-0.50** (≈ −30 dBFS) y déjalo con control de silencio. Web Audio exige gesto del usuario para arrancar.

---

## 13. Predicción de las métricas del banco

| métrica | objetivo | predicho para esta spec | base |
|---|---|---|---|
| `pend` | −4 a −7 | **−4.5 ± 0.7** | ✅ cadena medida −4.7/−4.8; la espuma la sube ~0.3 |
| `perio` | < 0.25 | **0.06 – 0.15** | ✅ medido 0.06 con 8 buffers; el scheduler estocástico no añade |
| `barrid` | **< 0.8** | **0.40 – 0.55** | ✅ piso medido 0.37 + shelf ±2 dB + envolventes |
| `suave` | < 0.6 | **< 0.10** | ✅ medido −0.03 (nada barre) |
| `olas/m` | 8 – 20 | **11 – 17** | 11.5 onsets/min + piso de la métrica |
| `cresta` | 8 – 16 | **13 – 15** | ✅ piso medido 13.0-13.5 + excursión − tanh |
| `st` | 0.2 – 0.7 | **0.45** | ✅ MEDIDO exacto con F_dec = 0.33 |
| `aud dB` | −26 a −18 | **−21** | por calibración |
| `pico` | < 0.95 | **≈ 0.45** | crest 14 dB sobre RMS −21 dBFS |

> ⚠️ **`olas/m` es una métrica débil — no la persigas.** ✅ MEDIDO: **ruido estático sin ninguna ola** ya marca **13.5 a 25.5 olas/min** (y ruido rosa crudo, 42/min). Cuenta el temblor de la envolvente del propio ruido. Úsala **solo como techo** (que no pase de 20). No la uses jamás como prueba de que hay olas.

---

## 14. Tabla de perillas — qué tocar cuando una métrica falla

| falla | perilla | dirección |
|---|---|---|
| `pend` > −4 (brillante) | `ESPUMA_dB` primero; luego `POLO_DIST` 3000 → 2400 | bajar |
| `pend` < −7 (oscuro) | `POLO_DIST` 3000 → 3800 | subir |
| `barrid` > 0.8 | highshelf por evento ±2 → ±1 dB → 0; luego subir el lecho 2 dB (es espectralmente fijo, promedia hacia abajo) | |
| `suave` > 0.6 | σ del intervalo 0.30 → 0.40; verifica que el surf-beat sea OU y no seno | |
| `perio` > 0.25 | ¿dos voces comparten buffer o `playbackRate`? Añade largos a `LARGOS`. Verifica que los μ sean inconmensurables | |
| `olas/m` > 20 | subir μ de las voces **cerca** | |
| `olas/m` < 8 | bajar μ de las voces **cerca** (no de las lejanas: no cruzan el umbral) | |
| `cresta` > 16 | `RAY_TOPE` 2.4 → 2.0; `tanh` k 1.15 → 1.4 | |
| `cresta` < 8 | subir la profundidad de envolvente (`PISO` 0.06 → 0.03) | |
| `st` < 0.2 | bajar `F_dec` | |
| `st` > 0.7 | subir `F_dec` | |
| `tono` > 6 dB | algún Q > 1 se coló. Todos los `lowpass`/`highpass` a **−3.0103**; el `peaking` a **0.7** | |
| `pico` > 0.95 | `MAESTRO` | |

**Aislamiento barato:** renderiza la misma arquitectura con N = 1, 2, 4 y 6 voces. Si `barrid` no cae aproximadamente como **B/√N**, las voces **no son independientes de verdad** (comparten buffer, offset o rate). Es el diagnóstico más rápido que existe para E1.

---

## 15. ⛔ Lo que NO se hace — cada prohibición con el error que evita

| ⛔ | por qué | evita |
|---|---|---|
| **Modular `filter.frequency` con cualquier cosa** — LFO, envolvente, ruido lento | Es la causa raíz literal del «bong». Mover el centroide >0.8 oct = una nota | **E2** |
| **`OscillatorNode` → cualquier `AudioParam`** | Un seno es predecible; el oído lo sigue. Todo modulador lento = rampas a destinos aleatorios | E4 |
| **Intervalos periódicos** | El oído caza la regularidad en ~30 s | E4 |
| **`Q > 1` en cualquier filtro** (salvo el `peaking` de 1 kHz, Q=0.7) | Un pico estrecho asoma como tono. `Q=0.0001` NO es plano: es +1.25 dB. Butterworth = **−3.0103** | E2 |
| **`BiquadFilterNode 'lowpass'` para la forma espectral** | −12 dB/oct con resonancia = el doble de abrupto que el mar. Un polo real solo con `IIRFilterNode` | E2 |
| **Compartir un buffer de ruido entre dos capas o entre L y R** | Causa #1 de que suene «plano»; con delay se cancela en mono (comb filtering) | E1, E7 |
| **Un solo buffer en bucle** | ✅ MEDIDO: `perio` 0.77. El oído memoriza un loop de ruido en ~5 vueltas | **E7** |
| **Ruido marrón como base** | −6 dB/oct es 3 dB/oct de más en graves y le falta el hombro de 800-1600 Hz. Marrón describe el mar **SUBMARINO** (Wenz/Knudsen); no lo uses para lo que oye una persona en la orilla | — |
| **Sub-graves / refuerzo bajo 100 Hz** | En un mar en calma los niveles **BAJAN** ahí; lo que se mide es **viento en el micrófono**, no olas. En laptop solo consume headroom | — |
| **Un transitorio percusivo tipo «crash»** | Chachalacas rompe **spilling**, no plunging: ξ₀ = 0.13-0.38, muy por debajo del umbral 0.5 de Battjes. No hay golpe único; hay emisión continua y distribuida | — |
| **Contenido audible sobre ~6 kHz** | A 300 m ya se perdieron 18 dB en 8 kHz; a 1 km, 55 dB | — |
| **Decorrelación total L/R** | `st ≈ 0` falla el gate 0.2-0.7 y suena a dos océanos | — |
| **Hard-pan (±1.0)** | El oyente localiza una fuente puntual; muere la línea de rompiente | — |
| **Sincronizar el audio con los periodos de `marea.js`** (6.9…17.1 s) | Son una estilización visual con ritmo de swell del Pacífico. Atar el audio a ellos **reintroduce exactamente la periodicidad que causó el bong** | E4 |
| **`AudioWorklet`** | `render.mjs` no hace `await construirMar(...)`; `addModule()` llegaría tarde | — |
| **Crear nodos por evento** | Miles de nodos en una web de hotel. Un evento es automatización de `AudioParam`, nada más | — |

---

## 16. Conflictos entre las lentes — resueltos, y por qué

| tensión | resolución |
|---|---|
| **Periodo: 3.64 s (Tm02) vs 5.0 s (Tp) vs 9 s** | Los tres son ciertos y miden cosas distintas. Tm02 cuenta toda ola; solo las energéticas rompen. **El tren de eventos AUDIBLES es 5.2 s** = Tp medido, obtenido de 6 voces a 21-31 s con 19 % de descarte. Los 9 s venían de suponer T=7 s (swell), no del Golfo |
| **Un polo a 1800 Hz vs dos polos a 1200 Hz** | Son la misma curva partida en dos: la primera es **la fuente**, la segunda incluía **la distancia**. La spec las separa (`POLO_FUENTE` + `POLO_DIST` + `POLO_AIRE`) y ✅ el resultado medido reproduce ambas referencias dentro de ±2 dB |
| **fc del evento ligada a la amplitud (700-1500 Hz) vs fija** | La ligadura sale de Bolin & Åbom, pero solo aplica con **Hs > 1 m**. Chachalacas tiene Hs mediana 0.56-0.7 m: **el pico se queda clavado en ~1 kHz**. fc FIJA + shelf ±2 dB |
| **Burbujas: 2-8/s vs 3000/s** | Λ = 400/s con β = 10: se generan 400, **asoman 4-6**. Las dos lentes describían el mismo fenómeno desde extremos distintos |
| **Ruido marrón de fondo vs highpass a 100 Hz** | Gana la medición: el mar en calma **baja** bajo 100 Hz. Sin marrón. HP 80 Hz Butterworth |
| **Estéreo: coherencia 0 vs Splay** | ✅ MEDIDO: coherencia 0 falla el gate. `F_dec = 0.33` → `st = 0.45` |
| **Excursión 19 dB vs 6-10 dB** | **9-12 dB.** Los 19 dB se midieron a 20 m; a 300 m la suma de muchos rompientes la comprime. Y ✅ el `cresta` base del ruido ya es 13 dB con techo de 16: 19 dB rompería el gate |
| **`Q = 0.0001` «plano»** | Falso: da Q_lineal = 1.0 = **+1.25 dB de pico**. Butterworth es **Q = −3.0103 dB** |
| **«Rosa es −3 dB/oct» en el docstring del banco** | ✅ MEDIDO falso para esta métrica: `tercios_de_octava()` mide energía de banda, y el rosa da **0.0 dB/oct**. El objetivo −4/−7 es **sobre el rosa**, no sobre el blanco |

---

## 17. Coste

~60 `AudioNode` permanentes · 8 buffers de ruido ≈ 6.5 MB · 1 buffer de burbujas de 30 s ×2 canales ≈ 11 MB (difiérelo 1.5 s y entra con crossfade) · re-programación de eventos cada 30 s. Cabe de sobra en el navegador de un huésped mirando fotos.

**Archivos de validación usados (ya borrados los WAV, quedan los .js):**
`/private/tmp/claude-501/-Users-gersioasecas/3ae282b9-cd0c-4f12-8852-d78c5b12dd4b/scratchpad/_spec-color.js` (cadena de color), `_spec-loop.js` (política anti-bucle), `_spec-st.js` (fórmula de estéreo). No toqué nada en `sonido/variantes/` — PROTOCOLO regla 5.
