import ExpoModulesCore
import ActivityKit
import Foundation

// ── Shared Attributes (MUST match MoraOrderActivity.swift exactly) ─────────────
struct MoraOrderActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var stage: String
        var message: String
        var isPaid: Bool
        var deliveryType: String?   // "standard" | "express" | "pickup" (optional for back-compat)
    }
    var orderNumber: String
    var customerName: String
    var priceText: String
}

// ── Module ─────────────────────────────────────────────────────────────────────
public class MoraLiveActivityModule: Module {
    // Keep a reference to running activities by ID
    var activities: [String: Any] = [:]

    public func definition() -> ModuleDefinition {
        Name("MoraLiveActivity")

        // Check if Live Activities are available on this device
        Function("isAvailable") { () -> Bool in
            if #available(iOS 16.1, *) {
                return ActivityAuthorizationInfo().areActivitiesEnabled
            }
            return false
        }

        // Diagnostics — returns the exact device state so failures stop being silent.
        Function("diagnose") { () -> [String: Any] in
            var info: [String: Any] = [:]
            info["moduleLoaded"] = true
            info["iosVersion"] = ProcessInfo.processInfo.operatingSystemVersionString
            if #available(iOS 16.1, *) {
                let auth = ActivityAuthorizationInfo()
                info["activityKitAvailable"] = true
                info["areActivitiesEnabled"] = auth.areActivitiesEnabled
                if #available(iOS 17.2, *) {
                    info["frequentPushesEnabled"] = auth.frequentPushesEnabled
                    info["pushToStartSupported"] = true
                } else {
                    info["pushToStartSupported"] = false
                }
                info["activeActivities"] = Activity<MoraOrderActivityAttributes>.activities.count
            } else {
                info["activityKitAvailable"] = false
                info["areActivitiesEnabled"] = false
            }
            return info
        }

        // Start a test Live Activity and RESOLVE with the precise outcome/error.
        // Unlike startActivity (which silently returns nil), this surfaces the real
        // failure reason so the user/agent can see exactly what's wrong on-device.
        AsyncFunction("startTestActivity") { (promise: Promise) in
            guard #available(iOS 16.1, *) else {
                promise.resolve(["ok": false, "error": "iOS < 16.1 — Live Activities unsupported"])
                return
            }
            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                promise.resolve(["ok": false, "error": "Live Activities are turned OFF in Settings → Mora"])
                return
            }
            // End any prior test activities so repeated taps don't accumulate.
            for activity in Activity<MoraOrderActivityAttributes>.activities
            where activity.attributes.orderNumber == "#TEST" {
                Task { await activity.end(dismissalPolicy: .immediate) }
            }
            do {
                let attrs = MoraOrderActivityAttributes(orderNumber: "#TEST", customerName: "Diagnostic", priceText: "75,000 IQD")
                let state = MoraOrderActivityAttributes.ContentState(
                    stage: "confirmed",
                    message: "Test Live Activity — if you see this, it works.",
                    isPaid: false
                )
                let activity = try Activity<MoraOrderActivityAttributes>.request(
                    attributes: attrs,
                    contentState: state,
                    pushType: .token
                )
                self.activities[activity.id] = activity
                promise.resolve(["ok": true, "activityId": activity.id])
            } catch {
                promise.resolve(["ok": false, "error": "Activity.request failed: \(error.localizedDescription)"])
            }
        }

        // Start a new Live Activity, returns activityId
        Function("startActivity") { (
            orderNumber: String,
            customerName: String,
            stage: String,
            message: String,
            priceText: String,
            isPaid: Bool,
            deliveryType: String
        ) -> String? in
            guard #available(iOS 16.1, *) else { return nil }
            guard ActivityAuthorizationInfo().areActivitiesEnabled else { return nil }

            do {
                let attrs = MoraOrderActivityAttributes(
                    orderNumber: orderNumber,
                    customerName: customerName,
                    priceText: priceText
                )
                let state = MoraOrderActivityAttributes.ContentState(
                    stage: stage,
                    message: message,
                    isPaid: isPaid,
                    deliveryType: deliveryType
                )
                let activity = try Activity<MoraOrderActivityAttributes>.request(
                    attributes: attrs,
                    contentState: state,
                    pushType: .token
                )
                self.activities[activity.id] = activity
                return activity.id
            } catch {
                return nil
            }
        }

        // Update an existing Live Activity
        Function("updateActivity") { (activityId: String, stage: String, message: String, isPaid: Bool, deliveryType: String) in
            guard #available(iOS 16.1, *) else { return }
            if let activity = self.activities[activityId] as? Activity<MoraOrderActivityAttributes> {
                let state = MoraOrderActivityAttributes.ContentState(stage: stage, message: message, isPaid: isPaid, deliveryType: deliveryType)
                Task { await activity.update(using: state) }
            }
        }

        // End a Live Activity
        Function("endActivity") { (activityId: String, stage: String, message: String, isPaid: Bool, deliveryType: String) in
            guard #available(iOS 16.1, *) else { return }
            if let activity = self.activities[activityId] as? Activity<MoraOrderActivityAttributes> {
                let state = MoraOrderActivityAttributes.ContentState(stage: stage, message: message, isPaid: isPaid, deliveryType: deliveryType)
                Task { await activity.end(using: state, dismissalPolicy: .default) }
                self.activities.removeValue(forKey: activityId)
            }
        }

        // Get APNs push token for a Live Activity (needed for server-side updates).
        // Falls back to scanning Activity.activities so push-to-start activities
        // (started remotely by the server) are also captured.
        AsyncFunction("getPushToken") { (activityId: String, promise: Promise) in
            guard #available(iOS 16.1, *) else {
                promise.resolve(nil)
                return
            }
            // 1. Check local cache first
            var activity = self.activities[activityId] as? Activity<MoraOrderActivityAttributes>
            // 2. Fall back to system activity list (covers push-to-start)
            if activity == nil {
                activity = Activity<MoraOrderActivityAttributes>.activities.first(where: { $0.id == activityId })
                if let a = activity { self.activities[activityId] = a }
            }
            guard let activity = activity else {
                promise.resolve(nil)
                return
            }
            Task {
                for await token in activity.pushTokenUpdates {
                    let hex = token.map { String(format: "%02x", $0) }.joined()
                    promise.resolve(hex)
                    return
                }
                promise.resolve(nil)
            }
        }

        // Returns all currently active activities with their IDs and orderNumbers.
        // Used on app launch to re-register push tokens for push-to-start activities.
        Function("getActiveActivities") { () -> [[String: String]] in
            guard #available(iOS 16.1, *) else { return [] }
            let systemActivities = Activity<MoraOrderActivityAttributes>.activities
            // Cache them so getPushToken() works for all of them
            for a in systemActivities { self.activities[a.id] = a }
            return systemActivities.map { [
                "id": $0.id,
                "orderNumber": $0.attributes.orderNumber
            ] }
        }

        // Get the push-to-start token (iOS 17.2+). This is captured on app launch
        // and sent to the server so the backend can START a Live Activity remotely
        // via APNs — even if the app is not running. This is the robust pattern used
        // by delivery apps and does not depend on an on-device Activity.request().
        AsyncFunction("getPushToStartToken") { (promise: Promise) in
            guard #available(iOS 17.2, *) else {
                promise.resolve(nil)
                return
            }
            Task {
                for await tokenData in Activity<MoraOrderActivityAttributes>.pushToStartTokenUpdates {
                    let hex = tokenData.map { String(format: "%02x", $0) }.joined()
                    promise.resolve(hex)
                    return
                }
                promise.resolve(nil)
            }
        }

        // Get all active activity IDs
        Function("getActiveActivityIds") { () -> [String] in
            guard #available(iOS 16.1, *) else { return [] }
            return Activity<MoraOrderActivityAttributes>.activities.map { $0.id }
        }
    }
}
