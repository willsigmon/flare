import SwiftUI

/// Platforms for trending content
enum TrendingPlatform: String, CaseIterable, Identifiable {
    case reddit = "Reddit"
    case twitter = "X"
    case threads = "Threads"
    case google = "Google"
    case hackernews = "Hacker News"
    case youtube = "YouTube"
    case local = "Local"

    var id: String { rawValue }

    /// Platforms to show in filter pills (excludes local since it's a special section)
    static var filterablePlatforms: [TrendingPlatform] {
        [.reddit, .twitter, .threads, .google, .hackernews, .youtube]
    }

    var icon: String {
        switch self {
        case .reddit: return "bubble.left.and.bubble.right.fill"
        case .twitter: return "at.badge.plus"
        case .threads: return "at"
        case .google: return "g.circle.fill"
        case .hackernews: return "y.square.fill"
        case .youtube: return "play.rectangle.fill"
        case .local: return "location.fill"
        }
    }

    var brandColor: Color {
        switch self {
        case .reddit: return Color(red: 1.0, green: 0.27, blue: 0.0) // Reddit orange
        case .twitter: return .primary // X is now black/white
        case .threads: return .primary
        case .google: return Color(red: 0.26, green: 0.52, blue: 0.96) // Google blue
        case .hackernews: return Color(red: 1.0, green: 0.4, blue: 0.0) // HN orange
        case .youtube: return Color(red: 1.0, green: 0.0, blue: 0.0) // YouTube red
        case .local: return Color(red: 0.0, green: 0.64, blue: 0.52) // Teal for local
        }
    }

    var gradient: [Color] {
        switch self {
        case .reddit: return [Color(red: 1.0, green: 0.27, blue: 0.0), Color(red: 0.9, green: 0.2, blue: 0.0)]
        case .twitter: return [.gray, .black]
        case .threads: return [.purple, .pink]
        case .google: return [Color(red: 0.26, green: 0.52, blue: 0.96), Color(red: 0.13, green: 0.59, blue: 0.95)]
        case .hackernews: return [Color(red: 1.0, green: 0.4, blue: 0.0), Color(red: 0.9, green: 0.3, blue: 0.0)]
        case .youtube: return [Color(red: 1.0, green: 0.0, blue: 0.0), Color(red: 0.8, green: 0.0, blue: 0.0)]
        case .local: return [Color(red: 0.0, green: 0.64, blue: 0.52), Color(red: 0.0, green: 0.5, blue: 0.45)]
        }
    }

    var logoName: String {
        // For SF Symbols or asset names
        switch self {
        case .reddit: return "reddit-logo"
        case .twitter: return "x-logo"
        case .threads: return "threads-logo"
        case .google: return "google-logo"
        case .hackernews: return "hn-logo"
        case .youtube: return "youtube-logo"
        case .local: return "location-logo"
        }
    }
}

/// A trending item from any platform
struct TrendingItem: Identifiable, Hashable {
    let id = UUID()
    let platform: TrendingPlatform
    let title: String
    let subtitle: String?
    let description: String?
    let url: String?
    let rank: Int
    let engagementCount: Int?
    let engagementLabel: String?
    let timestamp: Date
    let category: String?
    let imageUrl: String?

    var formattedEngagement: String? {
        guard let count = engagementCount else { return nil }
        if count >= 1_000_000 {
            return String(format: "%.1fM", Double(count) / 1_000_000)
        } else if count >= 1_000 {
            return String(format: "%.1fK", Double(count) / 1_000)
        }
        return "\(count)"
    }
}

/// Section of trending items grouped by platform or time
struct TrendingSection: Identifiable {
    let id = UUID()
    let platform: TrendingPlatform?
    let title: String
    let items: [TrendingItem]
}
