/**
 * Firebase helpers — Phone OTP, Google, Apple.
 * Lazy-loaded so the native bundle never pulls in Firebase.
 * All functions throw a clear error when env vars are missing.
 */

import { Platform } from "react-native";

// ─── Config ──────────────────────────────────────────────────────────────────

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

// ─── Lazy init ────────────────────────────────────────────────────────────────

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

// ─── Pending confirmation result (phone OTP) ─────────────────────────────────

export let pendingConfirmation: any = null;

// ─── Recaptcha (invisible, web only) ─────────────────────────────────────────

let _recaptcha: any = null;

function getRecaptcha() {
  const auth = getAuth();
  if (!_recaptcha) {
    let el = document.getElementById("mora-recaptcha");
    if (!el) {
      el = document.createElement("div");
      el.id = "mora-recaptcha";
      document.body.appendChild(el);
    }
    const { RecaptchaVerifier } = require("firebase/auth");
    _recaptcha = new RecaptchaVerifier(auth, el, {
      size: "invisible",
      "expired-callback": () => { _recaptcha = null; },
    });
  }
  return _recaptcha;
}

// ─── Phone OTP ────────────────────────────────────────────────────────────────

export async function sendPhoneOTP(phoneE164: string): Promise<void> {
  const auth = getAuth();
  const verifier = getRecaptcha();
  const { signInWithPhoneNumber } = require("firebase/auth");
  pendingConfirmation = await signInWithPhoneNumber(auth, phoneE164, verifier);
}

export async function verifyOTP(code: string): Promise<{ uid: string; phone: string }> {
  if (!pendingConfirmation) throw new Error("No pending OTP. Please request a new code.");
  const result = await pendingConfirmation.confirm(code);
  const uid: string = result.user.uid;
  const phone: string = result.user.phoneNumber ?? "";
  return { uid, phone };
}

// ─── Google ──────────────────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<{ uid: string; email: string; name: string }> {
  const auth = getAuth();
  const { GoogleAuthProvider, signInWithRedirect } = require("firebase/auth");
  const provider = new GoogleAuthProvider();
  // signInWithRedirect: navigates away → Google → back to app.
  // getGoogleRedirectResult() must be called on the return page.
  await signInWithRedirect(auth, provider);
  // This line is never reached (redirect happens above).
  return { uid: "", email: "", name: "" };
}

/** Call once on auth screen mount to collect the result after redirect. */
export async function getGoogleRedirectResult(): Promise<{ uid: string; email: string; name: string } | null> {
  if (!isFirebaseConfigured()) return null;
  const auth = getAuth();
  const { getRedirectResult } = require("firebase/auth");
  const result = await getRedirectResult(auth);
  if (!result) return null;
  return {
    uid:   result.user.uid,
    email: result.user.email ?? "",
    name:  result.user.displayName ?? "",
  };
}

// ─── Apple ───────────────────────────────────────────────────────────────────

export async function signInWithApple(): Promise<{ uid: string; email: string; name: string }> {
  const auth = getAuth();
  const { OAuthProvider, signInWithRedirect } = require("firebase/auth");
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  await signInWithRedirect(auth, provider);
  return { uid: "", email: "", name: "" };
}

/** Call once on auth screen mount to collect the Apple redirect result. */
export async function getAppleRedirectResult(): Promise<{ uid: string; email: string; name: string } | null> {
  if (!isFirebaseConfigured()) return null;
  const auth = getAuth();
  const { getRedirectResult } = require("firebase/auth");
  const result = await getRedirectResult(auth);
  if (!result) return null;
  return {
    uid:   result.user.uid,
    email: result.user.email ?? "",
    name:  result.user.displayName ?? "",
  };
}

// ─── Phone normaliser ────────────────────────────────────────────────────────

/** Converts "07766699669" or "7766699669" → "+9647766699669" */
export function normalizeIraqiPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("9647")) return "+" + digits;
  if (digits.startsWith("964"))  return "+" + digits;
  if (digits.startsWith("0"))    return "+964" + digits.slice(1);
  return "+964" + digits;
}

/** Must be +964 7XXXXXXXXX — 14 characters */
export function isValidIraqiPhone(e164: string): boolean {
  return /^\+9647\d{9}$/.test(e164);
}
