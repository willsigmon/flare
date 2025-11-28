import Foundation

/// Article fetched from an RSS feed or other source
struct Article: Identifiable, Codable, Hashable, Sendable {
    let id: UUID
    let sourceUrl: String
    let externalId: String?
    let url: String
    let title: String
    let author: String?
    let rawContent: String?
    let extractedContent: String?
    let summaryShort: String?
    let summaryExtended: String?
    let topics: [String]?
    let entities: ArticleEntities?
    let bangerScore: Double?
    let contentHash: String?
    let publishedAt: Date?
    let fetchedAt: Date
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case sourceUrl = "source_url"
        case externalId = "external_id"
        case url
        case title
        case author
        case rawContent = "raw_content"
        case extractedContent = "extracted_content"
        case summaryShort = "summary_short"
        case summaryExtended = "summary_extended"
        case topics
        case entities
        case bangerScore = "banger_score"
        case contentHash = "content_hash"
        case publishedAt = "published_at"
        case fetchedAt = "fetched_at"
        case createdAt = "created_at"
    }
}

/// Entities extracted from article by AI
struct ArticleEntities: Codable, Hashable, Sendable {
    let people: [String]?
    let companies: [String]?
    let products: [String]?
}

/// User-specific article state (read, saved, votes)
struct UserArticle: Identifiable, Codable, Hashable, Sendable {
    let id: UUID
    let userId: UUID
    let articleId: UUID
    let relevanceScore: Double?
    var isRead: Bool
    var isSaved: Bool
    var vote: Int // -1, 0, 1
    var timeSpentSec: Int?
    var readAt: Date?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case articleId = "article_id"
        case relevanceScore = "relevance_score"
        case isRead = "is_read"
        case isSaved = "is_saved"
        case vote
        case timeSpentSec = "time_spent_sec"
        case readAt = "read_at"
        case createdAt = "created_at"
    }
}

/// Combined article with user state for display
struct FeedItem: Identifiable, Hashable, Sendable {
    let article: Article
    var userState: UserArticle?

    var id: UUID { article.id }
    var isRead: Bool { userState?.isRead ?? false }
    var isSaved: Bool { userState?.isSaved ?? false }
    var vote: Int { userState?.vote ?? 0 }

    /// Time ago string for display
    var timeAgo: String {
        guard let publishedAt = article.publishedAt else { return "" }
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: publishedAt, relativeTo: Date())
    }

    /// Display summary - prefer AI summary, fallback to extracted content
    var displaySummary: String? {
        article.summaryShort ?? article.extractedContent?.prefix(200).description
    }
}
