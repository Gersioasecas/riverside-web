# Hallazgos de sloplint aceptados, con la prueba que los desmiente

`sloplint` es determinista y no ejecuta el navegador. Estas reglas disparan sobre este sitio
y se verificaron **midiendo**, no opinando. Cualquier regla que NO esté en esta lista bloquea
la publicación (ver `scripts/publicar.sh`).

## `low-contrast`

**Por qué dispara:** el texto del hero es blanco sobre una fotografía. El linter no puede
calcular el fondo de una imagen, así que asume el color del contenedor (transparente) y
reporta ratios de ~1.0.

**Cómo se verificó:** se capturó el hero con `visibility:hidden` en todo el texto, quedando el
fondo puro con su velo, y se midió el percentil 97 de luminancia (el 3 % más claro del fondo)
dentro de la caja exacta de cada texto:

| texto | tamaño | umbral | fondo peor | ratio | |
|---|---|---|---|---|---|
| H1 «Tu descanso favorito» | 86 px | 3:1 (texto grande) | `rgb(119,122,126)` | **4.31** | ✅ |
| Bajada | 23 px | 4.5:1 | `rgb(93,106,115)` | **5.56** | ✅ |
| «EXPLORA» | 12 px | 4.5:1 | `rgb(96,104,110)` | **5.67** | ✅ |
| Menú de la nav | 15 px | 4.5:1 | `rgb(46,28,34)` | **16.09** | ✅ |
| Iconos sociales | icono | 3:1 (gráfico) | `rgb(132,129,126)` | **3.87** | ✅ |

Todo pasa AA. Los iconos, además, llevan `drop-shadow` para despegarlos de la arena clara.

⚠️ **Si se cambia la foto del hero, esta medición hay que repetirla.** El script está en
`~/.claude/skills/revisor/engine/_fondo.mjs`.

## `overused-font`

**Por qué dispara:** el sitio carga **Montserrat**, que está en la lista de tipografías tan
usadas que ya no distinguen a nadie.

**Por qué se acepta aquí:** no es una elección estética. Montserrat delgada **es la tipografía
del logotipo de Riverside** — el «CHACHALACAS» que va debajo de «RIVERSIDE». Lo corrigió Sergio
el 2026-08-25, que conoce su propia marca:

> «la letra de el "CHACHALACAS" que va debajo del riverside en el logo no debe ser cinzel, esa es
> montserrat thin»

La regla existe para castigar el reflejo de elegir Montserrat por defecto. Usarla porque es la
del logo real es lo contrario de ese reflejo: es fidelidad a la marca.

**Alcance:** se usa **solo** en esas dos palabras (`.nav__nombre em` y `.pie__nombre em`). El
resto del sitio es Cinzel para display y DM Sans para el cuerpo. Si alguna vez Montserrat empieza
a aparecer en párrafos o botones, esta justificación ya no vale y el hallazgo vuelve a ser real.
