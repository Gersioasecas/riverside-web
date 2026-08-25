export function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function fft(re,im,inv){const n=re.length;for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
 for(let len=2;len<=n;len<<=1){const ang=2*Math.PI/len*(inv?1:-1);const wr=Math.cos(ang),wi=Math.sin(ang);
  for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){const ur=re[i+k],ui=im[i+k];
   const vr=re[i+k+len/2]*cr-im[i+k+len/2]*ci, vi=re[i+k+len/2]*ci+im[i+k+len/2]*cr;
   re[i+k]=ur+vr;im[i+k]=ui+vi;re[i+k+len/2]=ur-vr;im[i+k+len/2]=ui-vi;
   const ncr=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=ncr;}}}
 if(inv){for(let i=0;i<n;i++){re[i]/=n;im[i]/=n;}}}
export function ruidoPendiente(n, alpha, sr, rnd, fMin=25){
 const re=new Float64Array(n), im=new Float64Array(n), half=n>>1;
 for(let k=1;k<=half;k++){
  const f=k*sr/n; const mag = f<fMin ? 0 : Math.pow(f,-alpha/2);
  const ph=rnd()*2*Math.PI; const a=mag*Math.cos(ph), b=mag*Math.sin(ph);
  re[k]=a; im[k]=(k===half)?0:b; if(k<half){re[n-k]=a; im[n-k]=-b;}
 }
 fft(re,im,true);
 let s=0; for(let i=0;i<n;i++) s+=re[i]*re[i];
 const rms=Math.sqrt(s/n); const out=new Float32Array(n);
 for(let i=0;i<n;i++) out[i]=re[i]/rms;      // RMS = 1 exacto
 return out;
}
export function velvet(rho, ms, sr, rnd, segs=[0.85,0.55,0.35,0.20]){
 const Ls=Math.round(sr*ms/1000), Td=sr/rho, M=Math.floor(Ls/Td);
 const k=[], s=[];
 for(let m=0;m<M;m++){ k.push(Math.round(m*Td + rnd()*(Td-1)));
  const seg=Math.min(segs.length-1, Math.floor(m/M*segs.length));
  s.push((2*Math.round(rnd())-1)*segs[seg]); }
 return {k,s,Ls,M};
}
export function convVelvet(x, vn){
 const y=new Float32Array(x.length);
 for(let i=0;i<vn.k.length;i++){const d=vn.k[i], g=vn.s[i];
  for(let nn=d;nn<x.length;nn++) y[nn]+=g*x[nn-d];}
 let s=0;for(let nn=0;nn<y.length;nn++) s+=y[nn]*y[nn];
 const rms=Math.sqrt(s/y.length); for(let nn=0;nn<y.length;nn++) y[nn]/=rms;
 return y;
}
export function wav(path, L, R, sr=44100){
 const fs=require('node:fs');
}
