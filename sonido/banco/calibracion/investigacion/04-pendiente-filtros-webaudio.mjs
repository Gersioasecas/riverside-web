/* Pendiente espectral: comparativa de metodos, medida con el analizador del proyecto */
import puppeteer from '/Users/gersioasecas/.claude/skills/revisor/engine/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import { writeFileSync } from 'node:fs';
const SR=44100, DUR=40;
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 headless:true,args:['--headless=new','--no-sandbox','--disable-gpu']});
const p=await b.newPage(); await p.goto('about:blank');
const res=await p.evaluate(async (SR,DUR)=>{
 const n=SR*DUR, out={}, tiempos={};
 const blanco=(ctx)=>{const bb=ctx.createBuffer(1,SR*4,SR);const d=bb.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  const s=ctx.createBufferSource();s.buffer=bb;s.loop=true;s.start();return s;};
 const corre=async(nombre,build)=>{
  const t0=performance.now();
  const ctx=new OfflineAudioContext(2,n,SR); build(ctx);
  const buf=await ctx.startRendering(); const t1=performance.now();
  tiempos[nombre]=+(t1-t0).toFixed(1);
  const L=buf.getChannelData(0),R=buf.getChannelData(1);
  let mx=0;for(let i=0;i<n;i++)mx=Math.max(mx,Math.abs(L[i]),Math.abs(R[i]));
  const g=0.85/mx; const d=new Int16Array(n*2);
  for(let i=0;i<n;i++){d[2*i]=Math.round(Math.max(-1,Math.min(1,L[i]*g))*32767);
                       d[2*i+1]=Math.round(Math.max(-1,Math.min(1,R[i]*g))*32767);}
  let bin='';const u8=new Uint8Array(d.buffer);const CH=0x8000;
  for(let i=0;i<u8.length;i+=CH)bin+=String.fromCharCode.apply(null,u8.subarray(i,i+CH));
  out[nombre]=btoa(bin);
 };
 // --- A) cascada de lowshelf, espaciado Δ octavas, ganancia = |pend|*Δ ---
 const cascada=(delta,pend)=>(ctx)=>{
  const s=blanco(ctx); let node=s; const g=Math.abs(pend)*delta;
  for(let f=20; f<=20000; f*=Math.pow(2,delta)){
   const sh=ctx.createBiquadFilter(); sh.type='lowshelf'; sh.frequency.value=f; sh.gain.value=g;
   node.connect(sh); node=sh;
  }
  const gg=ctx.createGain(); gg.gain.value=0.0005; node.connect(gg).connect(ctx.destination);
 };
 await corre('cascada-1oct',   cascada(1,   -5));
 await corre('cascada-0.5oct', cascada(0.5, -5));
 await corre('cascada-0.33oct',cascada(1/3, -5));
 // --- B) IIRFilterNode: filtro rosa clasico de 3 polos (Bristow-Johnson / Kellet) ---
 const PB=[0.049922035,-0.095993537,0.050612699,-0.004408786];
 const PA=[1,-2.494956002,2.017265875,-0.522189400];
 await corre('iir-rosa', (ctx)=>{const s=blanco(ctx);
  const f=ctx.createIIRFilter(PB,PA); const g=ctx.createGain();g.gain.value=0.5;
  s.connect(f).connect(g).connect(ctx.destination);});
 // --- C) rosa + un polo a 20 Hz (integrador) => f^-1.5 => -6 dB/oct ---
 await corre('iir-rosa+1polo', (ctx)=>{const s=blanco(ctx);
  const f=ctx.createIIRFilter(PB,PA);
  const w=2*Math.PI*20/SR, a1=-Math.exp(-w), b0=1+a1;
  const lp=ctx.createIIRFilter([b0],[1,a1]);
  const g=ctx.createGain();g.gain.value=2; s.connect(f).connect(lp).connect(g).connect(ctx.destination);});
 // --- D) dos rosas en cascada (f^-1) => -3 dB/oct ---
 await corre('iir-rosa-x2', (ctx)=>{const s=blanco(ctx);
  const f1=ctx.createIIRFilter(PB,PA), f2=ctx.createIIRFilter(PB,PA);
  const g=ctx.createGain();g.gain.value=4; s.connect(f1).connect(f2).connect(g).connect(ctx.destination);});
 // --- E) rosa + lowshelf cascada de -2 dB/oct  => -5 total ---
 await corre('iir-rosa+cascada2', (ctx)=>{const s=blanco(ctx);
  let node=ctx.createIIRFilter(PB,PA); s.connect(node);
  for(let f=20;f<=20000;f*=2){const sh=ctx.createBiquadFilter();sh.type='lowshelf';
   sh.frequency.value=f; sh.gain.value=5; node.connect(sh); node=sh;}
  const g=ctx.createGain();g.gain.value=0.0006; node.connect(g).connect(ctx.destination);});
 // --- F) un solo polo (leaky integrator) a=0.99 => marron ---
 await corre('unpolo-0.99', (ctx)=>{const s=blanco(ctx);
  const f=ctx.createIIRFilter([0.01],[1,-0.99]); const g=ctx.createGain();g.gain.value=3;
  s.connect(f).connect(g).connect(ctx.destination);});
 return {out, tiempos};
}, SR, DUR);
await b.close();
console.log('tiempos de render (40 s de audio, ms):', JSON.stringify(res.tiempos));
for(const [k,v] of Object.entries(res.out)){
 const d=Buffer.from(v,'base64'); const c=Buffer.alloc(44);
 c.write('RIFF',0);c.writeUInt32LE(36+d.length,4);c.write('WAVE',8);c.write('fmt ',12);
 c.writeUInt32LE(16,16);c.writeUInt16LE(1,20);c.writeUInt16LE(2,22);c.writeUInt32LE(SR,24);
 c.writeUInt32LE(SR*4,28);c.writeUInt16LE(4,32);c.writeUInt16LE(16,34);c.write('data',36);
 c.writeUInt32LE(d.length,40);
 writeFileSync(`/tmp/wa/out3/${k}.wav`, Buffer.concat([c,d]));
}
