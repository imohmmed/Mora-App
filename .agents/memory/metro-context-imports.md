---
name: Metro Context Import Safety
description: Never import React Context objects directly in components — use the exported hooks instead to avoid circular dependency crashes.
---

## Rule
In Expo/Metro bundled apps, **never** `import { SomeContext } from "@/context/SomeContext"` and call `useContext(SomeContext)` directly inside a component.

Always import and use the exported hook instead:
```typescript
// ❌ CRASHES if circular dep exists — value read at module load time
import { AuthContext } from "@/context/AuthContext";
const auth = useContext(AuthContext); // AuthContext can be undefined

// ✅ Safe — hook accesses AuthContext at render time, after all modules loaded
import { useAuth } from "@/context/AuthContext";
const auth = useAuth();
```

**Why:** Metro bundler uses a CommonJS-like module system. If a circular import exists anywhere in the tree, the context object (`createContext()` return value) may be `undefined` when HomeHeader's module factory runs — but by the time hooks are *called* (render time), all modules are fully initialized.

**How to apply:** Audit every file that `import { SomeContext }` from a context file. Replace with the hook. Files that were affected: `HomeHeader.tsx`, `notifications.tsx`.

**Symptom:** `"undefined is not an object (evaluating 'n._currentValue')"` at React's `readContext` function — `n` (the context object) is undefined.
