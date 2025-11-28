import Foundation
import Observation

/// View model managing the article feed
@MainActor
@Observable
final class FeedViewModel {
    // MARK: - State

    private(set) var feedItems: [FeedItem] = []
    private(set) var isLoading = false
    private(set) var isRefreshing = false
    private(set) var error: Error?

    private let supabase = SupabaseService.shared

    // MARK: - Load Feed

    /// Load articles from user's subscribed sources
    func loadFeed() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            let articles = try await supabase.fetchArticles()

            // Fetch user states for these articles
            let articleIds = articles.map { $0.id }
            let userStates = try await supabase.fetchUserArticleStates(articleIds: articleIds)
            let statesById = Dictionary(uniqueKeysWithValues: userStates.map { ($0.articleId, $0) })

            // Combine into feed items
            feedItems = articles.map { article in
                FeedItem(article: article, userState: statesById[article.id])
            }
        } catch {
            self.error = error
        }

        isLoading = false
    }

    /// Refresh feed (pull to refresh)
    func refresh() async {
        guard !isRefreshing else { return }
        isRefreshing = true

        // Trigger RSS fetch for all active sources
        do {
            let sources = try await supabase.fetchSources()
            for source in sources where source.isActive && source.type == .rss {
                try? await supabase.triggerRSSFetch(sourceUrl: source.url)
            }

            // Reload feed after fetching
            await loadFeed()
        } catch {
            self.error = error
        }

        isRefreshing = false
    }

    // MARK: - Interactions

    /// Mark article as read
    func markAsRead(_ item: FeedItem) async {
        guard let userId = supabase.effectiveUserId else { return }

        let state = item.userState ?? UserArticle(
            id: UUID(),
            userId: userId,
            articleId: item.article.id,
            relevanceScore: nil,
            isRead: false,
            isSaved: false,
            vote: 0,
            timeSpentSec: nil,
            readAt: nil,
            createdAt: Date()
        )

        var updatedState = state
        updatedState.isRead = true
        updatedState.readAt = Date()

        try? await supabase.upsertUserArticleState(updatedState)
        updateLocalState(for: item.article.id, state: updatedState)
    }

    /// Toggle saved state
    func toggleSaved(_ item: FeedItem) async {
        guard let userId = supabase.effectiveUserId else { return }

        let state = item.userState ?? UserArticle(
            id: UUID(),
            userId: userId,
            articleId: item.article.id,
            relevanceScore: nil,
            isRead: false,
            isSaved: false,
            vote: 0,
            timeSpentSec: nil,
            readAt: nil,
            createdAt: Date()
        )

        var updatedState = state
        updatedState.isSaved.toggle()

        try? await supabase.upsertUserArticleState(updatedState)
        updateLocalState(for: item.article.id, state: updatedState)
    }

    /// Vote on article (thumbs up = 1, down = -1)
    func vote(_ item: FeedItem, direction: Int) async {
        guard let userId = supabase.effectiveUserId else { return }

        let state = item.userState ?? UserArticle(
            id: UUID(),
            userId: userId,
            articleId: item.article.id,
            relevanceScore: nil,
            isRead: false,
            isSaved: false,
            vote: 0,
            timeSpentSec: nil,
            readAt: nil,
            createdAt: Date()
        )

        var updatedState = state
        // Toggle vote if same direction, otherwise set
        updatedState.vote = state.vote == direction ? 0 : direction

        try? await supabase.upsertUserArticleState(updatedState)
        updateLocalState(for: item.article.id, state: updatedState)
    }

    // MARK: - Private

    private func updateLocalState(for articleId: UUID, state: UserArticle) {
        if let index = feedItems.firstIndex(where: { $0.article.id == articleId }) {
            feedItems[index].userState = state
        }
    }
}
