---
name: Admin panel i18n + redesign
description: How the Mora admin (artifacts/admin) does bilingual AR-RTL/EN-LTR i18n, its shared page primitives, and the gotchas when redesigning its ~28 pages.
---

# Admin bilingual i18n + redesign

Arabic RTL is the **default**, English LTR is a toggle. `LanguageContext` (useT hook) flips `document.dir`/`lang` and persists to localStorage. `t(key)` resolves from per-domain dict files under `src/i18n/dict/` (common.ts + one per cluster: orders, products, customers, discounts, content, notifications, settings, analytics, collections, login...). Shared shell/layout strings live in `dict/common.ts`.

**Use logical CSS props for RTL**: `ms/me/ps/pe/start/end/text-start`, and `rtl:rotate-180` on directional icons (back arrows, chevrons, collapse). Never use left/right. Charts/numbers stay LTR even in Arabic.

**Shared primitives** in `src/components/ui/page-primitives.tsx`: `PageContainer` (max-w + responsive padding + space-y) and `PageHeader` (title + actions slots). Every page should use these instead of ad-hoc `<div className="p-4 md:p-8">` wrappers. `PageContainer` className merges via tailwind-merge so you can override max-w (e.g. `className="max-w-2xl pb-24"`).

**Why:** consistency across 28 pages and correct RTL behavior. **How to apply:** when adding/editing an admin page, wrap in PageContainer/PageHeader, pull every user-facing string through `t()`, add the key to the right dict file (shell strings → common.ts), and test both locales.

## Delegation pattern that worked
Split the redesign by cluster; give each subagent ownership of ONE dict file + its own page files so there are **no write conflicts** on shared files. Main agent owns `common.ts`. Pre-converted clusters re-run fast.

## Build / verify / deploy
- tsc is permanently noisy here: api-client-react generated code fails strict `tsc --build`, so dist never emits → cascading TS6305/implicit-any. IGNORE tsc; **`vite build` (esbuild) is the real compile signal.**
- Build: `PORT=3002 BASE_PATH=/ NODE_ENV=production VITE_GOOGLE_CLIENT_ID="<client id>" pnpm --filter @workspace/admin build` (only harmless Radix sourcemap warnings expected).
- Deploy: `scp -r artifacts/admin/dist/public/. root@<vps>:/var/www/mora/artifacts/admin/dist/public/` (ship the built dist, not git).
- top-bar route-title lookup must strip query/hash first (`location.split("?")[0].split("#")[0]`) or routes like `/content?tab=menus` fall back to the wrong title.

## Viewing authenticated UI in preview
Google OAuth fails inside the preview iframe. AdminAuthContext has a DEV bypass gated by `import.meta.env.DEV` reading `VITE_DEV_ADMIN_TOKEN` from `artifacts/admin/.env.local`. Local SQLite has sample data.
