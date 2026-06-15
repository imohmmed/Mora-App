/**
 * useNativeReady
 *
 * Returns false on the very first render, then true from the second render
 * onwards (after useEffect fires). This defers SwiftUI / native-bridge
 * components by one render cycle so the Expo/SwiftUI host has time to
 * initialise before we try to mount native views.
 *
 * Background: on iOS 26, expo-glass-effect, @expo/ui SwiftUI components, and
 * expo-router/unstable-native-tabs all crash when rendered before the SwiftUI
 * host initialises. The host initialises asynchronously after the first JS
 * render, so waiting one cycle (useEffect) is enough.
 */
import { useEffect, useRef, useState } from "react";

/** Module-level flag — flips to true once any component has mounted. */
let globalBridgeReady = false;

export function useNativeReady(): boolean {
  // Initialise from the shared flag so that if ANY prior component already
  // caused a mount, subsequent components start ready immediately.
  const [ready, setReady] = useState(globalBridgeReady);
  const set = useRef(false);

  useEffect(() => {
    if (!set.current) {
      set.current = true;
      globalBridgeReady = true;
      if (!ready) setReady(true);
    }
  }, [ready]);

  return ready;
}
