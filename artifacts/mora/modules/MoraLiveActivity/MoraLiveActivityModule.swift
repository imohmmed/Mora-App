import ExpoModulesCore
import ActivityKit
import Foundation

// ── Shared Attributes (MUST match MoraOrderActivity.swift exactly) ─────────────
struct MoraOrderActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var stage: String
        var message: String
    }
    var orderNumber: String
    var customerName: String
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

        // Start a new Live Activity, returns activityId
        Function("startActivity") { (
            orderNumber: String,
            customerName: String,
            stage: String,
            message: String
        ) -> String? in
            guard #available(iOS 16.1, *) else { return nil }
            guard ActivityAuthorizationInfo().areActivitiesEnabled else { return nil }

            do {
                let attrs = MoraOrderActivityAttributes(
                    orderNumber: orderNumber,
                    customerName: customerName
                )
                let state = MoraOrderActivityAttributes.ContentState(
                    stage: stage,
                    message: message
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
        Function("updateActivity") { (activityId: String, stage: String, message: String) in
            guard #available(iOS 16.1, *) else { return }
            if let activity = self.activities[activityId] as? Activity<MoraOrderActivityAttributes> {
                let state = MoraOrderActivityAttributes.ContentState(stage: stage, message: message)
                Task { await activity.update(using: state) }
            }
        }

        // End a Live Activity
        Function("endActivity") { (activityId: String, stage: String, message: String) in
            guard #available(iOS 16.1, *) else { return }
            if let activity = self.activities[activityId] as? Activity<MoraOrderActivityAttributes> {
                let state = MoraOrderActivityAttributes.ContentState(stage: stage, message: message)
                Task { await activity.end(using: state, dismissalPolicy: .default) }
                self.activities.removeValue(forKey: activityId)
            }
        }

        // Get APNs push token for a Live Activity (needed for server-side updates)
        AsyncFunction("getPushToken") { (activityId: String, promise: Promise) in
            guard #available(iOS 16.1, *) else {
                promise.resolve(nil)
                return
            }
            guard let activity = self.activities[activityId] as? Activity<MoraOrderActivityAttributes> else {
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

        // Get all active activity IDs
        Function("getActiveActivityIds") { () -> [String] in
            guard #available(iOS 16.1, *) else { return [] }
            return Activity<MoraOrderActivityAttributes>.activities.map { $0.id }
        }
    }
}
