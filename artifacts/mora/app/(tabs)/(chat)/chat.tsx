import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  Layout,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  ChatMessage,
  ChatSession,
  clearSession,
  ensureSession,
  isNotFound,
  listMessages,
  loadSession,
  markSeen,
  sendAttachment,
  sendMessage,
  PickedFile,
} from "@/lib/chatwoot";

const PRIMARY = "#0274C1";
const POLL_MS = 3500;

// ── i18n ──────────────────────────────────────────────────────────────────────
const STR = {
  en: {
    title: "Mora Support",
    subtitle: "Typically replies in a few minutes",
    welcome: "👋 Hi! How can we help you today?",
    hintOrders: "Track my order",
    hintProduct: "Product question",
    hintReturn: "Returns & refunds",
    formTitle: "Start a conversation",
    formSubtitle: "Tell us who you are and we'll be right with you.",
    name: "Your name",
    email: "Email (optional)",
    start: "Start chat",
    placeholder: "Write a message…",
    nameRequired: "Please enter your name",
    today: "Today",
    yesterday: "Yesterday",
    retry: "Couldn't connect. Tap to retry",
    sending: "Sending…",
    failed: "Failed — tap to resend",
  },
  ar: {
    title: "دعم مورا",
    subtitle: "نرد عادةً خلال دقائق",
    welcome: "👋 أهلاً! كيف نقدر نساعدك اليوم؟",
    hintOrders: "تتبّع طلبي",
    hintProduct: "استفسار عن منتج",
    hintReturn: "الإرجاع والاسترداد",
    formTitle: "ابدأ المحادثة",
    formSubtitle: "عرّفنا بنفسك ونكون بخدمتك فوراً.",
    name: "اسمك",
    email: "الإيميل (اختياري)",
    start: "ابدأ الشات",
    placeholder: "اكتب رسالة…",
    nameRequired: "الرجاء إدخال اسمك",
    today: "اليوم",
    yesterday: "أمس",
    retry: "تعذّر الاتصال. اضغط لإعادة المحاولة",
    sending: "جارٍ الإرسال…",
    failed: "فشل — اضغط لإعادة الإرسال",
  },
};

type Palette = ReturnType<typeof makePalette>;
function makePalette(isDark: boolean) {
  return {
    isDark,
    bg: isDark ? "#0D0D0F" : "#FFFFFF",
    surface: isDark ? "#161619" : "#F4F5F7",
    surfaceAlt: isDark ? "#1E1E22" : "#FFFFFF",
    fg: isDark ? "#FFFFFF" : "#0D0D0F",
    muted: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
    bubbleMe: PRIMARY,
    bubbleMeText: "#FFFFFF",
    bubbleAgent: isDark ? "#1E1E22" : "#F0F1F3",
    bubbleAgentText: isDark ? "#FFFFFF" : "#0D0D0F",
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtTime(ms: number, lang: "en" | "ar"): string {
  try {
    return new Date(ms).toLocaleTimeString(lang === "ar" ? "ar-IQ" : "en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(ms: number, t: (typeof STR)["en"], lang: "en" | "ar"): string {
  const now = new Date();
  const d = new Date(ms);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return t.today;
  if (sameDay(d, yesterday)) return t.yesterday;
  return d.toLocaleDateString(lang === "ar" ? "ar-IQ" : "en-US", {
    day: "numeric",
    month: "short",
  });
}

let echoCounter = 0;
function nextEcho(): string {
  echoCounter += 1;
  return `mora-${Date.now()}-${echoCounter}`;
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function AgentAvatar({ uri, p, size = 30 }: { uri?: string; p: Palette; size?: number }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: p.surface }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${PRIMARY}22`,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name="storefront" size={size * 0.5} color={PRIMARY} />
    </View>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────────
function Header({ p, t, top }: { p: Palette; t: (typeof STR)["en"]; top: number }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(350)}
      style={[
        styles.header,
        { paddingTop: top + 10, backgroundColor: p.bg, borderBottomColor: p.border },
      ]}
    >
      <View style={styles.headerAvatar}>
        <AgentAvatar p={p} size={42} />
        <View style={[styles.onlineDot, { borderColor: p.bg }]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.headerTitle, { color: p.fg }]}>{t.title}</Text>
        <View style={styles.headerSubRow}>
          <View style={styles.onlineDotSmall} />
          <Text style={[styles.headerSub, { color: p.muted }]}>{t.subtitle}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ── Message bubble ──────────────────────────────────────────────────────────────
function Bubble({
  msg,
  prevAuthor,
  p,
  t,
  lang,
  onRetry,
}: {
  msg: ChatMessage;
  prevAuthor?: ChatMessage["author"];
  p: Palette;
  t: (typeof STR)["en"];
  lang: "en" | "ar";
  onRetry?: () => void;
}) {
  if (msg.author === "system") {
    return (
      <Animated.View entering={FadeIn} style={styles.systemRow}>
        <Text style={[styles.systemText, { color: p.muted, backgroundColor: p.surface }]}>
          {msg.content}
        </Text>
      </Animated.View>
    );
  }

  const mine = msg.author === "me";
  const showAvatar = !mine && prevAuthor !== "agent";
  const hasImage = msg.attachments.some((a) => a.fileType === "image");

  return (
    <Animated.View
      entering={(mine ? FadeInUp : FadeInDown).duration(260)}
      layout={Layout.springify().damping(18)}
      style={[styles.row, mine ? styles.rowMine : styles.rowAgent]}
    >
      {!mine && (
        <View style={{ width: 30, marginRight: 8 }}>
          {showAvatar && <AgentAvatar uri={msg.senderAvatar} p={p} />}
        </View>
      )}

      <View style={{ maxWidth: "78%" }}>
        <View
          style={[
            styles.bubble,
            mine
              ? { backgroundColor: p.bubbleMe, borderBottomRightRadius: 6 }
              : { backgroundColor: p.bubbleAgent, borderBottomLeftRadius: 6 },
            hasImage && { padding: 4, overflow: "hidden" },
            msg.failed && { opacity: 0.7 },
          ]}
        >
          {msg.attachments.map((a) =>
            a.fileType === "image" ? (
              <Image
                key={a.id}
                source={{ uri: a.dataUrl }}
                style={styles.attachImage}
                resizeMode="cover"
              />
            ) : (
              <Pressable key={a.id} style={styles.fileRow}>
                <Feather
                  name="paperclip"
                  size={16}
                  color={mine ? "#FFFFFF" : p.fg}
                />
                <Text
                  style={[
                    styles.fileText,
                    { color: mine ? "#FFFFFF" : p.fg },
                  ]}
                  numberOfLines={1}
                >
                  {a.fileType}
                </Text>
              </Pressable>
            )
          )}
          {!!msg.content && (
            <Text
              style={[
                styles.bubbleText,
                {
                  color: mine ? p.bubbleMeText : p.bubbleAgentText,
                  marginTop: hasImage ? 6 : 0,
                  marginHorizontal: hasImage ? 6 : 0,
                  marginBottom: hasImage ? 4 : 0,
                  textAlign: lang === "ar" ? "right" : "left",
                },
              ]}
            >
              {msg.content}
            </Text>
          )}
        </View>

        <View style={[styles.metaRow, mine ? { justifyContent: "flex-end" } : null]}>
          {msg.pending ? (
            <Text style={[styles.meta, { color: p.muted }]}>{t.sending}</Text>
          ) : msg.failed ? (
            <Pressable onPress={onRetry}>
              <Text style={[styles.meta, { color: "#E5484D" }]}>{t.failed}</Text>
            </Pressable>
          ) : (
            <Text style={[styles.meta, { color: p.muted }]}>
              {fmtTime(msg.createdAt, lang)}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

// ── Typing indicator ────────────────────────────────────────────────────────────
function EmptyWelcome({
  p,
  t,
  onHint,
}: {
  p: Palette;
  t: (typeof STR)["en"];
  onHint: (s: string) => void;
}) {
  const hints = [t.hintOrders, t.hintProduct, t.hintReturn];
  return (
    <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.welcomeWrap}>
      <View style={styles.row}>
        <View style={{ width: 30, marginRight: 8 }}>
          <AgentAvatar p={p} />
        </View>
        <View
          style={[
            styles.bubble,
            { backgroundColor: p.bubbleAgent, borderBottomLeftRadius: 6, maxWidth: "82%" },
          ]}
        >
          <Text style={[styles.bubbleText, { color: p.bubbleAgentText }]}>{t.welcome}</Text>
        </View>
      </View>
      <View style={styles.hintWrap}>
        {hints.map((h, i) => (
          <Animated.View key={h} entering={FadeInUp.delay(250 + i * 80)}>
            <Pressable
              onPress={() => onHint(h)}
              style={({ pressed }) => [
                styles.hintChip,
                { borderColor: p.border, backgroundColor: p.surface, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.hintText, { color: p.fg }]}>{h}</Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

// ── Pre-chat form ───────────────────────────────────────────────────────────────
function PreChatForm({
  p,
  t,
  lang,
  onSubmit,
  starting,
}: {
  p: Palette;
  t: (typeof STR)["en"];
  lang: "en" | "ar";
  onSubmit: (name: string, email: string) => void;
  starting: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState(false);
  const align = lang === "ar" ? ("right" as const) : ("left" as const);

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.formWrap}>
      <Animated.View entering={FadeInDown.duration(450)} style={styles.formIconWrap}>
        <View style={[styles.formIcon, { backgroundColor: `${PRIMARY}18` }]}>
          <Ionicons name="chatbubbles" size={40} color={PRIMARY} />
        </View>
      </Animated.View>
      <Text style={[styles.formTitle, { color: p.fg }]}>{t.formTitle}</Text>
      <Text style={[styles.formSub, { color: p.muted }]}>{t.formSubtitle}</Text>

      <View style={{ width: "100%", marginTop: 22, gap: 12 }}>
        <TextInput
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (err) setErr(false);
          }}
          placeholder={t.name}
          placeholderTextColor={p.muted}
          style={[
            styles.input,
            {
              backgroundColor: p.surface,
              color: p.fg,
              borderColor: err ? "#E5484D" : p.border,
              textAlign: align,
            },
          ]}
        />
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder={t.email}
          placeholderTextColor={p.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[
            styles.input,
            { backgroundColor: p.surface, color: p.fg, borderColor: p.border, textAlign: align },
          ]}
        />
        {err && <Text style={styles.formErr}>{t.nameRequired}</Text>}
      </View>

      <Pressable
        disabled={starting}
        onPress={() => {
          if (!name.trim()) {
            setErr(true);
            return;
          }
          onSubmit(name.trim(), email.trim());
        }}
        style={({ pressed }) => [styles.startBtn, { opacity: pressed || starting ? 0.85 : 1 }]}
      >
        {starting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.startBtnText}>{t.start}</Text>
            <Feather name={lang === "ar" ? "arrow-left" : "arrow-right"} size={18} color="#FFFFFF" />
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ── Composer ────────────────────────────────────────────────────────────────────
function Composer({
  p,
  t,
  lang,
  onSend,
  onAttach,
  bottom,
}: {
  p: Palette;
  t: (typeof STR)["en"];
  lang: "en" | "ar";
  onSend: (text: string) => void;
  onAttach: () => void;
  bottom: number;
}) {
  const [text, setText] = useState("");
  const canSend = text.trim().length > 0;

  const submit = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <View
      style={[
        styles.composer,
        { backgroundColor: p.bg, borderTopColor: p.border, paddingBottom: bottom + 8 },
      ]}
    >
      <Pressable
        onPress={onAttach}
        style={({ pressed }) => [styles.attachBtn, { opacity: pressed ? 0.5 : 1 }]}
        hitSlop={8}
      >
        <Feather name="image" size={22} color={p.muted} />
      </Pressable>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t.placeholder}
        placeholderTextColor={p.muted}
        multiline
        style={[
          styles.composerInput,
          { backgroundColor: p.surface, color: p.fg, textAlign: lang === "ar" ? "right" : "left" },
        ]}
        onSubmitEditing={submit}
        blurOnSubmit={false}
      />

      <Pressable onPress={submit} disabled={!canSend} hitSlop={6}>
        <Animated.View
          layout={Layout.springify()}
          style={[
            styles.sendBtn,
            { backgroundColor: canSend ? PRIMARY : p.surface },
          ]}
        >
          <Feather
            name="send"
            size={18}
            color={canSend ? "#FFFFFF" : p.muted}
            style={{ marginLeft: lang === "ar" ? 0 : -1, transform: [{ scaleX: lang === "ar" ? -1 : 1 }] }}
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const { resolvedScheme } = useTheme();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const isDark = resolvedScheme === "dark";
  const p = makePalette(isDark);
  const t = STR[lang === "ar" ? "ar" : "en"];

  const webReserve = Platform.OS === "web" ? 84 + (insets.bottom || 0) : 0;
  const composerBottom = Platform.OS === "web" ? webReserve : insets.bottom;

  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [needsForm, setNeedsForm] = useState(false);
  const [starting, setStarting] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const sessionRef = useRef<ChatSession | null>(null);
  sessionRef.current = session;

  const scrollToEnd = useCallback((animated = true) => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated }));
  }, []);

  // Merge server messages with any local pending ones (dedupe by echoId/id).
  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    setMessages((prev) => {
      const pending = prev.filter((m) => m.pending || m.failed);
      const stillPending = pending.filter(
        (pm) => !incoming.some((im) => im.echoId && im.echoId === pm.echoId)
      );
      return [...incoming, ...stillPending].sort(
        (a, b) => a.createdAt - b.createdAt || a.id - b.id
      );
    });
  }, []);

  const refresh = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    try {
      const msgs = await listMessages(s);
      mergeMessages(msgs);
      setError(false);
    } catch (e) {
      if (isNotFound(e)) {
        await clearSession();
        setSession(null);
        setMessages([]);
        setNeedsForm(!user);
      } else {
        setError(true);
      }
    }
  }, [mergeMessages, user]);

  const startSession = useCallback(
    async (name?: string, email?: string) => {
      setStarting(true);
      setError(false);
      try {
        const s = await ensureSession({
          name: name || (user ? `${user.firstName} ${user.lastName}`.trim() : undefined),
          email: email || user?.email,
          phone: user?.phone,
        });
        setSession(s);
        sessionRef.current = s;
        setNeedsForm(false);
        const msgs = await listMessages(s);
        mergeMessages(msgs);
        scrollToEnd(false);
      } catch {
        setError(true);
      } finally {
        setStarting(false);
      }
    },
    [user, mergeMessages, scrollToEnd]
  );

  // Boot: restore an existing session, else auto-start (logged in) or show form.
  useEffect(() => {
    let alive = true;
    (async () => {
      const existing = await loadSession();
      if (!alive) return;
      if (existing) {
        setSession(existing);
        sessionRef.current = existing;
        setBooting(false);
        try {
          const msgs = await listMessages(existing);
          if (alive) {
            mergeMessages(msgs);
            scrollToEnd(false);
          }
        } catch (e) {
          if (isNotFound(e)) {
            await clearSession();
            if (alive) {
              setSession(null);
              setNeedsForm(!user);
            }
          }
        }
      } else if (user) {
        setBooting(false);
        startSession();
      } else {
        setBooting(false);
        setNeedsForm(true);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll while focused.
  useEffect(() => {
    if (!isFocused || !session) return;
    markSeen(session);
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [isFocused, session, refresh]);

  useEffect(() => {
    if (messages.length) scrollToEnd();
  }, [messages.length, scrollToEnd]);

  // ── Send handlers ──────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (text: string) => {
      const s = sessionRef.current;
      if (!s) return;
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const echoId = nextEcho();
      const optimistic: ChatMessage = {
        id: -Date.now(),
        content: text,
        author: "me",
        createdAt: Date.now(),
        attachments: [],
        pending: true,
        echoId,
      };
      setMessages((prev) => [...prev, optimistic]);
      scrollToEnd();
      try {
        const sent = await sendMessage(s, text, echoId);
        setMessages((prev) =>
          prev.map((m) => (m.echoId === echoId ? { ...sent, echoId } : m))
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.echoId === echoId ? { ...m, pending: false, failed: true } : m
          )
        );
      }
    },
    [scrollToEnd]
  );

  const handleResend = useCallback(
    (msg: ChatMessage) => {
      setMessages((prev) => prev.filter((m) => m.echoId !== msg.echoId));
      if (msg.content) handleSend(msg.content);
    },
    [handleSend]
  );

  const handleAttach = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted && perm.canAskAgain === false) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    const file: PickedFile = {
      uri: asset.uri,
      name: asset.fileName || `image-${Date.now()}.jpg`,
      type: asset.mimeType || "image/jpeg",
    };
    const echoId = nextEcho();
    const optimistic: ChatMessage = {
      id: -Date.now(),
      content: null,
      author: "me",
      createdAt: Date.now(),
      attachments: [{ id: -1, fileType: "image", dataUrl: asset.uri }],
      pending: true,
      echoId,
    };
    setMessages((prev) => [...prev, optimistic]);
    scrollToEnd();
    try {
      const sent = await sendAttachment(s, file);
      setMessages((prev) => prev.map((m) => (m.echoId === echoId ? { ...sent, echoId } : m)));
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.echoId === echoId ? { ...m, pending: false, failed: true } : m))
      );
    }
  }, [scrollToEnd]);

  // ── Render ──────────────────────────────────────────────────────────────────
  if (booting) {
    return (
      <View style={[styles.fill, { backgroundColor: p.bg, paddingTop: insets.top }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </View>
    );
  }

  if (needsForm) {
    return (
      <KeyboardAvoidingView
        style={[styles.fill, { backgroundColor: p.bg }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Header p={p} t={t} top={insets.top} />
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingBottom: webReserve + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <PreChatForm p={p} t={t} lang={lang} onSubmit={startSession} starting={starting} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Build message list with day separators.
  const items: React.ReactNode[] = [];
  let lastDay = "";
  messages.forEach((m, i) => {
    const dk = dayKey(m.createdAt);
    if (dk !== lastDay) {
      lastDay = dk;
      items.push(
        <View key={`d-${dk}-${m.id}`} style={styles.daySepRow}>
          <Text style={[styles.daySep, { color: p.muted, backgroundColor: p.surface }]}>
            {dayLabel(m.createdAt, t, lang)}
          </Text>
        </View>
      );
    }
    items.push(
      <Bubble
        key={`${m.id}-${m.echoId ?? ""}`}
        msg={m}
        prevAuthor={messages[i - 1]?.author}
        p={p}
        t={t}
        lang={lang}
        onRetry={() => handleResend(m)}
      />
    );
  });

  return (
    <KeyboardAvoidingView
      style={[styles.fill, { backgroundColor: p.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 0}
    >
      <Header p={p} t={t} top={insets.top} />

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 14, paddingHorizontal: 12 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={() => scrollToEnd(false)}
      >
        {messages.length === 0 ? (
          <EmptyWelcome p={p} t={t} onHint={handleSend} />
        ) : (
          items
        )}
        {error && (
          <Pressable onPress={refresh} style={styles.errorRow}>
            <Text style={[styles.errorText, { color: "#E5484D" }]}>{t.retry}</Text>
          </Pressable>
        )}
      </ScrollView>

      <Composer
        p={p}
        t={t}
        lang={lang}
        onSend={handleSend}
        onAttach={handleAttach}
        bottom={composerBottom}
      />
    </KeyboardAvoidingView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerAvatar: { position: "relative" },
  onlineDot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
  },
  onlineDotSmall: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  headerSubRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12.5 },

  row: { flexDirection: "row", alignItems: "flex-end", marginVertical: 3 },
  rowMine: { justifyContent: "flex-end" },
  rowAgent: { justifyContent: "flex-start" },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  bubbleText: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 21 },
  attachImage: { width: 220, height: 220, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.05)" },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4, paddingHorizontal: 6 },
  fileText: { fontFamily: "Inter_500Medium", fontSize: 14 },

  metaRow: { flexDirection: "row", marginTop: 3, marginHorizontal: 4 },
  meta: { fontFamily: "Inter_400Regular", fontSize: 11 },

  systemRow: { alignItems: "center", marginVertical: 8 },
  systemText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: "hidden",
  },

  daySepRow: { alignItems: "center", marginVertical: 12 },
  daySep: {
    fontFamily: "Inter_500Medium",
    fontSize: 11.5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: "hidden",
  },

  welcomeWrap: { paddingTop: 6 },
  hintWrap: { marginTop: 14, marginLeft: 38, gap: 8, alignItems: "flex-start" },
  hintChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1,
  },
  hintText: { fontFamily: "Inter_500Medium", fontSize: 14 },

  formWrap: { alignItems: "center", paddingHorizontal: 30 },
  formIconWrap: { marginBottom: 18 },
  formIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  formTitle: { fontFamily: "Inter_700Bold", fontSize: 22, textAlign: "center" },
  formSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14.5,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 21,
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontFamily: "Inter_400Regular",
    fontSize: 15.5,
  },
  formErr: { color: "#E5484D", fontFamily: "Inter_400Regular", fontSize: 13 },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    height: 54,
    borderRadius: 16,
    width: "100%",
    marginTop: 22,
  },
  startBtnText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 16 },

  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachBtn: { padding: 8 },
  composerInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 11 : 8,
    paddingBottom: Platform.OS === "ios" ? 11 : 8,
    fontFamily: "Inter_400Regular",
    fontSize: 15.5,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  errorRow: { alignItems: "center", paddingVertical: 12 },
  errorText: { fontFamily: "Inter_500Medium", fontSize: 13 },
});
