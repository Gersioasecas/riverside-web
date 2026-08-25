/* ============================================================================
   BANCO DE PRUEBAS · renderizador
   ----------------------------------------------------------------------------
   Toma un archivo de variante y lo renderiza a WAV estéreo, para poder MEDIRLO
   con numpy y ESCUCHARLO. Sin esto, ajustar un sintetizador es adivinar.

   Contrato de una variante: un archivo .js que defina en el ámbito global

       function construirMar(ctx, duracionSegundos)

   y conecte lo que quiera a `ctx.destination`. Nada más.

   Uso:  node render.mjs <variante.js> <salida.wav> [segundos]
   ========================================================================== */

import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

const [, , ruta, salida, segArg, srArg] = process.argv;
if (!ruta || !salida) {
  console.error('uso: node render.mjs <variante.js> <salida.wav> [segundos]');
  process.exit(1);
}
const SEG = Number(segArg) || 30;
// El navegador suele abrir el contexto a 48 kHz, no a 44.1. Una variante que
// solo se probó a 44.1 puede sonar distinta en producción: la sesión granular
// avisó de que a 48 kHz la mitad de sus semillas se salían de rango.
const SR = Number(srArg) || 44100;
const codigo = readFileSync(ruta, 'utf8');

const navegador = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--window-position=-32000,-32000'],
});
const pagina = await navegador.newPage();
await pagina.goto('about:blank');

const canales = await pagina.evaluate(async (codigo, SEG, SR) => {
  // la variante se evalúa en el ámbito de la página
  // eslint-disable-next-line no-eval
  (0, eval)(codigo);
  if (typeof construirMar !== 'function') throw new Error('la variante no define construirMar(ctx, dur)');

  const ctx = new OfflineAudioContext(2, Math.round(SR * SEG), SR);
  construirMar(ctx, SEG);
  const buf = await ctx.startRendering();
  return [Array.from(buf.getChannelData(0)), Array.from(buf.getChannelData(1))];
}, codigo, SEG, SR);

await navegador.close();

/* --- WAV de 16 bits, sin librerías --------------------------------------- */
const n = canales[0].length;
const datos = Buffer.alloc(n * 4);            // 2 canales × 2 bytes
let pico = 0;
for (let i = 0; i < n; i++) {
  for (const c of canales) if (Math.abs(c[i]) > pico) pico = Math.abs(c[i]);
}
if (pico > 1) console.error(`⚠️  RECORTE: pico ${pico.toFixed(3)} — la variante satura`);
for (let i = 0; i < n; i++) {
  for (let c = 0; c < 2; c++) {
    const v = Math.max(-1, Math.min(1, canales[c][i]));
    datos.writeInt16LE(Math.round(v * 32767), (i * 2 + c) * 2);
  }
}
const cab = Buffer.alloc(44);
cab.write('RIFF', 0); cab.writeUInt32LE(36 + datos.length, 4); cab.write('WAVE', 8);
cab.write('fmt ', 12); cab.writeUInt32LE(16, 16); cab.writeUInt16LE(1, 20);
cab.writeUInt16LE(2, 22); cab.writeUInt32LE(SR, 24); cab.writeUInt32LE(SR * 4, 28);
cab.writeUInt16LE(4, 32); cab.writeUInt16LE(16, 34);
cab.write('data', 36); cab.writeUInt32LE(datos.length, 40);
writeFileSync(salida, Buffer.concat([cab, datos]));

console.log(`${basename(ruta).padEnd(26)} → ${basename(salida)}  ${SEG}s @${SR/1000}k  pico ${pico.toFixed(3)}${pico > 0.99 ? '  ❌ RECORTA' : ''}`);
