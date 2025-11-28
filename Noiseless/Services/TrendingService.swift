import Foundation

/// Service for fetching trending content from multiple platforms
@MainActor
final class TrendingService {
    static let shared = TrendingService()

    private init() {}

    // MARK: - The Pulse (Human Perspectives)

    /// Fetch popular posts/comments representing human perspectives
    func fetchPulsePosts() async -> [PulsePost] {
        // Fetch from multiple sources concurrently
        async let redditComments = fetchRedditTopComments()

        let allPosts = await redditComments + mockTwitterPosts() + mockThreadsPosts()

        // Sort by engagement and recency
        return allPosts.sorted { $0.engagementCount > $1.engagementCount }
    }

    private func fetchRedditTopComments() async -> [PulsePost] {
        // Fetch top comments from popular posts
        guard let url = URL(string: "https://www.reddit.com/r/popular/comments.json?limit=10") else {
            return []
        }

        do {
            var request = URLRequest(url: url)
            request.setValue("Noiseless/1.0", forHTTPHeaderField: "User-Agent")
            request.timeoutInterval = 10

            let (data, _) = try await URLSession.shared.data(for: request)

            struct RedditCommentsResponse: Decodable {
                struct Data: Decodable {
                    struct Child: Decodable {
                        struct ChildData: Decodable {
                            let author: String
                            let body: String
                            let score: Int
                            let permalink: String
                            let subreddit: String
                            let created_utc: Double
                        }
                        let data: ChildData
                    }
                    let children: [Child]
                }
                let data: Data
            }

            let response = try JSONDecoder().decode(RedditCommentsResponse.self, from: data)

            return response.data.children.compactMap { child in
                let comment = child.data
                // Filter out low quality comments
                guard comment.score > 50, comment.body.count > 20, comment.body.count < 500 else {
                    return nil
                }

                return PulsePost(
                    platform: .reddit,
                    authorName: comment.author,
                    authorHandle: "u/\(comment.author)",
                    authorAvatarUrl: nil,
                    content: comment.body,
                    relatedTopic: "r/\(comment.subreddit)",
                    engagementCount: comment.score,
                    engagementType: .upvotes,
                    timestamp: Date(timeIntervalSince1970: comment.created_utc),
                    url: "https://reddit.com\(comment.permalink)",
                    isVerified: false,
                    replyCount: nil,
                    shareCount: nil
                )
            }
        } catch {
            print("Reddit comments fetch error: \(error)")
            return []
        }
    }

    private func mockTwitterPosts() -> [PulsePost] {
        [
            PulsePost(
                platform: .twitter,
                authorName: "Casey Newton",
                authorHandle: "@CaseyNewton",
                authorAvatarUrl: nil,
                content: "The new iOS 26 design is genuinely the biggest visual change since iOS 7. Liquid Glass is either going to be beloved or divisive - no in between.",
                relatedTopic: "iOS 26",
                engagementCount: 12500,
                engagementType: .likes,
                timestamp: Date().addingTimeInterval(-3600),
                url: "https://twitter.com/CaseyNewton",
                isVerified: true,
                replyCount: 234,
                shareCount: 567
            ),
            PulsePost(
                platform: .twitter,
                authorName: "Marques Brownlee",
                authorHandle: "@MKBHD",
                authorAvatarUrl: nil,
                content: "Just spent an hour with the new design. First impression: it's gorgeous. Second impression: my eyes need time to adjust. Third impression: I can't go back.",
                relatedTopic: "Apple Design",
                engagementCount: 45000,
                engagementType: .likes,
                timestamp: Date().addingTimeInterval(-7200),
                url: "https://twitter.com/MKBHD",
                isVerified: true,
                replyCount: 890,
                shareCount: 2300
            ),
            PulsePost(
                platform: .twitter,
                authorName: "John Gruber",
                authorHandle: "@gruber",
                authorAvatarUrl: nil,
                content: "Apple's design team clearly spent years on this. Every detail feels considered. The way glass adapts to content underneath is remarkable engineering.",
                relatedTopic: "Liquid Glass",
                engagementCount: 8900,
                engagementType: .likes,
                timestamp: Date().addingTimeInterval(-5400),
                url: "https://twitter.com/gruber",
                isVerified: true,
                replyCount: 156,
                shareCount: 423
            )
        ]
    }

    private func mockThreadsPosts() -> [PulsePost] {
        [
            PulsePost(
                platform: .threads,
                authorName: "UI Designer",
                authorHandle: "@uidesigner",
                authorAvatarUrl: nil,
                content: "As someone who designs apps for a living, Liquid Glass is going to change how we think about layering and hierarchy. The translucency creates depth without shadows.",
                relatedTopic: "Design",
                engagementCount: 3200,
                engagementType: .likes,
                timestamp: Date().addingTimeInterval(-4800),
                url: "https://threads.net/@uidesigner",
                isVerified: false,
                replyCount: 89,
                shareCount: 145
            ),
            PulsePost(
                platform: .threads,
                authorName: "App Developer",
                authorHandle: "@swiftdev",
                authorAvatarUrl: nil,
                content: "Just rebuilt my app with SwiftUI for iOS 26. The glass effects are automatic - literally just recompile and your app looks brand new. Apple made adoption incredibly easy.",
                relatedTopic: "SwiftUI",
                engagementCount: 2100,
                engagementType: .likes,
                timestamp: Date().addingTimeInterval(-6000),
                url: "https://threads.net/@swiftdev",
                isVerified: false,
                replyCount: 67,
                shareCount: 98
            )
        ]
    }

    /// Fetch all trends from all platforms
    func fetchAllTrends() async -> [TrendingSection] {
        // Fetch from all platforms concurrently
        async let redditTrends = fetchRedditTrends()
        async let hnTrends = fetchHackerNewsTrends()
        async let googleTrends = fetchGoogleTrends()

        let results = await [
            TrendingSection(platform: .reddit, title: "Trending on Reddit", items: redditTrends),
            TrendingSection(platform: .hackernews, title: "Top on Hacker News", items: hnTrends),
            TrendingSection(platform: .google, title: "Google Trends", items: googleTrends),
            TrendingSection(platform: .twitter, title: "Trending on X", items: mockTwitterTrends()),
            TrendingSection(platform: .threads, title: "Popular on Threads", items: mockThreadsTrends()),
            TrendingSection(platform: .youtube, title: "Trending on YouTube", items: mockYouTubeTrends())
        ]

        return results.filter { !$0.items.isEmpty }
    }

    /// Fetch trends for a specific platform
    func fetchTrends(for platform: TrendingPlatform) async -> [TrendingItem] {
        switch platform {
        case .reddit:
            return await fetchRedditTrends()
        case .hackernews:
            return await fetchHackerNewsTrends()
        case .google:
            return await fetchGoogleTrends()
        case .twitter:
            return mockTwitterTrends()
        case .threads:
            return mockThreadsTrends()
        case .youtube:
            return mockYouTubeTrends()
        case .local:
            // Local trends are fetched via fetchLocalTrends with subreddits
            return []
        }
    }

    // MARK: - Reddit Trending

    private func fetchRedditTrends() async -> [TrendingItem] {
        guard let url = URL(string: "https://www.reddit.com/r/popular/hot.json?limit=15") else {
            return []
        }

        do {
            var request = URLRequest(url: url)
            request.setValue("Noiseless/1.0", forHTTPHeaderField: "User-Agent")
            request.timeoutInterval = 10

            let (data, _) = try await URLSession.shared.data(for: request)

            struct RedditResponse: Decodable {
                struct Data: Decodable {
                    struct Child: Decodable {
                        struct ChildData: Decodable {
                            let title: String
                            let subreddit: String
                            let score: Int
                            let num_comments: Int
                            let permalink: String
                            let selftext: String?
                            let thumbnail: String?
                            let created_utc: Double
                        }
                        let data: ChildData
                    }
                    let children: [Child]
                }
                let data: Data
            }

            let response = try JSONDecoder().decode(RedditResponse.self, from: data)

            return response.data.children.enumerated().map { index, child in
                let post = child.data
                let description = post.selftext?.prefix(200).description
                let imageUrl = post.thumbnail != "self" && post.thumbnail != "default" ? post.thumbnail : nil

                return TrendingItem(
                    platform: .reddit,
                    title: post.title,
                    subtitle: "r/\(post.subreddit)",
                    description: description?.isEmpty == false ? description : nil,
                    url: "https://reddit.com\(post.permalink)",
                    rank: index + 1,
                    engagementCount: post.score,
                    engagementLabel: "upvotes",
                    timestamp: Date(timeIntervalSince1970: post.created_utc),
                    category: post.subreddit,
                    imageUrl: imageUrl
                )
            }
        } catch {
            print("Reddit fetch error: \(error)")
            return []
        }
    }

    // MARK: - Hacker News Trending

    private func fetchHackerNewsTrends() async -> [TrendingItem] {
        guard let url = URL(string: "https://hacker-news.firebaseio.com/v0/topstories.json") else {
            return []
        }

        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let storyIds = try JSONDecoder().decode([Int].self, from: data)
            let topIds = Array(storyIds.prefix(15))

            var items: [TrendingItem] = []

            for (index, storyId) in topIds.enumerated() {
                guard let storyUrl = URL(string: "https://hacker-news.firebaseio.com/v0/item/\(storyId).json") else {
                    continue
                }

                struct HNStory: Decodable {
                    let title: String
                    let score: Int
                    let url: String?
                    let by: String
                    let time: Int
                    let descendants: Int?
                }

                do {
                    let (storyData, _) = try await URLSession.shared.data(from: storyUrl)
                    let story = try JSONDecoder().decode(HNStory.self, from: storyData)

                    items.append(TrendingItem(
                        platform: .hackernews,
                        title: story.title,
                        subtitle: "by \(story.by)",
                        description: "\(story.descendants ?? 0) comments",
                        url: story.url ?? "https://news.ycombinator.com/item?id=\(storyId)",
                        rank: index + 1,
                        engagementCount: story.score,
                        engagementLabel: "points",
                        timestamp: Date(timeIntervalSince1970: Double(story.time)),
                        category: "tech",
                        imageUrl: nil
                    ))
                } catch {
                    continue
                }
            }

            return items
        } catch {
            print("HN fetch error: \(error)")
            return []
        }
    }

    // MARK: - Google Trends (Mock - requires API key)

    private func fetchGoogleTrends() async -> [TrendingItem] {
        // Google Trends doesn't have a public API, so we use mock data
        // In production, you'd use the Google Trends API or scraping service
        return [
            TrendingItem(
                platform: .google,
                title: "AI in 2025",
                subtitle: "Technology",
                description: "Interest in artificial intelligence continues to surge as new models and applications emerge",
                url: "https://trends.google.com/trends/explore?q=AI",
                rank: 1,
                engagementCount: 500000,
                engagementLabel: "searches",
                timestamp: Date(),
                category: "Technology",
                imageUrl: nil
            ),
            TrendingItem(
                platform: .google,
                title: "iOS 26",
                subtitle: "Technology",
                description: "Apple's latest iOS update with Liquid Glass design",
                url: "https://trends.google.com/trends/explore?q=iOS%2026",
                rank: 2,
                engagementCount: 350000,
                engagementLabel: "searches",
                timestamp: Date(),
                category: "Technology",
                imageUrl: nil
            ),
            TrendingItem(
                platform: .google,
                title: "Climate Summit 2025",
                subtitle: "World News",
                description: "Global leaders gather to discuss climate action",
                url: "https://trends.google.com/trends/explore?q=Climate%20Summit",
                rank: 3,
                engagementCount: 280000,
                engagementLabel: "searches",
                timestamp: Date(),
                category: "News",
                imageUrl: nil
            )
        ]
    }

    // MARK: - Mock Data for Platforms Without Public APIs

    private func mockTwitterTrends() -> [TrendingItem] {
        // X/Twitter requires API access
        [
            TrendingItem(
                platform: .twitter,
                title: "#TechNews",
                subtitle: "Technology · Trending",
                description: "Latest updates from the tech world",
                url: "https://twitter.com/search?q=%23TechNews",
                rank: 1,
                engagementCount: 125000,
                engagementLabel: "posts",
                timestamp: Date(),
                category: "Technology",
                imageUrl: nil
            ),
            TrendingItem(
                platform: .twitter,
                title: "#WWDC25",
                subtitle: "Technology · Trending",
                description: "Apple's Worldwide Developers Conference discussions",
                url: "https://twitter.com/search?q=%23WWDC25",
                rank: 2,
                engagementCount: 98000,
                engagementLabel: "posts",
                timestamp: Date(),
                category: "Technology",
                imageUrl: nil
            ),
            TrendingItem(
                platform: .twitter,
                title: "#AI",
                subtitle: "Technology · Trending",
                description: "Artificial Intelligence discussions and news",
                url: "https://twitter.com/search?q=%23AI",
                rank: 3,
                engagementCount: 85000,
                engagementLabel: "posts",
                timestamp: Date(),
                category: "Technology",
                imageUrl: nil
            )
        ]
    }

    private func mockThreadsTrends() -> [TrendingItem] {
        // Threads doesn't have a public API
        [
            TrendingItem(
                platform: .threads,
                title: "Design Inspiration",
                subtitle: "Design · Popular",
                description: "Designers sharing their latest work and inspiration",
                url: "https://threads.net/search?q=design",
                rank: 1,
                engagementCount: 45000,
                engagementLabel: "likes",
                timestamp: Date(),
                category: "Design",
                imageUrl: nil
            ),
            TrendingItem(
                platform: .threads,
                title: "App Development",
                subtitle: "Technology · Popular",
                description: "Developers discussing mobile and web development",
                url: "https://threads.net/search?q=development",
                rank: 2,
                engagementCount: 32000,
                engagementLabel: "likes",
                timestamp: Date(),
                category: "Technology",
                imageUrl: nil
            )
        ]
    }

    private func mockYouTubeTrends() -> [TrendingItem] {
        // YouTube API requires key
        [
            TrendingItem(
                platform: .youtube,
                title: "Apple Event Recap",
                subtitle: "MKBHD · 2.5M views",
                description: "Complete breakdown of everything announced at the Apple event",
                url: "https://youtube.com",
                rank: 1,
                engagementCount: 2500000,
                engagementLabel: "views",
                timestamp: Date(),
                category: "Technology",
                imageUrl: nil
            ),
            TrendingItem(
                platform: .youtube,
                title: "iOS 26 Hands-On",
                subtitle: "The Verge · 1.8M views",
                description: "First look at the new Liquid Glass design system",
                url: "https://youtube.com",
                rank: 2,
                engagementCount: 1800000,
                engagementLabel: "views",
                timestamp: Date(),
                category: "Technology",
                imageUrl: nil
            )
        ]
    }

    // MARK: - Local Trending

    /// Fetch local trending content from subreddits based on location
    func fetchLocalTrends(subreddits: [String]) async -> [TrendingItem] {
        guard !subreddits.isEmpty else { return [] }

        var allItems: [TrendingItem] = []

        for subreddit in subreddits {
            let items = await fetchSubredditTrends(subreddit: subreddit)
            allItems.append(contentsOf: items)
        }

        // Sort by engagement and return top items
        return allItems
            .sorted { $0.engagementCount ?? 0 > $1.engagementCount ?? 0 }
            .enumerated()
            .map { index, item in
                var updatedItem = item
                // Re-rank after combining
                return TrendingItem(
                    platform: item.platform,
                    title: item.title,
                    subtitle: item.subtitle,
                    description: item.description,
                    url: item.url,
                    rank: index + 1,
                    engagementCount: item.engagementCount,
                    engagementLabel: item.engagementLabel,
                    timestamp: item.timestamp,
                    category: item.category,
                    imageUrl: item.imageUrl
                )
            }
    }

    /// Fetch trending posts from a specific subreddit
    private func fetchSubredditTrends(subreddit: String) async -> [TrendingItem] {
        guard let url = URL(string: "https://www.reddit.com/r/\(subreddit)/hot.json?limit=10") else {
            return []
        }

        do {
            var request = URLRequest(url: url)
            request.setValue("Noiseless/1.0", forHTTPHeaderField: "User-Agent")
            request.timeoutInterval = 10

            let (data, response) = try await URLSession.shared.data(for: request)

            // Check for valid response
            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                return []
            }

            struct RedditResponse: Decodable {
                struct Data: Decodable {
                    struct Child: Decodable {
                        struct ChildData: Decodable {
                            let title: String
                            let subreddit: String
                            let score: Int
                            let num_comments: Int
                            let permalink: String
                            let selftext: String?
                            let thumbnail: String?
                            let created_utc: Double
                        }
                        let data: ChildData
                    }
                    let children: [Child]
                }
                let data: Data
            }

            let redditResponse = try JSONDecoder().decode(RedditResponse.self, from: data)

            return redditResponse.data.children.enumerated().map { index, child in
                let post = child.data
                let description = post.selftext?.prefix(200).description
                let imageUrl = post.thumbnail != "self" && post.thumbnail != "default" ? post.thumbnail : nil

                return TrendingItem(
                    platform: .local,
                    title: post.title,
                    subtitle: "r/\(post.subreddit)",
                    description: description?.isEmpty == false ? description : nil,
                    url: "https://reddit.com\(post.permalink)",
                    rank: index + 1,
                    engagementCount: post.score,
                    engagementLabel: "upvotes",
                    timestamp: Date(timeIntervalSince1970: post.created_utc),
                    category: post.subreddit,
                    imageUrl: imageUrl
                )
            }
        } catch {
            print("Local subreddit fetch error for r/\(subreddit): \(error)")
            return []
        }
    }

    /// Fetch local Pulse posts from nearby subreddits
    func fetchLocalPulsePosts(subreddits: [String]) async -> [PulsePost] {
        guard !subreddits.isEmpty else { return [] }

        var allPosts: [PulsePost] = []

        for subreddit in subreddits {
            let posts = await fetchSubredditComments(subreddit: subreddit)
            allPosts.append(contentsOf: posts)
        }

        return allPosts.sorted { $0.engagementCount > $1.engagementCount }
    }

    private func fetchSubredditComments(subreddit: String) async -> [PulsePost] {
        guard let url = URL(string: "https://www.reddit.com/r/\(subreddit)/comments.json?limit=10") else {
            return []
        }

        do {
            var request = URLRequest(url: url)
            request.setValue("Noiseless/1.0", forHTTPHeaderField: "User-Agent")
            request.timeoutInterval = 10

            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                return []
            }

            struct RedditCommentsResponse: Decodable {
                struct Data: Decodable {
                    struct Child: Decodable {
                        struct ChildData: Decodable {
                            let author: String
                            let body: String
                            let score: Int
                            let permalink: String
                            let subreddit: String
                            let created_utc: Double
                        }
                        let data: ChildData
                    }
                    let children: [Child]
                }
                let data: Data
            }

            let commentsResponse = try JSONDecoder().decode(RedditCommentsResponse.self, from: data)

            return commentsResponse.data.children.compactMap { child in
                let comment = child.data
                guard comment.score > 10, comment.body.count > 20, comment.body.count < 500 else {
                    return nil
                }

                return PulsePost(
                    platform: .reddit,
                    authorName: comment.author,
                    authorHandle: "u/\(comment.author)",
                    authorAvatarUrl: nil,
                    content: comment.body,
                    relatedTopic: "r/\(comment.subreddit)",
                    engagementCount: comment.score,
                    engagementType: .upvotes,
                    timestamp: Date(timeIntervalSince1970: comment.created_utc),
                    url: "https://reddit.com\(comment.permalink)",
                    isVerified: false,
                    replyCount: nil,
                    shareCount: nil
                )
            }
        } catch {
            print("Local comments fetch error for r/\(subreddit): \(error)")
            return []
        }
    }
}
