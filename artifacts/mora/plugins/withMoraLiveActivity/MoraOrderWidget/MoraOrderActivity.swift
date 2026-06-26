import ActivityKit
import WidgetKit
import SwiftUI

// ── Shared Attributes (must match MoraLiveActivityModule.swift exactly) ────────
public struct MoraOrderActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var stage: String
        var message: String
        var isPaid: Bool    // true when payment confirmed → shows "تم دفع الطلب"
        var deliveryType: String?   // "standard" | "express" | "pickup" (optional for back-compat)
    }
    var orderNumber: String
    var customerName: String
    var priceText: String   // formatted total, e.g. "75,000 IQD"
}

// ── Brand palette (background black, text white, accent = site blue) ───────────
let kAccent   = Color(red: 0.008, green: 0.455, blue: 0.757)  // #0274C1
let kDanger   = Color(red: 0.898, green: 0.286, blue: 0.302)  // #E5494D  (cancelled)
let kWarning  = Color(red: 0.961, green: 0.620, blue: 0.043)  // #F59E0B  (issue / amber)
let kSuccess  = Color(red: 0.204, green: 0.780, blue: 0.349)  // #34C759
let kDim      = Color.white.opacity(0.55)
let kTrack    = Color.white.opacity(0.14)

// ── Embedded hollow Mora wordmark (white, base64 PNG — no asset catalog) ───────
let kMoraLogoBase64 = "iVBORw0KGgoAAAANSUhEUgAAAPAAAABGCAQAAABYz9FxAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAACYktHRAD/h4/MvwAAAAlwSFlzAAALEgAACxIB0t1+/AAAAAd0SU1FB+oGGBEQHVXGr1sAAAABb3JOVAHPoneaAAART0lEQVR42u2deXRUVbbGfzVlTkggkBCSQBgChDCGMIOAYoMCdtv62qG7n7MPn09dKPYT0ddObQOKrY/lQCvd7YCtgoq4zBMVJ0BaEFHmIYBAmAIJhBDIULXfH6kkdavucG6lAqvTfLVWkrrDPvvs75599tnnnBuHcAGtGc7zrcAFtCwuENzKcYHgVg47BMeSiaNFtEgm9nwborXCDsEDeITsFtAhgbsZer4N0VqhTrCDS/kt0/BEXIfLuZuLW8g3/MtDneBEBuPmOi6JsAbZ/BcpFJJ8vk3ROqFOcFf6Alk8SG4Ey4/mZoYA+XQ+36ZonVAneASdABjJHURHrPzJ/AceIJVB59sUrROqBMcxFrf/72si5qZ7ch8dAIhmeAv07hegTHAn+jb+ncZMukeg7ARmBETPA0k/38ZojVAleBhdNN9uIqbZZV/OlQGxcy4DzrcxWiPUCI5hvIZQJ7cxuZkl92cGKQHfEym4MFSKPNQIzmJY0JF2TG+Wm07mXgqCjo2h/fk2R+uDGsG9yQo5NpR7SAyzVAdX84uQo/3JO9/maH1wK1zjpIB4naO/ZS1/C6vUAdxNQsjRJHL5otk1chBPDO1xASD4OEYVZ/BF1G4tDZd/TBE4Xe+j1r4gFYI7GAyLErmXTXxnu8w0ZtBHV5dhvMrZZhglm3z6M4xkOuHxG8dLCWWsYx3b2ItXWZojKCIIXRlhvlYilnSyaI8PH/vZRYVliTEkE00OfUggjcyQMk6wg0q2c5hSKqlWq4YKwd3pYXCmL/dxB+XKRqs33HVcaXBuJNnssCWtAYkMYyLjyCUuJFTrDEzmNLv4jI9Zo2BqgEu5PMC8Qg1CcIvyAQ5+4F3qNPcmMZpfUUAaCQhCGZ8xh82GFkmmK4MYTj9iSSfFMNgUvJyijCPsZB3fs40Tlo+sWH0c8qD4xAinZZo4LWUEfkbJNkNplXKlLVn1nxi5VN6Q0iBZe2WOPCKPyWvyqWyRcv/RY/KmTJQ4BamzRBVvS3TAfR4ZLovkeMhVSyRFp5Ro6SvTZbnsl1r/dTVyXI5Kqf9TYVhqnRyRFTJbLpJYs3pYt+AkRpsMX+K4ly18qdzS0rifnoZn4xnHMps9TS9u5XrSQo7v5HEqgBiiSCWXCQwhj3Zcw8W8wXyKLZ98VQS2oQxu4UZNzqABQ8kK8nVuCriZceT444VDrGMlB/iJWvDbPJWBjGWoTsTiogMdGMdvWMYbfGvYtVk+ycOlxOIJ/kDSFNuaW+6Xs6ayvlGWVd92p8pKA0mfSJLmWpekyQSZL3tExCdfyxTxmMp+WLkFv9nYggulSGoMrjoiBRr5neUJ2dl4tkSel1FBGjd82sutss9UgxKZLV3062FtxHvEa1HBs/KAxkkZf0bLbgtZpTJWmd4EmSlHNXfvlWWyVNaLt5FgtyRJG4kXR6MDHS1L5bSIlMgMA4OGS/AQWSUiInVSIl/JElkiq+VoY/f2qXQMkD5Mihrt6pPVcpmpBV3y7zpOPxB18oVcpvfIWhkxVl5TqOJR+aUCIZmyzFKSTx5UpndWSA+1UNKlvdwhdSLykSQKkiXz5R25V6IC7kyVe2SfiJyWRyUxAgQvkihBCmW1iIjskUelUFIlRmIlTUbJ47JCvpY3ZGiA7K7yeUCNP5DelrVNkqWWehyQG0MpthKcL7uUKrlCciwkxciTUqcg6X1JUKDXI/frBCB75W15UhbKZqmV1yVGYiRHJsskyQsKBN0yUVaJSKU8Ykjx/ygTvEDcUiirRKRK3pLhQUZ2SbKkaMI6t8wO8IpLpYfSA32XgvUOyBS7BF8vZ5Qq6ZVnLYiZLIeVJO2RfpaVdclVBpHBXpkgfWSylEiRxMpY+bu8LeN1ZeTJZyJySu4Ul+753yvS65PpMlBWicgRuU/aKVCV6m/rIlWyQLopeqzxclJBmzXB3sD1e7P4MJr/ZIhSJOmgNwf43vB8F+boJjdCEc96Ezn1GM1zBitAosggiyxiOM1WaimmiG26EWYpm+hDd/LYwU6d82MZq6QvVDKFizjK73iZSqU7elCAiwPM40kOKpaSxbUKM3iZCJ9rRuWmT00X+VHZUYn8IIMM5CTIs0ruuR7PW8S3mbLc5O5auV0ypIv8Ub6R9bJYMkwkjZPtIvKVbvfyiLK+PhE5LncpBpoI0l6my6MyShMZWH3GygklbXZIL3UXfYNU2iBY5B3poCvn14rK1WODdDZ1zzOk2uTuOnlBrpCbZYZMlZtkqmlSwyHXSpn45EkdUz9qQ+MyuUtibJCFOBrjetWPmosWOSkTA+8zm01y0l9nksEMU7ldJ3WSx3Ta2JDS3XR9Vh9uIcrkvLCHtXxDF25gCpfopAgCr/2AxTi4hn626qlFHQt52WYOXWipXX8J2sSyWSYrjcE2hUdxG9/ycVCBd9lcqxFPP94zOBfNDYaZ8YYaTSYRJ/tZzFkqOWF69Wle4iJyuYYfwpmrAWAFf6IqzHsjDydZOJvmzswIHhCwDksVmcxid0DQ4uZafmV7pcYAEjmle6YbV1hK28gC4Awn8IbMCYViA2/xEJfxUlCopaqzj2UcsG0n+1C3YTaeprkmMxddQFIYiozkvgCHPIZZYSxpH2S4WmSkfxrNGJWsZT/7OUYdokCwl7fZRQ/Gh1FXAFGduDtn0NTYuAW3NZ1kMBN/PT/yIl6gI/eRzVl20cPWWupOjNQdKrXhctP+F+Bd3gOiiOUUPrx4Ah2WLnaxiu5cwhuaQc65Wh8WTSpZZNAZB01982H2UcIxToehkS+wfzcmOI8BwDGSLE0ajHims5kviGEaFwOf8hh/4GIbElyMYaFOv5Zt2Zuf4E1O4uYm2vEU1YDgsiD4LP/HvzGILLYGHG35jbVOshjFBPqQTWLj/sp6cqqp5BA7+JL1bLaII0xhTPBwOnCM/2aSZnGrGroyi70MZBpR7GIu3/KdLYKhK8k6BA+mo8V9+9gMpDONnbjxUodPYUp0PYfIIFdDcMu2YBcD+DmT6E1c0Jn6cmOIIZW+/JJjrKaIz4kNTyOjyicwDCjmA1bSnjG25Y7hOTJJpYp5fA2s47StIVdX8kNyPA66WXqTGqpxkE8iH1FDFA68gMNiUFLOQbqSz9JwTBjGaq9sbuR6k9HATorYg4tccsllKpPZTpnySnRNXY0I7k4B8C3llPIUvfwbTNThYQogvMmbCPADBy2GN1qkMIZPgmiJNVkqEIgs8qjge2qJI0opeVhBCZCFp3GoZB2cNcEuwYXMYrJJF3CYmbyHF/CQRA5XcTW9bcjXWM2omBFkUskK6oDlzAtznLeKOf7+45DttVahMbxbIV3ShhTq+JJKkvFQjRe3QlKhhh1AjxB3GXk4+BkLmGrawy9mmX+VSC3HWcdDXM0CToZXoH5BcYzFxWG2AFDNy3wWhuwynm6ktZLVNnM3fUO2qba17IEhi4kkUksHrsODD6dliAUgnALcGmuot2A79RrBXItAsYZvggZetaznXuYpJ2IUWnAG+cBWDvu/H+ePbLdRDQAfr7A8oNC1iqsZG5AekkdL1Gx10UcM07iOcvbQESdCNEk2XGigaVQJtpN0zOAhy+SRT3dcXclaauyYrwH6BBfSBTQLTNcwx6aTWMufNY59m+6knDFcDAkKK84o9ac9KaSc2XyAAx9nOKFEwLkY9bq4lnFh6xKmhnoERzGeWCo0qQYf7/C2jWe1hMeCCC1lr03dhgVtmDnGIaX7BGEFr1CJjxrFSYBz8cK/fG5Xyik0VxeNT9EjuAODgINBYdEp5rFGsYg65gdNOUA1P9qMN7PoZay4CRKIBbwITuX8WQxQG5aLVo2iHUykWwTlKd6vR3B/ugHfh7SXbTxBiVIRy3k9aK0/CCttZmTiGaHRr06xk4jCQw+GEodbkaY48oHtmsSgaiZLtb0lM0FRZkS9SWiRLsbTBi8rdYZGy3laIVQ6yNO68ys7+cmmdtr56Cq2Kd11mBoe5EqcJCiatD15wJGQhzKSyFBsv82HRRSdzijgiO6msloWUmQhvpKnWKl7ptQ/7FJHnmaoJGxSmrnxEEUa8UCcIsHtaEd1UKIy0sOkHNopStOXF6Y+oQaoN+oedunefJK5FvsJP+avBgF9NWtstpGsoCTpFo4p3JVDOg7KgLOKfXAeqezlR80xly1NrZGunEYxIjisODqU4ELaAJsMXfF3zDHZT7ibuSZn13LcpnaDNBTtZYPCXW1oz1FqScSttHsynkl42Mi+cAzIuYnAw9YomOC2jMVBNV+Z5E0+ZIFBG63kJdabFLxbsRdtQr4mC15OkYIPaMvDjKQTMURzUsH8eYzhLEWcCc+a52hreYRcdB/6Y9VbVjGPxbpnPuQl04TacdbZrFbXoMzPFwo57VhG0pVkDvGTQtztZgqZbOYTm5o1QLX9uhQpMuqD3eHF9cE3DSQVKGa/qYijPKWznbmY+RYG9fG9zQUuSUHv3tnGMuVq+pSMP5hfI7yvOAAMH1XK8UcLDpMSGIMT2Gk5GNrAM0FknmauQiJkC0dtajhKM6vk5V3bgy0zJHEnOWxhcTMcrRohO5qzLiN8fbQEd2cwUM2XljMXwlu8qtn6vJzFCm/A2Ge58ToYPYM2qWzgeaXeUsXsbq5mMrW8qpMnj/Qw6VDj1E148iLSBw8hAyhXmjmq5JmAnf1bmKMUIZ/gB2VF65FBoeZ7DX+18UYBc1zGI7ShiL/ZeDlLuDjCty1eRgMMomgPg/AAW9itJGYPj7MHgLPMV8xTe/nOZi/soSDoNaVHeZRNETDDcB6mE9uYzZFmSFHNkFfzocFa70jDMBfd0b9lpFh5YvArnqYK+MggqtbDJkptKjw0ZMHQGtOxuBpG8CcKKGU23+icdSi/+9ahHN2uZrXCVWIQDUQrO+mOgSmVQOUGkgd42awc73lZxFKKmWeDtGLbQ6VsckKMsJinNVMDeoYyRhQ/5wWGUMrDLDK4UpW2KOUccymvKrVhPX2Gcavy8uX0wHn0pmp4mEA8UM5aRUEA5fyBmbZ6lwrbr05LYUTI03uG/+W5MFtxB2byAv0o5WEWhrdOIkg/1bb1Ie9YXhPq8pO5gwWMUy4lWp/gDgwH4JDNEeFmFtvctrXT5k48F5NoG3K0gsf5nUl60avbEuIZz4s8QDq7eCAi9NrJZFXwFF9b1jbwDaCxjGYec+lrY3ScRkbTlyaCc/3DkY02R6piewS5yXZSIUfnPVhQxV+4hZUG5Qd3My7achULWMQv8LCK2/iLCb0ttYRnKw+ZJnMhlmvIxkU0HfkZz/B3bgQW85pypJ8YuH+rIRnv5BL/dNb2sHOyqviJzTbnRlPpoZs8reMTdnOH7ovQXAjgwUEsmfRiJH0ZTDJwgNd5xWC2LBzY2+v7FTczk6km81xTSWUTbcmhF8nARp5lCRO5VnGGK45C3m94HJoITgWgTCnSax6q2MJl6LUSh+4xiGcoywxaajGz+JDfMJ4sTWBUyHSgJ1Gk0pN0/96f/SzjHVYruGaVeahwIGzgTrZyg+E/GfNwERf5/z7IEl5mI4LTxgTmRF5sWAHXUA0vi6gjlVX8o4Uq1gQff2YTUf6ymyh14AmgyOH/6QKcFOM2JOUMn7OG3kzkEvqR7DdEb2ZrzHqCbRRRxEbFCGANbnx+fRyNv5seQqf/p4uNti1wlCf4iOu5gkzDaP0MxXzMEjb4Peph/qH5B4AOv3UcmiPgxI3QuYFgh2anocv/TtV/TjhoRz696U1PUoAUvFTgoIx9bGcDWzloo3YunEij+RwhZTU9gnVhvhsgmgGMJJ+edCUecOOhljrK2c9OVrCK/QGSo0gxePy1+jlxAscachmOf14+DeEikSigLV4qqN+K2ZKrrZqHKFLoQiKQTAplnOIQhzkZkfie1knwBQTgwv8PbuW4QHArxwWCWzn+H9ZOihLuHHpNAAAAeGVYSWZNTQAqAAAACAAFARIAAwAAAAEAAQAAARoABQAAAAEAAABKARsABQAAAAEAAABSASgAAwAAAAEAAgAAh2kABAAAAAEAAABaAAAAAAAAAEgAAAABAAAASAAAAAEAAqACAAQAAAABAAAFAKADAAQAAAABAAAFAAAAAABLIWroAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDI2LTA2LTA2VDE4OjEyOjI2KzAwOjAwk6JRJAAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyNi0wNi0wNlQxODoxMjoyNiswMDowMOL/6ZgAAAAodEVYdGRhdGU6dGltZXN0YW1wADIwMjYtMDYtMjRUMTc6MTY6MjkrMDA6MDA+pXhFAAAAEnRFWHRleGlmOkV4aWZPZmZzZXQAOTBZjN6bAAAAGXRFWHRleGlmOlBpeGVsWERpbWVuc2lvbgAxMjgwDMOu4gAAABl0RVh0ZXhpZjpQaXhlbFlEaW1lbnNpb24AMTI4MLU4dQoAAAAASUVORK5CYII="

func moraLogoImage() -> Image? {
    guard
        let data = Data(base64Encoded: kMoraLogoBase64),
        let ui = UIImage(data: data)
    else { return nil }
    return Image(uiImage: ui).renderingMode(.template)
}

// ── Stage Helpers ──────────────────────────────────────────────────────────────
let kStageFlow = ["confirmed", "preparing", "shipping", "delivered"]
// Pickup orders skip the shipping step → 3-step tracker.
let kPickupStageFlow = ["confirmed", "preparing", "delivered"]

// Returns the ordered step flow for the given delivery type.
func stageFlow(for deliveryType: String?) -> [String] {
    return deliveryType == "pickup" ? kPickupStageFlow : kStageFlow
}

extension String {
    var isExceptionStage: Bool { self == "issue" || self == "cancelled" }
    var isTerminalStage: Bool { self == "delivered" || self.isExceptionStage }

    var stepIcon: String {
        switch self {
        case "confirmed": return "bag.fill"
        case "preparing": return "shippingbox.fill"
        case "shipping":  return "truck.box.fill"
        case "delivered": return "checkmark.seal.fill"
        default:          return "circle.fill"
        }
    }

    // Big Arabic headline shown per stage.
    var stageHeadline: String {
        switch self {
        case "confirmed": return "تم تثبيت طلبك"
        case "preparing": return "تم تجهيز طلبك"
        case "shipping":  return "طلبك في الطريق"
        case "delivered": return "تم توصيل طلبك"
        case "issue":     return "صارت مشكلة بطلبك"
        case "cancelled": return "تم إلغاء طلبك"
        default:          return "قيد المعالجة"
        }
    }

    // Default subtitle (overridden by ContentState.message when non-empty).
    var stageSubtitle: String {
        switch self {
        case "confirmed": return "استلمنا طلبك وراح نبلش نجهزه إلك"
        case "preparing": return "نجهز طلبك ونحضّره للشحن"
        case "shipping":  return "تم تسليم طلبك لشركة التوصيل"
        case "delivered": return "نتمنى ينال إعجابك 🎉"
        case "issue":     return "تواصل ويانا حتى نحلها إلك بأسرع وقت"
        case "cancelled": return "تواصل ويانا للمساعدة"
        default:          return ""
        }
    }

    // Expected-arrival pill text (non-terminal stages only), delivery-type aware.
    func stageEta(for deliveryType: String?) -> String? {
        // Pickup orders are prepared in-store — no delivery ETA.
        if deliveryType == "pickup" { return nil }
        switch self {
        case "confirmed", "preparing":
            return deliveryType == "express"
                ? "متوقع الوصول خلال 1-3 أيام"
                : "متوقع الوصول خلال 1-5 أيام"
        case "shipping":               return "متوقع الوصول خلال 1-2 يوم"
        default:                       return nil
        }
    }

    var stageAccent: Color {
        switch self {
        case "issue":     return kWarning
        case "cancelled": return kDanger
        default:          return kAccent
        }
    }

    var stageHeadlineColor: Color {
        switch self {
        case "issue":     return kWarning
        case "cancelled": return kDanger
        default:          return .white
        }
    }

    var stageIndex: Int { kStageFlow.firstIndex(of: self) ?? 0 }

    var deepLink: URL {
        // confirmed/preparing/shipping → My Orders; delivered/issue/cancelled → support chat.
        let path = (self == "delivered" || isExceptionStage) ? "mora://chat" : "mora://orders"
        return URL(string: path)!
    }
}

// ── Brand mark (wordmark, color configurable) ─────────────────────────────────────
struct MoraLogoMark: View {
    var height: CGFloat = 15
    var color: Color = .white
    var body: some View {
        if let logo = moraLogoImage() {
            logo
                .resizable()
                .scaledToFit()
                .foregroundColor(color)
                .frame(height: height)
        } else {
            Text("Mora")
                .font(.system(size: height, weight: .heavy, design: .rounded))
                .foregroundColor(color)
        }
    }
}

// ── Price / paid badge ───────────────────────────────────────────────────────────
struct PricePill: View {
    let priceText: String
    let isPaid: Bool
    var body: some View {
        if isPaid {
            HStack(spacing: 4) {
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 11, weight: .bold))
                Text("تم دفع الطلب")
                    .font(.system(size: 12, weight: .bold))
            }
            .foregroundColor(kSuccess)
        } else {
            Text(priceText)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.white)
        }
    }
}

// ── ETA pill ─────────────────────────────────────────────────────────────────────
struct EtaPill: View {
    let text: String
    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: "clock.fill")
                .font(.system(size: 10, weight: .semibold))
            Text(text)
                .font(.system(size: 11.5, weight: .semibold))
        }
        .foregroundColor(.white.opacity(0.85))
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(Capsule().fill(Color.white.opacity(0.10)))
    }
}

// ── Action buttons ───────────────────────────────────────────────────────────────
struct ContactButton: View {
    var tint: Color = kDanger
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
            .background(tint)
            .cornerRadius(11)
        }
    }
}

struct RateButton: View {
    var body: some View {
        Link(destination: URL(string: "mora://chat")!) {
            HStack(spacing: 6) {
                Image(systemName: "star.fill")
                    .font(.system(size: 12, weight: .semibold))
                Text("انطينا رأيك")
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

// ── Dribbble-style 4-step tracker (icons + connecting line + checkmarks) ──────────
struct OrderStepsBar: View {
    let stage: String
    var deliveryType: String? = nil
    var nodeSize: CGFloat = 30

    var body: some View {
        let flow = stageFlow(for: deliveryType)
        let current = flow.firstIndex(of: stage) ?? 0
        HStack(spacing: 0) {
            ForEach(Array(flow.enumerated()), id: \.offset) { idx, step in
                let done = idx < current
                let active = idx == current
                // Node
                ZStack {
                    Circle()
                        .fill(done || active ? kAccent : kTrack)
                        .frame(width: nodeSize, height: nodeSize)
                    Image(systemName: done ? "checkmark" : step.stepIcon)
                        .font(.system(size: nodeSize * 0.42, weight: .bold))
                        .foregroundColor(done || active ? .white : .white.opacity(0.40))
                }
                // Connector (not after the last node)
                if idx < flow.count - 1 {
                    Rectangle()
                        .fill(idx < current ? kAccent : kTrack)
                        .frame(height: 3)
                        .frame(maxWidth: .infinity)
                }
            }
        }
    }
}

// ── Lock Screen / Banner View ──────────────────────────────────────────────────
struct OrderBannerView: View {
    let context: ActivityViewContext<MoraOrderActivityAttributes>

    var body: some View {
        let stage = context.state.stage
        let isException = stage.isExceptionStage
        let subtitle = context.state.message.isEmpty ? stage.stageSubtitle : context.state.message

        VStack(spacing: 12) {
            // Main row: LEFT = logo + order + price  |  RIGHT = icon + headline + subtitle + eta
            HStack(alignment: .top, spacing: 12) {

                // ── اليسار: لوكو أزرق · رقم الطلب · السعر ──────────────
                VStack(alignment: .leading, spacing: 5) {
                    MoraLogoMark(height: 15, color: kAccent)
                    Text(context.attributes.orderNumber)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white.opacity(0.92))
                    PricePill(priceText: context.attributes.priceText,
                              isPaid: context.state.isPaid)
                }

                Spacer(minLength: 8)

                // ── اليمين: أيقونة + عنوان · تفاصيل · وقت التوصيل ────────
                VStack(alignment: .trailing, spacing: 4) {
                    HStack(spacing: 7) {
                        Text(stage.stageHeadline)
                            .font(.system(size: 15, weight: .heavy))
                            .foregroundColor(stage.stageHeadlineColor)
                            .lineLimit(1)
                        Image(systemName: isException ? "exclamationmark.triangle.fill" : stage.stepIcon)
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(stage.stageAccent)
                    }
                    Text(subtitle)
                        .font(.system(size: 11.5, weight: .medium))
                        .foregroundColor(kDim)
                        .multilineTextAlignment(.trailing)
                        .lineLimit(2)
                    if let eta = stage.stageEta(for: context.state.deliveryType) {
                        EtaPill(text: eta)
                    }
                }
            }

            // ── الخط السفلي: tracker المراحل / أزرار ──────────────────────
            if isException {
                ContactButton(tint: stage.stageAccent)
            } else {
                OrderStepsBar(stage: stage, deliveryType: context.state.deliveryType)
                if stage == "delivered" { RateButton() }
            }
        }
        .padding(16)
        .activityBackgroundTint(.black)
        .activitySystemActionForegroundColor(.white)
        .widgetURL(stage.deepLink)
    }
}

// ── Widget Entry ───────────────────────────────────────────────────────────────
@available(iOS 16.1, *)
struct MoraOrderActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: MoraOrderActivityAttributes.self) { context in
            OrderBannerView(context: context)
        } dynamicIsland: { context in
            let stage = context.state.stage
            let isException = stage.isExceptionStage
            let subtitle = context.state.message.isEmpty ? stage.stageSubtitle : context.state.message
            return DynamicIsland {
                // ── اليسار: لوكو أزرق · رقم الطلب · السعر ───────────────
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 3) {
                        MoraLogoMark(height: 12, color: kAccent)
                        Text(context.attributes.orderNumber)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.white)
                        PricePill(priceText: context.attributes.priceText,
                                  isPaid: context.state.isPaid)
                    }
                    .padding(.leading, 4)
                }
                // ── اليمين: أيقونة + عنوان المرحلة ────────────────────────
                DynamicIslandExpandedRegion(.trailing) {
                    HStack(spacing: 6) {
                        Text(stage.stageHeadline)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(stage.stageHeadlineColor)
                            .lineLimit(2)
                            .multilineTextAlignment(.trailing)
                        Image(systemName: isException ? "exclamationmark.triangle.fill" : stage.stepIcon)
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(stage.stageAccent)
                    }
                    .padding(.trailing, 4)
                }
                // ── الأسفل: التفاصيل + التراكر ────────────────────────────
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 9) {
                        Text(subtitle)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(kDim)
                            .frame(maxWidth: .infinity, alignment: .trailing)
                            .lineLimit(2)
                            .padding(.horizontal, 4)
                        if isException {
                            ContactButton(tint: stage.stageAccent).padding(.horizontal, 4).padding(.bottom, 4)
                        } else {
                            OrderStepsBar(stage: stage, deliveryType: context.state.deliveryType, nodeSize: 26)
                                .padding(.horizontal, 4)
                            if stage == "delivered" {
                                RateButton().padding(.horizontal, 4).padding(.bottom, 4)
                            }
                        }
                    }
                }
            } compactLeading: {
                Image(systemName: isException ? "exclamationmark.triangle.fill" : stage.stepIcon)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(stage.stageAccent)
            } compactTrailing: {
                Text(context.attributes.orderNumber)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.white)
            } minimal: {
                Image(systemName: isException ? "exclamationmark.triangle.fill" : stage.stepIcon)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(stage.stageAccent)
            }
            .widgetURL(stage.deepLink)
            .keylineTint(stage.stageAccent)
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
