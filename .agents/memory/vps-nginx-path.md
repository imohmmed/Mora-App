---
name: VPS nginx serve path
description: The correct directory for Expo web dist deployment on the VPS, and cache headers setup
---

## Rule
Expo web builds must be deployed to `/var/www/mora/artifacts/mora/dist` on the VPS (not `/var/www/mora-web/`).

**Why:** The nginx config at `/etc/nginx/sites-available/mora` has `root /var/www/mora/artifacts/mora/dist`. Deploying to `/var/www/mora-web/` does nothing — nginx never reads from there.

## How to apply
Deploy command:
```bash
cd artifacts/mora && tar -czf /tmp/mora-web.tar.gz -C dist .
sshpass -p 'ZVwas511mm' scp /tmp/mora-web.tar.gz root@159.65.55.65:/tmp/
ssh root@159.65.55.65 'rm -rf /var/www/mora/artifacts/mora/dist/* && tar -xzf /tmp/mora-web.tar.gz -C /var/www/mora/artifacts/mora/dist/'
```

## Cache headers
Added `Cache-Control: no-store` for `*.html` files in nginx so Cloudflare never caches the SPA entry point. JS bundles are hash-named so they cache fine.

## Verification
```bash
ssh root@VPS 'curl -sk --resolve moramoda.tech:443:127.0.0.1 https://moramoda.tech/ | grep -o "entry-[a-f0-9]*\.js"'
```
The returned hash should match the local `dist/_expo/static/js/web/` filename.
