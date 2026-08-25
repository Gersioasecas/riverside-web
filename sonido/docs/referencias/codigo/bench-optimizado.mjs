const SR=44100, DUR=5.0, N=Math.round(SR*DUR);
// A2: same as A but pulses placed via geometric inter-arrival (sparse), single shared force buffer per bin
function A2(nBins, rate){
  const out=new Float32Array(N);
  const rmin=0.00015,rmax=0.015;
  const force=new Float64Array(N);
  let nb=0;
  for(let k=0;k<nBins;k++){
    const r=rmin*Math.pow(rmax/rmin,k/(nBins-1));
    const f=3.0/r,d=0.13/r+0.0072*Math.pow(r,-1.5);
    const R=Math.exp(-d/SR),th=2*Math.PI*f/SR;
    const a=2*R*Math.cos(th),b=R*R,g=17.2133*Math.pow(r,1.5)*R*Math.sin(th);
    const lam=(rate/nBins)/SR;
    force.fill(0);
    let n=0;
    while(true){ n += Math.max(1, Math.ceil(-Math.log(1-Math.random())/lam)); if(n>=N) break; force[n]=Math.pow(Math.random(),10); nb++; }
    let p1=0,p2=0;
    for(let i=0;i<N;i++){ const yn=a*p1-b*p2+g*force[i]; p2=p1;p1=yn; out[i]+=yn; }
  }
  return nb;
}
// A3: skip the force buffer entirely -> inject impulse directly into recursion state at event samples
function A3(nBins, rate){
  const out=new Float32Array(N);
  const rmin=0.00015,rmax=0.015;
  let nb=0;
  const ev=new Int32Array(1<<16); const am=new Float64Array(1<<16);
  for(let k=0;k<nBins;k++){
    const r=rmin*Math.pow(rmax/rmin,k/(nBins-1));
    const f=3.0/r,d=0.13/r+0.0072*Math.pow(r,-1.5);
    const R=Math.exp(-d/SR),th=2*Math.PI*f/SR;
    const a=2*R*Math.cos(th),b=R*R,g=17.2133*Math.pow(r,1.5)*R*Math.sin(th);
    const lam=(rate/nBins)/SR;
    let m=0,n=0;
    while(m<ev.length){ n+=Math.max(1,Math.ceil(-Math.log(1-Math.random())/lam)); if(n>=N)break; ev[m]=n; am[m]=g*Math.pow(Math.random(),10); m++; }
    nb+=m;
    let p1=0,p2=0,e=0,next=m?ev[0]:N;
    for(let i=0;i<N;i++){
      let yn=a*p1-b*p2;
      if(i===next){ yn+=am[e]; e++; next = e<m?ev[e]:N; }
      p2=p1;p1=yn; out[i]+=yn;
    }
  }
  return nb;
}
for(const rate of [10000,100000]){
  let t=performance.now(); let nb=A2(50,rate); console.log(`A2 rate=${rate} bubbles=${nb} -> ${(performance.now()-t).toFixed(1)} ms`);
  t=performance.now(); nb=A3(50,rate); console.log(`A3 rate=${rate} bubbles=${nb} -> ${(performance.now()-t).toFixed(1)} ms`);
}
