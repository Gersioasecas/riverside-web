import sys, os, glob
sys.path.insert(0, os.path.expanduser('~/Developer/riverside-web/sonido/banco'))
from analizar import leer, eventos_por_minuto
import numpy as np
print(f"{'archivo':<22}{'olas/m':>8}{'sigma%':>8}{'umbral%':>9}{'<0.05Hz':>9}{'0.05-.15':>9}{'.15-.35':>9}{'>0.35Hz':>9}")
for r in sorted(sys.argv[1:]):
    sr, izq, der = leer(r); x=(izq+der)/2
    n = eventos_por_minuto(sr, x)
    e = np.abs(x); k=int(sr*0.05)
    e = np.convolve(e,np.ones(k)/k,'same')[::k]
    e = np.convolve(e,np.ones(30)/30,'same')[60:-60]
    fs = sr/k
    med, sd = e.mean(), e.std()
    d = e-med
    nn = 1<<int(np.log2(len(d)))
    P = np.abs(np.fft.rfft(d[:nn]*np.hanning(nn)))**2
    f = np.fft.rfftfreq(nn,1/fs); tot=P.sum()+1e-30
    def sh(a,b):
        m=(f>=a)&(f<b); return 100*P[m].sum()/tot
    print(f"{os.path.basename(r)[:21]:<22}{n:>8.1f}{100*sd/med:>8.2f}{100*0.5*sd/med:>9.2f}"
          f"{sh(0,0.05):>9.1f}{sh(0.05,0.15):>9.1f}{sh(0.15,0.35):>9.1f}{sh(0.35,9):>9.1f}")
