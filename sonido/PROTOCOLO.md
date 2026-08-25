# Protocolo — el sonido del mar de Riverside

> Compartido por todas las sesiones dedicadas. Léelo entero antes de tocar nada.

## El encargo, en una frase

Sintetizar en **Web Audio, sin ningún archivo de audio**, el sonido de un **mar tranquilo y
lejano** — el que relaja de inmediato al entrar a la página, no el que sobresalta.

## Lo que ya falló, y por qué

Sergio escuchó el primer intento y dijo, textual:

> «no suena para nada como las suaves olas, suena mas como el sonido de un bong en la
> filarmonica cuando el sonido se queda largo, así, no hay multiples olas suavemente
> superponiendose»

Ese intento era ruido rosa pasado por **un** lowpass cuya frecuencia de corte modulaba entre
600 y 3800 Hz con un LFO lento.

**Ya está diagnosticado, y con número.** El problema no era un tono: era que el **centro
tímbrico paseaba 2.55 octavas**, y el oído sigue eso igual que seguiría una nota.

| | barrido del centroide |
|---|---|
| ruido puro (control) | 0.06 oct |
| v0, el que sonó a «bong» | **2.55 oct** |
| v1, filtros quietos pero bandas moduladas por separado | **2.37 oct** ← tampoco sirvió |
| v2, envolvente sobre la voz entera | 1.52 oct |

**La lección:** una ola de verdad sube y baja de **VOLUMEN**; su timbre apenas cambia. Cualquier
cosa que mueva el centroide más de ~0.8 octavas vuelve a sonar a filtro.

## El banco de pruebas (ya está hecho, úsalo)

```bash
cd ~/Developer/riverside-web/sonido/banco

# renderizar tu variante a WAV (30-40 s es suficiente)
node render.mjs ../variantes/TU-VARIANTE.js ../rendids/TU-VARIANTE.wav 40

# medirla, sola o comparada con las demás
python3 analizar.py ../rendids/TU-VARIANTE.wav
python3 analizar.py ../rendids/*.wav
```

**Contrato de una variante:** un archivo `.js` que defina en el ámbito global

```js
function construirMar(ctx, duracionSegundos) { /* conecta a ctx.destination */ }
```

Nada más. Sin imports, sin dependencias. Va a correr tal cual en el navegador.

## Objetivo numérico

| métrica | objetivo | qué significa |
|---|---|---|
| `barrid` | **< 0.8 oct** | ⭐ el número que mata el «bong». El más importante. |
| `suave` | < 0.6 | recorrido del centroide irregular, no un LFO liso |
| `perio` | < 0.25 | no se oye el bucle |
| `olas/m` | 8 – 20 | se perciben olas, ni contables ni una lavadora |
| `cresta` | 8 – 16 dB | respira, sin golpes que sobresalten |
| `st` | 0.2 – 0.7 | envuelve, no suena dentro de la cabeza |
| `pend` | −4 a −7 dB/oct | un mar LEJANO es oscuro: el aire se come los agudos |
| `aud dB` | −26 a −18 | se oye en un altavoz de laptop |
| pico | **< 0.95** | si recorta, no sirve por bueno que mida |

## Reglas duras

1. **Nada de archivos de audio.** Todo generado. Es una decisión tomada: un mp3 en bucle se
   desincroniza de la animación y pesa.
2. **Que no recorte.** El renderizador avisa con `❌ RECORTA`. Un pico >1.0 invalida la variante.
3. **Mide antes de opinar.** Ninguno de nosotros puede escuchar esto; el banco es el único juez
   hasta que Sergio lo oiga.
4. **Que sea barato.** Va a correr en el navegador de un huésped mientras mira fotos. Buffers
   razonables, sin miles de nodos.
5. **Escribe SOLO tu archivo de variante.** Las demás sesiones trabajan en paralelo.
6. **Documenta en el propio archivo** por qué elegiste cada número, sobre todo si viene de una
   fuente. Quien lo lea dentro de seis meses tiene que entender el porqué.

## Cómo se decide la ganadora

Yo (el orquestador) mido todas, genero los WAV y se los mando a Sergio para que los escuche.
**Él es el juez final** — el banco solo evita que le lleguemos con algo que ya sabemos que falla.
