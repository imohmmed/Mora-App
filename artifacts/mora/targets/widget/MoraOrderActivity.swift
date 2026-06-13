import ActivityKit
import WidgetKit
import SwiftUI

// ── Shared Attributes (must match MoraLiveActivityModule.swift exactly) ────────
public struct MoraOrderActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var stage: String
        var message: String
    }
    var orderNumber: String
    var customerName: String
}

// ── Stage Helpers ──────────────────────────────────────────────────────────────
extension String {
    var stageIcon: String {
        switch self {
        case "confirmed":  return "checkmark.circle.fill"
        case "preparing":  return "shippingbox.fill"
        case "shipping":   return "truck.box.fill"
        case "delivered":  return "house.circle.fill"
        default:           return "clock.fill"
        }
    }
    var stageColor: Color {
        switch self {
        case "confirmed":  return Color(red: 0.01, green: 0.45, blue: 0.76)
        case "preparing":  return .orange
        case "shipping":   return Color(red: 0.01, green: 0.45, blue: 0.76)
        case "delivered":  return .green
        default:           return .gray
        }
    }
    var stageLabel: String {
        switch self {
        case "confirmed":  return "Order Confirmed"
        case "preparing":  return "Preparing Order"
        case "shipping":   return "Out for Delivery"
        case "delivered":  return "Delivered!"
        default:           return "Processing"
        }
    }
    var stageIndex: Int {
        let stages = ["confirmed", "preparing", "shipping", "delivered"]
        return stages.firstIndex(of: self) ?? 0
    }
}

// ── Progress Bar ───────────────────────────────────────────────────────────────
struct OrderProgressBar: View {
    let stage: String
    let accentColor: Color

    var body: some View {
        let stages = ["confirmed", "preparing", "shipping", "delivered"]
        let current = stage.stageIndex

        HStack(spacing: 3) {
            ForEach(Array(stages.enumerated()), id: \.offset) { idx, _ in
                Capsule()
                    .fill(idx <= current ? accentColor : Color.gray.opacity(0.25))
                    .frame(height: 3)
            }
        }
    }
}

// ── Lock Screen / Banner View ──────────────────────────────────────────────────
struct OrderBannerView: View {
    let context: ActivityViewContext<MoraOrderActivityAttributes>
    let accentColor = Color(red: 0.01, green: 0.45, blue: 0.76)

    var body: some View {
        VStack(spacing: 10) {
            HStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill(context.state.stage.stageColor.opacity(0.12))
                        .frame(width: 50, height: 50)
                    Image(systemName: context.state.stage.stageIcon)
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundColor(context.state.stage.stageColor)
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text("Order \(context.attributes.orderNumber)")
                        .font(.system(size: 15, weight: .bold))
                    Text(context.state.message.isEmpty ? context.state.stage.stageLabel : context.state.message)
                        .font(.system(size: 13))
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }

                Spacer()

                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(accentColor)
                        .frame(width: 40, height: 40)
                    Text("M")
                        .font(.system(size: 20, weight: .black, design: .rounded))
                        .foregroundColor(.white)
                }
            }

            OrderProgressBar(stage: context.state.stage, accentColor: accentColor)
        }
        .padding(16)
        .activityBackgroundTint(Color(.systemBackground))
        .activitySystemActionForegroundColor(.primary)
    }
}

// ── Widget Entry ───────────────────────────────────────────────────────────────
@available(iOS 16.1, *)
struct MoraOrderActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: MoraOrderActivityAttributes.self) { context in
            OrderBannerView(context: context)
        } dynamicIsland: { context in
            let accent = Color(red: 0.01, green: 0.45, blue: 0.76)
            return DynamicIsland {
                // Expanded — long press
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 8) {
                        Image(systemName: context.state.stage.stageIcon)
                            .font(.system(size: 22, weight: .semibold))
                            .foregroundColor(context.state.stage.stageColor)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Order \(context.attributes.orderNumber)")
                                .font(.system(size: 13, weight: .bold))
                            Text(context.attributes.customerName)
                                .font(.system(size: 11))
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.leading, 6)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(context.state.stage.stageLabel)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(context.state.stage.stageColor)
                        Text("Mora")
                            .font(.system(size: 11))
                            .foregroundColor(.secondary)
                    }
                    .padding(.trailing, 6)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 6) {
                        if !context.state.message.isEmpty {
                            Text(context.state.message)
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 6)
                        }
                        OrderProgressBar(stage: context.state.stage, accentColor: accent)
                            .padding(.horizontal, 6)
                            .padding(.bottom, 6)
                    }
                }
            } compactLeading: {
                Image(systemName: context.state.stage.stageIcon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(context.state.stage.stageColor)
            } compactTrailing: {
                Text(context.attributes.orderNumber)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.primary)
            } minimal: {
                Image(systemName: context.state.stage.stageIcon)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(context.state.stage.stageColor)
            }
            .widgetURL(URL(string: "mora://orders/\(context.attributes.orderNumber)"))
            .keylineTint(Color(red: 0.01, green: 0.45, blue: 0.76))
        }
    }
}

// ── Widget Bundle ──────────────────────────────────────────────────────────────
@main
struct MoraWidgetBundle: WidgetBundle {
    @WidgetBundleBuilder
    var body: some Widget {
        if #available(iOS 16.1, *) {
            MoraOrderActivityWidget()
        }
    }
}
