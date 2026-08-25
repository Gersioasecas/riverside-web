import puppeteer from '/Users/gersioasecas/.claude/skills/revisor/engine/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 headless:true,args:['--headless=new','--no-sandbox','--disable-gpu','--enable-precise-memory-info']});
const p=await b.newPage(); await p.goto('about:blank');
const r=await p.evaluate(async ()=>{
 const SR=44100, VOCES=20, DUR=600;  // 10 minutos reales
 const mem=()=>performance.memory? performance.memory.usedJSHeapSize : -1;
 const mkNoise=(ctx,secs)=>{const n=Math.round(SR*secs);const bb=ctx.createBuffer(1,n,SR);
  const d=bb.getChannelData(0);let l=0;
  for(let i=0;i<n;i++){const w=Math.random()*2-1;l=0.99*l+0.05*w;d[i]=l;} return bb;};
 const prueba=async(nombre,build)=>{
  if(window.gc) window.gc();
  const m0=mem(), t0=performance.now();
  const ctx=new OfflineAudioContext(2,SR*DUR,SR);
  build(ctx,DUR);
  const t1=performance.now(), m1=mem();
  const buf=await ctx.startRendering();
  const t2=performance.now(), m2=mem();
  return {nombre, jsGrafoMs:+(t1-t0).toFixed(0), renderMs:+(t2-t1).toFixed(0),
   xTiempoReal:+(DUR*1000/(t2-t1)).toFixed(0),
   cpuPorCientoEstim:+(100*(t2-t1)/(DUR*1000)).toFixed(3),
   memGrafoMB:+((m1-m0)/1048576).toFixed(2), memTotalMB:+((m2-m0)/1048576).toFixed(2)};
 };
 const R=[];
 R.push(await prueba('A estatico (piso)', (ctx)=>{
  const nb=mkNoise(ctx,8);
  for(let v=0;v<VOCES;v++){const s=ctx.createBufferSource();s.buffer=nb;s.loop=true;
   const g=ctx.createGain();g.gain.value=0.03;s.connect(g).connect(ctx.destination);s.start(0,v*0.37);}}));
 R.push(await prueba('B setValueAtTime 50ms (240k eventos)', (ctx,dur)=>{
  const nb=mkNoise(ctx,8);
  for(let v=0;v<VOCES;v++){const s=ctx.createBufferSource();s.buffer=nb;s.loop=true;
   const g=ctx.createGain();g.gain.value=0;s.connect(g).connect(ctx.destination);s.start(0,v*0.37);
   for(let t=0;t<dur;t+=0.05) g.gain.setValueAtTime(0.02+0.02*Math.random(),t);}}));
 R.push(await prueba('C linearRamp 50ms (240k eventos)', (ctx,dur)=>{
  const nb=mkNoise(ctx,8);
  for(let v=0;v<VOCES;v++){const s=ctx.createBufferSource();s.buffer=nb;s.loop=true;
   const g=ctx.createGain();g.gain.value=0;s.connect(g).connect(ctx.destination);s.start(0,v*0.37);
   g.gain.setValueAtTime(0.02,0);
   for(let t=0.05;t<dur;t+=0.05) g.gain.linearRampToValueAtTime(0.02+0.02*Math.random(),t);}}));
 R.push(await prueba('D setValueCurveAtTime (1 llamada/voz, 12000 puntos)', (ctx,dur)=>{
  const nb=mkNoise(ctx,8);
  for(let v=0;v<VOCES;v++){const s=ctx.createBufferSource();s.buffer=nb;s.loop=true;
   const g=ctx.createGain();g.gain.value=0;s.connect(g).connect(ctx.destination);s.start(0,v*0.37);
   const c=new Float32Array(12000); for(let i=0;i<12000;i++)c[i]=0.02+0.02*Math.random();
   g.gain.setValueCurveAtTime(c,0,dur);}}));
 R.push(await prueba('E mod tasa audio (buffer 12000 muestras, rate 0.0204)', (ctx,dur)=>{
  const nb=mkNoise(ctx,8);
  const eb=ctx.createBuffer(1,12000,SR); const ed=eb.getChannelData(0);
  for(let i=0;i<12000;i++)ed[i]=0.02+0.02*Math.random();
  for(let v=0;v<VOCES;v++){const s=ctx.createBufferSource();s.buffer=nb;s.loop=true;
   const g=ctx.createGain();g.gain.value=0;
   const m=ctx.createBufferSource();m.buffer=eb;m.loop=true;m.playbackRate.value=12000/(SR*dur/1);
   m.connect(g.gain);m.start(0,v*0.017);
   s.connect(g).connect(ctx.destination);s.start(0,v*0.37);}}));
 R.push(await prueba('F mod tasa audio COMPARTIDA (1 modulador -> 20 gains)', (ctx,dur)=>{
  const nb=mkNoise(ctx,8);
  const eb=ctx.createBuffer(1,12000,SR); const ed=eb.getChannelData(0);
  for(let i=0;i<12000;i++)ed[i]=0.02+0.02*Math.random();
  const m=ctx.createBufferSource();m.buffer=eb;m.loop=true;m.playbackRate.value=12000/(SR*dur);m.start();
  for(let v=0;v<VOCES;v++){const s=ctx.createBufferSource();s.buffer=nb;s.loop=true;
   const g=ctx.createGain();g.gain.value=0; m.connect(g.gain);
   s.connect(g).connect(ctx.destination);s.start(0,v*0.37);}}));
 R.push(await prueba('G mod con OscillatorNode 0.03 Hz (20 osc)', (ctx,dur)=>{
  const nb=mkNoise(ctx,8);
  for(let v=0;v<VOCES;v++){const s=ctx.createBufferSource();s.buffer=nb;s.loop=true;
   const g=ctx.createGain();g.gain.value=0.03;
   const o=ctx.createOscillator();o.frequency.value=0.03+0.01*v;
   const og=ctx.createGain();og.gain.value=0.02;o.connect(og).connect(g.gain);o.start();
   s.connect(g).connect(ctx.destination);s.start(0,v*0.37);}}));
 return R;
});
await b.close();
console.log(JSON.stringify(r,null,1));
