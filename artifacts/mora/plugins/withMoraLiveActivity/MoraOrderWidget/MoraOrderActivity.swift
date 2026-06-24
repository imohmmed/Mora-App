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

// ── Brand palette ───────────────────────────────────────────────────────────────
let kAccent = Color(red: 0.01, green: 0.45, blue: 0.76)   // #0373C2

// ── Stage Helpers ──────────────────────────────────────────────────────────────
extension String {
    var isExceptionStage: Bool { self == "issue" || self == "cancelled" }

    var stageIcon: String {
        switch self {
        case "confirmed":  return "checkmark.seal.fill"
        case "preparing":  return "shippingbox.fill"
        case "shipping":   return "shippingbox.and.arrow.backward.fill"
        case "delivered":  return "checkmark.circle.fill"
        case "issue":      return "exclamationmark.triangle.fill"
        case "cancelled":  return "xmark.circle.fill"
        default:           return "clock.fill"
        }
    }
    var stageColor: Color {
        switch self {
        case "confirmed":  return kAccent
        case "preparing":  return .orange
        case "shipping":   return kAccent
        case "delivered":  return .green
        case "issue":      return .orange
        case "cancelled":  return .red
        default:           return .gray
        }
    }
    var stageLabel: String {
        switch self {
        case "confirmed":  return "تم تثبيت الطلب"
        case "preparing":  return "يتم تجهيز الطلب"
        case "shipping":   return "في الطريق إليك"
        case "delivered":  return "تم التوصيل"
        case "issue":      return "هناك مشكلة في الطلب"
        case "cancelled":  return "تم إلغاء الطلب"
        default:           return "قيد المعالجة"
        }
    }
    var stageIndex: Int {
        let stages = ["confirmed", "preparing", "shipping", "delivered"]
        return stages.firstIndex(of: self) ?? 0
    }
}

// ── Brand mark (text logo, no image asset) ───────────────────────────────────────
struct MoraLogoMark: View {
    var size: CGFloat = 40
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.27, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [kAccent, kAccent.opacity(0.78)],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    )
                )
                .frame(width: size, height: size)
            Text("M")
                .font(.system(size: size * 0.52, weight: .black, design: .rounded))
                .foregroundColor(.white)
        }
    }
}

// ── Contact Us button (issue / cancelled) ────────────────────────────────────────
struct ContactButton: View {
    var body: some View {
        Link(destination: URL(string: "mora://chat")!) {
            HStack(spacing: 6) {
                Image(systemName: "bubble.left.and.bubble.right.fill")
                    .font(.system(size: 12, weight: .semibold))
                Text("تواصل معنا")
                    .font(.system(size: 13, weight: .bold))
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 9)
            .background(kAccent)
            .cornerRadius(11)
        }
    }
}

// ── Stepped Progress Bar ─────────────────────────────────────────────────────────
struct OrderProgressBar: View {
    let stage: String
    let accentColor: Color

    var body: some View {
        let stages = ["confirmed", "preparing", "shipping", "delivered"]
        let current = stage.stageIndex

        HStack(spacing: 4) {
            ForEach(Array(stages.enumerated()), id: \.offset) { idx, _ in
                Capsule()
                    .fill(idx <= current ? accentColor : Color.white.opacity(0.16))
                    .frame(height: 4)
            }
        }
    }
}

// ── Lock Screen / Banner View ──────────────────────────────────────────────────
struct OrderBannerView: View {
    let context: ActivityViewContext<MoraOrderActivityAttributes>
    let accentColor = kAccent

    var body: some View {
        let isException = context.state.stage.isExceptionStage
        VStack(spacing: 12) {
            HStack(spacing: 13) {
                ZStack {
                    Circle()
                        .fill(context.state.stage.stageColor.opacity(0.16))
                        .frame(width: 48, height: 48)
                    Image(systemName: context.state.stage.stageIcon)
                        .font(.system(size: 21, weight: .semibold))
                        .foregroundColor(context.state.stage.stageColor)
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text("الطلب \(context.attributes.orderNumber)")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                    Text(context.state.stage.stageLabel)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(context.state.stage.stageColor)
                        .lineLimit(1)
                }

                Spacer()

                MoraLogoMark(size: 40)
            }

            if !context.state.message.isEmpty {
                Text(context.state.message)
                    .font(.system(size: 12.5))
                    .foregroundColor(.white.opacity(0.62))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .lineLimit(2)
            }

            if isException {
                ContactButton()
            } else {
                OrderProgressBar(stage: context.state.stage, accentColor: accentColor)
            }
        }
        .padding(16)
        .activityBackgroundTint(.black)
        .activitySystemActionForegroundColor(.white)
    }
}

// ── Widget Entry ───────────────────────────────────────────────────────────────
@available(iOS 16.1, *)
struct MoraOrderActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: MoraOrderActivityAttributes.self) { context in
            OrderBannerView(context: context)
        } dynamicIsland: { context in
            let accent = kAccent
            return DynamicIsland {
                // Expanded — long press
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 9) {
                        ZStack {
                            Circle()
                                .fill(context.state.stage.stageColor.opacity(0.16))
                                .frame(width: 36, height: 36)
                            Image(systemName: context.state.stage.stageIcon)
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundColor(context.state.stage.stageColor)
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text("الطلب \(context.attributes.orderNumber)")
                                .font(.system(size: 13, weight: .bold))
                            Text(context.attributes.customerName)
                                .font(.system(size: 11))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                        }
                    }
                    .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(context.state.stage.stageLabel)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(context.state.stage.stageColor)
                            .lineLimit(1)
                        Text("Mora")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.secondary)
                    }
                    .padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 8) {
                        if !context.state.message.isEmpty {
                            Text(context.state.message)
                                .font(.system(size: 12))
                                .foregroundColor(.white.opacity(0.62))
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 4)
                        }
                        if context.state.stage.isExceptionStage {
                            ContactButton()
                                .padding(.horizontal, 4)
                                .padding(.bottom, 4)
                        } else {
                            OrderProgressBar(stage: context.state.stage, accentColor: accent)
                                .padding(.horizontal, 4)
                                .padding(.bottom, 4)
                        }
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
            .keylineTint(kAccent)
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
