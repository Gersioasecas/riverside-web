import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
const codigo = readFileSync(process.argv[2], 'utf8');
const SEG = Number(process.argv[3] || 180);
const nav = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--headless=new','--no-sandbox','--disable-gpu'],
  protocolTimeout: 900000,
});
const p = await nav.newPage(); await p.goto('about:blank');
const r = await p.evaluate(async (codigo, SEG) => {
  const SR = 44100;
  (0, eval)(codigo);
  const t0 = performance.now();
  const ctx = new OfflineAudioContext(2, Math.round(SR*SEG), SR);
  construirMar(ctx, SEG);
  const tConstruir = performance.now() - t0;
  const buf = await ctx.startRendering();
  let pico = 0, s2 = 0, n = 0;
  const picoPorMin = [];
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > pico) pico = a; s2 += d[i]*d[i]; n++; }
  }
  for (let m = 0; m*60*SR < buf.length; m++) {
    let pm = 0;
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c);
      for (let i = m*60*SR; i < Math.min((m+1)*60*SR, d.length); i++) { const a = Math.abs(d[i]); if (a>pm) pm=a; } }
    picoPorMin.push(+pm.toFixed(3));
  }
  return { pico:+pico.toFixed(4), rms:+Math.sqrt(s2/n).toFixed(4), tConstruir:+tConstruir.toFixed(0), picoPorMin };
}, codigo, SEG);
await nav.close();
console.log(`render de ${SEG}s · pico ${r.pico} · rms ${r.rms} · cresta ${(20*Math.log10(r.pico/r.rms)).toFixed(1)} dB`);
console.log(`construirMar() tardó ${r.tConstruir} ms en generar los buffers`);
console.log(`pico por minuto: ${r.picoPorMin.join(' · ')}`);
