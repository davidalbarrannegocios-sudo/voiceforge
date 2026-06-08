#!/bin/bash
set -e
cd /var/www/elitelabs
git checkout -- package.json package-lock.json
git pull origin main
npm install
cp -r public .next/standalone/public
pm2 restart elitelabs --update-env
echo "Deploy completado $(date)"
