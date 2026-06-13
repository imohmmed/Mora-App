/**
 * Firebase helpers — Google + Apple sign-in via popup.
 * Web-only. On native platforms these functions throw.
 */

import { Platform } from "react-native";

function cfg() {
  return {
    apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };
}

export function isFirebaseConfigured(): boolean {
  const c = cfg();
  return !!(c.apiKey && c.authDomain && c.projectId && c.appId);
}

/** Call this on auth screen mount to pre-load Firebase modules so they're
 *  ready before the user taps — prevents Safari iOS popup-blocked on first tap. */
export function warmUpFirebase(): void {
  if (Platform.OS !== "web") return;
  try { getAuth(); } catch {}
}

let _auth: any = null;

function getAuth() {
  if (Platform.OS !== "web") throw new Error("Firebase auth is web-only");
  if (!isFirebaseConfigured()) throw new Error("Firebase غير مهيأ — يرجى إضافة بيانات Firebase");
  if (!_auth) {
    const { initializeApp, getApps, getApp } = require("firebase/app");
    const { getAuth: _getAuth } = require("firebase/auth");
    const app = getApps().length ? getApp() : initializeApp(cfg());
    _auth = _getAuth(app);
  }
  return _auth;
}

// ─── Google (popup — stays on same page) ─────────────────────────────────────

export async function signInWithGoogle(): Promise<{ uid: string; email: string; name: string }> {
  const auth = getAuth();
  const { GoogleAuthProvider, signInWithPopup } = require("firebase/auth");
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return {
    uid:   result.user.uid,
    email: result.user.email ?? "",
    name:  result.user.displayName ?? "",
  };
}

// ─── Apple (popup — stays on same page) ──────────────────────────────────────

export async function signInWithApple(): Promise<{ uid: string; email: string; name: string }> {
  const auth = getAuth();
  const { OAuthProvider, signInWithPopup } = require("firebase/auth");
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  const result = await signInWithPopup(auth, provider);
  return {
    uid:   result.user.uid,
    email: result.user.email ?? "",
    name:  result.user.displayName ?? "",
  };
}

// ─── Phone normaliser ────────────────────────────────────────────────────────

export function normalizeIraqiPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("9647")) return "+" + digits;
  if (digits.startsWith("964"))  return "+" + digits;
  if (digits.startsWith("0"))    return "+964" + digits.slice(1);
  return "+964" + digits;
}

export function isValidIraqiPhone(e164: string): boolean {
  return /^\+9647\d{9}$/.test(e164);
}
