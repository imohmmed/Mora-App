---
name: Favorite heart convention
description: How favorited/wishlisted state is rendered across the Mora mobile app
---

# Favorite (wishlist) heart convention

When an item is favorited/wishlisted, render a **filled** heart in brand blue
`#0274C1` using `Ionicons name="heart"`. When not favorited, render
`Ionicons name="heart-outline"` in the surface's default foreground color
(e.g. `#1A1A1A` on light cards, `#FFF` over images/glass).

**Why:** Product owner explicitly wanted favorites to read as on-brand blue, not
the old red (`#E53935`) outline-only Feather heart. Feather's `heart` is
outline-only and cannot show a filled state, which is why we use Ionicons.

**How to apply:** Any new favorite/wishlist toggle must use this pattern. The
wishlist state itself comes from `useWishlist()` (`isWishlisted`/`toggle`) in
`context/WishlistContext.tsx`. Note: header nav hearts (HomeHeader) that merely
link to the wishlist screen are NOT favorite toggles — leave those as-is.

The shared `components/QuickAddSheet.tsx` (used by home, search, collection,
wishlist, and related-products on product detail) owns its own favorite button
via `useWishlist()` and keeps the `{visible, product, onClose, onConfirm}`
contract, so callers don't change when its layout evolves.
