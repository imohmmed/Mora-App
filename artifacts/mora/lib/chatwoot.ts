/**
 * Chatwoot public (client) API helper.
 *
 * We talk to Chatwoot directly from the app/web — the public API enables CORS
 * (`access-control-allow-origin: *`) so no proxy is needed. Conversations land
 * in the Chatwoot dashboard (chat.moramoda.tech) under the "Mora App" API inbox,
 * where agents reply exactly as before.
 *
 * Flow: create contact → create conversation → send/list messages (poll).
 * The session (contact id + conversation id) is persisted so a returning user
 * keeps the same thread.
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CHAT_DOMAIN = "https://chat.moramoda.tech";
const INBOX_IDENTIFIER = "1GvEp657KMDmNTGUYxihf5gh";
const STORAGE_KEY = "mora.chat.session.v1";

function inboxBase(): string {
  return `${CHAT_DOMAIN}/public/api/v1/inboxes/${INBOX_IDENTIFIER}`;
}

// ── Types ────────────────────────────────────────────────────────────────────
export type ChatSession = {
  contactId: string; // source_id (contact identifier)
  conversationId: number; // display_id
  pubsubToken: string;
};

export type ContactInfo = {
  name?: string;
  email?: string;
  phone?: string;
};

export type ChatAttachment = {
  id: number;
  fileType: string; // image | audio | video | file
  dataUrl: string;
  thumbUrl?: string;
};

export type ChatMessage = {
  id: number;
  content: string | null;
  author: "me" | "agent" | "system"; // me = customer, agent = staff/bot
  createdAt: number; // ms epoch
  senderName?: string;
  senderAvatar?: string;
  attachments: ChatAttachment[];
  pending?: boolean;
  failed?: boolean;
  echoId?: string;
};

export type PickedFile = { uri: string; name: string; type: string };

// ── Low-level fetch ──────────────────────────────────────────────────────────
class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new ApiError(res.status, `Chatwoot API ${res.status}`);
  }
  return (await res.json()) as T;
}

export function isNotFound(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}

// ── Session persistence ──────────────────────────────────────────────────────
export async function loadSession(): Promise<ChatSession | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatSession;
    if (parsed?.contactId && parsed?.conversationId) return parsed;
    return null;
  } catch {
    return null;
  }
}

async function saveSession(s: ChatSession): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export async function clearSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// ── Contact + conversation ───────────────────────────────────────────────────
async function createContact(
  info: ContactInfo
): Promise<{ contactId: string; pubsubToken: string }> {
  const body: Record<string, unknown> = {};
  if (info.name) body.name = info.name;
  if (info.email) body.email = info.email;
  if (info.phone) body.phone_number = info.phone;
  const res = await jsonFetch<{ source_id: string; pubsub_token: string }>(
    `${inboxBase()}/contacts`,
    { method: "POST", body: JSON.stringify(body) }
  );
  return { contactId: res.source_id, pubsubToken: res.pubsub_token };
}

async function createConversation(contactId: string): Promise<number> {
  const res = await jsonFetch<{ id: number }>(
    `${inboxBase()}/contacts/${contactId}/conversations`,
    { method: "POST", body: JSON.stringify({}) }
  );
  return res.id;
}

/**
 * Returns an existing session, or creates a fresh contact + conversation.
 * `info` is used only when creating (prefill for logged-in users).
 */
export async function ensureSession(info: ContactInfo): Promise<ChatSession> {
  const existing = await loadSession();
  if (existing) return existing;
  const { contactId, pubsubToken } = await createContact(info);
  const conversationId = await createConversation(contactId);
  const session: ChatSession = { contactId, conversationId, pubsubToken };
  await saveSession(session);
  return session;
}

// ── Messages ─────────────────────────────────────────────────────────────────
type RawMessage = {
  id: number;
  content: string | null;
  message_type: number; // 0 incoming(customer), 1 outgoing(agent), 2 activity, 3 template
  created_at: number; // seconds
  echo_id?: string;
  private?: boolean;
  sender?: { name?: string; thumbnail?: string; type?: string };
  attachments?: Array<{
    id: number;
    file_type: string;
    data_url: string;
    thumb_url?: string;
  }>;
};

function normalize(m: RawMessage): ChatMessage {
  let author: ChatMessage["author"];
  if (m.message_type === 0) author = "me";
  else if (m.message_type === 2) author = "system";
  else author = "agent"; // 1 (agent) or 3 (bot/template)
  const attachments: ChatAttachment[] = (m.attachments ?? []).map((a) => ({
    id: a.id,
    fileType: a.file_type,
    dataUrl: a.data_url,
    thumbUrl: a.thumb_url,
  }));
  return {
    id: m.id,
    content: m.content,
    author,
    createdAt: (m.created_at ?? 0) * 1000,
    senderName: m.sender?.name,
    senderAvatar: m.sender?.thumbnail || undefined,
    attachments,
    echoId: m.echo_id,
  };
}

export async function listMessages(s: ChatSession): Promise<ChatMessage[]> {
  const res = await jsonFetch<RawMessage[]>(
    `${inboxBase()}/contacts/${s.contactId}/conversations/${s.conversationId}/messages`
  );
  return (Array.isArray(res) ? res : [])
    .filter((m) => !m.private)
    .map(normalize)
    .sort((a, b) => a.createdAt - b.createdAt || a.id - b.id);
}

export async function sendMessage(
  s: ChatSession,
  content: string,
  echoId?: string
): Promise<ChatMessage> {
  const res = await jsonFetch<RawMessage>(
    `${inboxBase()}/contacts/${s.contactId}/conversations/${s.conversationId}/messages`,
    { method: "POST", body: JSON.stringify({ content, echo_id: echoId }) }
  );
  return normalize(res);
}

export async function sendAttachment(
  s: ChatSession,
  file: PickedFile
): Promise<ChatMessage> {
  const form = new FormData();
  if (Platform.OS === "web") {
    // On web we need a real Blob/File for the multipart body.
    const blob = await (await fetch(file.uri)).blob();
    form.append("attachments[]", blob, file.name);
  } else {
    // React Native accepts the { uri, name, type } shape.
    form.append("attachments[]", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);
  }
  const res = await fetch(
    `${inboxBase()}/contacts/${s.contactId}/conversations/${s.conversationId}/messages`,
    { method: "POST", body: form }
  );
  if (!res.ok) throw new ApiError(res.status, `Chatwoot upload ${res.status}`);
  return normalize((await res.json()) as RawMessage);
}

export async function markSeen(s: ChatSession): Promise<void> {
  try {
    await fetch(
      `${inboxBase()}/contacts/${s.contactId}/conversations/${s.conversationId}/update_last_seen`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );
  } catch {
    /* best-effort */
  }
}
