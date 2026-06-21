#!/bin/bash
set -e

NGINX_CONF="/etc/nginx/sites-available/elitelabs"
BACKUP="${NGINX_CONF}.bak"

if [ ! -f "$BACKUP" ]; then
  echo "No hay backup en $BACKUP — mantenimiento no está activo."
  exit 1
fi

cp "$BACKUP" "$NGINX_CONF"
rm "$BACKUP"

nginx -t && systemctl reload nginx
echo "Mantenimiento DESACTIVADO."
