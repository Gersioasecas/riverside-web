#!/usr/bin/env bash
# SOLO LA PRIMERA VEZ: crea el repo en GitHub, lo empuja y enciende Pages.
# Después de esto, publicar es siempre ./scripts/publicar.sh "mensaje"
set -euo pipefail
cd "$(dirname "$0")/.."

REPO="Gersioasecas/riverside-web"
TOKEN="${GH_TOKEN:-$(security find-internet-password -s github.com -w 2>/dev/null || true)}"
[ -n "$TOKEN" ] || { echo "❌ sin token. Autoriza el llavero o exporta GH_TOKEN."; exit 1; }
API=(curl -sS --max-time 30 -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github+json")

echo "▸ 1/4 creando el repositorio"
"${API[@]}" -X POST https://api.github.com/user/repos -d '{
  "name":"riverside-web",
  "description":"Sitio de Riverside Chachalacas — hotel, glamping, casa y restaurante a la orilla del río, en Chachalacas, Veracruz.",
  "private":false,"has_issues":false,"has_wiki":false,"has_projects":false,
  "homepage":"https://riversidechachalacas.com.mx"}' \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print('  ',d.get('full_name') or d.get('message'))"

echo "▸ 2/4 empujando main"
git push "https://Gersioasecas:${TOKEN}@github.com/${REPO}.git" main

echo "▸ 3/4 encendiendo Pages (origen: GitHub Actions)"
"${API[@]}" -X POST "https://api.github.com/repos/${REPO}/pages" \
  -d '{"build_type":"workflow"}' \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print('  ',d.get('html_url') or d.get('message'))" || true

echo "▸ 4/4 esperando el primer despliegue"
for i in $(seq 1 30); do
  EST=$("${API[@]}" "https://api.github.com/repos/${REPO}/pages" | python3 -c "import json,sys;print(json.load(sys.stdin).get('status','?'))" 2>/dev/null || echo "?")
  printf "\r   estado: %-12s (%ds)" "$EST" $((i*10))
  [ "$EST" = "built" ] && break
  sleep 10
done
echo
echo
echo "✅ Listo. Verifica AQUÍ antes de tocar el DNS:"
echo "   https://gersioasecas.github.io/riverside-web/"
echo "   https://github.com/${REPO}/actions"
echo
echo "Cuando eso cargue bien, el paso del DNS está en docs/DOMINIO-Y-DNS.md"
