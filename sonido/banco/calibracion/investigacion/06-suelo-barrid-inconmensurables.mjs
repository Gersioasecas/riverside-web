import { writeFileSync } from 'node:fs';
import { mulberry32, ruidoPendiente } from '/tmp/wa/lib.mjs';
const SR=44100, DUR=40, n=SR*DUR;
function esc(nom,L,R){let mx=0;for(let i=0;i<n;i++)mx=Math.max(mx,Math.abs(L[i]),Math.abs(R[i]));
 const g=0.85/mx,d=Buffer.alloc(n*4);
 for(let i=0;i<n;i++){d.writeInt16LE(Math.round(Math.max(-1,Math.min(1,L[i]*g))*32767),i*4);
                      d.writeInt16LE(Math.round(Math.max(-1,Math.min(1,R[i]*g))*32767),i*4+2);}
 const c=Buffer.alloc(44);c.write('RIFF',0);c.writeUInt32LE(36+d.length,4);c.write('WAVE',8);
 c.write('fmt ',12);c.writeUInt32LE(16,16);c.writeUInt16LE(1,20);c.writeUInt16LE(2,22);
 c.writeUInt32LE(SR,24);c.writeUInt32LE(SR*4,28);c.writeUInt16LE(4,32);c.writeUInt16LE(16,34);
 c.write('data',36);c.writeUInt32LE(d.length,40);
 writeFileSync(`/tmp/wa/out5/${nom}.wav`,Buffer.concat([c,d]));}
const seg=(b,o,len)=>{const x=new Float32Array(len);for(let i=0;i<len;i++)x[i]=b[(i+o)%b.length];return x;};

/* A) SUELO de la metrica barrid con ruido estacionario puro, segun la pendiente */
for(const [a,et] of [[0,'blanco'],[1,'rosa'],[2,'marron'],[2.661,'a2.661_-5dBoct'],[3.33,'a3.33_-7dBoct']]){
 const b=ruidoPendiente(1<<21,a,SR,mulberry32(101));
 esc(`suelo-${et}`, seg(b,0,n), seg(b,Math.round(0.41*(1<<21)),n));
}
/* B) mismo pero con paso-alto a 120 Hz (2 polos) para quitar el retumbe */
for(const [a,et] of [[2.661,'a2.661_hp120']]){
 const b=ruidoPendiente(1<<21,a,SR,mulberry32(101),120);
 esc(`suelo-${et}`, seg(b,0,n), seg(b,Math.round(0.41*(1<<21)),n));
}
/* C) capas inconmensurables: se combate 'perio' */
const capas=(largos, semilla)=>{
 const y=new Float32Array(n);
 largos.forEach((L,i)=>{ const NP=1<<Math.round(Math.log2(L*SR));
  const b=ruidoPendiente(NP,2.661,SR,mulberry32(semilla+i*17));
  const off=Math.round(0.13*i*NP);
  for(let j=0;j<n;j++) y[j]+= b[(j+off)%NP]/Math.sqrt(largos.length); });
 return y;};
// potencias de 2 (mala idea: el mcm es el mas largo)
esc('capas-pot2-4-8-16', capas([4,8,16],5), capas([4,8,16],55));
// longitudes inconmensurables reales, via playbackRate irracional (se simula con remuestreo)
function remuestrea(b, tasa, len){ const y=new Float32Array(len);
 for(let i=0;i<len;i++){ const p=(i*tasa)%b.length; const i0=Math.floor(p), f=p-i0;
  y[i]=b[i0]*(1-f)+b[(i0+1)%b.length]*f; } return y;}
{ const NP=1<<20; // 23.8 s
  const b1=ruidoPendiente(NP,2.661,SR,mulberry32(11));
  const b2=ruidoPendiente(NP,2.661,SR,mulberry32(12));
  const b3=ruidoPendiente(NP,2.661,SR,mulberry32(13));
  // tasas irracionales -> periodos 23.8/1, 23.8/0.7937, 23.8/0.6299 s  (2^(-1/3), 2^(-2/3))
  const L=(s)=>{const y=new Float32Array(n);
   const a=remuestrea(b1,1.0,n), c=remuestrea(b2,Math.pow(2,-1/3),n), d=remuestrea(b3,Math.pow(2,-2/3),n);
   for(let i=0;i<n;i++) y[i]=(a[i]+c[i]+d[i])/Math.sqrt(3); return y;};
  esc('capas-inconmensurables', L(1), L(2));
}
console.log('exp5 listo');
