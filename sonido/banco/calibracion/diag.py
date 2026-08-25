import sys, os
sys.path.insert(0, os.path.expanduser('~/Developer/riverside-web/sonido/banco'))
from analizar import analizar, leer, periodicidad
import numpy as np
for r in sys.argv[1:]:
    a = analizar(r)
    sr, izq, der = leer(r); mono=(izq+der)/2
    env = np.abs(mono); k = sr//100
    env = np.convolve(env, np.ones(k)/k,'same')[::k]; env-=env.mean(); env/=env.std()
    ac = np.correlate(env,env,'full')[len(env)-1:]; ac/=ac[0]
    top = sorted([(ac[i], i/100) for i in range(50, min(len(ac), 2500))], reverse=True)[:1]
    # los 6 retardos con más correlación, separados entre sí
    picos=[]; 
    for v,l in sorted([(ac[i], i/100) for i in range(50, min(len(ac),2500))], reverse=True):
        if all(abs(l-p[1])>0.8 for p in picos): picos.append((v,l))
        if len(picos)>=6: break
    print(f"{os.path.basename(r):<20} perio={a['periodicidad']:.3f} @ {a['retardo_s']:.2f}s  rms={10**(a['dBFS']/20):.4f} pico={a['pico']:.3f} cent={a['centroide_Hz']:.0f}Hz")
    print("   picos de autocorrelación:", ' · '.join(f"{v:.2f}@{l:.1f}s" for v,l in picos))
    print("   bandas:", ' '.join(f"{c:.0f}:{d:.0f}" for c,d in a['bandas']))

def respiracion(ruta):
    """p10-p90 de la envolvente suavizada a 1.5 s, en dB: cuánto RESPIRA el mar."""
    sr, izq, der = leer(ruta); x=(izq+der)/2
    e = np.abs(x); k=int(sr*0.05); e=np.convolve(e,np.ones(k)/k,'same')[::k]
    e = np.convolve(e,np.ones(30)/30,'same')[40:-40]
    lo,hi = np.percentile(e,10), np.percentile(e,90)
    return 20*np.log10(hi/lo)
