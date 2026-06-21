#!/bin/bash
set -e

NGINX_CONF="/etc/nginx/sites-available/elitelabs"
BACKUP="${NGINX_CONF}.bak"
MAINTENANCE_HTML="/var/www/elitelabs/maintenance.html"

if [ -f "$BACKUP" ]; then
  echo "Ya existe un backup en $BACKUP — mantenimiento posiblemente ya activo."
  exit 1
fi

cp "$NGINX_CONF" "$BACKUP"

cat > "$NGINX_CONF" << 'EOF'
server {
    server_name www.elitelabs.es elitelabs.es;

    location / {
        root /var/www/elitelabs;
        try_files /maintenance.html =503;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/elitelabs.es/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/elitelabs.es/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}
server {
    if ($host = www.elitelabs.es) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    if ($host = elitelabs.es) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name www.elitelabs.es elitelabs.es;
    return 404; # managed by Certbot
}
EOF

nginx -t && systemctl reload nginx
echo "Mantenimiento ACTIVADO."
