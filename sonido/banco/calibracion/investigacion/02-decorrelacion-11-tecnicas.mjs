import puppeteer from '/Users/gersioasecas/.claude/skills/revisor/engine/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import { writeFileSync } from 'node:fs';
const SR=44100, DUR=40;
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--headless=new','--no-sandbox','--disable-gpu']});
const page = await browser.newPage(); await page.goto('about:blank');
const res = await page.evaluate(async (SR,DUR)=>{
/* ---------- utilidades ---------- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function fft(re,im,inv){const n=re.length;for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
 for(let len=2;len<=n;len<<=1){const ang=2*Math.PI/len*(inv?1:-1);const wr=Math.cos(ang),wi=Math.sin(ang);
  for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){const ur=re[i+k],ui=im[i+k];
   const vr=re[i+k+len/2]*cr-im[i+k+len/2]*ci, vi=re[i+k+len/2]*ci+im[i+k+len/2]*cr;
   re[i+k]=ur+vr;im[i+k]=ui+vi;re[i+k+len/2]=ur-vr;im[i+k+len/2]=ui-vi;
   const ncr=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=ncr;}}}
 if(inv){for(let i=0;i<n;i++){re[i]/=n;im[i]/=n;}}}
/* ruido con PSD exactamente proporcional a f^-alpha, y PERIODICO por construccion */
function ruidoPendiente(n, alpha, sr, rnd, fMin=25){
 const re=new Float64Array(n), im=new Float64Array(n), half=n>>1;
 for(let k=1;k<=half;k++){
  const f=k*sr/n;
  const mag = f<fMin ? 0 : Math.pow(f,-alpha/2);
  const ph=rnd()*2*Math.PI;
  const a=mag*Math.cos(ph), b=mag*Math.sin(ph);
  re[k]=a; im[k]=(k===half)?0:b;
  if(k<half){re[n-k]=a; im[n-k]=-b;}
 }
 fft(re,im,true);
 let mx=0; for(let i=0;i<n;i++) if(Math.abs(re[i])>mx) mx=Math.abs(re[i]);
 const out=new Float32Array(n); for(let i=0;i<n;i++) out[i]=re[i]/mx*0.9;
 return out;
}
/* secuencia velvet: densidad rho imp/s, largo ms, decaimiento por segmentos */
function velvet(rho, ms, sr, rnd, segs=[0.85,0.55,0.35,0.20]){
 const Ls=Math.round(sr*ms/1000), Td=sr/rho, M=Math.floor(Ls/Td);
 const k=[], s=[];
 for(let m=0;m<M;m++){
  k.push(Math.round(m*Td + rnd()*(Td-1)));
  const seg=Math.min(segs.length-1, Math.floor(m/M*segs.length));
  s.push((2*Math.round(rnd())-1)*segs[seg]);
 }
 return {k,s,Ls};
}
function convVelvet(x, vn){
 const y=new Float32Array(x.length);
 for(let i=0;i<vn.k.length;i++){const d=vn.k[i], g=vn.s[i];
  for(let n=d;n<x.length;n++) y[n]+=g*x[n-d];}
 let mx=0;for(let n=0;n<y.length;n++) if(Math.abs(y[n])>mx) mx=Math.abs(y[n]);
 for(let n=0;n<y.length;n++) y[n]/=mx/0.9;
 return y;
}
/* envolvente de olas compartida: suma de gaussianas irregulares */
function envolvente(n, sr, rnd, porMin=13){
 const e=new Float32Array(n).fill(0.18);
 const total=Math.round(porMin*(n/sr)/60);
 for(let i=0;i<total;i++){
  const c=rnd()*n, w=sr*(2.5+rnd()*4), a=0.35+rnd()*0.5;
  const i0=Math.max(0,Math.floor(c-3*w)), i1=Math.min(n,Math.ceil(c+3*w));
  for(let j=i0;j<i1;j++){const t=(j-c)/w; e[j]+=a*Math.exp(-t*t);}
 }
 return e;
}

const N = 1<<21;            // 2^21 = 47.6 s  (potencia de 2, obligatorio para la FFT)
const ALPHA = 2.661;        // -> pendiente medida = -5.0 dB/oct
const n = SR*DUR;
const rnd = mulberry32(12345);
const A = ruidoPendiente(N, ALPHA, SR, rnd);
const B = ruidoPendiente(N, ALPHA, SR, mulberry32(999));
const env = envolvente(n, SR, mulberry32(4242));

const vari = {};
const put=(name,L,R)=>{ // aplica envolvente comun y normaliza a -20 dBFS aprox
 const l=new Float32Array(n), r=new Float32Array(n);
 for(let i=0;i<n;i++){l[i]=L[i]*env[i];r[i]=R[i]*env[i];}
 let mx=0;for(let i=0;i<n;i++){mx=Math.max(mx,Math.abs(l[i]),Math.abs(r[i]));}
 const g=0.85/mx; for(let i=0;i<n;i++){l[i]*=g;r[i]*=g;}
 vari[name]=[l,r];
};
const seg=(buf,off)=>{const o=new Float32Array(n);for(let i=0;i<n;i++)o[i]=buf[(i+off)%buf.length];return o;};

// 1 mono (control)
put('1-mono', seg(A,0), seg(A,0));
// 2 buffers independientes
put('2-indep', seg(A,0), seg(B,0));
// 3 mismo buffer, offsets muy separados
put('3-offset3.7s', seg(A,0), seg(A,Math.round(3.7*SR)));
// 4 retardo corto fijo 1.3 ms
put('4-delay1.3ms', seg(A,0), seg(A,Math.round(0.0013*SR)));
// 5 retardo fijo 12 ms
put('5-delay12ms', seg(A,0), seg(A,Math.round(0.012*SR)));
// 6 retardo fijo 120 ms
put('6-delay120ms', seg(A,0), seg(A,Math.round(0.120*SR)));
// 7 velvet decorrelator: L = velvet1*A, R = velvet2*A  (dos VNS independientes)
{const a=seg(A,0);
 const v1=velvet(1000,30,SR,mulberry32(11)), v2=velvet(1000,30,SR,mulberry32(22));
 put('7-velvet1000', convVelvet(a,v1), convVelvet(a,v2));}
// 7b velvet solo en R (L seco)
{const a=seg(A,0); const v2=velvet(1000,30,SR,mulberry32(22));
 put('7b-velvetR', a, convVelvet(a,v2));}
// 8 matriz suma/resta con correlacion exacta rho=0.45
{const rho=0.45, th=0.5*Math.acos(rho), c=Math.cos(th), s=Math.sin(th);
 const a=seg(A,0), b=seg(B,0);
 const l=new Float32Array(n), r=new Float32Array(n);
 for(let i=0;i<n;i++){l[i]=c*a[i]+s*b[i]; r[i]=c*a[i]-s*b[i];}
 put('8-matriz045', l, r);}
// 9 allpass en cascada (8 biquad allpass) solo en R  -> se hace con Web Audio
// se rellena abajo

/* --- variante 9 y 10 via Web Audio real --- */
async function viaWA(build){
 const ctx=new OfflineAudioContext(2,n,SR);
 build(ctx);
 const b=await ctx.startRendering();
 return [b.getChannelData(0), b.getChannelData(1)];
}
const mkBuf=(ctx,data)=>{const b=ctx.createBuffer(1,data.length,SR);b.getChannelData(0).set(data);return b;};
{const a=seg(A,0);
 const [l,r]=await viaWA((ctx)=>{
  const src=ctx.createBufferSource(); src.buffer=mkBuf(ctx,a);
  const merge=ctx.createChannelMerger(2);
  src.connect(merge,0,0);
  let node=src;
  const freqs=[137,331,613,1117,1789,2593,3719,5417]; // primos
  for(const f of freqs){const ap=ctx.createBiquadFilter();ap.type='allpass';ap.frequency.value=f;ap.Q.value=1.2;node.connect(ap);node=ap;}
  node.connect(merge,0,1);
  merge.connect(ctx.destination); src.start();
 });
 put('9-allpass8R', l, r);
}
{const a=seg(A,0);
 const [l,r]=await viaWA((ctx)=>{
  const src=ctx.createBufferSource(); src.buffer=mkBuf(ctx,a);
  const merge=ctx.createChannelMerger(2);
  const mk=(freqs)=>{let node=src;for(const f of freqs){const ap=ctx.createBiquadFilter();ap.type='allpass';ap.frequency.value=f;ap.Q.value=1.2;node.connect(ap);node=ap;}return node;};
  mk([113,283,571,1013,1663,2437,3583,5231]).connect(merge,0,0);
  mk([137,331,613,1117,1789,2593,3719,5417]).connect(merge,0,1);
  merge.connect(ctx.destination); src.start();
 });
 put('10-allpass8LR', l, r);
}

/* empaquetar a Int16 base64 */
const salida={};
for(const [k,[l,r]] of Object.entries(vari)){
 const buf=new Int16Array(n*2);
 for(let i=0;i<n;i++){buf[2*i]=Math.max(-32767,Math.min(32767,Math.round(l[i]*32767)));
                      buf[2*i+1]=Math.max(-32767,Math.min(32767,Math.round(r[i]*32767)));}
 let bin='';const u8=new Uint8Array(buf.buffer);
 const CH=0x8000; for(let i=0;i<u8.length;i+=CH) bin+=String.fromCharCode.apply(null,u8.subarray(i,i+CH));
 salida[k]=btoa(bin);
}
return salida;
}, SR, DUR);
await browser.close();
for(const [k,b64] of Object.entries(res)){
 const datos=Buffer.from(b64,'base64');
 const cab=Buffer.alloc(44);
 cab.write('RIFF',0);cab.writeUInt32LE(36+datos.length,4);cab.write('WAVE',8);
 cab.write('fmt ',12);cab.writeUInt32LE(16,16);cab.writeUInt16LE(1,20);cab.writeUInt16LE(2,22);
 cab.writeUInt32LE(SR,24);cab.writeUInt32LE(SR*4,28);cab.writeUInt16LE(4,32);cab.writeUInt16LE(16,34);
 cab.write('data',36);cab.writeUInt32LE(datos.length,40);
 writeFileSync(`/tmp/wa/out/${k}.wav`, Buffer.concat([cab,datos]));
 console.log('ok', k, datos.length);
}
