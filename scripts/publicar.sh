#!/usr/bin/env bash
# Publica el sitio. Un solo comando.
#   ./scripts/publicar.sh "qué cambió"
#
# CÓMO FUNCIONA: se empuja el repo completo a main y una acción de GitHub
# despliega SOLO codigo-puro/ en Pages. No hay espejo ni rama aparte.
# CREDENCIAL: el token sale del llavero de macOS y solo se usa en el push.
set -euo pipefail
cd "$(dirname "$0")/.."

MSG="${1:-actualiza el sitio}"
REPO="Gersioasecas/riverside-web"

# --- guardas: lo que NUNCA debe salir roto -----------------------------------
[ -f codigo-puro/CNAME ] || { echo "❌ falta codigo-puro/CNAME — el dominio se caería"; exit 1; }
grep -q "riversidechachalacas.com.mx" codigo-puro/CNAME || { echo "❌ CNAME con dominio equivocado"; exit 1; }
[ -f codigo-puro/index.html ] || { echo "❌ falta index.html"; exit 1; }

if command -v sloplint >/dev/null 2>&1; then
  echo "▸ sloplint"
  sloplint codigo-puro/index.html || { echo "❌ sloplint encontró algo — revísalo antes de publicar"; exit 1; }
fi

python3 - <<'PY'
import json, re
s = open('codigo-puro/index.html', encoding='utf-8').read()
m = re.search(r'<script type="application/ld\+json">(.*?)</script>', s, re.S)
if m:
    json.loads(m.group(1)); print('▸ JSON-LD válido')
PY

RAMA=$(git rev-parse --abbrev-ref HEAD)
if [ "$RAMA" != "main" ]; then
  echo "⚠️  estás en '$RAMA'. Solo se publica desde main."
  echo "    git checkout main && git merge $RAMA"
  exit 1
fi

git add -A
if git diff --cached --quiet; then echo "▸ nada nuevo que subir"; else git commit -m "$MSG"; fi

TOKEN="$(security find-internet-password -s github.com -w 2>/dev/null || true)"
[ -n "$TOKEN" ] || { echo "❌ no hay token de github.com en el llavero"; exit 1; }

git push "https://Gersioasecas:${TOKEN}@github.com/${REPO}.git" main
unset TOKEN

echo
echo "✅ empujado. La acción de GitHub publica en ~1-2 min."
echo "   Estado: https://github.com/${REPO}/actions"
echo "   Sitio:  https://riversidechachalacas.com.mx/"
