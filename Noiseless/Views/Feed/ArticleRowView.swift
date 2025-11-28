import SwiftUI

/// Row view for an article in the feed
struct ArticleRowView: View {
    let item: FeedItem

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Source and time
            HStack {
                // Source indicator
                HStack(spacing: 4) {
                    Image(systemName: "dot.radiowaves.up.forward")
                        .font(.caption2)
                        .foregroundStyle(.secondary)

                    Text(sourceName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                // Time ago
                Text(item.timeAgo)
                    .font(.caption)
                    .foregroundStyle(.tertiary)

                // Vote indicator
                if item.vote != 0 {
                    Image(systemName: item.vote > 0 ? "hand.thumbsup.fill" : "hand.thumbsdown.fill")
                        .font(.caption2)
                        .foregroundStyle(item.vote > 0 ? .green : .red)
                }

                // Saved indicator
                if item.isSaved {
                    Image(systemName: "bookmark.fill")
                        .font(.caption2)
                        .foregroundStyle(.blue)
                }
            }

            // Title
            Text(item.article.title)
                .font(.headline)
                .lineLimit(2)
                .foregroundStyle(item.isRead ? .secondary : .primary)

            // Summary
            if let summary = item.displaySummary {
                Text(summary)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
            }

            // Topics
            if let topics = item.article.topics, !topics.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(topics.prefix(4), id: \.self) { topic in
                            Text(topic)
                                .font(.caption2)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(.secondary.opacity(0.15))
                                .clipShape(Capsule())
                        }
                    }
                }
            }

            // Banger indicator
            if let score = item.article.bangerScore, score >= 0.7 {
                HStack(spacing: 4) {
                    Image(systemName: score >= 0.9 ? "flame.fill" : "star.fill")
                        .foregroundStyle(score >= 0.9 ? .orange : .yellow)
                    Text(score >= 0.9 ? "Major" : "Notable")
                        .font(.caption2)
                        .fontWeight(.medium)
                }
            }
        }
        .padding(.vertical, 4)
    }

    /// Extract source name from URL
    private var sourceName: String {
        guard let url = URL(string: item.article.sourceUrl),
              let host = url.host() else {
            return item.article.sourceUrl
        }
        // Remove www. prefix
        return host.replacingOccurrences(of: "www.", with: "")
    }
}

#Preview {
    List {
        ArticleRowView(item: .preview)
        ArticleRowView(item: .previewRead)
        ArticleRowView(item: .previewBanger)
    }
    .listStyle(.plain)
}

// MARK: - Preview Data

extension FeedItem {
    static var preview: FeedItem {
        FeedItem(
            article: Article(
                id: UUID(),
                sourceUrl: "https://www.theverge.com/rss/index.xml",
                externalId: nil,
                url: "https://www.theverge.com/2024/1/1/article",
                title: "Apple announces new MacBook Pro with M4 chip",
                author: "Nilay Patel",
                rawContent: nil,
                extractedContent: "Apple has announced a new MacBook Pro featuring the M4 chip, promising significant performance improvements over the previous generation.",
                summaryShort: "Apple's new MacBook Pro with M4 chip promises 50% faster performance and improved battery life.",
                summaryExtended: nil,
                topics: ["apple", "macbook", "m4"],
                entities: nil,
                bangerScore: 0.6,
                contentHash: nil,
                publishedAt: Date().addingTimeInterval(-3600),
                fetchedAt: Date(),
                createdAt: Date()
            ),
            userState: nil
        )
    }

    static var previewRead: FeedItem {
        var item = preview
        item.userState = UserArticle(
            id: UUID(),
            userId: UUID(),
            articleId: item.article.id,
            relevanceScore: nil,
            isRead: true,
            isSaved: false,
            vote: 1,
            timeSpentSec: nil,
            readAt: Date(),
            createdAt: Date()
        )
        return item
    }

    static var previewBanger: FeedItem {
        FeedItem(
            article: Article(
                id: UUID(),
                sourceUrl: "https://www.theverge.com/rss/index.xml",
                externalId: nil,
                url: "https://www.theverge.com/2024/1/1/breaking",
                title: "Breaking: Major tech company acquisition announced",
                author: "Tom Warren",
                rawContent: nil,
                extractedContent: nil,
                summaryShort: "A major acquisition has been announced that will reshape the industry.",
                summaryExtended: nil,
                topics: ["breaking", "acquisition"],
                entities: nil,
                bangerScore: 0.95,
                contentHash: nil,
                publishedAt: Date().addingTimeInterval(-1800),
                fetchedAt: Date(),
                createdAt: Date()
            ),
            userState: nil
        )
    }
}
