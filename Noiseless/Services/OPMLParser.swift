import Foundation

/// Parses OPML files (standard RSS feed list format)
final class OPMLParser: NSObject, XMLParserDelegate {

    struct OPMLFeed: Sendable {
        let title: String
        let xmlUrl: String
        let htmlUrl: String?
        let category: String?
    }

    struct OPMLResult: Sendable {
        let title: String?
        let feeds: [OPMLFeed]
    }

    // MARK: - Parsing State

    private var result: OPMLResult?
    private var feeds: [OPMLFeed] = []
    private var documentTitle: String?
    private var currentCategory: String?
    private var categoryStack: [String] = []

    // MARK: - Public API

    /// Parse OPML data and return feeds
    static func parse(data: Data) -> OPMLResult? {
        let parser = OPMLParser()
        return parser.parseData(data)
    }

    /// Parse OPML from URL (local file)
    static func parse(url: URL) -> OPMLResult? {
        guard let data = try? Data(contentsOf: url) else { return nil }
        return parse(data: data)
    }

    // MARK: - Private

    private func parseData(_ data: Data) -> OPMLResult? {
        let xmlParser = XMLParser(data: data)
        xmlParser.delegate = self

        if xmlParser.parse() {
            return OPMLResult(title: documentTitle, feeds: feeds)
        }
        return nil
    }

    // MARK: - XMLParserDelegate

    func parser(_ parser: XMLParser, didStartElement elementName: String, namespaceURI: String?, qualifiedName qName: String?, attributes attributeDict: [String : String] = [:]) {

        switch elementName.lowercased() {
        case "title":
            // Will capture in foundCharacters
            break

        case "outline":
            // Check if this is a feed (has xmlUrl) or a category (has nested outlines)
            if let xmlUrl = attributeDict["xmlUrl"] ?? attributeDict["xmlurl"] {
                // This is a feed
                let title = attributeDict["title"] ?? attributeDict["text"] ?? "Untitled"
                let htmlUrl = attributeDict["htmlUrl"] ?? attributeDict["htmlurl"]
                let category = categoryStack.last

                let feed = OPMLFeed(
                    title: title,
                    xmlUrl: xmlUrl,
                    htmlUrl: htmlUrl,
                    category: category
                )
                feeds.append(feed)
            } else if let categoryName = attributeDict["title"] ?? attributeDict["text"] {
                // This is a category folder
                categoryStack.append(categoryName)
            }

        default:
            break
        }
    }

    func parser(_ parser: XMLParser, didEndElement elementName: String, namespaceURI: String?, qualifiedName qName: String?) {
        if elementName.lowercased() == "outline" && !categoryStack.isEmpty {
            // Check if we're closing a category (not a feed)
            // We pop when closing an outline that was a category
            // This is tricky - we need to track depth properly
        }
    }

    func parser(_ parser: XMLParser, foundCharacters string: String) {
        // Capture document title if we're in <title> inside <head>
        let trimmed = string.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty && documentTitle == nil {
            documentTitle = trimmed
        }
    }
}

// MARK: - Import Helper

extension OPMLParser {

    /// Convert parsed feeds to UserSource objects
    @MainActor
    static func convertToSources(feeds: [OPMLFeed], userId: UUID) -> [UserSource] {
        feeds.map { feed in
            UserSource(
                id: UUID(),
                userId: userId,
                type: .rss,
                url: feed.xmlUrl,
                name: feed.title,
                iconUrl: extractFaviconUrl(from: feed.htmlUrl ?? feed.xmlUrl),
                category: feed.category,
                fetchFrequency: "1 hour",
                lastFetched: nil,
                isActive: true,
                notifyAlways: false,
                createdAt: Date()
            )
        }
    }

    private static func extractFaviconUrl(from urlString: String) -> String? {
        guard let url = URL(string: urlString),
              let host = url.host() else { return nil }
        return "https://\(host)/favicon.ico"
    }
}
