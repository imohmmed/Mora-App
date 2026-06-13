/**
 * notifications.ts
 * Expo push notification registration and token management.
 * Works in both Expo Go (limited) and Development Build (full).
 */
import { Platform } from "react-native";

let Notifications: typeof import("expo-notifications") | null = null;
try {
  Notifications = require("expo-notifications");
} catch {}

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}/api` : "/api";
}

/** Request permission and return the Expo push token, or null on failure */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Notifications) return null;
  if (Platform.OS === "web") return null;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return null;

    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenData.data;
  } catch {
    return null;
  }
}

/** Send the push token to the Mora backend for storage */
export async function sendTokenToServer(
  pushToken: string,
  authToken: string
): Promise<void> {
  try {
    await fetch(`${getApiBase()}/store/notifications/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token: pushToken, platform: Platform.OS }),
    });
  } catch {}
}

/** Remove the push token from the backend (call on logout) */
export async function removeTokenFromServer(pushToken: string): Promise<void> {
  try {
    await fetch(`${getApiBase()}/store/notifications/token`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: pushToken }),
    });
  } catch {}
}

/** Set the badge count on the app icon */
export async function setBadgeCount(count: number): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch {}
}

/** Schedule a local notification (e.g. abandoned cart reminder) */
export async function scheduleLocalNotification(opts: {
  title: string;
  body: string;
  delaySeconds: number;
  data?: Record<string, unknown>;
  identifier?: string;
}): Promise<string | null> {
  if (!Notifications) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      identifier: opts.identifier,
      content: {
        title: opts.title,
        body: opts.body,
        data: opts.data ?? {},
        sound: true,
      },
      trigger: { seconds: opts.delaySeconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
    });
  } catch {
    return null;
  }
}

/** Cancel a previously scheduled local notification */
export async function cancelScheduledNotification(identifier: string): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {}
}
