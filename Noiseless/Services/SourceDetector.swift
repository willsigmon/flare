import Foundation

/// Detects source type and metadata from a URL
@MainActor
final class SourceDetector {

    struct DetectedSource: Sendable {
        var type: SourceType
        var url: String
        var name: String
        var feedUrl: String? // For websites, the discovered RSS feed
        var iconUrl: String?
    }

    /// Detect source type and fetch metadata from URL
    static func detect(url: String) async -> DetectedSource? {
        guard let parsedUrl = URL(string: url.trimmingCharacters(in: .whitespacesAndNewlines)) else {
            return nil
        }

        let cleanUrl = parsedUrl.absoluteString
        let host = parsedUrl.host()?.lowercased() ?? ""

        // Detect by domain patterns
        if host.contains("twitter.com") || host.contains("x.com") {
            return detectTwitter(url: cleanUrl, parsedUrl: parsedUrl)
        }

        if host.contains("reddit.com") {
            return detectReddit(url: cleanUrl, parsedUrl: parsedUrl)
        }

        if host.contains("news.ycombinator.com") || host.contains("hacker-news") {
            return DetectedSource(
                type: .hackerNews,
                url: "https://news.ycombinator.com",
                name: "Hacker News",
                feedUrl: nil,
                iconUrl: "https://news.ycombinator.com/favicon.ico"
            )
        }

        if host.contains("youtube.com") || host.contains("youtu.be") {
            return detectYouTube(url: cleanUrl, parsedUrl: parsedUrl)
        }

        if host.contains("threads.net") {
            return detectThreads(url: cleanUrl, parsedUrl: parsedUrl)
        }

        // Check if it's an RSS feed directly
        if await isRSSFeed(url: cleanUrl) {
            let name = await fetchRSSTitle(url: cleanUrl) ?? extractDomainName(from: host)
            return DetectedSource(
                type: .rss,
                url: cleanUrl,
                name: name,
                feedUrl: cleanUrl,
                iconUrl: "https://\(host)/favicon.ico"
            )
        }

        // Try to discover RSS feed from website
        if let feedUrl = await discoverRSSFeed(from: cleanUrl) {
            let name = await fetchRSSTitle(url: feedUrl) ?? extractDomainName(from: host)
            return DetectedSource(
                type: .rss,
                url: feedUrl,
                name: name,
                feedUrl: feedUrl,
                iconUrl: "https://\(host)/favicon.ico"
            )
        }

        // Fallback: treat as website to scrape
        return DetectedSource(
            type: .website,
            url: cleanUrl,
            name: extractDomainName(from: host),
            feedUrl: nil,
            iconUrl: "https://\(host)/favicon.ico"
        )
    }

    // MARK: - Platform Detectors

    private static func detectTwitter(url: String, parsedUrl: URL) -> DetectedSource {
        let path = parsedUrl.path()
        let components = path.split(separator: "/").map(String.init)

        // Check if it's a search URL
        if path.contains("/search") {
            let query = parsedUrl.query() ?? "search"
            return DetectedSource(
                type: .twitterSearch,
                url: url,
                name: "X Search: \(query.removingPercentEncoding ?? query)",
                feedUrl: nil,
                iconUrl: "https://abs.twimg.com/favicons/twitter.ico"
            )
        }

        // Extract username from path
        if let username = components.first, !username.isEmpty {
            return DetectedSource(
                type: .twitterUser,
                url: url,
                name: "@\(username)",
                feedUrl: nil,
                iconUrl: "https://abs.twimg.com/favicons/twitter.ico"
            )
        }

        return DetectedSource(
            type: .twitterUser,
            url: url,
            name: "X/Twitter",
            feedUrl: nil,
            iconUrl: "https://abs.twimg.com/favicons/twitter.ico"
        )
    }

    private static func detectReddit(url: String, parsedUrl: URL) -> DetectedSource {
        let path = parsedUrl.path()
        let components = path.split(separator: "/").map(String.init)

        // /r/subreddit
        if let rIndex = components.firstIndex(of: "r"), rIndex + 1 < components.count {
            let subreddit = components[rIndex + 1]
            return DetectedSource(
                type: .redditSubreddit,
                url: "https://reddit.com/r/\(subreddit)",
                name: "r/\(subreddit)",
                feedUrl: "https://reddit.com/r/\(subreddit)/.rss",
                iconUrl: "https://www.reddit.com/favicon.ico"
            )
        }

        // /user/username
        if let uIndex = components.firstIndex(of: "user"), uIndex + 1 < components.count {
            let username = components[uIndex + 1]
            return DetectedSource(
                type: .redditUser,
                url: "https://reddit.com/user/\(username)",
                name: "u/\(username)",
                feedUrl: "https://reddit.com/user/\(username)/.rss",
                iconUrl: "https://www.reddit.com/favicon.ico"
            )
        }

        return DetectedSource(
            type: .redditSubreddit,
            url: url,
            name: "Reddit",
            feedUrl: nil,
            iconUrl: "https://www.reddit.com/favicon.ico"
        )
    }

    private static func detectYouTube(url: String, parsedUrl: URL) -> DetectedSource {
        let path = parsedUrl.path()
        let components = path.split(separator: "/").map(String.init)

        // /@username or /channel/ID or /c/name
        var channelName = "YouTube Channel"

        if let first = components.first {
            if first.hasPrefix("@") {
                channelName = first
            } else if components.count >= 2 && (first == "channel" || first == "c" || first == "user") {
                channelName = components[1]
            }
        }

        return DetectedSource(
            type: .youtubeChannel,
            url: url,
            name: channelName,
            feedUrl: nil,
            iconUrl: "https://www.youtube.com/favicon.ico"
        )
    }

    private static func detectThreads(url: String, parsedUrl: URL) -> DetectedSource {
        let path = parsedUrl.path()
        let components = path.split(separator: "/").map(String.init)

        if let username = components.first?.replacingOccurrences(of: "@", with: "") {
            return DetectedSource(
                type: .website, // Threads doesn't have API yet
                url: url,
                name: "@\(username) on Threads",
                feedUrl: nil,
                iconUrl: "https://www.threads.net/favicon.ico"
            )
        }

        return DetectedSource(
            type: .website,
            url: url,
            name: "Threads",
            feedUrl: nil,
            iconUrl: "https://www.threads.net/favicon.ico"
        )
    }

    // MARK: - RSS Detection

    private static func isRSSFeed(url: String) async -> Bool {
        guard let feedUrl = URL(string: url) else { return false }

        var request = URLRequest(url: feedUrl)
        request.httpMethod = "HEAD"
        request.timeoutInterval = 5

        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            if let httpResponse = response as? HTTPURLResponse,
               let contentType = httpResponse.value(forHTTPHeaderField: "Content-Type") {
                return contentType.contains("xml") ||
                       contentType.contains("rss") ||
                       contentType.contains("atom")
            }
        } catch {}

        // Fallback: try fetching and checking content
        do {
            var getRequest = URLRequest(url: feedUrl)
            getRequest.timeoutInterval = 5
            let (data, _) = try await URLSession.shared.data(for: getRequest)
            if let text = String(data: data.prefix(500), encoding: .utf8) {
                return text.contains("<rss") ||
                       text.contains("<feed") ||
                       text.contains("<channel")
            }
        } catch {}

        return false
    }

    private static func discoverRSSFeed(from url: String) async -> String? {
        guard let pageUrl = URL(string: url) else { return nil }

        do {
            var request = URLRequest(url: pageUrl)
            request.timeoutInterval = 10
            let (data, _) = try await URLSession.shared.data(for: request)
            guard let html = String(data: data, encoding: .utf8) else { return nil }

            // Look for RSS link tags
            let patterns = [
                #"<link[^>]+type=[\"']application/rss\+xml[\"'][^>]+href=[\"']([^\"']+)[\"']"#,
                #"<link[^>]+href=[\"']([^\"']+)[\"'][^>]+type=[\"']application/rss\+xml[\"']"#,
                #"<link[^>]+type=[\"']application/atom\+xml[\"'][^>]+href=[\"']([^\"']+)[\"']"#,
                #"<link[^>]+href=[\"']([^\"']+)[\"'][^>]+type=[\"']application/atom\+xml[\"']"#
            ]

            for pattern in patterns {
                if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
                   let match = regex.firstMatch(in: html, range: NSRange(html.startIndex..., in: html)),
                   let range = Range(match.range(at: 1), in: html) {
                    var feedPath = String(html[range])

                    // Handle relative URLs
                    if feedPath.hasPrefix("/") {
                        feedPath = "\(pageUrl.scheme ?? "https")://\(pageUrl.host() ?? "")\(feedPath)"
                    } else if !feedPath.hasPrefix("http") {
                        feedPath = "\(url.hasSuffix("/") ? url : url + "/")\(feedPath)"
                    }

                    return feedPath
                }
            }

            // Try common RSS paths
            let commonPaths = ["/feed", "/rss", "/rss.xml", "/feed.xml", "/atom.xml", "/index.xml"]
            let baseUrl = "\(pageUrl.scheme ?? "https")://\(pageUrl.host() ?? "")"

            for path in commonPaths {
                let testUrl = baseUrl + path
                if await isRSSFeed(url: testUrl) {
                    return testUrl
                }
            }

        } catch {}

        return nil
    }

    private static func fetchRSSTitle(url: String) async -> String? {
        guard let feedUrl = URL(string: url) else { return nil }

        do {
            var request = URLRequest(url: feedUrl)
            request.timeoutInterval = 10
            let (data, _) = try await URLSession.shared.data(for: request)
            guard let xml = String(data: data, encoding: .utf8) else { return nil }

            // Extract title from RSS/Atom
            let patterns = [
                #"<title>(?:<!\[CDATA\[)?([^\]<]+)"#,
                #"<title[^>]*>([^<]+)</title>"#
            ]

            for pattern in patterns {
                if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
                   let match = regex.firstMatch(in: xml, range: NSRange(xml.startIndex..., in: xml)),
                   let range = Range(match.range(at: 1), in: xml) {
                    let title = String(xml[range]).trimmingCharacters(in: .whitespacesAndNewlines)
                    if !title.isEmpty && title.count < 100 {
                        return title
                    }
                }
            }
        } catch {}

        return nil
    }

    private static func extractDomainName(from host: String) -> String {
        var name = host
            .replacingOccurrences(of: "www.", with: "")
            .replacingOccurrences(of: ".com", with: "")
            .replacingOccurrences(of: ".org", with: "")
            .replacingOccurrences(of: ".net", with: "")
            .replacingOccurrences(of: ".io", with: "")

        // Capitalize first letter
        if let first = name.first {
            name = first.uppercased() + name.dropFirst()
        }

        return name
    }
}
