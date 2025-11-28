import SwiftUI

/// Compact, dense row for the unified feed - matches web design
struct UnifiedFeedRow: View {
    let item: TrendingItem
    let rank: Int

    @State private var voteState: VoteState = .none

    enum VoteState {
        case none, up, down
    }

    var body: some View {
        HStack(spacing: 12) {
            // Rank number
            Text("\(rank).")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
                .frame(width: 28, alignment: .trailing)

            // Vote buttons - vertical stack like Reddit
            VStack(spacing: 0) {
                Button {
                    withAnimation(.spring(response: 0.2, dampingFraction: 0.7)) {
                        voteState = voteState == .up ? .none : .up
                    }
                } label: {
                    Image(systemName: "arrowtriangle.up.fill")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(voteState == .up ? .green : .secondary.opacity(0.5))
                }
                .buttonStyle(.plain)

                Button {
                    withAnimation(.spring(response: 0.2, dampingFraction: 0.7)) {
                        voteState = voteState == .down ? .none : .down
                    }
                } label: {
                    Image(systemName: "arrowtriangle.down.fill")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(voteState == .down ? .red : .secondary.opacity(0.5))
                }
                .buttonStyle(.plain)
            }
            .frame(width: 20)

            // Main content
            VStack(alignment: .leading, spacing: 4) {
                // Title
                Text(item.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)
                    .foregroundStyle(.primary)

                // Metadata line
                HStack(spacing: 6) {
                    // Platform icon + name
                    HStack(spacing: 3) {
                        Image(systemName: item.platform.icon)
                            .font(.caption2)
                        Text(item.platform.rawValue)
                            .font(.caption)
                    }
                    .foregroundStyle(item.platform.brandColor)

                    Text("•")
                        .foregroundStyle(.tertiary)

                    // Points
                    if let engagement = item.formattedEngagement {
                        Text("\(engagement) pts")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Text("•")
                        .foregroundStyle(.tertiary)

                    // Time
                    Text(item.timestamp, style: .relative)
                        .font(.caption)
                        .foregroundStyle(.tertiary)

                    // Domain (if URL available)
                    if let urlString = item.url, let domain = extractDomain(from: urlString) {
                        Text("•")
                            .foregroundStyle(.tertiary)
                        Text(domain)
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                            .lineLimit(1)
                    }
                }
            }

            Spacer(minLength: 0)

            // Comment count if available
            if let subtitle = item.subtitle, subtitle.contains("comment") {
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .contentShape(Rectangle())
    }

    private func extractDomain(from urlString: String) -> String? {
        guard let url = URL(string: urlString),
              let host = url.host else { return nil }
        return host.replacingOccurrences(of: "www.", with: "")
    }
}

/// Hero card for top 1-2 stories - matches web HeroCard
struct UnifiedHeroCard: View {
    let item: TrendingItem
    let rank: Int

    @State private var voteState: VoteState = .none

    enum VoteState {
        case none, up, down
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header - rank + platform + engagement
            HStack {
                // Rank badge
                Text("#\(rank)")
                    .font(.caption)
                    .fontWeight(.bold)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(item.platform.brandColor.opacity(0.15))
                    .foregroundStyle(item.platform.brandColor)
                    .clipShape(Capsule())

                Spacer()

                // Platform
                HStack(spacing: 4) {
                    Image(systemName: item.platform.icon)
                        .font(.caption)
                    Text(item.platform.rawValue)
                        .font(.caption)
                        .fontWeight(.medium)
                }
                .foregroundStyle(.secondary)
            }

            // Title
            Text(item.title)
                .font(.headline)
                .fontWeight(.semibold)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)

            // Metadata
            HStack(spacing: 12) {
                if let engagement = item.formattedEngagement, let label = item.engagementLabel {
                    HStack(spacing: 4) {
                        Text(engagement)
                            .fontWeight(.semibold)
                        Text(label)
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }

                Text(item.timestamp, style: .relative)
                    .font(.caption)
                    .foregroundStyle(.tertiary)

                Spacer()

                // Vote buttons - horizontal for hero
                HStack(spacing: 8) {
                    Button {
                        withAnimation(.spring(response: 0.2, dampingFraction: 0.7)) {
                            voteState = voteState == .up ? .none : .up
                        }
                    } label: {
                        Image(systemName: "hand.thumbsup.fill")
                            .font(.system(size: 14))
                            .foregroundStyle(voteState == .up ? .green : .secondary.opacity(0.6))
                    }
                    .buttonStyle(.plain)

                    Button {
                        withAnimation(.spring(response: 0.2, dampingFraction: 0.7)) {
                            voteState = voteState == .down ? .none : .down
                        }
                    } label: {
                        Image(systemName: "hand.thumbsdown.fill")
                            .font(.system(size: 14))
                            .foregroundStyle(voteState == .down ? .red : .secondary.opacity(0.6))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(
                            LinearGradient(
                                colors: [item.platform.brandColor.opacity(0.08), .clear],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                )
        )
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(item.platform.brandColor.opacity(0.2), lineWidth: 1)
        )
    }
}

#Preview {
    VStack(spacing: 0) {
        UnifiedHeroCard(
            item: TrendingItem(
                platform: .reddit,
                title: "Campbell's fires executive who was recorded saying DEI approach",
                subtitle: "r/news",
                description: nil,
                url: "https://reddit.com/r/news/123",
                rank: 1,
                engagementCount: 19300,
                engagementLabel: "upvotes",
                timestamp: Date().addingTimeInterval(-3600 * 4),
                category: nil,
                imageUrl: nil
            ),
            rank: 1
        )
        .padding()

        Divider()

        UnifiedFeedRow(
            item: TrendingItem(
                platform: .hackernews,
                title: "Migrating the main Zig repository from GitHub to Codeberg",
                subtitle: "198 comments",
                description: nil,
                url: "https://news.ycombinator.com/item?id=123",
                rank: 3,
                engagementCount: 316,
                engagementLabel: "points",
                timestamp: Date().addingTimeInterval(-3600 * 2),
                category: nil,
                imageUrl: nil
            ),
            rank: 3
        )

        Divider()

        UnifiedFeedRow(
            item: TrendingItem(
                platform: .twitter,
                title: "Breaking: Major announcement from Apple about new product line",
                subtitle: nil,
                description: nil,
                url: "https://twitter.com/apple/status/123",
                rank: 4,
                engagementCount: 12500,
                engagementLabel: "likes",
                timestamp: Date().addingTimeInterval(-3600),
                category: nil,
                imageUrl: nil
            ),
            rank: 4
        )
    }
    .background(Color(.systemBackground))
}
