// Web/Android fallback stub.
// The real Expo UI (SwiftUI) implementation lives in AccountExpoUI.ios.tsx and
// is only bundled on iOS. On other platforms account.tsx renders AccountClassic,
// so this component is never actually mounted — it exists only to satisfy the
// import on non-iOS bundles without pulling in the native @expo/ui modules.
export function AccountExpoUI() {
  return null;
}
