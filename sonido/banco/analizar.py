#!/usr/bin/env python3
"""
BANCO DE PRUEBAS · analizador
------------------------------------------------------------------------------
Mide un WAV contra el perfil de un mar tranquilo real. Existe porque ajustar un
sintetizador de oído, sin poder oírlo, es adivinar; y porque el oído humano
detecta enseguida cosas que sí se pueden medir: la periodicidad de un bucle, la
resonancia de un filtro, la falta de eventos superpuestos.

Uso:  python3 analizar.py <a.wav> [b.wav ...]
"""
import sys, wave, math
import numpy as np


def leer(ruta):
    with wave.open(ruta, 'rb') as w:
        sr = w.getframerate()
        ch = w.getnchannels()
        cru = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768.0
    if ch == 2:
        izq, der = cru[0::2], cru[1::2]
    else:
        izq = der = cru
    return sr, izq, der


def tercios_de_octava(sr, x):
    """Energía por bandas de tercio de octava, en dB relativos al total."""
    n = 1 << int(math.log2(len(x)))
    x = x[:n] * np.hanning(n)
    esp = np.abs(np.fft.rfft(x)) ** 2
    frec = np.fft.rfftfreq(n, 1 / sr)
    centros = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
    fuera = []
    total = esp.sum() + 1e-30
    for c in centros:
        lo, hi = c / 2 ** (1 / 6), c * 2 ** (1 / 6)
        m = (frec >= lo) & (frec < hi)
        e = esp[m].sum()
        fuera.append((c, 10 * math.log10(e / total + 1e-30)))
    return fuera


def pendiente_db_oct(bandas, desde=250, hasta=8000):
    """Pendiente espectral en dB/octava. Ruido rosa ≈ -3, marrón ≈ -6."""
    pts = [(math.log2(c), d) for c, d in bandas if desde <= c <= hasta]
    if len(pts) < 3:
        return float('nan')
    xs = np.array([p[0] for p in pts]); ys = np.array([p[1] for p in pts])
    return float(np.polyfit(xs, ys, 1)[0])


def periodicidad(sr, x):
    """
    ¿Se oye el bucle? Autocorrelación de la ENVOLVENTE. Un pico alto a un
    retardo concreto significa que la textura se repite y el oído lo cazará.
    Devuelve (mejor_correlacion, segundos_de_ese_retardo).
    """
    env = np.abs(x)
    k = sr // 100                                   # envolvente a 100 Hz
    env = np.convolve(env, np.ones(k) / k, 'same')[::k]
    env = env - env.mean()
    if env.std() < 1e-9:
        return 0.0, 0.0
    env = env / env.std()
    ac = np.correlate(env, env, 'full')[len(env) - 1:]
    ac /= ac[0] + 1e-30
    # Ignorar retardos < 2 s: ahí la correlación alta es DESEABLE (una
    # envolvente suave es lo que hace que un mar no dé saltos), no un bucle.
    # Sin este umbral, v7 y v3 marcaban 0.55 por ser suaves, mientras que los
    # bucles de verdad de v0 y v6 aparecían exactamente en 6.0 s y 12.0 s.
    ini = int(2.0 * 100)
    fin = min(len(ac), int(25 * 100))
    if fin <= ini:
        return 0.0, 0.0
    i = int(np.argmax(ac[ini:fin])) + ini
    return float(ac[i]), i / 100.0


def eventos_por_minuto(sr, x):
    """
    Cuenta crecidas de la envolvente LENTA: cuántas olas se perciben.
    Suavizado a ~1.5 s: una ola dura segundos, no milisegundos. Con ventanas
    cortas se cuenta el temblor del ruido y salen cifras absurdas (178/min).
    """
    env = np.abs(x)
    k = int(sr * 0.05)
    env = np.convolve(env, np.ones(k) / k, 'same')[::k]      # 20 Hz
    k2 = 30                                                   # ~1.5 s
    env = np.convolve(env, np.ones(k2) / k2, 'same')
    if env.std() < 1e-9:
        return 0.0
    umbral = env.mean() + 0.5 * env.std()
    arriba = env > umbral
    cruces = int(np.sum((~arriba[:-1]) & arriba[1:]))
    return cruces / (len(x) / sr) * 60


def tonalidad(sr, x):
    """
    ¿Hay un tono audible dentro del ruido? Es lo que delata un filtro
    resonante ('el bong'). Compara cada pico del espectro con la media de su
    vecindario: >8 dB de asomo ya se oye como tono.
    """
    # Welch: promediar muchas ventanas. Sin esto el periodograma de ruido puro
    # ya "tiene tonos" de +13 dB por su propia varianza (chi-cuadrado), y la
    # métrica no distingue un filtro resonante de ruido honesto.
    n = 1 << 14
    saltos = max(1, (len(x) - n) // (n // 2))
    acum = np.zeros(n // 2 + 1)
    vent = np.hanning(n)
    usadas = 0
    for k in range(saltos):
        ini = k * (n // 2)
        tro = x[ini:ini + n]
        if len(tro) < n:
            break
        acum += np.abs(np.fft.rfft(tro * vent)) ** 2
        usadas += 1
    esp = 10 * np.log10(acum / max(1, usadas) + 1e-20)
    frec = np.fft.rfftfreq(n, 1 / sr)
    m = (frec > 40) & (frec < 14000)
    esp, frec = esp[m], frec[m]
    k = 101
    # 'same' promedia con menos muestras en los bordes, así que la media cae y
    # aparece un asomo ENORME que no existe en el audio. Se recorta el margen.
    suave = np.convolve(esp, np.ones(k) / k, 'same')
    borde = k
    esp, frec, suave = esp[borde:-borde], frec[borde:-borde], suave[borde:-borde]
    asomo = esp - suave
    # los cinco picos que más asoman, para saber DÓNDE está el tono
    orden = np.argsort(asomo)[::-1]
    picos, usadas = [], []
    for i in orden:
        f = frec[i]
        if any(abs(f - u) < f * 0.12 for u in usadas):
            continue
        usadas.append(f)
        picos.append((float(asomo[i]), float(f)))
        if len(picos) >= 5:
            break
    return picos[0][0], picos[0][1], picos


def centroide(sr, x):
    """
    EL «BONG». Un filtro que barre no deja un tono fijo —por eso la tonalidad
    espectral no lo veía—, mueve el CENTRO TÍMBRICO del ruido como un
    glissando, y el oído lo sigue igual que seguiría una nota.

    Se mide el centroide espectral ventana a ventana y se devuelven:
      · barrido_oct : recorrido del centroide en OCTAVAS (percentil 10→90).
                      El agua se mueve poco; un filtro barrido, muchísimo.
      · suavidad    : autocorrelación del centroide a 1 s. Cerca de 1 = el
                      recorrido es liso y predecible, o sea un LFO. El agua
                      real da un recorrido irregular.
    """
    n = 1 << 12
    salto = n // 2
    frec = np.fft.rfftfreq(n, 1 / sr)
    vent = np.hanning(n)
    cents = []
    for ini in range(0, len(x) - n, salto):
        esp = np.abs(np.fft.rfft(x[ini:ini + n] * vent)) ** 2
        tot = esp.sum()
        if tot < 1e-14:
            continue
        cents.append((esp * frec).sum() / tot)
    if len(cents) < 8:
        return 0.0, 0.0, 0.0
    c = np.array(cents)
    c = np.maximum(c, 20.0)
    lo, hi = np.percentile(c, 10), np.percentile(c, 90)
    barrido = math.log2(hi / lo)
    l = np.log2(c) - np.log2(c).mean()
    if l.std() < 1e-9:
        return 0.0, 0.0, float(c.mean())
    l = l / l.std()
    retardo = max(1, int(sr / salto))              # ~1 s
    if len(l) <= retardo + 2:
        return barrido, 0.0, float(c.mean())
    suav = float(np.corrcoef(l[:-retardo], l[retardo:])[0, 1])
    return float(barrido), suav, float(c.mean())


def analizar(ruta):
    sr, izq, der = leer(ruta)
    mono = (izq + der) / 2
    rms = float(np.sqrt((mono ** 2).mean()))
    pico = float(np.abs(mono).max())
    bandas = tercios_de_octava(sr, mono)
    # banda audible en altavoz de laptop
    e_alta = sum(10 ** (d / 10) for c, d in bandas if c >= 250)
    corr = float(np.corrcoef(izq, der)[0, 1]) if izq.std() > 0 and der.std() > 0 else 1.0
    ac, retardo = periodicidad(sr, mono)
    asomo, f_asomo, picos = tonalidad(sr, mono)
    barrido, suav, c_medio = centroide(sr, mono)
    return {
        'barrido_oct': barrido,
        'suavidad': suav,
        'centroide_Hz': c_medio,
        'archivo': ruta.split('/')[-1],
        'dBFS': 20 * math.log10(rms + 1e-12),
        'audible_dBFS': 20 * math.log10(rms * math.sqrt(e_alta) + 1e-12),
        'pico': pico,
        'cresta_dB': 20 * math.log10(pico / (rms + 1e-12) + 1e-12),
        'pendiente': pendiente_db_oct(bandas),
        'periodicidad': ac,
        'retardo_s': retardo,
        'tono_dB': asomo,
        'tono_Hz': f_asomo,
        'picos': picos,
        'olas_min': eventos_por_minuto(sr, mono),
        'estereo_corr': corr,
        'bandas': bandas,
    }


OBJETIVO = """
CÓMO SE LEE (perfil de un mar tranquilo y lejano, de la investigación):
  pendiente      −4 a −7 dB/oct entre 250 Hz y 8 kHz. Rosa es −3, marrón −6.
                 Un mar LEJANO tira a marrón: el aire se come los agudos.
  periodicidad   < 0.25. Por encima de ~0.4 el oído caza la repetición.
  barrid         < 0.8 octavas. Es EL número del «bong»: cuánto pasea el
                 centro tímbrico. Un filtro barriendo lo mueve 2-3 octavas y
                 el oído lo sigue como una nota. El agua lo mueve poco.
  suave          < 0.6. Autocorrelación del recorrido del centroide a 1 s.
                 Cerca de 1 significa que se mueve liso y predecible: un LFO.
                 El agua real da un recorrido irregular.
  olas_min       8 a 20. Menos y se cuentan una a una; más y es una lavadora.
  cresta_dB      8 a 16. Menos es un muro plano; más son golpes que sobresaltan.
  estereo_corr   0.2 a 0.7. En 1.0 es mono y suena dentro de la cabeza.
  audible_dBFS   −26 a −18. Por debajo de −35 no se oye en un laptop.
"""

if __name__ == '__main__':
    rutas = sys.argv[1:]
    if not rutas:
        print(__doc__); sys.exit(1)
    res = [analizar(r) for r in rutas]
    enc = (f"{'archivo':<22}{'pend':>6}{'perio':>7}{'barrid':>7}{'suave':>7}"
           f"{'olas/m':>7}{'cresta':>7}{'st':>6}{'aud dB':>8}")
    print(enc); print('-' * len(enc))
    for r in res:
        print(f"{r['archivo'][:21]:<22}{r['pendiente']:>6.1f}{r['periodicidad']:>7.2f}"
              f"{r['barrido_oct']:>7.2f}{r['suavidad']:>7.2f}{r['olas_min']:>7.1f}"
              f"{r['cresta_dB']:>7.1f}{r['estereo_corr']:>6.2f}{r['audible_dBFS']:>8.1f}")
    print(OBJETIVO)
    print('picos que asoman sobre el ruido (>6 dB ya se oyen como tono):')
    for r in res:
        ps = ' · '.join(f"{f:>6.0f} Hz +{a:.0f} dB" for a, f in r['picos'][:4])
        print(f"  {r['archivo'][:20]:<21} {ps}")
    print()
    if len(res) == 1:
        print('espectro por tercios de octava (dB rel. al total):')
        for c, d in res[0]['bandas']:
            barra = '█' * max(0, int((d + 40) / 1.4))
            print(f"  {c:>6.0f} Hz {d:>7.1f}  {barra}")
