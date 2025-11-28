import SwiftUI

/// Categories for discovering sources
enum DiscoverCategory: String, CaseIterable, Identifiable {
    case technology = "Technology"
    case news = "News"
    case gaming = "Gaming"
    case entertainment = "Entertainment"
    case science = "Science"
    case business = "Business"
    case sports = "Sports"
    case design = "Design"
    case food = "Food"
    case lifestyle = "Lifestyle"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .technology: return "laptopcomputer"
        case .news: return "newspaper"
        case .gaming: return "gamecontroller"
        case .entertainment: return "film"
        case .science: return "atom"
        case .business: return "chart.line.uptrend.xyaxis"
        case .sports: return "sportscourt"
        case .design: return "paintbrush"
        case .food: return "fork.knife"
        case .lifestyle: return "heart"
        }
    }

    var gradient: [Color] {
        switch self {
        case .technology: return [.blue, .cyan]
        case .news: return [.red, .orange]
        case .gaming: return [.purple, .pink]
        case .entertainment: return [.yellow, .orange]
        case .science: return [.green, .mint]
        case .business: return [.gray, .blue]
        case .sports: return [.green, .yellow]
        case .design: return [.pink, .purple]
        case .food: return [.orange, .red]
        case .lifestyle: return [.mint, .teal]
        }
    }

    var description: String {
        switch self {
        case .technology: return "Tech news, gadgets, and software"
        case .news: return "World news and current events"
        case .gaming: return "Video games and gaming culture"
        case .entertainment: return "Movies, TV, and pop culture"
        case .science: return "Science and discovery"
        case .business: return "Finance, startups, and markets"
        case .sports: return "Sports news and scores"
        case .design: return "UI/UX, architecture, and art"
        case .food: return "Recipes, restaurants, and cooking"
        case .lifestyle: return "Health, wellness, and living"
        }
    }
}

/// A suggested source for discovery
struct SuggestedSource: Identifiable, Hashable {
    let id = UUID()
    let name: String
    let feedUrl: String
    let iconUrl: String?
    let description: String
    let category: DiscoverCategory

    var faviconUrl: String {
        if let icon = iconUrl { return icon }
        guard let url = URL(string: feedUrl),
              let host = url.host() else { return "" }
        return "https://\(host)/favicon.ico"
    }
}

/// Curated sources for discovery
struct CuratedSources {
    static let all: [SuggestedSource] = [
        // Technology
        SuggestedSource(
            name: "The Verge",
            feedUrl: "https://www.theverge.com/rss/index.xml",
            iconUrl: nil,
            description: "Technology, science, art, and culture",
            category: .technology
        ),
        SuggestedSource(
            name: "Ars Technica",
            feedUrl: "https://feeds.arstechnica.com/arstechnica/index",
            iconUrl: nil,
            description: "In-depth technology news and analysis",
            category: .technology
        ),
        SuggestedSource(
            name: "TechCrunch",
            feedUrl: "https://techcrunch.com/feed/",
            iconUrl: nil,
            description: "Startup and technology news",
            category: .technology
        ),
        SuggestedSource(
            name: "Hacker News",
            feedUrl: "https://news.ycombinator.com/rss",
            iconUrl: "https://news.ycombinator.com/favicon.ico",
            description: "Tech community links and discussion",
            category: .technology
        ),
        SuggestedSource(
            name: "9to5Mac",
            feedUrl: "https://9to5mac.com/feed/",
            iconUrl: nil,
            description: "Apple news and rumors",
            category: .technology
        ),
        SuggestedSource(
            name: "MacRumors",
            feedUrl: "https://feeds.macrumors.com/MacRumors-All",
            iconUrl: nil,
            description: "Apple news and product rumors",
            category: .technology
        ),
        SuggestedSource(
            name: "Wired",
            feedUrl: "https://www.wired.com/feed/rss",
            iconUrl: nil,
            description: "Technology and culture",
            category: .technology
        ),

        // News
        SuggestedSource(
            name: "BBC News",
            feedUrl: "https://feeds.bbci.co.uk/news/rss.xml",
            iconUrl: nil,
            description: "World news from the BBC",
            category: .news
        ),
        SuggestedSource(
            name: "NPR News",
            feedUrl: "https://feeds.npr.org/1001/rss.xml",
            iconUrl: nil,
            description: "National and world news",
            category: .news
        ),
        SuggestedSource(
            name: "Reuters",
            feedUrl: "https://www.reutersagency.com/feed/",
            iconUrl: nil,
            description: "Breaking international news",
            category: .news
        ),
        SuggestedSource(
            name: "The Guardian",
            feedUrl: "https://www.theguardian.com/world/rss",
            iconUrl: nil,
            description: "World news and opinion",
            category: .news
        ),

        // Gaming
        SuggestedSource(
            name: "Polygon",
            feedUrl: "https://www.polygon.com/rss/index.xml",
            iconUrl: nil,
            description: "Gaming news and reviews",
            category: .gaming
        ),
        SuggestedSource(
            name: "Kotaku",
            feedUrl: "https://kotaku.com/rss",
            iconUrl: nil,
            description: "Gaming news and culture",
            category: .gaming
        ),
        SuggestedSource(
            name: "IGN",
            feedUrl: "https://feeds.feedburner.com/ign/all",
            iconUrl: nil,
            description: "Games, movies, TV, and more",
            category: .gaming
        ),
        SuggestedSource(
            name: "r/gaming",
            feedUrl: "https://www.reddit.com/r/gaming/.rss",
            iconUrl: "https://www.reddit.com/favicon.ico",
            description: "Gaming community on Reddit",
            category: .gaming
        ),

        // Entertainment
        SuggestedSource(
            name: "Variety",
            feedUrl: "https://variety.com/feed/",
            iconUrl: nil,
            description: "Entertainment industry news",
            category: .entertainment
        ),
        SuggestedSource(
            name: "Hollywood Reporter",
            feedUrl: "https://www.hollywoodreporter.com/feed/",
            iconUrl: nil,
            description: "Movies, TV, and entertainment",
            category: .entertainment
        ),
        SuggestedSource(
            name: "Entertainment Weekly",
            feedUrl: "https://ew.com/feed/",
            iconUrl: nil,
            description: "Pop culture news and reviews",
            category: .entertainment
        ),

        // Science
        SuggestedSource(
            name: "NASA",
            feedUrl: "https://www.nasa.gov/rss/dyn/breaking_news.rss",
            iconUrl: nil,
            description: "Space exploration and science",
            category: .science
        ),
        SuggestedSource(
            name: "Scientific American",
            feedUrl: "http://rss.sciam.com/ScientificAmerican-Global",
            iconUrl: nil,
            description: "Science news and discoveries",
            category: .science
        ),
        SuggestedSource(
            name: "Nature",
            feedUrl: "https://www.nature.com/nature.rss",
            iconUrl: nil,
            description: "Scientific research and news",
            category: .science
        ),

        // Business
        SuggestedSource(
            name: "Bloomberg",
            feedUrl: "https://feeds.bloomberg.com/markets/news.rss",
            iconUrl: nil,
            description: "Financial markets and business",
            category: .business
        ),
        SuggestedSource(
            name: "Harvard Business Review",
            feedUrl: "https://hbr.org/feed",
            iconUrl: nil,
            description: "Business strategy and management",
            category: .business
        ),

        // Sports
        SuggestedSource(
            name: "ESPN",
            feedUrl: "https://www.espn.com/espn/rss/news",
            iconUrl: nil,
            description: "Sports news and scores",
            category: .sports
        ),
        SuggestedSource(
            name: "Bleacher Report",
            feedUrl: "https://bleacherreport.com/articles/feed",
            iconUrl: nil,
            description: "Sports highlights and analysis",
            category: .sports
        ),

        // Design
        SuggestedSource(
            name: "Dezeen",
            feedUrl: "https://www.dezeen.com/feed/",
            iconUrl: nil,
            description: "Architecture and design",
            category: .design
        ),
        SuggestedSource(
            name: "Dribbble",
            feedUrl: "https://dribbble.com/shots/popular.rss",
            iconUrl: nil,
            description: "Design inspiration",
            category: .design
        ),
        SuggestedSource(
            name: "A List Apart",
            feedUrl: "https://alistapart.com/main/feed/",
            iconUrl: nil,
            description: "Web design and development",
            category: .design
        ),

        // Food
        SuggestedSource(
            name: "Serious Eats",
            feedUrl: "https://www.seriouseats.com/feeds/serious-eats",
            iconUrl: nil,
            description: "Recipes and food science",
            category: .food
        ),
        SuggestedSource(
            name: "Bon Appétit",
            feedUrl: "https://www.bonappetit.com/feed/rss",
            iconUrl: nil,
            description: "Recipes and food culture",
            category: .food
        ),

        // Lifestyle
        SuggestedSource(
            name: "Lifehacker",
            feedUrl: "https://lifehacker.com/rss",
            iconUrl: nil,
            description: "Tips for living better",
            category: .lifestyle
        ),
        SuggestedSource(
            name: "Zen Habits",
            feedUrl: "https://zenhabits.net/feed/",
            iconUrl: nil,
            description: "Mindfulness and simplicity",
            category: .lifestyle
        )
    ]

    static func sources(for category: DiscoverCategory) -> [SuggestedSource] {
        all.filter { $0.category == category }
    }

    static var popular: [SuggestedSource] {
        [
            all.first { $0.name == "The Verge" }!,
            all.first { $0.name == "Hacker News" }!,
            all.first { $0.name == "BBC News" }!,
            all.first { $0.name == "Polygon" }!,
            all.first { $0.name == "NASA" }!
        ]
    }
}
