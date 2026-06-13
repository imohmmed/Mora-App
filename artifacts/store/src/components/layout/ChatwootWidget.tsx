import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useStoreAuth } from "@/hooks/use-store-auth";

const TOKEN   = "WPeCyRzhWzff2TuFHRe27SaQ";
const BASE    = "https://chat.moramoda.tech";

declare global {
  interface Window {
    $chatwoot: {
      toggleNewConversation: () => void;
      toggle:               (state?: "open" | "close") => void;
      setColorScheme:       (scheme: "light" | "dark") => void;
      setUser:              (id: string, attrs: Record<string, string>) => void;
    };
    chatwootSettings: Record<string, unknown>;
    chatwootSDK:      { run: (opts: { websiteToken: string; baseUrl: string }) => void };
  }
}

export function ChatwootWidget() {
  const { user } = useStoreAuth();
  const [ready, setReady] = useState(false);
  const [dark,  setDark]  = useState(() =>
    document.documentElement.classList.contains("dark")
  );
  const identitySet = useRef(false);

  // ── Watch .dark class on <html> ──────────────────────────────────────────
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains("dark"))
    );
    obs.observe(document.documentElement, {
      attributes: true, attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  // ── Load Chatwoot SDK once ────────────────────────────────────────────────
  useEffect(() => {
    if (document.getElementById("cw-sdk")) return;

    window.chatwootSettings = {
      hideMessageBubble: true,
      position:  "right",
      locale:    "ar",
      darkMode:  document.documentElement.classList.contains("dark") ? "dark" : "light",
    };

    const s = document.createElement("script");
    s.id    = "cw-sdk";
    s.src   = `${BASE}/packs/js/sdk.js`;
    s.async = true;
    s.defer = true;
    s.onload = () =>
      window.chatwootSDK?.run({ websiteToken: TOKEN, baseUrl: BASE });

    document.head.appendChild(s);

    const onReady = () => setReady(true);
    window.addEventListener("chatwoot:ready", onReady, { once: true });
    return () => window.removeEventListener("chatwoot:ready", onReady);
  }, []);

  // ── Sync color scheme when dark changes ──────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    window.$chatwoot?.setColorScheme(dark ? "dark" : "light");
  }, [dark, ready]);

  // ── Set user identity once when both ready + user are available ──────────
  useEffect(() => {
    if (!ready || !user || identitySet.current) return;
    identitySet.current = true;
    window.$chatwoot?.setUser(user.id, {
      name:  `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      ...(user.phone ? { phone_number: user.phone } : {}),
    });
  }, [ready, user]);

  // ── Open new conversation directly (skips the landing screen) ────────────
  const handleClick = () => {
    if (!ready) return;
    window.$chatwoot?.toggleNewConversation();
  };

  return (
    <button
      onClick={handleClick}
      aria-label="تواصل مع الدعم"
      className={[
        "fixed bottom-6 right-6 z-50",
        "w-14 h-14 rounded-full",
        "bg-primary text-primary-foreground",
        "shadow-xl",
        "flex items-center justify-center",
        "transition-transform hover:scale-110 active:scale-95",
        ready ? "opacity-100" : "opacity-70 cursor-wait",
      ].join(" ")}
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  );
}
