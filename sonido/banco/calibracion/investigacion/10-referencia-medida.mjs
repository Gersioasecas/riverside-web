import puppeteer from '/Users/gersioasecas/.claude/skills/revisor/engine/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import { writeFileSync } from 'node:fs';
const SR=44100, DUR=60, n=SR*DUR;
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 headless:true,args:['--headless=new','--no-sandbox','--disable-gpu']});
const p=await b.newPage(); await p.goto('about:blank');
const res=await p.evaluate(async (SR,n,DUR)=>{
 /* ---------- FFT + ruido de pendiente exacta ---------- */
 function fft(re,im,inv){const N=re.length;for(let i=1,j=0;i<N;i++){let bit=N>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;
  if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
  for(let len=2;len<=N;len<<=1){const a=2*Math.PI/len*(inv?1:-1),wr=Math.cos(a),wi=Math.sin(a);
   for(let i=0;i<N;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){const ur=re[i+k],ui=im[i+k];
    const vr=re[i+k+len/2]*cr-im[i+k+len/2]*ci,vi=re[i+k+len/2]*ci+im[i+k+len/2]*cr;
    re[i+k]=ur+vr;im[i+k]=ui+vi;re[i+k+len/2]=ur-vr;im[i+k+len/2]=ui-vi;
    const t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t;}}}
  if(inv)for(let i=0;i<N;i++){re[i]/=N;im[i]/=N;}}
 function ruido(N,alpha,sr,fLo,fHi){
  const re=new Float64Array(N),im=new Float64Array(N),h=N>>1;
  for(let k=1;k<=h;k++){const f=k*sr/N;
   let m = Math.pow(f,-alpha/2);
   if(f<fLo) m*=Math.pow(f/fLo,2);          // faldon suave debajo de fLo
   if(f>fHi) m*=Math.pow(fHi/f,2);
   const ph=Math.random()*2*Math.PI, a=m*Math.cos(ph), bb=m*Math.sin(ph);
   re[k]=a; im[k]=(k===h)?0:bb; if(k<h){re[N-k]=a; im[N-k]=-bb;}}
  fft(re,im,true);
  let s=0;for(let i=0;i<N;i++)s+=re[i]*re[i];const r=Math.sqrt(s/N);
  const o=new Float32Array(N);for(let i=0;i<N;i++)o[i]=re[i]/r/6;return o;}
 /* ---------- envolvente de olas ---------- */
 function olas(N, segTotales, porMin){
  const e=new Float32Array(N).fill(0.22);
  const cuantas=Math.round(porMin*segTotales/60);
  for(let i=0;i<cuantas;i++){
   const c=Math.random()*N, w=N*(1.1+Math.random()*2.0)/segTotales, a=0.30+Math.random()*0.55;
   const i0=Math.max(0,Math.floor(c-3*w)), i1=Math.min(N,Math.ceil(c+3*w));
   for(let j=i0;j<i1;j++){const t=(j-c)/w; e[j]+=a*Math.exp(-t*t);}}
  e[N-1]=e[0];                                // costura del bucle
  return e;}

 const t0=performance.now();
 const ctx=new OfflineAudioContext(2,n,SR);
 const NB=1<<20;                               // 23.78 s
 const bufRuido=ctx.createBuffer(1,NB,SR);
 bufRuido.getChannelData(0).set(ruido(NB,2.661,SR,110,16000));
 const NE=8192, SEG_ENV=300;                   // 4096 muestras = 300 s de envolvente
 const bufsEnv=[0,1,2].map(()=>{const b=ctx.createBuffer(1,NE,SR);b.getChannelData(0).set(olas(NE,SEG_ENV,30));return b;});
 const tasaEnv=NE/(SEG_ENV*SR);                // 3.096e-4

 const RHO=0.45, th=0.5*Math.acos(RHO), cA=Math.cos(th), cB=Math.sin(th);
 const mezL=ctx.createGain(), mezR=ctx.createGain();
 const merge=ctx.createChannelMerger(2); mezL.connect(merge,0,0); mezR.connect(merge,0,1);
 const maestro=ctx.createGain(); maestro.gain.value=1.0;
 merge.connect(maestro).connect(ctx.destination);

 const CAPAS=[{r:1.0,offA:0,offB:11.9},{r:Math.pow(2,-1/3),offA:5.1,offB:17.3},{r:Math.pow(2,-2/3),offA:8.7,offB:20.4}];
 CAPAS.forEach((L,i)=>{
  const voz=ctx.createGain(); voz.gain.value=0;          // la envolvente la pone el modulador
  const mod=ctx.createBufferSource(); mod.buffer=bufsEnv[i]; mod.loop=true;
  mod.playbackRate.value=tasaEnv*(1+0.11*i);             // periodos de ola inconmensurables
  const escala=ctx.createGain(); escala.gain.value=1/Math.sqrt(CAPAS.length);
  mod.connect(escala).connect(voz.gain); mod.start(0, i*37);
  const sA=ctx.createBufferSource(); sA.buffer=bufRuido; sA.loop=true; sA.playbackRate.value=L.r;
  const sB=ctx.createBufferSource(); sB.buffer=bufRuido; sB.loop=true; sB.playbackRate.value=L.r;
  const gA=ctx.createGain(); gA.gain.value=cA;
  const gP=ctx.createGain(); gP.gain.value=cB;
  const gM=ctx.createGain(); gM.gain.value=-cB;
  sA.connect(gA); sB.connect(gP); sB.connect(gM);
  const sumL=ctx.createGain(), sumR=ctx.createGain();
  gA.connect(sumL); gP.connect(sumL);
  gA.connect(sumR); gM.connect(sumR);
  const vL=ctx.createGain(), vR=ctx.createGain(); vL.gain.value=0; vR.gain.value=0;
  mod.connect(escala); escala.connect(vL.gain); escala.connect(vR.gain);
  sumL.connect(vL).connect(mezL); sumR.connect(vR).connect(mezR);
  sA.start(0,L.offA); sB.start(0,L.offB);
 });
 const buf=await ctx.startRendering();
 const ms=performance.now()-t0;
 const L=buf.getChannelData(0),R=buf.getChannelData(1);
 let mx=0;for(let i=0;i<n;i++)mx=Math.max(mx,Math.abs(L[i]),Math.abs(R[i]));
 const g=0.85/mx, d=new Int16Array(n*2);
 for(let i=0;i<n;i++){d[2*i]=Math.round(Math.max(-1,Math.min(1,L[i]*g))*32767);
                      d[2*i+1]=Math.round(Math.max(-1,Math.min(1,R[i]*g))*32767);}
 let s='';const u8=new Uint8Array(d.buffer);
 for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));
 return {wav:btoa(s), ms:+ms.toFixed(0), picoCrudo:+mx.toFixed(3),
   nodos:'6 BufferSource ruido + 3 BufferSource env + 17 Gain + 1 Merger'};
}, SR, n, DUR);
await b.close();
console.log('render', res.ms,'ms para',DUR,'s  ('+Math.round(DUR*1000/res.ms)+'x tiempo real) · pico crudo', res.picoCrudo);
const dd=Buffer.from(res.wav,'base64'), c=Buffer.alloc(44);
c.write('RIFF',0);c.writeUInt32LE(36+dd.length,4);c.write('WAVE',8);c.write('fmt ',12);
c.writeUInt32LE(16,16);c.writeUInt16LE(1,20);c.writeUInt16LE(2,22);c.writeUInt32LE(SR,24);
c.writeUInt32LE(SR*4,28);c.writeUInt16LE(4,32);c.writeUInt16LE(16,34);c.write('data',36);
c.writeUInt32LE(dd.length,40);
writeFileSync('/tmp/wa/out8/referencia.wav', Buffer.concat([c,dd]));
