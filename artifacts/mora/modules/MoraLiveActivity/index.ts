import { requireNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

export type OrderStage =
  | "confirmed"
  | "preparing"
  | "shipping"
  | "delivered"
  | "issue"
  | "cancelled";

export interface LiveActivityDiagnostics {
  moduleLoaded: boolean;
  iosVersion?: string;
  activityKitAvailable?: boolean;
  areActivitiesEnabled?: boolean;
  frequentPushesEnabled?: boolean;
  pushToStartSupported?: boolean;
  activeActivities?: number;
}

export interface StartTestResult {
  ok: boolean;
  activityId?: string;
  error?: string;
}

interface MoraLiveActivityNative {
  isAvailable(): boolean;
  diagnose(): LiveActivityDiagnostics;
  startTestActivity(): Promise<StartTestResult>;
  startActivity(
    orderNumber: string,
    customerName: string,
    stage: string,
    message: string,
    priceText: string,
    isPaid: boolean
  ): string | null;
  updateActivity(activityId: string, stage: string, message: string, isPaid: boolean): void;
  endActivity(activityId: string, stage: string, message: string, isPaid: boolean): void;
  getPushToken(activityId: string): Promise<string | null>;
  getPushToStartToken(): Promise<string | null>;
  getActiveActivityIds(): string[];
  getActiveActivities(): Array<{ id: string; orderNumber: string }>;
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

  /**
   * Returns the precise on-device Live Activity state. If the native module is
   * not in the installed build (old IPA, Expo Go, or web) moduleLoaded is false.
   */
  diagnose(): LiveActivityDiagnostics {
    if (!native?.diagnose) {
      return { moduleLoaded: false };
    }
    try {
      return native.diagnose();
    } catch {
      return { moduleLoaded: false };
    }
  },

  /**
   * Attempts to start a test Live Activity and returns the precise outcome.
   * Use this to diagnose why nothing appears: it surfaces the real error
   * (disabled in Settings, request failed, module missing) instead of failing
   * silently like startActivity().
   */
  async startTestActivity(): Promise<StartTestResult> {
    if (!native?.startTestActivity) {
      return {
        ok: false,
        error:
          "Native module not in this build (Expo Go, web, or an old build that predates the widget). Install a fresh native build.",
      };
    }
    try {
      return await native.startTestActivity();
    } catch (e: any) {
      return { ok: false, error: e?.message ?? String(e) };
    }
  },

  /** Start a Live Activity for order tracking. Returns activityId or null */
  startActivity(params: {
    orderNumber: string;
    customerName: string;
    stage?: OrderStage;
    message?: string;
    priceText?: string;
    isPaid?: boolean;
  }): string | null {
    if (!native) return null;
    try {
      return native.startActivity(
        params.orderNumber,
        params.customerName,
        params.stage ?? "confirmed",
        params.message ?? "",
        params.priceText ?? "",
        params.isPaid ?? false
      );
    } catch {
      return null;
    }
  },

  /** Update the stage and message of an active Live Activity */
  updateActivity(activityId: string, stage: OrderStage, message?: string, isPaid?: boolean): void {
    native?.updateActivity(activityId, stage, message ?? "", isPaid ?? false);
  },

  /** End a Live Activity (shows final state then dismisses) */
  endActivity(activityId: string, stage: OrderStage, message?: string, isPaid?: boolean): void {
    native?.endActivity(activityId, stage, message ?? "", isPaid ?? false);
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

  /**
   * Returns all active system Live Activities with their IDs and order numbers.
   * Also caches them in the native module so getPushToken() works for
   * push-to-start activities that weren't started locally by the app.
   */
  getActiveActivities(): Array<{ id: string; orderNumber: string }> {
    return native?.getActiveActivities() ?? [];
  },
};
