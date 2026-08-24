#!/usr/bin/env bash
# Publica el sitio. Un solo comando.
#   ./scripts/publicar.sh "qué cambió"
set -euo pipefail
cd "$(dirname "$0")/.."

MSG="${1:-actualiza el sitio}"

# --- guardas: lo que NUNCA debe salir roto -----------------------------------
[ -f codigo-puro/CNAME ] || { echo "❌ falta codigo-puro/CNAME"; exit 1; }
grep -q "riversidechachalacas.com.mx" codigo-puro/CNAME || { echo "❌ CNAME equivocado"; exit 1; }
[ -f codigo-puro/index.html ] || { echo "❌ falta index.html"; exit 1; }

if command -v sloplint >/dev/null 2>&1; then
  echo "▸ sloplint"
  sloplint codigo-puro/index.html || { echo "❌ sloplint encontró algo — revísalo antes de publicar"; exit 1; }
fi

python3 - <<'PY'
import json, re, sys
s = open('codigo-puro/index.html', encoding='utf-8').read()
m = re.search(r'<script type="application/ld\+json">(.*?)</script>', s, re.S)
if m:
    json.loads(m.group(1))
    print('▸ JSON-LD válido')
PY

RAMA=$(git rev-parse --abbrev-ref HEAD)
if [ "$RAMA" != "main" ]; then
  echo "⚠️  estás en '$RAMA'. Solo se publica desde main."
  echo "    git checkout main && git merge $RAMA"
  exit 1
fi

git add -A
if git diff --cached --quiet; then
  echo "▸ nada que publicar"
else
  git commit -m "$MSG"
fi
git push origin main

echo
echo "✅ empujado. La acción de GitHub publica en ~1-2 min."
echo "   Estado:  gh run watch --repo \"\$(gh repo view --json nameWithOwner -q .nameWithOwner)\""
echo "   Sitio:   https://riversidechachalacas.com.mx/"
