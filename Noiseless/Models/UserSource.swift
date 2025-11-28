import Foundation

/// Source types supported by Noiseless
enum SourceType: String, Codable, CaseIterable, Sendable {
    case rss
    case website
    case twitterUser = "twitter_user"
    case twitterSearch = "twitter_search"
    case redditSubreddit = "reddit_subreddit"
    case redditUser = "reddit_user"
    case hackerNews = "hackernews"
    case youtubeChannel = "youtube_channel"
    case newsletter
    case manualUrl = "manual_url"

    var displayName: String {
        switch self {
        case .rss: return "RSS Feed"
        case .website: return "Website"
        case .twitterUser: return "X/Twitter User"
        case .twitterSearch: return "X/Twitter Search"
        case .redditSubreddit: return "Subreddit"
        case .redditUser: return "Reddit User"
        case .hackerNews: return "Hacker News"
        case .youtubeChannel: return "YouTube Channel"
        case .newsletter: return "Newsletter"
        case .manualUrl: return "Manual URL"
        }
    }

    var iconName: String {
        switch self {
        case .rss: return "dot.radiowaves.up.forward"
        case .website: return "globe"
        case .twitterUser, .twitterSearch: return "at"
        case .redditSubreddit, .redditUser: return "bubble.left.and.bubble.right"
        case .hackerNews: return "y.square"
        case .youtubeChannel: return "play.rectangle"
        case .newsletter: return "envelope"
        case .manualUrl: return "link"
        }
    }
}

/// User's subscription to a content source
struct UserSource: Identifiable, Codable, Hashable, Sendable {
    let id: UUID
    let userId: UUID
    var type: SourceType
    var url: String
    var name: String
    var iconUrl: String?
    var category: String?
    var fetchFrequency: String? // Postgres INTERVAL as string
    var lastFetched: Date?
    var isActive: Bool
    var notifyAlways: Bool
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case type
        case url
        case name
        case iconUrl = "icon_url"
        case category
        case fetchFrequency = "fetch_frequency"
        case lastFetched = "last_fetched"
        case isActive = "is_active"
        case notifyAlways = "notify_always"
        case createdAt = "created_at"
    }

    /// Create a new source for insertion
    static func create(
        userId: UUID,
        type: SourceType = .rss,
        url: String,
        name: String,
        category: String? = nil
    ) -> UserSource {
        UserSource(
            id: UUID(),
            userId: userId,
            type: type,
            url: url,
            name: name,
            iconUrl: nil,
            category: category,
            fetchFrequency: "1 hour",
            lastFetched: nil,
            isActive: true,
            notifyAlways: false,
            createdAt: Date()
        )
    }
}
