// Benchmark A: van den Doel / JASS architecture -> N reson filters driven by random pulse trains
// Benchmark B: naive per-bubble 2-pole ringing oscillator (voice per bubble)
const SR = 44100, DUR = 5.0, N = Math.round(SR*DUR);

function benchA(nBins, rate){ // rate = bubbles/sec total
  const out = new Float32Array(N);
  const rmin=0.00015, rmax=0.015;
  const twoRcos=new Float64Array(nBins), R2=new Float64Array(nBins), amp=new Float64Array(nBins);
  const y1=new Float64Array(nBins), y2=new Float64Array(nBins);
  const pps = (rate/nBins)/SR;
  for(let k=0;k<nBins;k++){
    const r = rmin*Math.pow(rmax/rmin, k/(nBins-1));
    const f = 3.0/r, d = 0.13/r + 0.0072*Math.pow(r,-1.5);
    const R = Math.exp(-d/SR), th = 2*Math.PI*f/SR;
    twoRcos[k]=2*R*Math.cos(th); R2[k]=R*R; amp[k]=R*Math.sin(th)*Math.pow(r,1.5)*17.2133;
  }
  const force = new Float64Array(N);
  let nb=0;
  for(let k=0;k<nBins;k++){
    // fill force with Bernoulli pulses, amplitude = rnd^beta
    force.fill(0);
    for(let n=0;n<N;n++){ if(Math.random()<pps){ force[n]=Math.pow(Math.random(),10); nb++; } }
    let a=twoRcos[k], b=R2[k], g=amp[k], p1=0,p2=0;
    for(let n=0;n<N;n++){
      const yn = a*p1 - b*p2 + g*force[n];
      p2=p1; p1=yn; out[n]+=yn;
    }
  }
  return {out, nb};
}

function benchB(nBubbles){ // one ringing 2-pole per bubble, culled at -60 dB
  const out = new Float32Array(N);
  const rmin=0.00015, rmax=0.015;
  for(let i=0;i<nBubbles;i++){
    const r = rmin*Math.pow(rmax/rmin, Math.random());
    const f = 3.0/r, d = 0.13/r + 0.0072*Math.pow(r,-1.5);
    const R=Math.exp(-d/SR), th=2*Math.PI*f/SR;
    const a=2*R*Math.cos(th), b=R*R;
    const g=17.2133*Math.pow(r,1.5)*Math.pow(Math.random(),10);
    let start=(Math.random()*(N-1))|0;
    let len=Math.min(N-start, Math.ceil(7/d*SR)); // ~ -60 dB
    let p1=g*R*Math.sin(th), p2=0;
    out[start]+=p1;
    for(let n=1;n<len;n++){
      const yn=a*p1-b*p2; p2=p1; p1=yn; out[start+n]+=yn;
    }
  }
  return out;
}

for (const bins of [50]) {
  for (const rate of [2000, 10000, 100000]) {
    const t0=performance.now(); const {nb}=benchA(bins, rate); const t1=performance.now();
    console.log(`A  bins=${bins} rate=${rate}/s  bubbles=${nb}  ${DUR}s audio in ${(t1-t0).toFixed(1)} ms`);
  }
}
for (const nb of [10000, 30000, 100000]) {
  const t0=performance.now(); benchB(nb); const t1=performance.now();
  console.log(`B  perVoice bubbles=${nb}  ${DUR}s audio in ${(t1-t0).toFixed(1)} ms`);
}
