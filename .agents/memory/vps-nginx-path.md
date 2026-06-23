---
name: VPS nginx serve path
description: The correct directory for Expo web dist deployment on the VPS, and cache headers setup
---

## Rule
Expo web builds must be deployed to `/var/www/mora/artifacts/mora/dist` on the VPS (not `/var/www/mora-web/`).

**Why:** The nginx config at `/etc/nginx/sites-available/mora` has `root /var/www/mora/artifacts/mora/dist`. Deploying to `/var/www/mora-web/` does nothing — nginx never reads from there.

## Building the Expo web bundle (moramoda.tech)
The website is the Expo **web export**, NOT the `pnpm build` script (that one — `scripts/build.js` — produces Expo Go ios/android bundles for the landing page, not web). Build the website with:
```bash
cd artifacts/mora && rm -rf dist && timeout 110 pnpm exec expo export --platform web --output-dir dist
```
Base path is `/` (no `experiments.baseUrl` in app.json); assets resolve at `/_expo/...` matching nginx root. **The export actually finishes in <110s — run it in the FOREGROUND.** Do NOT background it with `nohup ... &` or `setsid ... & disown`: the export dies silently the moment the launching shell exits (log stops after the "Expo Autolinking module resolution enabled" line, dist stays empty). The progress spinner doesn't flush to a piped log, so a stalled-looking log ≠ stuck. Also note `pgrep -f "expo export"` gives false positives by matching your own polling commands — check `ps -eo pid,cmd | rg expo/bin` and whether `dist` is filling instead.

## admin build needs BOTH PORT and BASE_PATH
`vite.config.ts` for admin throws "PORT environment variable is required" at config load, even for `build`. Build the admin SPA with `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/admin run build` → outputs to `dist/public`. Store build needs no vars (base defaults to `/store/`). Same codebase as the mobile app, so app feature changes land on the website after a rebuild+redeploy.

## How to apply
Deploy command (credentials come from env/secret, NEVER hardcode them — the VPS root password must not live in the repo):
```bash
cd artifacts/mora && tar -czf /tmp/mora-web.tar.gz -C dist .
scp /tmp/mora-web.tar.gz root@<VPS_HOST>:/tmp/
ssh root@<VPS_HOST> 'rm -rf /var/www/mora/artifacts/mora/dist/* && tar -xzf /tmp/mora-web.tar.gz -C /var/www/mora/artifacts/mora/dist/'
```

## Cache headers
Added `Cache-Control: no-store` for `*.html` files in nginx so Cloudflare never caches the SPA entry point. JS bundles are hash-named so they cache fine.

## Verification
```bash
ssh root@VPS 'curl -sk --resolve moramoda.tech:443:127.0.0.1 https://moramoda.tech/ | grep -o "entry-[a-f0-9]*\.js"'
```
The returned hash should match the local `dist/_expo/static/js/web/` filename.

## /var/www/mora is NOT a git repo — deploy by scp'ing built dist
There is no remote/branch on the VPS checkout; you cannot `git pull` there. Build locally, tar the dist, scp, extract.
nginx routes (`/etc/nginx/sites-available/mora`), all `/api/` → `127.0.0.1:3001`:
- `moramoda.tech` / `app.moramoda.tech` → root `artifacts/mora/dist` (Expo web)
- `admin.moramoda.tech` → root `artifacts/admin/dist/public` (admin SPA, build with `PORT=<any> BASE_PATH=/`)
- `expo.moramoda.tech` → proxy to dev server :8081

## API server persistence (the data-reset bug)
The API reads ONLY `process.env.PORT`; without `DATABASE_PATH` db.ts falls back to in-memory SQLite → **all data resets on every pm2 restart**. Fix is environment, not code:
```bash
# build locally (externalizes better-sqlite3 — must exist in VPS node_modules, it does)
pnpm --filter @workspace/api-server run build   # -> dist/index.mjs + pino workers
# scp dist, then on VPS:
mkdir -p /var/www/mora/data
PORT=3001 NODE_ENV=production DATABASE_PATH=/var/www/mora/data/mora.db pm2 restart mora-api --update-env
pm2 save   # REQUIRED — persists env across reboots; there is NO ecosystem file
```
**Why:** seed runs only when products table is empty, so a real file DB keeps admin edits. Verified: settings edit survives `pm2 restart`. mora.db + mora.db-wal/-shm appearing in `/var/www/mora/data` confirms file mode.

## pm2 restart drops env vars unless ALL are re-supplied (admin-login outage cause)
The mora-api process env is NOT in any ecosystem file. A plain `pm2 restart mora-api --update-env` takes env from the CURRENT shell, so any var not present in that shell gets dropped. A restart done from a bare shell silently dropped `GOOGLE_ADMIN_CLIENT_ID` and `ADMIN_JWT_SECRET`, which broke admin Google login: `/admin/auth/google` verifies the Google idToken with `audience: GOOGLE_ADMIN_CLIENT_ID` — when undefined, verification fails so no admin can get a fresh JWT; once the owner's 7-day token expired, every `/admin/*` call 401'd → "can't publish products" + admin "hangs/slow loading" (SPA spinning on 401s). Server itself is healthy (admin endpoints 4-6ms, create works with a valid token).

**Fix pattern:** before restarting, re-export EVERY needed var in one shell, capturing secrets without printing them, e.g. `WAYL_API_KEY="$(pm2 env 2 | sed -n 's/^WAYL_API_KEY: //p')"`, plus DATABASE_PATH, PORT=3001, NODE_ENV=production, GOOGLE_ADMIN_CLIENT_ID (public, recoverable from the admin JS bundle via grep `apps.googleusercontent.com`), ADMIN_JWT_SECRET (generate random; old tokens die but they're expired anyway). Then `pm2 restart mora-api --update-env && pm2 save`. Verify with `pm2 env 2`. **Why:** missing these = production admin lockout. **The real durable fix is a pm2 ecosystem file or systemd EnvironmentFile so env survives any restart.**

## API code-only redeploy (preserve env — do NOT use --update-env)
VPS host is `159.65.55.65` (root, password in `VPS_PASSWORD` secret). pm2 process `mora-api`
(id 2, cluster) runs `/var/www/mora/artifacts/api-server/dist/index.mjs`.
To ship a code change WITHOUT touching env: build locally, scp the dist, extract over
`/var/www/mora/artifacts/api-server/dist`, then `pm2 restart mora-api` **without** `--update-env`.
**Why:** plain restart reuses the captured env (DATABASE_PATH + secrets stay intact); `--update-env`
would re-read the bare ssh shell and silently drop them → prod outage. Verify with a live curl of the
changed endpoint, not just pm2 status.
**Symptom this fixed:** prod stale until redeployed — `/store/products/related/:id` and
`/store/special-collections/:slug` returned products with NO `variants` key, so QuickAddSheet showed
no size/color chips and add-to-cart was impossible. Repo code was already correct; only the VPS was old.

## Installing native npm packages (e.g. sharp) on VPS
The VPS api-server's `package.json` has `workspace:*` deps — `npm install` there fails with EUNSUPPORTEDPROTOCOL. Workaround: `mkdir /tmp/pkg-tmp && cd /tmp/pkg-tmp && npm init -y && npm install sharp multer` then `cp -r node_modules/sharp node_modules/@img node_modules/detect-libc node_modules/multer node_modules/busboy ... /var/www/mora/artifacts/api-server/node_modules/`. Copy ALL transitive deps (sharp needs: `@img/sharp-linux-x64`, `@img/sharp-libvips-linux-x64`, `@img/colour`, `detect-libc`, `semver`; multer needs: `busboy`, `streamsearch`).

## SECURITY: admin auth is a hardcoded token in the PUBLIC bundle
Admin sends a hardcoded `Authorization: Bearer <static-token>` (setAuthTokenGetter in `artifacts/admin/src/main.tsx`, AUTH_HEADER in `content/index.tsx`); requireAdmin checks that exact string. It ships inside the JS served at `admin.moramoda.tech`, so anyone can extract it and write/delete now-persistent prod data. **Until a real admin_users + bcrypt + sessions auth lands, production has an open write hole.** Also: the VPS root password was committed in git history earlier — rotation is the only fix.

## store.moramoda.tech is deployed but NOT publicly reachable (DNS + cert gap)
nginx has a correct `server_name store.moramoda.tech` block (root `/var/www/mora/artifacts/store/dist/public`) and it serves 200 locally via `curl -H "Host: store.moramoda.tech" http://127.0.0.1/`. BUT the hostname has **no public DNS A record** (does not resolve) and **no Let's Encrypt cert** (`/etc/letsencrypt/live/` has moramoda.tech, chat, expo — no store). So public `https://store.moramoda.tech/` returns curl 000. **This is infra setup the user owns** (add DNS record at registrar + `certbot --nginx -d store.moramoda.tech`), NOT a deploy/code bug. Store dist deploys fine; base path is `/store/` (vite.config default), assets referenced as `/store/assets/...`.
