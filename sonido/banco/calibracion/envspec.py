import sys, os
sys.path.insert(0, os.path.expanduser('~/Developer/riverside-web/sonido/banco'))
from analizar import leer
import numpy as np
BANDAS = [(0.005,0.04),(0.04,0.1),(0.1,0.25),(0.25,0.6),(0.6,1.5),(1.5,4),(4,12),(12,50)]
print(f"{'archivo':<20}" + ''.join(f"{f'{a}-{b}Hz':>11}" for a,b in BANDAS) + f"{'rel.std':>9}")
for r in sys.argv[1:]:
    sr, izq, der = leer(r); x=(izq+der)/2
    k = sr//100
    e = np.convolve(np.abs(x), np.ones(k)/k, 'same')[::k]     # envolvente a 100 Hz
    fs = sr/k
    e = e[int(3*fs):]                                          # fuera la entrada suave
    med = e.mean(); d = e-med
    n = 1<<int(np.log2(len(d)))
    P = np.abs(np.fft.rfft(d[:n]*np.hanning(n)))**2
    f = np.fft.rfftfreq(n, 1/fs)
    tot = P.sum()+1e-30
    fila = f"{os.path.basename(r)[:19]:<20}"
    for a,b in BANDAS:
        m=(f>=a)&(f<b); fila += f"{100*P[m].sum()/tot:>10.1f}%"
    fila += f"{100*d.std()/med:>8.1f}%"
    print(fila)
