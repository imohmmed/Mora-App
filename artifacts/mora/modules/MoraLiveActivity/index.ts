import { requireNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

export type OrderStage =
  | "confirmed"
  | "preparing"
  | "shipping"
  | "delivered"
  | "issue"
  | "cancelled";

interface MoraLiveActivityNative {
  isAvailable(): boolean;
  startActivity(
    orderNumber: string,
    customerName: string,
    stage: string,
    message: string
  ): string | null;
  updateActivity(activityId: string, stage: string, message: string): void;
  endActivity(activityId: string, stage: string, message: string): void;
  getPushToken(activityId: string): Promise<string | null>;
  getPushToStartToken(): Promise<string | null>;
  getActiveActivityIds(): string[];
}

let native: MoraLiveActivityNative | null = null;

if (Platform.OS === "ios") {
  try {
    native = requireNativeModule("MoraLiveActivity");
  } catch {
    // Not available in Expo Go or when native build is missing
  }
}

export const MoraLiveActivity = {
  /** Whether Live Activities are supported and enabled on this device */
  isAvailable(): boolean {
    return native?.isAvailable() ?? false;
  },

  /** Start a Live Activity for order tracking. Returns activityId or null */
  startActivity(params: {
    orderNumber: string;
    customerName: string;
    stage?: OrderStage;
    message?: string;
  }): string | null {
    if (!native) return null;
    try {
      return native.startActivity(
        params.orderNumber,
        params.customerName,
        params.stage ?? "confirmed",
        params.message ?? ""
      );
    } catch {
      return null;
    }
  },

  /** Update the stage and message of an active Live Activity */
  updateActivity(activityId: string, stage: OrderStage, message?: string): void {
    native?.updateActivity(activityId, stage, message ?? "");
  },

  /** End a Live Activity (shows final state then dismisses) */
  endActivity(activityId: string, stage: OrderStage, message?: string): void {
    native?.endActivity(activityId, stage, message ?? "");
  },

  /** Get APNs push token for server-side updates. Call after startActivity. */
  async getPushToken(activityId: string): Promise<string | null> {
    if (!native) return null;
    try {
      return await native.getPushToken(activityId);
    } catch {
      return null;
    }
  },

  /**
   * Get the push-to-start token (iOS 17.2+). Captured on app launch and sent to
   * the server so the backend can START a Live Activity remotely via APNs without
   * relying on an on-device Activity.request(). Returns null on iOS < 17.2.
   */
  async getPushToStartToken(): Promise<string | null> {
    if (!native?.getPushToStartToken) return null;
    try {
      return await native.getPushToStartToken();
    } catch {
      return null;
    }
  },

  /** Get all currently active activity IDs */
  getActiveActivityIds(): string[] {
    return native?.getActiveActivityIds() ?? [];
  },
};
