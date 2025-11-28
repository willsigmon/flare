import SwiftUI

/// A human perspective post from social platforms
struct PulsePost: Identifiable, Hashable {
    let id = UUID()
    let platform: TrendingPlatform
    let authorName: String
    let authorHandle: String
    let authorAvatarUrl: String?
    let content: String
    let relatedTopic: String?
    let engagementCount: Int
    let engagementType: EngagementType
    let timestamp: Date
    let url: String?
    let isVerified: Bool
    let replyCount: Int?
    let shareCount: Int?

    enum EngagementType: String {
        case likes = "likes"
        case upvotes = "upvotes"
        case points = "points"
        case views = "views"
    }

    var formattedEngagement: String {
        if engagementCount >= 1_000_000 {
            return String(format: "%.1fM", Double(engagementCount) / 1_000_000)
        } else if engagementCount >= 1_000 {
            return String(format: "%.1fK", Double(engagementCount) / 1_000)
        }
        return "\(engagementCount)"
    }
}

/// Categories for Pulse content
enum PulseCategory: String, CaseIterable {
    case hotTakes = "Hot Takes"
    case insightful = "Insightful"
    case funny = "Funny"
    case controversial = "Controversial"
    case breaking = "Breaking"
}
