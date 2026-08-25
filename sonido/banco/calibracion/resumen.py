import sys, os, re, collections
sys.path.insert(0, os.path.expanduser('~/Developer/riverside-web/sonido/banco'))
from analizar import analizar, leer
import numpy as np
def respiracion(ruta):
    sr, izq, der = leer(ruta); x=(izq+der)/2
    e=np.abs(x); k=int(sr*0.05); e=np.convolve(e,np.ones(k)/k,'same')[::k]
    e=np.convolve(e,np.ones(30)/30,'same')[40:-40]
    return float(20*np.log10(np.percentile(e,90)/np.percentile(e,10)))
g = collections.OrderedDict()
for r in sys.argv[1:]:
    nom = re.sub(r'__\d+\.wav$', '', os.path.basename(r))
    a=analizar(r); a['resp']=respiracion(r); a['aud85']=a['audible_dBFS']+20*np.log10(0.85/max(a['pico'],1e-9)); g.setdefault(nom, []).append(a)
CAMPOS = [('pendiente','pend',-7,-4),('periodicidad','perio',None,0.25),('barrido_oct','barrid',None,0.8),
          ('suavidad','suave',None,0.6),('olas_min','olas/m',8,20),('cresta_dB','cresta',8,16),
          ('estereo_corr','st',0.2,0.7),('audible_dBFS','aud',-26,-18),('pico','pico',None,0.95),('resp','resp dB',None,None),('aud85','aud@.85',-26,-18)]
print(f"{'caso':<16}" + ''.join(f"{e:>15}" for _,e,_,_ in CAMPOS))
print('-'*(16+15*len(CAMPOS)))
for nom, rs in g.items():
    fila = f"{nom[:15]:<16}"
    for k,e,lo,hi in CAMPOS:
        v = np.array([r[k] for r in rs]); m, sd = v.mean(), v.std()
        ok = all((lo is None or x>=lo) and (hi is None or x<=hi) for x in v)
        mark = ' ' if ok else '!'
        fila += (f"{v.min():>6.1f}-{v.max():<5.1f}{mark}" if e=='olas/m' else f"{m:>10.2f}±{sd:<3.1f}{mark}")
    print(fila)
