# Scripts de calibración del banco

Los dejó la sesión dedicada del «mar lejano» mientras calibraba las métricas. No hacen falta
para usar el banco (`../render.mjs` + `../analizar.py`), pero sirven cuando haya que **volver a
validar el instrumento**, que es algo que hubo que hacer cinco veces.

- `cal-*.js` — generadores de ruido de control (blanco, rosa, marrón, con forma). Son los que
  demuestran que el analizador mide lo que dice medir.
- `barrer.mjs` — barre un parámetro y mide cada punto, para ver a qué responde una métrica.
- `espec-mar-100m.py` — reproduce la tabla espectral objetivo de un mar a 100 m.
- `investigacion/` — los scripts de medición que salieron del workflow de acústica.

Los WAV que generaron se borraron: eran 11 GB y se regeneran corriendo los scripts.

⚠️ **Antes de creerle un número al banco, pásale un ruido de control.** Los valores buenos son:
blanco `pend +3.0 · barrid 0.07` · rosa `0.0 / 1.07` · marrón `−3.0 / 1.42`.
