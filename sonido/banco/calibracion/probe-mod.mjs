/* ¿Chrome acepta modular gain.gain con un buffer a playbackRate minúsculo? */
import puppeteer from 'puppeteer-core';
const nav = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--headless=new','--no-sandbox','--disable-gpu'],
});
const p = await nav.newPage();
await p.goto('about:blank');
const r = await p.evaluate(async () => {
  const SR = 44100, SEG = 20;
  const ctx = new OfflineAudioContext(1, SR*SEG, SR);
  // portadora: DC via constante
  const cs = ctx.createConstantSource(); cs.offset.value = 1;
  const g = ctx.createGain(); g.gain.value = 0;
  cs.connect(g).connect(ctx.destination); cs.start();
  // envolvente: buffer de 4096 muestras, rampa 0->1, a playbackRate ínfimo
  const N = 4096;
  const eb = ctx.createBuffer(1, N, SR);
  const ed = eb.getChannelData(0);
  for (let i=0;i<N;i++) ed[i] = i/(N-1);      // rampa lineal 0..1
  const es = ctx.createBufferSource(); es.buffer = eb; es.loop = true;
  // queremos que los 4096 samples duren 10 s -> rate = 4096/(10*SR)
  es.playbackRate.value = N/(10*SR);
  es.connect(g.gain); es.start();
  const buf = await ctx.startRendering();
  const d = buf.getChannelData(0);
  const muestras = [];
  for (let t=0;t<20;t+=1) muestras.push(+d[Math.round(t*SR)].toFixed(4));
  return { rate: N/(10*SR), muestras };
});
await nav.close();
console.log('playbackRate =', r.rate);
console.log('valor de la ganancia cada 1 s durante 20 s (debe subir 0->1 en 10 s y repetir):');
console.log(r.muestras.join('  '));
