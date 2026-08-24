# MISIÓN — riversidechachalacas.com.mx: de WordPress.com a código puro

> Hilo vivo de la misión. Hermano de `MAPA.md` (navegación estructural).
> Arrancada 2026-08-24. Driver: `/full-autonomy-loop`. Método de construcción: `/estudio`.

---

## 📜 Acta de Espíritu (WRITE-ONCE — no se reescribe)

**Verbatim de Sergio (2026-08-24):**

> «tengo este dominio, la página está hosteada y todo en wordpress, quiero que hagamos como con
> senusa y como con solmil, y que la mudemos a codigo puro en un grupo de github pages, de forma
> que quede mucho mejor, pero primero para que te inspires checa la pagina actual, y toma de ahí
> las imagenes, logos y todo para cuando reconstuyas, activa la skill de paginas que guardamos
> cuando la de solmil, y deja todo listo porfas, ya solo te ayudo si es que no controlas lo de
> los DNS y todo eso de wordpress pero si tienes el mcp asi que igual y si puedes todo»

**Corrección en vivo (mismo día):**

> «estabas checando el sitio incorrecto, el que quiero mudar es riversidechachalacas.com.mx, el
> de la foto que te compartí, **riverside hotel no lo toques porfas**»

**Traducción a "hecho" (definición observable de misión cumplida):**

1. `https://riversidechachalacas.com.mx` sirve un sitio **estático propio** desde GitHub Pages,
   con HTTPS válido y sin una sola línea de WordPress.
2. El sitio es **notoriamente mejor** que el actual: dirección de arte propia, animación firma
   derivada del logo, contenido real (no placeholder de tema).
3. **El correo `reservaciones@riversidechachalacas.com.mx` sigue funcionando** después de la mudanza.
4. Todos los assets (logo, 4 fotos, hero) salieron del sitio actual y viven en el repo.
5. Publicar es **un comando** documentado.
6. Pasa `sloplint` con 0 críticos y `/revisor` con calificación ≥ B.

---

## ⛔ INVARIANTES (romper uno = misión fallida)

| # | Invariante | Por qué |
|---|---|---|
| I-1 | **`riversidehotel.com.mx` NO SE TOCA.** Ni su sitio, ni su DNS, ni su blog_id (238125758). | Orden explícita de Sergio. Es un negocio distinto y vivo. |
| I-2 | **El correo Titan no se rompe.** MX `mx1/mx2.titan.email` + el SPF quedan intactos. | `reservaciones@` es la puerta de reservas del negocio. |
| I-3 | **No se inventa ni un dato del negocio.** Precio, horario, número de habitaciones, reseña: o tiene fuente, o no se publica. | `feedback_no_inventar_afirmaciones_especificas` |
| I-4 | El sitio de WordPress **no se borra** hasta que el nuevo esté verificado en vivo. | Rollback en un solo cambio de DNS. |
| I-5 | Nada entra a `main` sin que yo lo lea y lo verifique con los ojos. | Ley de la Escalera de Fuerza. |

---

## 🗺️ Mapa del Estado (medido, no supuesto — 2026-08-24)

### Lo que hay hoy

| Pieza | Estado real |
|---|---|
| Sitio | WordPress.com **simple**, blog_id `238996446`, alias `riversidechachalacascommxdomainonly.wordpress.com` |
| Creado | 2024-11-13 · **última edición 2024-12-05** (lleva ~21 meses congelado) |
| Contenido | **0 páginas, 0 posts** en la API. Todo vive en plantillas del editor de sitios (FSE). Es una one-page. |
| Dominio | Registrado 22-oct-2024, renueva **7-oct-2027**, autorenovación ON, MX$282 |
| Nameservers | **ns1/ns2/ns3.wordpress.com** ← se quedan; solo cambian los registros A |
| A (apex) | `192.0.78.180`, `192.0.78.232` (WordPress.com) |
| www | CNAME → apex |
| Correo | **Titan Email** — MX `mx1.titan.email` (10), `mx2.titan.email` (20) |
| SPF | `v=spf1 include:_spf.wpcloud.com include:_spf.google.com include:spf.titan.email ~all` |
| DMARC | `v=DMARC1;p=none;` |
| Otro TXT | `google-site-verification=rXOxyZounnZasA8Z7oaD3c14JdjS9aKSWvsR1EbUSIQ` |
| SSL | activo · DNSSEC desactivado · privacidad WHOIS no disponible (política del registro `.mx`) |

### El sitio actual, sección por sección

```
[hero]  foto aérea de la alberca junto al río · H1 "TU DESCANSO FAVORITO" · botón EXPLORA
        logo blanco arriba-izq · iconos IG / WhatsApp / FB arriba-der
[body]  H2 "Nuestras opciones para ti."
        párrafo genérico ← ES EL PLACEHOLDER DEL TEMA, no lo escribió nadie
        4 tarjetas en fila, cada una con foto + nombre + tagline + ★★★★★ + botón RESERVA
[slop]  barra flotante "Suscribirse" de WordPress.com
```

**Las 4 tarjetas (contenido real, se conserva):**

| Tarjeta | Tagline | RESERVA apunta a | Foto |
|---|---|---|---|
| Hotel | *No renuncies a nada.* | `riversidehotel.com.mx` | `riverside-hotel-chachalacas-veracruz12-edited.jpg` |
| Glamping | *Conecta con la naturaleza.* | `wa.me/5212292110203` | `cabanas.jpg` |
| Home | *Absoluta privacidad.* | `wa.me/5212292110203` | `home.jpg` |
| Restaurante | *Placer en cada bocado.* | `wa.me/5212292110203` | `resta.jpg` |

**Contacto real verificado en el HTML:**
WhatsApp `+52 1 229 211 0203` · IG [@riversidechachalacas](https://www.instagram.com/riversidechachalacas/) ·
FB `profile.php?id=100070940716284` · correo `reservaciones@riversidechachalacas.com.mx`

### Assets rescatados → `origen/assets/`

| Archivo | px | Qué es |
|---|---|---|
| `riversolo-blanco.png` | 792×810 | **El logo.** Gota triangular de línea fina + ola enroscada que sale en dos corrientes horizontales |
| `riverside-hotel-…veracruz11-….png` | 1883×1218 | Hero: toma cenital de la alberca entre el río y las palapas de teja roja |
| `riverside-hotel-…veracruz12-edited.jpg` | 1170×1560 | Hotel: los A-frame frente al agua con motos acuáticas |
| `cabanas.jpg` | 1536×2048 | Glamping: cabañas A-frame en la orilla con kayaks rojos |
| `home.jpg` | 2048×1064 | Home: casa blanca, alberca y palmeras |
| `resta.jpg` | 1440×1080 | Restaurante: palapa de madera con vista al río |
| `digital_stacked_white.png` | 478×412 | Sello TripAdvisor |
| `facebook_logo_secondary.png` / `instagram_glyph_white.png` | — | Glifos sociales (se reemplazan por SVG propio) |

**Fuera del sitio, ya en el disco de Sergio:**
`~/Documents/Riverside Adventure.jpg` + `RIVERSIDE_ADVENTURE_vector_limpio.png|.svg.ai` — el logo
completo de **Riverside Adventure Chachalacas**: montañas + la misma ola + onda azul + serif
"RIVERSIDE" + brush "ADVENTURE". Confirma la paleta azul y da el bloqueo tipográfico de la marca.

---

## 🎨 Dossier de Gusto (destilado, no preguntado)

De `~/.claude/CLAUDE.md`, `knowledge/`, `memory/` y el precedente de `solmil.com.mx`:

- **La animación firma sale de la geometría del logo** (`/estudio` ley 1), no de un catálogo.
- **La física es el árbitro** (ley 2): nada se mueve sin causa. Sin bounce, sin elastic.
- **«Estructurado y ordenado» es la otra mitad** (ley 3): la retícula va aburrida a propósito;
  toda la sorpresa vive en la signature.
- **Anti-slop es criterio de aceptación**, no de estilo: si se ve hecho por IA genérica, falló.
- **Belleza en lo cliente-facing.** Este sitio es la cara de un negocio real de Sergio.
- **Ship-something-beautiful over ask-first**: él edita cuando ve el resultado.
- **Redundancia con modos de falla independientes** en lo operativo (rollback de DNS trivial).
- **Honestidad con números** en cualquier recomendación de costo.

---

## ✍️ Contrato de Gusto (asunciones que tomo SIN preguntar — vetables sobre la marcha)

| # | Asumo | Si me equivoco |
|---|---|---|
| G-1 | El sitio deja de ser un menú de 4 botones y pasa a ser **un sitio destino**: cuenta Chachalacas, el río, las dunas — y ahí adentro viven las 4 experiencias. | Recorto a one-page: 20 min |
| G-2 | **Las puertas de reserva no cambian**: Hotel → `riversidehotel.com.mx`, los otros 3 → WhatsApp. Sin motor de reservas. | Cambiar un href |
| G-3 | **Signature = la ola del logo se desenrosca al hacer scroll** y su cresta se estira en la corriente que cose las secciones, como el Actopan cose Chachalacas. | Es un módulo aislado, se apaga |
| G-4 | Paleta del propio logo: **azul río** (~`#1B8ED6`), **azul noche** (`#14202C`), **arena** y blanco. Sin degradados morados ni glassmorphism. | Son tokens, un archivo |
| G-5 | **Se tiran las ★★★★★ auto-otorgadas** de las tarjetas. Estrellas que uno se pone solo restan credibilidad; van reseñas reales con fuente, o nada. | Se reponen |
| G-6 | Se tira el párrafo `«Bienvenido a un mundo de posibilidades ilimitadas…»` — **es el placeholder del tema**, no lo escribió nadie. | Se repone |
| G-7 | **Sin cookie banner, sin newsletter, sin chat flotante.** Ninguno aporta a un huésped que quiere ver el lugar y escribir por WhatsApp. | Se agregan |
| G-8 | Español como idioma único; inglés queda como hueco futuro, no bloquea. | Se abre el hueco |

---

## 📋 Ledger de Huecos

| # | Hueco | Mano | Gate | Estado |
|---|---|---|---|---|
| H-1 | Saber qué es el sitio actual y rescatar sus assets | yo (curl/puppeteer/PIL) | assets en disco + captura leída | ✅ cerrado |
| H-2 | Auditar el DNS y encontrar qué se rompe al mudar | yo (`dig`) | Titan/SPF identificados | ✅ cerrado |
| H-3 | Contenido REAL del negocio y del destino | Workflow 4 lentes + verificación adversarial | cada dato con fuente_url | 🔄 en vuelo (`wf_cdcc5c2c-276`) |
| H-4 | Sistema de diseño desde el logo (tokens, tipografía, signature) | yo | tokens escritos, cero valores mágicos | ⬜ |
| H-5 | Rebanada testigo: hero + una sección, para validar el norte | yo | Sergio la ve | ⬜ |
| H-6 | Sitio completo | yo + obreros para la talacha | todas las secciones | ⬜ |
| H-7 | Assets optimizados (webp/avif, responsive, favicon, OG) | obrero / script | Lighthouse ≥ 90 | ⬜ |
| H-8 | SEO técnico: JSON-LD `Hotel`+`LocalBusiness`, sitemap, robots, OG | obrero | validadores en verde | ⬜ |
| H-9 | Gates: `sloplint` + `/revisor` + auditores | skills | 0 críticos, ≥ B | ⬜ |
| H-10 | Repo GitHub + Pages + CNAME | yo | build verde | ⬜ |
| H-11 | **Cambio de DNS (A → GitHub Pages)** | MCP WordPress.com | **R1 — pido confirmación** | 🛑 parqueado |
| H-12 | Verificación en vivo + prueba de que el correo sobrevivió | yo | HTTPS OK + correo probado | ⬜ |

---

## 🛑 Paradas parqueadas

- **R1 · H-11 — cambiar los registros DNS.** El sitio queda 100% listo y verificado en la URL de
  GitHub Pages ANTES de tocar nada. El plan es **conservador**: se quedan los nameservers de
  WordPress.com, solo se sustituyen los 2 registros A del apex por los 4 de GitHub Pages y el
  CNAME de `www`. **MX, SPF, DMARC y la verificación de Google no se tocan** → el correo Titan
  sobrevive. Rollback = volver a poner los 2 A viejos.
- **R1 · crear el repo público en GitHub** (`git push` es hacia afuera) — se pide junto con lo anterior.

---

## 🧭 Bitácora de decisiones

| Fecha | Decisión | Cómo se revierte |
|---|---|---|
| 2026-08-24 | Proyecto en `~/Developer/riverside-web/`, rama de trabajo `construccion`. `main` solo recibe lo verificado. | `rm -rf` la carpeta |
| 2026-08-24 | **Se conservan los nameservers de WordPress.com** en vez de migrar a Cloudflare como en SOLMIL. Menos superficie de falla y el correo Titan ni se entera. | Migrar a Cloudflare después, si hace falta |
| 2026-08-24 | Estructura `codigo-puro/` como en SOLMIL, para reusar el patrón de publicación ya probado. | — |

---

## ➡️ Siguiente movimiento

Cerrar **H-4** (sistema de diseño) mientras vuelve el Workflow de contenido, y con eso levantar
la **rebanada testigo (H-5)** para enseñársela a Sergio antes de abrir el fan-out.
