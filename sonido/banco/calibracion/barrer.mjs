/* barrido de parámetros de v3: inyecta perillas, renderiza K semillas, mide */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
const BASE = process.env.HOME + '/Developer/riverside-web/sonido/variantes/v3-lejano.js';
const BANCO = process.env.HOME + '/Developer/riverside-web/sonido/banco';
const casos = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const K = Number(process.argv[3] || 2);
const SEG = Number(process.argv[4] || 40);
mkdirSync('/tmp/mar-cal/sw', { recursive: true });
const fuente = readFileSync(BASE, 'utf8');
const wavs = [];
for (const c of casos) {
  let js = fuente;
  for (const [k, v] of Object.entries(c.perillas)) {
    const re = new RegExp(`(const\\s+${k}\\s*=\\s*)([^;]+)(;)`);
    if (!re.test(js)) { console.error('perilla no encontrada:', k); process.exit(1); }
    js = js.replace(re, `$1${JSON.stringify(v)}$3`);
  }
  const f = `/tmp/mar-cal/sw/${c.nom}.js`;
  writeFileSync(f, js);
  // pase 1: medir el pico y renormalizar a 0.85 para que todo sea comparable
  const sonda = `/tmp/mar-cal/sw/${c.nom}__sonda.wav`;
  const sal = execSync(`node render.mjs ${f} ${sonda} 20`, { cwd: BANCO }).toString();
  const pico = Number((sal.match(/pico ([0-9.]+)/) || [])[1] || 1);
  const mBase = Number((js.match(/const\s+MAESTRO\s*=\s*([0-9.]+)/) || [])[1]);
  const mNuevo = mBase;
  writeFileSync(f, js.replace(/(const\s+MAESTRO\s*=\s*)([^;]+)(;)/, `$1${mNuevo}$3`));
  for (let s = 1; s <= K; s++) {
    const w = `/tmp/mar-cal/sw/${c.nom}__${s}.wav`;
    execSync(`node render.mjs ${f} ${w} ${SEG}`, { cwd: BANCO, stdio: 'pipe' });
    wavs.push(w);
  }
}
console.log(wavs.join('\n'));
