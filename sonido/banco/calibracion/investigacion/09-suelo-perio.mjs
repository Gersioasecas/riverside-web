import { writeFileSync } from 'node:fs';
import { mulberry32, ruidoPendiente } from '/tmp/wa/lib.mjs';
const SR=44100;
function esc(nom,L,R,n){let mx=0;for(let i=0;i<n;i++)mx=Math.max(mx,Math.abs(L[i]),Math.abs(R[i]));
 const g=0.85/mx,d=Buffer.alloc(n*4);
 for(let i=0;i<n;i++){d.writeInt16LE(Math.round(Math.max(-1,Math.min(1,L[i]*g))*32767),i*4);
                      d.writeInt16LE(Math.round(Math.max(-1,Math.min(1,R[i]*g))*32767),i*4+2);}
 const c=Buffer.alloc(44);c.write('RIFF',0);c.writeUInt32LE(36+d.length,4);c.write('WAVE',8);
 c.write('fmt ',12);c.writeUInt32LE(16,16);c.writeUInt16LE(1,20);c.writeUInt16LE(2,22);
 c.writeUInt32LE(SR,24);c.writeUInt32LE(SR*4,28);c.writeUInt16LE(4,32);c.writeUInt16LE(16,34);
 c.write('data',36);c.writeUInt32LE(d.length,40);
 writeFileSync(`/tmp/wa/out9/${nom}.wav`,Buffer.concat([c,d]));}
/* SUELO de 'perio': envolvente de olas TOTALMENTE aperiodica (generada fresca, sin bucle) */
const NB=1<<21;
const A=ruidoPendiente(NB,2.661,SR,mulberry32(31),110);
for(const [dur,porMin,semilla] of [[40,13,1],[40,13,2],[40,13,3],[60,13,4],[120,13,5],[40,20,6],[40,8,7]]){
 const n=SR*dur, rnd=mulberry32(semilla*77);
 const e=new Float32Array(n).fill(0.22);
 const cuantas=Math.round(porMin*dur/60);
 for(let i=0;i<cuantas;i++){const c=rnd()*n, w=SR*(1.1+rnd()*2.0), a=0.3+rnd()*0.55;
  const i0=Math.max(0,Math.floor(c-3*w)),i1=Math.min(n,Math.ceil(c+3*w));
  for(let j=i0;j<i1;j++){const t=(j-c)/w;e[j]+=a*Math.exp(-t*t);}}
 const L=new Float32Array(n), R=new Float32Array(n);
 for(let i=0;i<n;i++){L[i]=A[i%NB]*e[i]; R[i]=A[(i+700000)%NB]*e[i];}
 esc(`suelo-perio-${dur}s-${porMin}pm-s${semilla}`,L,R,n);
}
