import puppeteer from '/Users/gersioasecas/.claude/skills/revisor/engine/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const browser = await puppeteer.launch({
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--headless=new','--no-sandbox','--disable-gpu']});
const page = await browser.newPage();
await page.goto('about:blank');
const out = await page.evaluate(async () => {
  const R = {};
  R.ua = navigator.userAgent;
  const SR = 44100;

  // ---------- A: modulacion a tasa de audio con playbackRate minusculo ----------
  async function modProbe(rate, dur) {
    const ctx = new OfflineAudioContext(1, SR*dur, SR);
    // buffer modulador: 8 muestras, rampa conocida
    const nb = 8;
    const b = ctx.createBuffer(1, nb, SR);
    const d = b.getChannelData(0);
    for (let i=0;i<nb;i++) d[i] = i/(nb-1);        // 0..1 lineal
    const src = ctx.createBufferSource(); src.buffer=b; src.loop=true;
    src.playbackRate.value = rate;
    const dc = new ConstantSourceNode(ctx,{offset:1});
    const g = ctx.createGain(); g.gain.value = 0;   // salida = SOLO la modulacion
    dc.connect(g); src.connect(g.gain); g.connect(ctx.destination);
    dc.start(); src.start();
    const buf = await ctx.startRendering();
    const y = buf.getChannelData(0);
    // segunda diferencia: 0 => tramo perfectamente lineal
    let maxd2=0, maxd1=0;
    for (let i=2;i<y.length;i++){
      const d2=Math.abs(y[i]-2*y[i-1]+y[i-2]); if(d2>maxd2)maxd2=d2;
      const d1=Math.abs(y[i]-y[i-1]); if(d1>maxd1)maxd1=d1;
    }
    return {rate, first:[...y.slice(0,6)].map(v=>+v.toFixed(6)),
            at:[y[0],y[1000],y[5000],y[20000],y[SR-1]].map(v=>+v.toFixed(6)),
            min:Math.min(...y), max:Math.max(...y), maxStep:+maxd1.toExponential(3),
            maxCurv:+maxd2.toExponential(3), n:y.length};
  }
  R.mod = [];
  for (const r of [1, 0.05, 0.005, 0.0005, 1e-5, 0]) {
    try { R.mod.push(await modProbe(r, 1)); } catch(e){ R.mod.push({rate:r, err:String(e)}); }
  }

  // ---------- B: benchmark de coste ----------
  const bench = async (name, build, dur) => {
    const t0 = performance.now();
    const ctx = new OfflineAudioContext(2, Math.round(SR*dur), SR);
    build(ctx, dur);
    const buf = await ctx.startRendering();
    const t1 = performance.now();
    let pk=0; const c=buf.getChannelData(0);
    for(let i=0;i<c.length;i+=97) if(Math.abs(c[i])>pk) pk=Math.abs(c[i]);
    return {name, ms:+(t1-t0).toFixed(1), xRealtime:+(dur*1000/(t1-t0)).toFixed(1), pico:+pk.toFixed(3)};
  };
  const mkNoise = (ctx, secs) => {
    const n = Math.round(SR*secs);
    const b = ctx.createBuffer(1,n,SR); const d=b.getChannelData(0);
    let l=0; for(let i=0;i<n;i++){ const w=Math.random()*2-1; l=0.99*l+0.05*w; d[i]=l; }
    return b;
  };
  const VOCES = 20, DUR = 30;   // 30 s (extrapolamos a 10 min)

  R.bench = [];
  // B1: silencio de referencia (coste del propio render)
  R.bench.push(await bench('vacio', (ctx)=>{ new ConstantSourceNode(ctx,{offset:0}).connect(ctx.destination); }, DUR));

  // B2: 20 voces, ganancia estatica (piso)
  R.bench.push(await bench('20 voces estaticas', (ctx,dur)=>{
    const nb = mkNoise(ctx, 8);
    for(let v=0;v<VOCES;v++){
      const s=ctx.createBufferSource(); s.buffer=nb; s.loop=true;
      const g=ctx.createGain(); g.gain.value=0.03;
      s.connect(g).connect(ctx.destination); s.start(0, v*0.37);
    }
  }, DUR));

  // B3: 20 voces, setValueAtTime cada 50 ms
  R.bench.push(await bench('20 voces setValueAtTime 50ms', (ctx,dur)=>{
    const nb = mkNoise(ctx, 8);
    for(let v=0;v<VOCES;v++){
      const s=ctx.createBufferSource(); s.buffer=nb; s.loop=true;
      const g=ctx.createGain(); g.gain.value=0;
      s.connect(g).connect(ctx.destination); s.start(0, v*0.37);
      for(let t=0;t<dur;t+=0.05) g.gain.setValueAtTime(0.02+0.02*Math.random(), t);
    }
  }, DUR));

  // B4: 20 voces, linearRampToValueAtTime cada 50 ms
  R.bench.push(await bench('20 voces linearRamp 50ms', (ctx,dur)=>{
    const nb = mkNoise(ctx, 8);
    for(let v=0;v<VOCES;v++){
      const s=ctx.createBufferSource(); s.buffer=nb; s.loop=true;
      const g=ctx.createGain(); g.gain.value=0;
      s.connect(g).connect(ctx.destination); s.start(0, v*0.37);
      g.gain.setValueAtTime(0.02, 0);
      for(let t=0.05;t<dur;t+=0.05) g.gain.linearRampToValueAtTime(0.02+0.02*Math.random(), t);
    }
  }, DUR));

  // B5: 20 voces, modulacion a tasa de audio (buffer lento -> gain.gain)
  R.bench.push(await bench('20 voces mod audio-rate', (ctx,dur)=>{
    const nb = mkNoise(ctx, 8);
    // un solo buffer de envolvente compartido, 600 muestras
    const eb = ctx.createBuffer(1, 600, SR); const ed=eb.getChannelData(0);
    for(let i=0;i<600;i++) ed[i]=0.02+0.02*Math.random();
    for(let v=0;v<VOCES;v++){
      const s=ctx.createBufferSource(); s.buffer=nb; s.loop=true;
      const g=ctx.createGain(); g.gain.value=0;
      const m=ctx.createBufferSource(); m.buffer=eb; m.loop=true; m.playbackRate.value=0.02;
      m.connect(g.gain); m.start(0, v*0.001);
      s.connect(g).connect(ctx.destination); s.start(0, v*0.37);
    }
  }, DUR));

  // B6: 20 voces + biquad lowpass cada una
  R.bench.push(await bench('20 voces + 1 biquad c/u', (ctx,dur)=>{
    const nb = mkNoise(ctx, 8);
    for(let v=0;v<VOCES;v++){
      const s=ctx.createBufferSource(); s.buffer=nb; s.loop=true;
      const f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=1200;
      const g=ctx.createGain(); g.gain.value=0.03;
      s.connect(f).connect(g).connect(ctx.destination); s.start(0, v*0.37);
    }
  }, DUR));

  // B7: 20 voces + cadena de 4 allpass biquad
  R.bench.push(await bench('20 voces + 4 allpass c/u', (ctx,dur)=>{
    const nb = mkNoise(ctx, 8);
    for(let v=0;v<VOCES;v++){
      const s=ctx.createBufferSource(); s.buffer=nb; s.loop=true;
      let node=s;
      for(let k=0;k<4;k++){ const a=ctx.createBiquadFilter(); a.type='allpass';
        a.frequency.value=200*Math.pow(3,k)*(1+0.3*Math.random()); a.Q.value=0.7;
        node.connect(a); node=a; }
      const g=ctx.createGain(); g.gain.value=0.03;
      node.connect(g).connect(ctx.destination); s.start(0, v*0.37);
    }
  }, DUR));

  // B8: convolver con IR sintetica de 0.5 / 1 / 2 s (UNA sola, 20 voces al bus)
  for (const irLen of [0.25, 0.5, 1, 2]) {
    R.bench.push(await bench(`20 voces -> 1 convolver IR ${irLen}s`, (ctx,dur)=>{
      const nb = mkNoise(ctx, 8);
      const n=Math.round(SR*irLen); const ir=ctx.createBuffer(2,n,SR);
      for(let c=0;c<2;c++){ const d=ir.getChannelData(c);
        for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.exp(-6*i/n); }
      const cv=ctx.createConvolver(); cv.normalize=false; cv.buffer=ir;
      const bus=ctx.createGain(); bus.gain.value=0.03;
      bus.connect(cv).connect(ctx.destination);
      for(let v=0;v<VOCES;v++){ const s=ctx.createBufferSource(); s.buffer=nb; s.loop=true;
        s.connect(bus); s.start(0, v*0.37); }
    }, DUR));
  }
  // B9: 20 convolvers (uno por voz) con IR 0.5 s
  R.bench.push(await bench('20 convolvers IR 0.5s', (ctx,dur)=>{
    const nb = mkNoise(ctx, 8);
    for(let v=0;v<VOCES;v++){
      const n=Math.round(SR*0.5); const ir=ctx.createBuffer(2,n,SR);
      for(let c=0;c<2;c++){ const d=ir.getChannelData(c);
        for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.exp(-6*i/n); }
      const cv=ctx.createConvolver(); cv.normalize=false; cv.buffer=ir;
      const s=ctx.createBufferSource(); s.buffer=nb; s.loop=true;
      const g=ctx.createGain(); g.gain.value=0.01;
      s.connect(cv).connect(g).connect(ctx.destination); s.start(0, v*0.37);
    }
  }, DUR));
  return R;
});
await browser.close();
console.log(JSON.stringify(out,null,1));
