import { writeFileSync } from 'node:fs';
import { mulberry32, ruidoPendiente } from '/tmp/wa/lib.mjs';
const SR=44100, DUR=40, n=SR*DUR;
function esc(nom,L,R){ let mx=0;for(let i=0;i<n;i++)mx=Math.max(mx,Math.abs(L[i]),Math.abs(R[i]));
 const g=0.85/mx, d=Buffer.alloc(n*4);
 for(let i=0;i<n;i++){d.writeInt16LE(Math.round(Math.max(-1,Math.min(1,L[i]*g))*32767),i*4);
                      d.writeInt16LE(Math.round(Math.max(-1,Math.min(1,R[i]*g))*32767),i*4+2);}
 const c=Buffer.alloc(44);c.write('RIFF',0);c.writeUInt32LE(36+d.length,4);c.write('WAVE',8);
 c.write('fmt ',12);c.writeUInt32LE(16,16);c.writeUInt16LE(1,20);c.writeUInt16LE(2,22);
 c.writeUInt32LE(SR,24);c.writeUInt32LE(SR*4,28);c.writeUInt16LE(4,32);c.writeUInt16LE(16,34);
 c.write('data',36);c.writeUInt32LE(d.length,40);
 writeFileSync(`/tmp/wa/out4/${nom}.wav`,Buffer.concat([c,d]));}

/* ---- KASDIN 1995: FIR de f^-beta   h[0]=1, h[k]=h[k-1]*(k-1+beta/2)/k ---- */
function kasdin(nMuestras, beta, largoFIR, rnd){
 const h=new Float64Array(largoFIR); h[0]=1;
 for(let k=1;k<largoFIR;k++) h[k]=h[k-1]*(k-1+beta/2)/k;
 const x=new Float64Array(nMuestras+largoFIR);
 for(let i=0;i<x.length;i++){ // Box-Muller: gaussiana
  const u=Math.max(1e-12,rnd()), v=rnd();
  x[i]=Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
 const y=new Float32Array(nMuestras);
 for(let i=0;i<nMuestras;i++){let s=0;
  for(let k=0;k<largoFIR;k++) s+=h[k]*x[i+largoFIR-k];
  y[i]=s;}
 let ss=0;for(let i=0;i<nMuestras;i++)ss+=y[i]*y[i];
 const r=Math.sqrt(ss/nMuestras); for(let i=0;i<nMuestras;i++)y[i]/=r;
 return y;}
/* ---- KELLET refinado (musicdsp): rosa 1/f, +-0.05 dB desde 9.2 Hz ---- */
function kellet(nM, rnd){
 let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0; const y=new Float32Array(nM);
 for(let i=0;i<nM;i++){ const w=rnd()*2-1;
  b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759; b2=0.96900*b2+w*0.1538520;
  b3=0.86650*b3+w*0.3104856; b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
  y[i]=b0+b1+b2+b3+b4+b5+b6+w*0.5362; b6=w*0.115926; }
 let s=0;for(let i=0;i<nM;i++)s+=y[i]*y[i];const r=Math.sqrt(s/nM);
 for(let i=0;i<nM;i++)y[i]/=r; return y;}
/* ---- marron: un polo con fuga ---- */
function marron(nM,a,rnd){const y=new Float32Array(nM);let l=0;
 for(let i=0;i<nM;i++){l=a*l+(1-a)*(rnd()*2-1);y[i]=l;}
 let s=0;for(let i=0;i<nM;i++)s+=y[i]*y[i];const r=Math.sqrt(s/nM);
 for(let i=0;i<nM;i++)y[i]/=r;return y;}

const r1=mulberry32(3), r2=mulberry32(4);
esc('kasdin-b1.0-L2048', kasdin(n,1.0,2048,mulberry32(1)), kasdin(n,1.0,2048,mulberry32(2)));
esc('kasdin-b1.5-L2048', kasdin(n,1.5,2048,mulberry32(1)), kasdin(n,1.5,2048,mulberry32(2)));
esc('kasdin-b2.0-L2048', kasdin(n,2.0,2048,mulberry32(1)), kasdin(n,2.0,2048,mulberry32(2)));
esc('kasdin-b2.661-L512', kasdin(n,2.661,512,mulberry32(1)), kasdin(n,2.661,512,mulberry32(2)));
esc('kasdin-b2.661-L2048',kasdin(n,2.661,2048,mulberry32(1)),kasdin(n,2.661,2048,mulberry32(2)));
esc('kasdin-b2.661-L8192',kasdin(n,2.661,8192,mulberry32(1)),kasdin(n,2.661,8192,mulberry32(2)));
esc('kellet-rosa', kellet(n,mulberry32(1)), kellet(n,mulberry32(2)));
esc('marron-0.99', marron(n,0.99,mulberry32(1)), marron(n,0.99,mulberry32(2)));
console.log('listo exp4');

/* ---- bucle: ruido puro sin envolvente, longitudes y capas inconmensurables ---- */
const seg=(b,o,len)=>{const x=new Float32Array(len);for(let i=0;i<len;i++)x[i]=b[(i+o)%b.length];return x;};
for(const secs of [1,2,4,8,16,32]){
 const NL=Math.round(secs*SR);
 const NP=1<<Math.round(Math.log2(NL));
 const bb=ruidoPendiente(NP,2.661,SR,mulberry32(77));
 esc(`puro-bucle-${secs}s`, seg(bb,0,n), seg(bb,Math.round(0.41*NP),n));
}
