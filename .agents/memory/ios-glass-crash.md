---
name: iOS Native Crash — expo-glass-effect
description: expo-glass-effect causes EXC_BAD_ACCESS SIGSEGV on iOS 26 beta during native view registration at startup
---

## Rule
Never use `expo-glass-effect` in this project. Use `expo-blur` (BlurView) for all tab bar and bottom bar backgrounds on iOS.

**Why:**
On iOS 26.5.1 beta (iPhone OS 26, device iPhone18,2), `expo-glass-effect` v56.0.4
caused a fatal native crash:
- Exception: `EXC_BAD_ACCESS (SIGSEGV)` at null address `0x0000000000000000`
- Triggered by Thread 9 (ExpoModulesJSI JavaScriptPromise destructor)
- Thread 0 stack: `AppContext.registerNativeViews()` → `ViewModuleWrapper.createViewModuleWrapperClass()` → `ViewModuleWrapper.name()` → null pointer in Swift string interpolation

The crash happens **before JS runs** — during native module registration at app startup.
No JS ErrorBoundary or ErrorUtils.setGlobalHandler can catch it.
The module registers `GlassView` as a Fabric native view; on iOS 26 beta, its
`name()` accessor dereferences nil, causing SIGSEGV.

**The `isGlassEffectAPIAvailable()` guard does NOT save us:** the expo-glass-effect docs added `isGlassEffectAPIAvailable()` (a JS runtime check) for iOS 26 beta. It is useless here because our crash is at *native module registration at startup, before JS runs* — a JS-level guard can't prevent it. Bundled version is still ~56.0.4 (the version that crashed). Do not reintroduce the package on the strength of that guard.

**How to apply:**
- `expo-glass-effect` is removed from `package.json`
- All files set `const GlassViewComp: any = null` (existing View fallbacks used)
- Tab bar: `BlurView` with `tint="systemChromeMaterial"` (official expo-blur)
- If iOS 26 Liquid Glass is needed in future, wait for a stable release of
  `expo-glass-effect` that handles iOS 26 beta compatibility
