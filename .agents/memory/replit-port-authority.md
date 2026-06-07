---
name: Replit port authority and artifact workflows
description: Why artifact workflows fail with DIDNT_OPEN_A_PORT and how to fix it
---

## The Rule
Replit's port authority only monitors ports that are **pre-registered in `.replit` [[ports]]**. If an artifact's `localPort` is not in that list, the workflow always times out with `DIDNT_OPEN_A_PORT` even if Vite/the server actually binds successfully.

**Why:** The port monitoring system watches OS-level port events only for ports it knows about in advance. Dynamic ports registered via `configureWorkflow(waitForPort:)` do NOT add entries to `.replit` [[ports]] in a way that the artifact workflow monitor respects.

**How to apply:** When creating a new artifact that needs a dev server:
1. Check which ports are currently registered in `.replit` [[ports]] (read the file).
2. Pick one that is NOT currently in use by another running artifact.
3. Set that port in the artifact's `artifact.toml` `localPort` and `services.env.PORT`.
4. The Mora project's registered ports are: 8080 (API), 8081 (mockup-sandbox/store), 23744 (admin), 26251 (Expo). All four are occupied when all workflows run simultaneously — the store displaced the mockup-sandbox on 8081.

**Cannot do:** Edit `.replit` directly (restricted). Use `configureWorkflow` alone to add new monitored ports for artifact workflows.
