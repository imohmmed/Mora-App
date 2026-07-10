import { useRef, useCallback } from "react";
import type { ScrollView, FlatList } from "react-native";

// Shared helper for horizontal ScrollView/FlatList carousels so that, in
// Arabic, the FIRST item in the data ends up visually on the RIGHT and
// swiping right-to-left reveals the next items — matching RTL reading order.
//
// Approach: keep item order as-is but flip contentContainerStyle to
// "row-reverse" (so item 0 lands at the right edge of the content box), then
// jump the scroll position to the end once content lays out. This avoids the
// image/text mirroring caused by FlatList's `inverted` prop or `scaleX: -1`
// transforms.
//
// IMPORTANT: when the row's items don't fill the full screen width (e.g. only
// 1-2 items), the ScrollView's content box shrink-wraps to its natural
// (smaller) size and sits flush at the LEFT of the viewport — row-reverse
// only reorders items *inside* that box, it does not push the box itself to
// the right edge. `rtlContentStyle` also adds `flexGrow: 1` +
// `justifyContent: "flex-end"` so short rows get right-aligned too.
export function useRtlScrollToEnd(isAr: boolean) {
  const ref = useRef<ScrollView | FlatList<any>>(null);
  const done = useRef(false);

  const onContentSizeChange = useCallback(
    (w: number) => {
      if (!isAr || done.current || w <= 0) return;
      done.current = true;
      requestAnimationFrame(() => {
        (ref.current as any)?.scrollToEnd?.({ animated: false });
      });
    },
    [isAr]
  );

  return { ref, onContentSizeChange };
}

export function rtlContentStyle(isAr: boolean) {
  return isAr
    ? ({ flexDirection: "row-reverse", flexGrow: 1, justifyContent: "flex-end" } as const)
    : undefined;
}
