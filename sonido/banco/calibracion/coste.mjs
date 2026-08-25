import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
const codigo = readFileSync(process.argv[2],'utf8');
const nav = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--headless=new','--no-sandbox','--disable-gpu'],protocolTimeout:600000});
const p = await nav.newPage(); await p.goto('about:blank');
console.log(await p.evaluate(async (codigo) => {
  (0,eval)(codigo);
  const ctx = new OfflineAudioContext(2, 44100*2, 44100);
  let nodos = 0, bytes = 0;
  for (const m of ['createGain','createBiquadFilter','createStereoPanner','createBufferSource','createConstantSource']) {
    const o = ctx[m].bind(ctx); ctx[m] = (...a) => { nodos++; return o(...a); };
  }
  const ob = ctx.createBuffer.bind(ctx);
  ctx.createBuffer = (c,n,sr) => { bytes += c*n*4; return ob(c,n,sr); };
  const t = performance.now();
  construirMar(ctx, 600);
  return `nodos: ${nodos} · buffers: ${(bytes/1048576).toFixed(1)} MB · construcción: ${(performance.now()-t).toFixed(0)} ms (con dur=600 s)`;
}, codigo));
await nav.close();
