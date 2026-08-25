# MAPA — riversidechachalacas.com.mx

> Brief de navegación. Léelo primero. **Si un archivo contradice a este mapa, gana el archivo.**
> Hilo de la misión viva: `MISION.md`. Sellado: 2026-08-24.

## Qué es

El sitio de **Riverside Chachalacas**, un complejo a la orilla del río Actopan en Chachalacas,
Úrsulo Galván, Veracruz, con cuatro productos bajo una marca: **Hotel · Glamping · Home ·
Restaurante**. Este repo lo saca de WordPress.com y lo deja en código puro sobre GitHub Pages.

## ⛔ Invariantes

| # | Regla |
|---|---|
| I-1 | **`riversidehotel.com.mx` NO SE TOCA.** Es otro sitio, otro dominio, otro negocio vivo. Aquí solo se le enlaza. |
| I-2 | **El correo Titan no se rompe.** Los MX, el SPF, el DMARC y la verificación de Google se quedan como están. Solo cambian los registros A. → `docs/DOMINIO-Y-DNS.md` |
| I-3 | **Ningún dato del negocio se inventa.** Cifra, distancia, capacidad o amenidad: con fuente, o no se publica. |
| I-4 | El WordPress viejo **no se borra** hasta que el nuevo esté verificado en vivo. Es el rollback. |
| I-5 | Los colores **no se eligen, se miden**. Todo valor nuevo entra por `tokens.css` con su origen anotado. |

## 🌳 Cómo se conecta

```
riverside-web/
├── MAPA.md · MISION.md          ← empieza aquí
│
├── codigo-puro/                 ★ ESTO es lo que se publica (y solo esto)
│   ├── index.html               una sola página; las secciones son anclas
│   ├── 404.html
│   ├── CNAME                    ⚠️ si desaparece, el dominio se cae
│   ├── robots.txt · sitemap.xml
│   ├── css/
│   │   ├── tokens.css           🏠 HOGAR de color, tipografía, espacio, tiempo
│   │   ├── base.css             reset + tipografía del documento + botones
│   │   └── sitio.css            composición de cada sección
│   ├── js/
│   │   ├── corriente.js         🏠 la animación firma (ver abajo)
│   │   └── sitio.js             nav que se posa · aparición al entrar · año del pie
│   └── img/                     avif + webp + jpg de respaldo, generados
│
├── origen/                      el WordPress viejo, tal como estaba
│   ├── assets/                  los 9 archivos originales a máxima resolución
│   ├── home_raw.html            el HTML servido
│   ├── home_texto.txt           su texto plano
│   └── actual.png               captura del sitio anterior
│
├── scripts/
│   ├── imagenes.py              origen/assets → codigo-puro/img (idempotente)
│   └── publicar.sh              ★ el único comando de despliegue
│
├── docs/DOMINIO-Y-DNS.md        qué registro se toca y cuál mataría el correo
└── .github/workflows/publicar.yml   push a main → GitHub Pages
```

## 🏠 Registro de hogares canónicos

Antes de crear algo, mira si ya vive aquí.

| Necesitas… | Vive en | Nunca |
|---|---|---|
| Un color, un tamaño de letra, un espacio, una duración | `css/tokens.css` | escribir un hex o un `px` suelto en otro archivo |
| Azul de marca **para texto o fondo de botón** | `--marca-legible` (`#0d66aa`) | `--marca` (`#1080d0`): es la identidad, y con blanco encima da 4.18:1 — por debajo de AA |
| Estilo de botón | `css/base.css` (`.boton` + modificadores) | un botón nuevo desde cero |
| Un tipo de sección | `css/sitio.css` | duplicar la retícula |
| La animación firma | `js/corriente.js` | una segunda librería de scroll |
| Reveal al entrar en cuadro | `js/sitio.js` (`[data-sube]`) | otro IntersectionObserver |
| Procesar una imagen nueva | `scripts/imagenes.py` (añádela al dict `PLAN`) | meter un jpg a pelo en `img/` |
| Publicar | `scripts/publicar.sh` | `git push` a mano |
| El original de una foto | `origen/assets/` | volver a bajarla del WordPress |

## 🌊 La animación firma (lo que hace distinto a este sitio)

El logo es una **gota triangular con una ola enroscada** cuya cresta escapa en dos trazos
horizontales. Esos trazos son el río. `corriente.js` los desenrosca: calcula un path Bézier a
partir de la posición **real** de cada título marcado `data-moja`, y lo va dibujando conforme
bajas (`stroke-dashoffset` ligado al scroll, con inercia). Una gota viaja sobre el trazo, y cada
título que el agua toca se queda con una marca de agua debajo, para siempre.

**Reglas de esa animación (son gates, no gustos):**
- El agua **no rebota** — no hay `bounce` ni `elastic` en ninguna curva del sitio.
- El agua corre **por debajo** del contenido. Si asoma sobre una foto, es un defecto.
  Por eso `.estancias` y `.cerca` tienen suelo opaco.
- Lo que ya se mojó **se queda mojado** al subir. El agua no se despinta.
- Con `prefers-reduced-motion` el SVG se oculta y todos los títulos nacen ya subrayados.

## ⚠️ Trampas

1. **El WordPress viejo tenía 0 páginas y 0 posts en la API.** Todo vivía en plantillas del
   editor de sitios. Si vuelves a consultar la REST y te da vacío, no está roto: es así.
2. **`riversidehotel.com.mx` responde 403 a bots** pero 200 con un User-Agent de navegador.
3. **El `filter:` que tiñe el logo de la nav** (`sitio.css`) es una cadena de `invert/sepia/
   hue-rotate` calibrada a mano contra `--rio-500`. Si cambia el azul de marca, hay que
   recalibrarla, no adivinarla.
4. **`sloplint` marca `numbered-section-markers`**: no vuelvas a poner 01/02/03 como etiquetas.
   Y vigila las rayas — más de dos en el cuerpo del texto y vuelve a saltar.
5. **`body` NO lleva `overflow-x: hidden`** a propósito: recortaba el SVG de la corriente.
   Si alguna vez hace falta contener un desborde, arréglese el desborde, no se reponga esa línea.
6. **Las rutas de recurso son RELATIVAS** (`img/…`, no `/img/…`) para que el sitio cargue igual
   en el dominio y en la URL de previsualización con subcarpeta. El `404.html` sí las lleva
   absolutas, porque puede servirse desde cualquier ruta.
7. **⚠️ NO empujes mientras GitHub esté emitiendo el certificado del dominio.** Con
   `build_type: workflow`, cada despliegue relee el `CNAME` del artefacto y **reinicia el
   aprovisionamiento del certificado**. El 2026-08-24 tres pushes seguidos dejaron el
   certificado sin emitirse durante 90 minutos: el objeto `https_certificate` ni siquiera
   llegaba a existir. **El destrabe** es quitar el dominio por API (`PUT /pages` con
   `{"cname": null}`), esperar ~3 min y volver a ponerlo; el estado pasa entonces a
   `authorization_pending`, que es la señal de que sí arrancó.
8. **`home-1100` y `restaurante-1100` no existen a propósito**: al recortar a 4:5 esas fotos
   quedan por debajo de 1100px de ancho. El `srcset` ya lo contempla.

## Correr y probar

```bash
cd ~/Developer/riverside-web/codigo-puro && python3 -m http.server 4173
sloplint index.html                       # gate anti-slop, 0 tokens
```

Capturas y QA visual: el motor está en `~/.claude/skills/revisor/engine/` (puppeteer-core +
Chrome). Un script propio tiene que vivir en esa carpeta para poder importarlo.

## Estado

**EN VIVO** en https://riversidechachalacas.com.mx desde el 2026-08-24.
Repo `Gersioasecas/riverside-web`; `git push` a `main` dispara la acción que publica
`codigo-puro/`. Detalle del montaje, el DNS y cómo revertir: `MISION.md`.
