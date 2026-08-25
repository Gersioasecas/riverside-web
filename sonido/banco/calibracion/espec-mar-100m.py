#!/usr/bin/env python3
"""
VALIDACION NUMERICA DE LA ESPECIFICACION "mar a 100 m, terraza de Veracruz".
------------------------------------------------------------------------------
No es una variante Web Audio: es el MODELO de referencia en numpy con el que se
midieron los numeros de la especificacion (perfil espectral, profundidad de
modulacion, tasa de olas, viento, matriz estereo) contra banco/analizar.py.
Sirve para dos cosas:
  1. reproducir la tabla de metricas previstas (12 semillas)  -> python3 espec-mar-100m.py
  2. re-medir cualquier cambio de la especificacion ANTES de escribirlo en JS
Cada parametro lleva su procedencia en el comentario.
"""
import sys, math, wave
import numpy as np
sys.path.insert(0, '/Users/gersioasecas/Developer/riverside-web/sonido/banco')
import analizar as A

SR = 44100

# --- A) OBJETIVO ESPECTRAL ------------------------------------------------
# Niveles de BANDA de 1/3 de octava en los centros de octava, dB re 250 Hz.
# fuente (Bolin&Abom + Tollefsen) - absorcion ISO 9613-1 de fuente LINEA a
# 100 m, 29 C / 80 % HR - efecto suelo de playa (ISO 9613-2, refuerzo).
CENTROS = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
PERFIL  = [-3.4, 0.1, 0.2, 0.0, 1.1, -1.7, -5.6, -13.1, -24.0, -45.5]
HP_HZ, HP_ORD = 100.0, 2      # faldon 12 dB/oct: baja barrid y libera headroom
LP_HZ, LP_ORD = 16000.0, 2

# --- B) ESTRUCTURA TEMPORAL -----------------------------------------------
VOCES, T_VOZ, JITTER = 5, 5.5, 0.30    # NDBC 42055: APD 4.8 s, DPD 6.2 s
TA, TD               = 0.8, 2.2        # smearing por ancho de rompiente 25-80 m
OLAS_L10_90          = 1.6             # dB (simulacion a 100 m: 1.7-4.5)

# --- C) VIENTO LENTO ------------------------------------------------------
VIENTO_TAU, VIENTO_L10_90 = 12.0, 0.35 # mas profundo hunde olas/m

# --- D) ESTEREO -----------------------------------------------------------
RHO = 0.45                             # matriz suma/resta (rho(f) tipo sinc da 0.44)
RMS_OBJ = 0.15                         # -16.5 dBFS -> aud dB -23.1, pico max 0.87

CAPAS = [1.0, 2**(-1/3), 2**(-2/3)]    # tasas inconmensurables -> perio 0.10
NBUF  = 1 << 20                        # 23.78 s


def ruido(N, rng, hp=HP_HZ, hp_ord=HP_ORD):
    f = np.fft.rfftfreq(N, 1/SR)
    band = np.interp(np.log2(np.maximum(f, 1.0)), np.log2(CENTROS), PERFIL)
    mag = 10**((band - 10*np.log10(np.maximum(f, 1.0)))/20.0)   # banda = PSD * f
    mag *= np.where(f < hp, (np.maximum(f, 1e-9)/hp)**hp_ord, 1.0)
    mag *= np.where(f > LP_HZ, (LP_HZ/np.maximum(f, 1e-9))**LP_ORD, 1.0)
    mag[0] = 0
    X = mag*np.exp(1j*rng.uniform(0, 2*np.pi, len(f))); X[0] = 0
    if N % 2 == 0: X[-1] = np.abs(X[-1])
    x = np.fft.irfft(X, n=N)
    return x/np.sqrt((x**2).mean())


def _a_l10_90(d, objetivo):
    for _ in range(60):
        lv = 20*np.log10(np.maximum(1+d, 1e-3))
        cur = np.percentile(lv, 90) - np.percentile(lv, 10)
        if cur < 1e-6: break
        d = d*(objetivo/cur)
        if abs(cur-objetivo) < 0.01: break
    return np.maximum(1+d, 0.05)


def env_olas(N, rng):
    t = np.arange(N)/SR; dur = N/SR; e = np.zeros(N)
    for _ in range(VOCES):
        tt = rng.uniform(-T_VOZ, 0)
        while tt < dur + 6*TD:
            i0 = max(0, int(tt*SR))
            if tt > -6*TD:
                dt = t[i0:] - tt
                e[i0:] += (1-np.exp(-dt/TA))*np.exp(-dt/TD)
            tt += T_VOZ*max(0.15, 1 + JITTER*rng.standard_normal())
    return _a_l10_90(e/e.mean() - 1.0, OLAS_L10_90)


def env_viento(N, rng):
    fs2 = 100.0; M = int(N/SR*fs2)+1
    w = rng.standard_normal(M+4000)
    k = int(VIENTO_TAU*fs2)
    g = np.exp(-0.5*(np.arange(-3*k, 3*k+1)/k)**2); g /= g.sum()
    w = np.convolve(w, g, 'same')[2000:2000+M]
    w = (w-w.mean())/(w.std()+1e-12)
    return _a_l10_90(np.interp(np.arange(N)/SR, np.arange(M)/fs2, w), VIENTO_L10_90)


def capa(buf, rate, n, off):
    idx = (np.arange(n)*rate + off*SR) % len(buf)
    i0 = idx.astype(int); fr = idx - i0
    return buf[i0]*(1-fr) + buf[(i0+1) % len(buf)]*fr


def construir(n, semilla):
    buf = ruido(NBUF, np.random.default_rng(5000+semilla))
    a = sum(capa(buf, r, n, 3.7*k + semilla*0.83) for k, r in enumerate(CAPAS))/np.sqrt(len(CAPAS))
    b = sum(capa(buf, r, n, 11.9 + 4.3*k + semilla*1.31) for k, r in enumerate(CAPAS))/np.sqrt(len(CAPAS))
    env = env_olas(n, np.random.default_rng(5100+semilla))*env_viento(n, np.random.default_rng(5200+semilla))
    th = 0.5*math.acos(RHO); ca, cb = math.cos(th), math.sin(th)
    L = (ca*a + cb*b)*env; R = (ca*a - cb*b)*env
    g = RMS_OBJ/np.sqrt((((L+R)/2)**2).mean())
    return L*g, R*g


def escribir(path, L, R):
    inter = np.empty(len(L)*2); inter[0::2] = L; inter[1::2] = R
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(inter, -1, 1)*32767).astype(np.int16).tobytes())


def perio(x, ini_s=0.5):
    env = np.abs(x); k = SR//100
    env = np.convolve(env, np.ones(k)/k, 'same')[::k]
    env = (env-env.mean())/(env.std()+1e-12)
    ac = np.correlate(env, env, 'full')[len(env)-1:]; ac /= ac[0]+1e-30
    return float(ac[int(ini_s*100):min(len(ac), 2500)].max())


if __name__ == '__main__':
    N = SR*40; res = []
    for s in range(12):
        L, R = construir(N, s)
        escribir('/tmp/espec-mar.wav', L, R)
        r = A.analizar('/tmp/espec-mar.wav')
        _, iz, de = A.leer('/tmp/espec-mar.wav')
        r['perio0.5'] = perio((iz+de)/2, 0.5)
        res.append(r)
    lim = {'pendiente': (-7, -4), 'perio0.5': (None, .25), 'barrido_oct': (None, .8),
           'suavidad': (None, .6), 'olas_min': (8, 20), 'cresta_dB': (8, 16),
           'estereo_corr': (.2, .7), 'audible_dBFS': (-26, -18), 'pico': (None, .95)}
    print('=== especificacion mar-100m · 12 renders de 40 s ===')
    for k in ['pendiente', 'perio0.5', 'barrido_oct', 'suavidad', 'olas_min',
              'cresta_dB', 'estereo_corr', 'audible_dBFS', 'pico', 'tono_dB', 'centroide_Hz']:
        v = [x[k] for x in res]; ok = ''
        if k in lim:
            lo, hi = lim[k]
            ok = f"  {sum(1 for z in v if (lo is None or z >= lo) and (hi is None or z <= hi))}/12 dentro"
        print(f"  {k:<14} media {np.mean(v):>8.2f}  min {min(v):>7.2f}  max {max(v):>7.2f}{ok}")
    bs = np.array([[d for _, d in x['bandas']] for x in res]).mean(0)
    print('\n  bandas entregadas (dB re 250 Hz):')
    for c, d in zip(CENTROS, bs):
        print(f"   {c:>7.1f} Hz  {d-bs[3]:>+7.1f}")
