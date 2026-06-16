/**
 * Native iOS auth helpers — Apple Sign In + Google OAuth via expo-auth-session.
 * Used instead of Firebase Web SDK (which is web-only).
 *
 * Google Sign In requires:
 *   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID — iOS OAuth 2.0 client ID from Google Cloud Console
 *   (Firebase Console → Project Settings → Your Apps → iOS → CLIENT_ID in GoogleService-Info.plist)
 */

import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

// Required so expo-auth-session can complete the session after web browser returns
WebBrowser.maybeCompleteAuthSession();

// ─────────────────────────────────────────────────────────────────────────────
// Apple Sign In (native iOS — no credentials needed beyond usesAppleSignIn entitlement)
// ─────────────────────────────────────────────────────────────────────────────

export async function nativeAppleSignIn(): Promise<{ uid: string; email: string; name: string }> {
  const Apple = await import("expo-apple-authentication");

  const credential = await Apple.signInAsync({
    requestedScopes: [
      Apple.AppleAuthenticationScope.FULL_NAME,
      Apple.AppleAuthenticationScope.EMAIL,
    ],
  });

  const firstName = credential.fullName?.givenName ?? "";
  const lastName  = credential.fullName?.familyName ?? "";
  const name      = [firstName, lastName].filter(Boolean).join(" ");

  // Apple only returns the email on the first sign-in for a given device.
  // For subsequent sign-ins we generate a stable placeholder email from the Apple user ID.
  const safeId = credential.user.replace(/[^a-zA-Z0-9]/g, "");
  const email  = credential.email || `${safeId.slice(0, 20)}@apple.user`;

  return {
    uid:   `apple:${credential.user}`,
    email,
    name:  name || "Apple User",
  };
}

export async function isAppleAvailable(): Promise<boolean> {
  try {
    const Apple = await import("expo-apple-authentication");
    return Apple.isAvailableAsync();
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Google Sign In (native iOS via expo-auth-session + PKCE)
//
// Requires:
//   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID — create an iOS OAuth 2.0 client in
//   Google Cloud Console (or Firebase Console → Project Settings → iOS app).
//   The redirect URI is automatically derived as:
//     com.googleusercontent.apps.<client-id-prefix>:/
//   Google authorizes this scheme by default for iOS OAuth clients.
// ─────────────────────────────────────────────────────────────────────────────

const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint:         "https://oauth2.googleapis.com/token",
  revocationEndpoint:    "https://oauth2.googleapis.com/revoke",
};

export function isGoogleConfigured(): boolean {
  return !!GOOGLE_IOS_CLIENT_ID;
}

export async function nativeGoogleSignIn(): Promise<{ uid: string; email: string; name: string }> {
  if (!GOOGLE_IOS_CLIENT_ID) {
    throw new Error(
      "Google sign-in not configured — set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID " +
      "(iOS OAuth client from Google Cloud Console / Firebase Project Settings)."
    );
  }

  // Derived URL scheme: reverse of the client ID host portion
  // e.g. "274592364900-abc.apps.googleusercontent.com" →
  //      "com.googleusercontent.apps.274592364900-abc"
  const [prefix] = GOOGLE_IOS_CLIENT_ID.split(".apps.googleusercontent.com");
  const reversedScheme = `com.googleusercontent.apps.${prefix}`;

  const redirectUri = AuthSession.makeRedirectUri({ scheme: reversedScheme });

  const request = new AuthSession.AuthRequest({
    clientId:     GOOGLE_IOS_CLIENT_ID,
    scopes:       ["openid", "profile", "email"],
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE:      true,
  });

  const result = await request.promptAsync(GOOGLE_DISCOVERY);

  if (result.type === "cancel" || result.type === "dismiss") {
    throw new Error("CANCELLED");
  }
  if (result.type !== "success") {
    throw new Error("Google sign-in failed");
  }

  // Exchange auth code → access + ID tokens
  const tokenResponse = await AuthSession.exchangeCodeAsync(
    {
      code:       result.params["code"]!,
      clientId:   GOOGLE_IOS_CLIENT_ID,
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier! },
    },
    GOOGLE_DISCOVERY
  );

  // Fetch user profile
  const userInfo = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenResponse.accessToken}` },
  }).then((r) => r.json()) as { sub: string; email: string; name: string };

  return {
    uid:   `google:${userInfo.sub}`,
    email: userInfo.email ?? "",
    name:  userInfo.name  ?? "",
  };
}
