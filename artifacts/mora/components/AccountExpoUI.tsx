// Web/Android fallback stub.
// The real Expo UI (SwiftUI) implementation lives in AccountExpoUI.ios.tsx and
// is only bundled on iOS. On Android/web the AccountMain classic layout is shown
// instead — this stub exists only to satisfy the TypeScript import.

export interface AccountExpoUIProps {
  user: { firstName: string; lastName: string; email: string } | null;
  wishlistCount: number;
  onLogout: () => void;
  onOrdersPress: () => void;
  onWishlistPress: () => void;
}

export function AccountExpoUI(_props: AccountExpoUIProps) {
  return null;
}
