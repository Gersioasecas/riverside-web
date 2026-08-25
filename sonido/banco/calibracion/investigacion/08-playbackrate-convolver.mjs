import puppeteer from '/Users/gersioasecas/.claude/skills/revisor/engine/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import { writeFileSync } from 'node:fs';
import { mulberry32, ruidoPendiente } from '/tmp/wa/lib.mjs';
const SR=44100, DUR=40, n=SR*DUR;
const NB=1<<20;
const A=Array.from(ruidoPendiente(NB,2.661,SR,mulberry32(11),120));
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 headless:true,args:['--headless=new','--no-sandbox','--disable-gpu']});
const p=await b.newPage(); await p.goto('about:blank');
const res=await p.evaluate(async (SR,n,A)=>{
 const out={}, t={};
 const mkBuf=(ctx,d)=>{const bb=ctx.createBuffer(1,d.length,SR);bb.getChannelData(0).set(d);return bb;};
 const corre=async(nom,build)=>{const t0=performance.now();
  const ctx=new OfflineAudioContext(2,n,SR);build(ctx);const buf=await ctx.startRendering();
  t[nom]=+(performance.now()-t0).toFixed(0);
  const L=buf.getChannelData(0),R=buf.getChannelData(1);
  let mx=0;for(let i=0;i<n;i++)mx=Math.max(mx,Math.abs(L[i]),Math.abs(R[i]));
  const g=0.85/mx,d=new Int16Array(n*2);
  for(let i=0;i<n;i++){d[2*i]=Math.round(Math.max(-1,Math.min(1,L[i]*g))*32767);
                       d[2*i+1]=Math.round(Math.max(-1,Math.min(1,R[i]*g))*32767);}
  let s='';const u8=new Uint8Array(d.buffer);for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));
  out[nom]=btoa(s);};

 // 1) autosemejanza: el mismo buffer a distintas playbackRate
 for(const r of [1.0, Math.pow(2,-1/3), Math.pow(2,-2/3), 0.5, 1.5]){
  await corre(`rate-${r.toFixed(4)}`, (ctx)=>{
   const s=ctx.createBufferSource();s.buffer=mkBuf(ctx,A);s.loop=true;s.playbackRate.value=r;
   const m=ctx.createChannelMerger(2);s.connect(m,0,0);s.connect(m,0,1);m.connect(ctx.destination);s.start();});
 }
 // 2) tres capas con playbackRate inconmensurables (2^-1/3, 2^-2/3) + matriz de correlacion
 await corre('capas-rate-matriz', (ctx)=>{
  const bb=mkBuf(ctx,A);
  const rho=0.45, th=0.5*Math.acos(rho), c=Math.cos(th), sn=Math.sin(th);
  const mL=ctx.createGain(), mR=ctx.createGain(); mL.gain.value=1; mR.gain.value=1;
  const merge=ctx.createChannelMerger(2); mL.connect(merge,0,0); mR.connect(merge,0,1);
  [[1.0,0],[Math.pow(2,-1/3),0.31],[Math.pow(2,-2/3),0.67]].forEach(([r,off],i)=>{
   // A: comun          B: independiente (mismo buffer, offset muy lejano)
   const sa=ctx.createBufferSource();sa.buffer=bb;sa.loop=true;sa.playbackRate.value=r;
   const sb=ctx.createBufferSource();sb.buffer=bb;sb.loop=true;sb.playbackRate.value=r;
   const ga=ctx.createGain();ga.gain.value=c/Math.sqrt(3);
   const gp=ctx.createGain();gp.gain.value= sn/Math.sqrt(3);
   const gm=ctx.createGain();gm.gain.value=-sn/Math.sqrt(3);
   sa.connect(ga);ga.connect(mL);ga.connect(mR);
   sb.connect(gp);gp.connect(mL); sb.connect(gm);gm.connect(mR);
   sa.start(0, off*20); sb.start(0, 11.7+off*20);});
  merge.connect(ctx.destination);});
 // 3) convolver con IR difusa sintetica (estereo, decorrelada) vs allpass
 const mkIR=(ctx,seg,dec)=>{const N=Math.round(SR*seg);const ir=ctx.createBuffer(2,N,SR);
  for(let c=0;c<2;c++){const d=ir.getChannelData(c);
   for(let i=0;i<N;i++) d[i]=(Math.random()*2-1)*Math.exp(-dec*i/N);}
  return ir;};
 for(const seg of [0.3,1.0,2.5]){
  await corre(`conv-${seg}s`, (ctx)=>{
   const s=ctx.createBufferSource();s.buffer=mkBuf(ctx,A);s.loop=true;
   const cv=ctx.createConvolver();cv.normalize=true;cv.buffer=mkIR(ctx,seg,7);
   const g=ctx.createGain();g.gain.value=1;
   s.connect(cv).connect(g).connect(ctx.destination);s.start();});
 }
 // 4) IR de VELVET difusa (impulsos dispersos) — mas barata de generar
 await corre('conv-velvet-1s', (ctx)=>{
  const s=ctx.createBufferSource();s.buffer=mkBuf(ctx,A);s.loop=true;
  const N=Math.round(SR*1.0), ir=ctx.createBuffer(2,N,SR), rho=3000, Td=SR/rho;
  for(let c=0;c<2;c++){const d=ir.getChannelData(c);
   for(let m=0;m*Td<N;m++){const k=Math.round(m*Td+Math.random()*(Td-1));
    if(k<N) d[k]=(2*Math.round(Math.random())-1)*Math.exp(-7*k/N);}}
  const cv=ctx.createConvolver();cv.normalize=true;cv.buffer=ir;
  s.connect(cv).connect(ctx.destination);s.start();});
 return {out,t};
}, SR, n, A);
await b.close();
console.log('render ms (40 s):', JSON.stringify(res.t));
for(const [k,v] of Object.entries(res.out)){
 const d=Buffer.from(v,'base64'),c=Buffer.alloc(44);
 c.write('RIFF',0);c.writeUInt32LE(36+d.length,4);c.write('WAVE',8);c.write('fmt ',12);
 c.writeUInt32LE(16,16);c.writeUInt16LE(1,20);c.writeUInt16LE(2,22);c.writeUInt32LE(SR,24);
 c.writeUInt32LE(SR*4,28);c.writeUInt16LE(4,32);c.writeUInt16LE(16,34);c.write('data',36);
 c.writeUInt32LE(d.length,40);
 writeFileSync(`/tmp/wa/out7/${k}.wav`,Buffer.concat([c,d]));}
