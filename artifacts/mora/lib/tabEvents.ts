/**
 * tabEvents — lightweight cross-platform event bus for tab-bar interactions.
 * Replaces window.dispatchEvent (web-only) with a universal solution.
 *
 * Usage:
 *   TabEvents.emit(TAB_HOME_SCROLL_TOP)   // from tab bar
 *   const off = TabEvents.on(TAB_HOME_SCROLL_TOP, () => scrollRef.current?.scrollToOffset({offset:0}))
 *   useEffect(() => off, [])              // cleanup
 */

type Listener = () => void;
const _map: Record<string, Listener[]> = {};

export const TabEvents = {
  emit(event: string) {
    (_map[event] ?? []).forEach((fn) => fn());
  },
  on(event: string, fn: Listener): () => void {
    if (!_map[event]) _map[event] = [];
    _map[event].push(fn);
    return () => {
      _map[event] = (_map[event] ?? []).filter((l) => l !== fn);
    };
  },
};

export const TAB_HOME_SCROLL_TOP = "tab:home:scroll-top";
export const TAB_SEARCH_FOCUS    = "tab:search:focus";
