/**
 * NotificationContext.tsx
 * Manages push notifications + iOS Live Activity (Dynamic Island / Lock Screen).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import {
  registerForPushNotificationsAsync,
  sendTokenToServer,
  sendPushToStartTokenToServer,
  removeTokenFromServer,
  scheduleLocalNotification,
  cancelScheduledNotification,
  setBadgeCount,
} from "@/services/notifications";
import { MoraLiveActivity, type OrderStage } from "@/modules/MoraLiveActivity";
import { useAuth } from "@/context/AuthContext";

export type { OrderStage };

export type CartActivity = {
  active: boolean;
  totalItems: number;
};

export type OrderActivity = {
  active: boolean;
  orderId: string;
  orderNumber: string;
  stage: OrderStage;
  message?: string;
};

type NotificationCtx = {
  pushToken: string | null;
  permissionGranted: boolean;
  cartActivity: CartActivity;
  orderActivity: OrderActivity | null;
  onUserLogin: (authToken: string) => Promise<void>;
  onUserLogout: () => Promise<void>;
  updateCartActivity: (totalItems: number) => void;
  startOrderActivity: (params: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    stage?: OrderStage;
    message?: string;
    priceText?: string;
    isPaid?: boolean;
  }) => void;
  updateOrderStage: (stage: OrderStage, message?: string) => void;
  endOrderActivity: () => void;
};

const NotificationContext = createContext<NotificationCtx>({
  pushToken: null,
  permissionGranted: false,
  cartActivity: { active: false, totalItems: 0 },
  orderActivity: null,
  onUserLogin: async () => {},
  onUserLogout: async () => {},
  updateCartActivity: () => {},
  startOrderActivity: () => {},
  updateOrderStage: () => {},
  endOrderActivity: () => {},
});

const CART_REMINDER_ID = "mora_cart_reminder";

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}/api` : "/api";
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { token: authToken } = useAuth();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [cartActivity, setCartActivity] = useState<CartActivity>({ active: false, totalItems: 0 });
  const [orderActivity, setOrderActivity] = useState<OrderActivity | null>(null);

  const authTokenRef      = useRef<string | null>(null);
  const cartReminderRef   = useRef<string | null>(null);
  const liveActivityIdRef = useRef<string | null>(null);   // Native iOS Live Activity ID
  const orderIdRef        = useRef<string | null>(null);   // API order ID for server calls

  // ── Init: request permission ────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === "web") return;
    registerForPushNotificationsAsync().then((token) => {
      if (token) { setPushToken(token); setPermissionGranted(true); }
    });
  }, []);

  // ── Capture Live Activity push-to-start token (iOS 17.2+) ───────────────────
  // Grabbed as soon as the user is authenticated so the backend can START a Live
  // Activity directly on this device via APNs — independent of the fragile
  // on-device Activity.request() path at checkout.
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    if (!authToken) return;
    let cancelled = false;
    MoraLiveActivity.getPushToStartToken()
      .then((token) => {
        if (!token || cancelled) return;
        void sendPushToStartTokenToServer(token, authToken).catch(() => {});
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [authToken]);

  // ── Foreground push handler ─────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === "web") return;
    let N: typeof import("expo-notifications") | null = null;
    try { N = require("expo-notifications"); } catch {}
    if (!N) return;
    const sub = N.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, unknown>;
      if (data?.type === "live_activity" && data?.stage) {
        const stage = data.stage as OrderStage;
        const msg   = data.message as string | undefined;
        setOrderActivity((prev) =>
          prev ? { ...prev, stage, message: msg, active: true } : null
        );
        // Also update the native Live Activity if running
        if (liveActivityIdRef.current) {
          MoraLiveActivity.updateActivity(liveActivityIdRef.current, stage, msg);
        }
      }
    });
    return () => sub.remove();
  }, []);

  // ── Notification tap → navigate ─────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === "web") return;
    let N: typeof import("expo-notifications") | null = null;
    try { N = require("expo-notifications"); } catch {}
    if (!N) return;
    const sub = N.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const type = data?.type as string | undefined;
      const url  = data?.url  as string | undefined;
      if (type === "chat_message") {
        router.push("/(tabs)/chat");
      } else if (url) {
        router.push(url as any);
      }
    });
    return () => sub.remove();
  }, []);

  // ── Badge count sync ────────────────────────────────────────────────────────
  useEffect(() => {
    setBadgeCount(cartActivity.totalItems > 0 ? cartActivity.totalItems : 0);
  }, [cartActivity.totalItems]);

  // ── Login ───────────────────────────────────────────────────────────────────
  const onUserLogin = useCallback(async (authToken: string) => {
    authTokenRef.current = authToken;
    if (pushToken) {
      await sendTokenToServer(pushToken, authToken);
    } else {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        setPushToken(token);
        setPermissionGranted(true);
        await sendTokenToServer(token, authToken);
      }
    }
  }, [pushToken]);

  // ── Logout ──────────────────────────────────────────────────────────────────
  const onUserLogout = useCallback(async () => {
    if (pushToken) await removeTokenFromServer(pushToken);
    authTokenRef.current = null;
  }, [pushToken]);

  // ── Bridge: register/unregister push token as auth session changes ───────────
  // The server stores a push token only against a logged-in customer, so the
  // token must be (re)sent whenever the user logs in, and removed on logout.
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (authToken) {
      void onUserLogin(authToken).catch(() => {});
    } else {
      void onUserLogout().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, pushToken]);

  // ── Cart Activity ───────────────────────────────────────────────────────────
  const updateCartActivity = useCallback((totalItems: number) => {
    setCartActivity({ active: totalItems > 0, totalItems });
    if (totalItems > 0) {
      if (cartReminderRef.current) cancelScheduledNotification(cartReminderRef.current);
      scheduleLocalNotification({
        identifier: CART_REMINDER_ID,
        title: "نسيت شيئاً في سلتك! 🛒",
        body: `لديك ${totalItems} ${totalItems === 1 ? "منتج" : "منتجات"} بانتظارك`,
        delaySeconds: 2 * 60 * 60,
        data: { type: "abandoned_cart" },
      }).then((id) => { if (id) cartReminderRef.current = id; });
    } else {
      cancelScheduledNotification(CART_REMINDER_ID);
      cartReminderRef.current = null;
    }
  }, []);

  // ── Order Live Activity ─────────────────────────────────────────────────────
  const startOrderActivity = useCallback((params: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    stage?: OrderStage;
    message?: string;
    priceText?: string;
    isPaid?: boolean;
  }) => {
    const stage = params.stage ?? "confirmed";

    // Update React state
    setOrderActivity({
      active: true,
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      stage,
      message: params.message,
    });
    setCartActivity({ active: false, totalItems: 0 });
    cancelScheduledNotification(CART_REMINDER_ID);

    // Start native iOS Live Activity
    if (Platform.OS === "ios" && MoraLiveActivity.isAvailable()) {
      const activityId = MoraLiveActivity.startActivity({
        orderNumber: params.orderNumber,
        customerName: params.customerName,
        stage,
        message: params.message,
        priceText: params.priceText,
        isPaid: params.isPaid,
      });
      if (activityId) {
        liveActivityIdRef.current = activityId;
        orderIdRef.current = params.orderId;

        // Send push token to server so backend can update Live Activity remotely
        MoraLiveActivity.getPushToken(activityId).then((token) => {
          if (token && params.orderId) {
            const base = getApiBase();
            fetch(`${base}/store/orders/${params.orderId}/live-activity-token`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(authTokenRef.current
                  ? { Authorization: `Bearer ${authTokenRef.current}` }
                  : {}),
              },
              body: JSON.stringify({ pushToken: token }),
            }).catch(() => {});
          }
        });
      }
    }
  }, []);

  const updateOrderStage = useCallback((stage: OrderStage, message?: string) => {
    setOrderActivity((prev) =>
      prev ? { ...prev, stage, message } : null
    );
    if (liveActivityIdRef.current) {
      MoraLiveActivity.updateActivity(liveActivityIdRef.current, stage, message);
    }
  }, []);

  const endOrderActivity = useCallback(() => {
    setOrderActivity((prev) => prev ? { ...prev, active: false } : null);
    if (liveActivityIdRef.current) {
      MoraLiveActivity.endActivity(liveActivityIdRef.current, "delivered", "Order delivered!");
      liveActivityIdRef.current = null;
    }
    orderIdRef.current = null;
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        pushToken,
        permissionGranted,
        cartActivity,
        orderActivity,
        onUserLogin,
        onUserLogout,
        updateCartActivity,
        startOrderActivity,
        updateOrderStage,
        endOrderActivity,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationCtx {
  return useContext(NotificationContext);
}
