/**
 * NotificationContext.tsx
 * Manages push notifications + in-app Live Activity banner state.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import {
  registerForPushNotificationsAsync,
  sendTokenToServer,
  removeTokenFromServer,
  scheduleLocalNotification,
  cancelScheduledNotification,
  setBadgeCount,
} from "@/services/notifications";

// ── Types ──────────────────────────────────────────────────────────────────────

export type OrderStage =
  | "confirmed"
  | "preparing"
  | "shipping"
  | "delivered"
  | "issue";

export type CartActivity = {
  active: boolean;
  totalItems: number;
};

export type OrderActivity = {
  active: boolean;
  orderId: string;
  stage: OrderStage;
  message?: string;
};

type NotificationCtx = {
  pushToken: string | null;
  permissionGranted: boolean;
  cartActivity: CartActivity;
  orderActivity: OrderActivity | null;
  /** Call on login to register the push token */
  onUserLogin: (authToken: string) => Promise<void>;
  /** Call on logout to deregister */
  onUserLogout: () => Promise<void>;
  /** Called by CartContext whenever cart changes */
  updateCartActivity: (totalItems: number) => void;
  /** Start order tracking Live Activity */
  startOrderActivity: (orderId: string, stage?: OrderStage) => void;
  /** Advance the order to next stage */
  updateOrderStage: (stage: OrderStage, message?: string) => void;
  /** End order Live Activity (called on delivered ack or dismiss) */
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

// ── Provider ───────────────────────────────────────────────────────────────────

const CART_REMINDER_ID = "mora_cart_reminder";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [cartActivity, setCartActivity] = useState<CartActivity>({ active: false, totalItems: 0 });
  const [orderActivity, setOrderActivity] = useState<OrderActivity | null>(null);

  const authTokenRef = useRef<string | null>(null);
  const cartReminderRef = useRef<string | null>(null);

  // ── Init: request permission on app start ────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === "web") return;
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setPushToken(token);
        setPermissionGranted(true);
      }
    });
  }, []);

  // ── Handle incoming push notifications (order stage updates from backend) ────
  useEffect(() => {
    if (Platform.OS === "web") return;
    let Notifications: typeof import("expo-notifications") | null = null;
    try { Notifications = require("expo-notifications"); } catch {}
    if (!Notifications) return;

    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, unknown>;
      if (data?.type === "live_activity" && data?.stage) {
        const stage = data.stage as OrderStage;
        const orderId = (data.orderId as string) ?? "";
        const message = data.message as string | undefined;
        setOrderActivity({ active: true, orderId, stage, message });
      }
    });

    return () => sub.remove();
  }, []);

  // ── Badge count sync ─────────────────────────────────────────────────────────
  useEffect(() => {
    setBadgeCount(cartActivity.totalItems > 0 ? cartActivity.totalItems : 0);
  }, [cartActivity.totalItems]);

  // ── Login: register token ────────────────────────────────────────────────────
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

  // ── Logout: deregister token ─────────────────────────────────────────────────
  const onUserLogout = useCallback(async () => {
    if (pushToken) await removeTokenFromServer(pushToken);
    authTokenRef.current = null;
  }, [pushToken]);

  // ── Cart Live Activity ────────────────────────────────────────────────────────
  const updateCartActivity = useCallback((totalItems: number) => {
    setCartActivity({ active: totalItems > 0, totalItems });

    // Schedule / cancel abandoned cart reminder
    if (totalItems > 0) {
      // Cancel previous reminder, schedule new one (2 hours)
      if (cartReminderRef.current) {
        cancelScheduledNotification(cartReminderRef.current);
      }
      scheduleLocalNotification({
        identifier: CART_REMINDER_ID,
        title: "نسيت شيئاً في سلتك! 🛒",
        body: `لديك ${totalItems} ${totalItems === 1 ? "منتج" : "منتجات"} بانتظارك — أكمل طلبك قبل نفاذ الكمية.`,
        delaySeconds: 2 * 60 * 60, // 2 hours
        data: { type: "abandoned_cart" },
      }).then((id) => { if (id) cartReminderRef.current = id; });
    } else {
      cancelScheduledNotification(CART_REMINDER_ID);
      cartReminderRef.current = null;
    }
  }, []);

  // ── Order Live Activity ───────────────────────────────────────────────────────
  const startOrderActivity = useCallback((orderId: string, stage: OrderStage = "confirmed") => {
    setOrderActivity({ active: true, orderId, stage });
    // Cart is now empty after checkout
    setCartActivity({ active: false, totalItems: 0 });
    cancelScheduledNotification(CART_REMINDER_ID);
  }, []);

  const updateOrderStage = useCallback((stage: OrderStage, message?: string) => {
    setOrderActivity((prev) =>
      prev ? { ...prev, stage, message } : { active: true, orderId: "", stage, message }
    );
  }, []);

  const endOrderActivity = useCallback(() => {
    setOrderActivity((prev) => prev ? { ...prev, active: false } : null);
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
