#!/usr/bin/env python3
"""Procesa los assets rescatados del WordPress viejo a formatos web.
Idempotente: no rehace lo que ya existe y es más nuevo que la fuente."""
import os, sys
from PIL import Image, ImageOps

RAIZ = os.path.expanduser('~/Developer/riverside-web')
SRC  = os.path.join(RAIZ, 'origen/assets')
DST  = os.path.join(RAIZ, 'codigo-puro/img')
os.makedirs(DST, exist_ok=True)

# nombre_destino: (archivo_origen, [anchos], relacion_o_None, gravedad)
PLAN = {
    'hero':       ('riverside-hotel-chachalacas-veracruz11-3780520574-e1731559709420.png', [1880, 1440, 1024, 640], (16, 10), 'center'),
    'hotel':      ('riverside-hotel-chachalacas-veracruz12-edited.jpg', [1100, 800, 560], (4, 5), 'center'),
    'glamping':   ('cabanas.jpg',  [1100, 800, 560], (4, 5), 'center'),
    'home':       ('home.jpg',     [1100, 800, 560], (4, 5), 'center'),
    'restaurante':('resta.jpg',    [1100, 800, 560], (4, 5), 'center'),
}

def recorta(im, ratio, grav):
    if not ratio: return im
    w, h = im.size
    objetivo = ratio[0] / ratio[1]
    actual = w / h
    if abs(actual - objetivo) < 0.01: return im
    if actual > objetivo:                      # sobra ancho
        nw = int(h * objetivo)
        x = (w - nw) // 2
        return im.crop((x, 0, x + nw, h))
    nh = int(w / objetivo)                     # sobra alto
    y = 0 if grav == 'top' else (h - nh) // 2
    return im.crop((0, y, w, y + nh))

hechos = []
for nombre, (arch, anchos, ratio, grav) in PLAN.items():
    f = os.path.join(SRC, arch)
    if not os.path.exists(f):
        print(f'  ⚠️  falta {arch}', file=sys.stderr); continue
    base = ImageOps.exif_transpose(Image.open(f)).convert('RGB')
    base = recorta(base, ratio, grav)
    for w in anchos:
        if w > base.width: continue
        h = round(base.height * w / base.width)
        im = base.resize((w, h), Image.LANCZOS)
        for ext, kw in (('webp', dict(quality=82, method=6)), ('avif', dict(quality=58))):
            out = os.path.join(DST, f'{nombre}-{w}.{ext}')
            if os.path.exists(out) and os.path.getmtime(out) > os.path.getmtime(f): continue
            try:
                im.save(out, **kw); hechos.append(os.path.basename(out))
            except Exception as e:
                print(f'  ⚠️  {ext}: {e}', file=sys.stderr)
        # respaldo jpg para el ancho menor
        if w == min(anchos):
            out = os.path.join(DST, f'{nombre}-{w}.jpg')
            im.save(out, quality=84, optimize=True, progressive=True); hechos.append(os.path.basename(out))

# logo: se conserva PNG (blanco con transparencia) + versión chica
logo = os.path.join(SRC, 'riversolo-blanco.png')
if os.path.exists(logo):
    l = Image.open(logo).convert('RGBA')
    for w, n in ((792, 'logo'), (240, 'logo-sm')):
        if w > l.width: continue
        l.resize((w, round(l.height * w / l.width)), Image.LANCZOS).save(os.path.join(DST, f'{n}.png'), optimize=True)
        hechos.append(f'{n}.png')

# imagen para compartir (OG) 1200x630, hero + velo + logo
try:
    from PIL import ImageDraw
    h = ImageOps.exif_transpose(Image.open(os.path.join(SRC, PLAN['hero'][0]))).convert('RGB')
    og = recorta(h, (1200, 630), 'center').resize((1200, 630), Image.LANCZOS)
    velo = Image.new('RGBA', og.size, (12, 27, 39, 110))
    og = Image.alpha_composite(og.convert('RGBA'), velo).convert('RGB')
    lg = Image.open(logo).convert('RGBA'); lg.thumbnail((190, 190), Image.LANCZOS)
    og.paste(lg, ((1200 - lg.width) // 2, 150), lg)
    og.save(os.path.join(DST, 'og.jpg'), quality=88, optimize=True); hechos.append('og.jpg')
except Exception as e:
    print(f'  ⚠️  og: {e}', file=sys.stderr)

print(f'✅ {len(hechos)} archivos: ' + ', '.join(sorted(hechos)[:6]) + (' …' if len(hechos) > 6 else ''))
