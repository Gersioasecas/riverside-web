import { writeFileSync } from 'node:fs';
import { mulberry32, ruidoPendiente, velvet, convVelvet } from '/tmp/wa/lib.mjs';
const SR=44100, DUR=40, n=SR*DUR, N=1<<21, ALPHA=2.661;
function escribir(nombre,L,R){
 let mx=0;for(let i=0;i<n;i++){mx=Math.max(mx,Math.abs(L[i]),Math.abs(R[i]));}
 const g=0.85/mx;
 const d=Buffer.alloc(n*4);
 for(let i=0;i<n;i++){ d.writeInt16LE(Math.round(Math.max(-1,Math.min(1,L[i]*g))*32767), i*4);
                       d.writeInt16LE(Math.round(Math.max(-1,Math.min(1,R[i]*g))*32767), i*4+2); }
 const c=Buffer.alloc(44); c.write('RIFF',0);c.writeUInt32LE(36+d.length,4);c.write('WAVE',8);
 c.write('fmt ',12);c.writeUInt32LE(16,16);c.writeUInt16LE(1,20);c.writeUInt16LE(2,22);
 c.writeUInt32LE(SR,24);c.writeUInt32LE(SR*4,28);c.writeUInt16LE(4,32);c.writeUInt16LE(16,34);
 c.write('data',36);c.writeUInt32LE(d.length,40);
 writeFileSync(`/tmp/wa/out2/${nombre}.wav`, Buffer.concat([c,d]));
}
const rnd=mulberry32(12345);
const A=ruidoPendiente(N,ALPHA,SR,rnd);
const B=ruidoPendiente(N,ALPHA,SR,mulberry32(999));
// envolvente con MAS olas para acercarse al objetivo 8-20/min
function envolvente(n,sr,rnd,porMin=14){
 const e=new Float32Array(n).fill(0.30);
 const total=Math.round(porMin*(n/sr)/60*3);
 for(let i=0;i<total;i++){const c=rnd()*n,w=sr*(1.2+rnd()*2.2),a=0.25+rnd()*0.45;
  const i0=Math.max(0,Math.floor(c-3*w)),i1=Math.min(n,Math.ceil(c+3*w));
  for(let j=i0;j<i1;j++){const t=(j-c)/w;e[j]+=a*Math.exp(-t*t);}}
 return e;}
const env=envolvente(n,SR,mulberry32(4242));
const seg=(b,o)=>{const x=new Float32Array(n);for(let i=0;i<n;i++)x[i]=b[(i+o)%b.length];return x;};
const conEnv=(x)=>{const y=new Float32Array(n);for(let i=0;i<n;i++)y[i]=x[i]*env[i];return y;};

// --- 1. barrido de densidad velvet ---
for(const [rho,ms] of [[500,30],[1000,30],[2000,30],[4000,30],[8000,30],[2000,15],[2000,50],[4000,50],[8000,50]]){
 const a=seg(A,0);
 const v1=velvet(rho,ms,SR,mulberry32(11)), v2=velvet(rho,ms,SR,mulberry32(22));
 escribir(`vel-${rho}-${ms}ms`, conEnv(convVelvet(a,v1)), conEnv(convVelvet(a,v2)));
}
// --- 2. matriz con RMS igualado, varios rho objetivo ---
for(const rho of [0.2,0.3,0.45,0.6,0.7]){
 const th=0.5*Math.acos(rho), c=Math.cos(th), s=Math.sin(th);
 const a=seg(A,0), b=seg(B,0);
 const l=new Float32Array(n), r=new Float32Array(n);
 for(let i=0;i<n;i++){l[i]=c*a[i]+s*b[i]; r[i]=c*a[i]-s*b[i];}
 escribir(`mat-${rho}`, conEnv(l), conEnv(r));
}
// --- 3. longitud del bucle: ruido puro en bucle, sin envolvente ---
for(const secs of [1,2,4,8,16,32]){
 const NL=1<<Math.round(Math.log2(secs*SR));
 const buf=ruidoPendiente(NL,ALPHA,SR,mulberry32(77));
 const l=seg(buf,0), r=seg(buf,Math.round(0.37*NL));
 // discontinuidad en el punto de bucle
 escribir(`bucle-${secs}s`, conEnv(l), conEnv(r));
}
// --- 4. verificar continuidad del bucle IFFT (salto en la costura) ---
{const NL=1<<19; const b=ruidoPendiente(NL,ALPHA,SR,mulberry32(5));
 let maxIn=0; for(let i=1;i<NL;i++) maxIn=Math.max(maxIn,Math.abs(b[i]-b[i-1]));
 const costura=Math.abs(b[0]-b[NL-1]);
 console.log(JSON.stringify({saltoMaxInterno:+maxIn.toFixed(5), saltoEnCostura:+costura.toFixed(5),
   ratio:+(costura/maxIn).toFixed(3)}));}
