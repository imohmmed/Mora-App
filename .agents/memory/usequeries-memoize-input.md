---
name: useQueries needs a memoized input array
description: Why a non-memoized queries array passed to React Query useQueries causes an infinite render loop that crashes only on native
---

## Rule
Always pass a **memoized** `queries` array to `@tanstack/react-query`'s `useQueries`. Memoize any
array you spread from a `Set`/`Map` first, then memoize the mapped `queries` off that.

```ts
const ids = useMemo(() => [...idSet], [idSet]);          // idSet identity must be stable
const queries = useMemo(
  () => ids.map((id) => ({ queryKey: ["product", id], queryFn: () => fetchProduct(id), staleTime: 60_000 })),
  [ids]
);
const results = useQueries({ queries });
```

**Why:** `useQueries` is built on `useSyncExternalStore`. If you build the `queries` array inline
each render (e.g. `useQueries({ queries: [...set].map(...) })`), `getSnapshot` returns a fresh
reference every render → React keeps re-rendering → "Maximum update depth exceeded." The web
reconciler tolerates/recovers from this, but a **production native (iOS) build treats it as fatal**,
so the bug looks like "works on the website, crashes only in the app."

**How to apply:**
- Any `useQueries` whose input derives from a Set/Map/filtered list must memoize both the
  intermediate array and the final `queries` array.
- The dependency (e.g. the Set) must itself have stable identity — context providers should update
  it immutably (`new Set(prev)`) so it only changes on real mutations.
- Symptom signature to recognize: infinite-loop error that reproduces ONLY in the native build,
  never on Expo web.
