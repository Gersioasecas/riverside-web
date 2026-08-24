#!/usr/bin/env bash
# Espera a que GitHub emita el certificado del dominio y entonces fuerza HTTPS.
# GitHub lo emite solo tras verificar el DNS; suele tardar de minutos a una hora.
set -uo pipefail
REPO="Gersioasecas/riverside-web"
LOG=~/Developer/riverside-web/docs/https.log
T="$(security find-internet-password -s github.com -w 2>/dev/null)"
[ -n "$T" ] || { echo "sin token" | tee -a "$LOG"; exit 1; }

for i in $(seq 1 90); do   # hasta 90 min
  EST=$(curl -sS --max-time 20 -H "Authorization: token $T" \
        "https://api.github.com/repos/${REPO}/pages" \
        | python3 -c "import json,sys;print((json.load(sys.stdin).get('https_certificate') or {}).get('state','none'))" 2>/dev/null)
  echo "$(date '+%H:%M:%S') cert=$EST" >> "$LOG"
  if [ "$EST" = "approved" ]; then
    curl -sS --max-time 30 -X PUT -H "Authorization: token $T" -H "Accept: application/vnd.github+json" \
      "https://api.github.com/repos/${REPO}/pages" -d '{"https_enforced":true}' >/dev/null
    sleep 20
    COD=$(curl -sS --max-time 25 -o /dev/null -w "%{http_code}" https://riversidechachalacas.com.mx)
    echo "$(date '+%H:%M:%S') HTTPS forzado · https responde $COD" >> "$LOG"
    command -v aviso-autonomia >/dev/null 2>&1 && \
      aviso-autonomia fin "riversidechachalacas.com.mx" "HTTPS activo y forzado. El sitio nuevo está completo." || true
    exit 0
  fi
  sleep 60
done
echo "$(date '+%H:%M:%S') se agotó la espera: el certificado sigue sin emitirse" >> "$LOG"
command -v aviso-autonomia >/dev/null 2>&1 && \
  aviso-autonomia alerta "riversidechachalacas.com.mx" "El certificado HTTPS no se emitió en 90 min. Revisar en Settings > Pages." || true
