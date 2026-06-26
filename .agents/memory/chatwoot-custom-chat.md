---
name: Chatwoot custom in-app chat + admin management
description: How Mora's in-app chat talks to self-hosted Chatwoot directly, and how Admin manages canned responses + automation rules via an api-server proxy
---

## Architecture (no widget)
The in-app chat (native + web) is fully custom UI talking **directly** to Chatwoot's
**public** API — the Chatwoot JS widget / WebView / iframe was removed.
- Public API base: `https://chat.moramoda.tech/public/api/v1/inboxes/{identifier}`
- The API-channel inbox identifier is `1GvEp657KMDmNTGUYxihf5gh` (inbox_id=2, "Mora App").
- CORS is open (`*`) so app + web call it browser-side with no proxy.
- `message_type`: 0=customer(me), 1=agent, 2=activity, 3=template.
- Client code: `artifacts/mora/lib/chatwoot.ts` (ensureSession → contact+conversation,
  list/send/markSeen, AsyncStorage persistence + 404 recovery) and the screen
  `artifacts/mora/app/(tabs)/(chat)/chat.tsx`.

**Why public API not widget:** full control of theme/animations/keyboard, and it works
identically on native and web. The public API only exists for inboxes whose channel is
`Channel::Api` — a normal website-widget inbox has NO public endpoints (you'd get 404).
So the inbox MUST be created as an API channel.

## Admin management (canned responses + automation rules)
Admin parity with the Chatwoot dashboard is built on the **Application** API (not public),
which needs an agent `api_access_token`. That token is secret, so it is **proxied** by the
api-server, never exposed to the browser.
- Proxy: `artifacts/api-server/src/routes/chat-admin.ts`, mounted at `/api/admin/chat/*`
  behind `requireAdmin`. Returns 503 unless ALL of `CHATWOOT_URL`,
  `CHATWOOT_ACCOUNT_ID`, `CHATWOOT_API_TOKEN` are set (don't default the account id —
  defaulting silently routes to the wrong account).
- Application API base: `${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/...`, auth via
  `api_access_token` request header.
- Payload shapes: canned = `{short_code, content}`; automation =
  `{name, description, event_name, active, conditions:[{attribute_key, filter_operator,
  query_operator, values[]}], actions:[{action_name, action_params[]}]}`.
  `query_operator` is `and`/`or` for every condition except the LAST, which must be `null`.
- Ref lists for the rule builder: `agents`/`teams` come back as a bare array; `labels`/
  `inboxes` come wrapped in `{payload:[...]}` — handle both. Label condition/action VALUES
  use the label **title/name string**, not its numeric id; agents/teams/inboxes use numeric id.
- Admin UI: `artifacts/admin/src/pages/chat/{canned-responses,automation}.tsx`, constants
  in `lib/automation-constants.ts`, i18n in `i18n/dict/chat.ts`, nav under section
  `nav.section.support` (permission `content`), routes `/chat/canned-responses` + `/chat/automation`.

## The nginx gotcha that cost the most time
Chatwoot's Application API authenticates with the `api_access_token` **header**, which
contains an underscore. nginx **strips headers with underscores by default**, so every
proxied Application API call returned **401**. Fix: add `underscores_in_headers on;` to the
443 server block in `/etc/nginx/sites-available/chatwoot`, then reload nginx. (The public
API was unaffected because it needs no auth header.)

## Generating the agent token
`sudo -u chatwoot bash -lc "cd /home/chatwoot/chatwoot && RAILS_ENV=production bundle exec
rails runner /tmp/x.rb"` where the script does `User.find_by(email: ...).access_token.token`.
Store it in `/var/www/mora/artifacts/api-server/.env` as CHATWOOT_URL / CHATWOOT_ACCOUNT_ID /
CHATWOOT_API_TOKEN. It is loaded into the pm2 process env; a plain `pm2 restart mora-api`
(NOT `--update-env`) preserves it along with the other secrets.
