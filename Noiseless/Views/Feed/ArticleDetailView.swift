import SwiftUI

/// Detailed view of a single article
struct ArticleDetailView: View {
    let item: FeedItem
    @Environment(FeedViewModel.self) private var viewModel
    @Environment(\.openURL) private var openURL

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Header
                header

                Divider()

                // Content
                content

                // Actions
                actions

                // The Pulse - What people are saying
                Section {
                    PulseView(
                        topic: item.article.title,
                        keywords: item.article.topics ?? []
                    )
                } header: {
                    Text("Community")
                        .font(.headline)
                        .padding(.top, 16)
                }

                Spacer(minLength: 32)
            }
            .padding()
        }
        .navigationTitle("")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItemGroup(placement: .primaryAction) {
                Button {
                    Task { await viewModel.toggleSaved(item) }
                } label: {
                    Image(systemName: item.isSaved ? "bookmark.fill" : "bookmark")
                }

                ShareLink(item: URL(string: item.article.url)!) {
                    Image(systemName: "square.and.arrow.up")
                }
            }
        }
        .task {
            await viewModel.markAsRead(item)
        }
    }

    // MARK: - Subviews

    private var header: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Source and time
            HStack {
                Label(sourceName, systemImage: "dot.radiowaves.up.forward")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Spacer()

                if let publishedAt = item.article.publishedAt {
                    Text(publishedAt, style: .relative)
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }

            // Title
            Text(item.article.title)
                .font(.title2)
                .fontWeight(.bold)

            // Author
            if let author = item.article.author {
                Text("By \(author)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            // Topics
            if let topics = item.article.topics, !topics.isEmpty {
                FlowLayout(spacing: 8) {
                    ForEach(topics, id: \.self) { topic in
                        Text(topic)
                            .font(.caption)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(.secondary.opacity(0.15))
                            .clipShape(Capsule())
                    }
                }
            }

            // Banger indicator
            if let score = item.article.bangerScore, score >= 0.7 {
                HStack(spacing: 6) {
                    Image(systemName: score >= 0.9 ? "flame.fill" : "star.fill")
                        .foregroundStyle(score >= 0.9 ? .orange : .yellow)
                    Text(score >= 0.9 ? "Major Story" : "Notable")
                        .font(.caption)
                        .fontWeight(.semibold)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(score >= 0.9 ? .orange.opacity(0.15) : .yellow.opacity(0.15))
                .clipShape(Capsule())
            }
        }
    }

    private var content: some View {
        VStack(alignment: .leading, spacing: 16) {
            // AI Summary
            if let summary = item.article.summaryExtended ?? item.article.summaryShort {
                VStack(alignment: .leading, spacing: 8) {
                    Label("AI Summary", systemImage: "sparkles")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.secondary)

                    Text(summary)
                        .font(.body)
                }
                .padding()
                .background(.secondary.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            // Extracted content
            if let content = item.article.extractedContent {
                Text(content)
                    .font(.body)
                    .lineSpacing(4)
            } else if item.article.summaryShort == nil {
                ContentUnavailableView {
                    Label("No Content", systemImage: "doc.text")
                } description: {
                    Text("Open the original article to read the full content.")
                }
            }
        }
    }

    private var actions: some View {
        VStack(spacing: 12) {
            // Open original
            Button {
                if let url = URL(string: item.article.url) {
                    openURL(url)
                }
            } label: {
                Label("Read Original", systemImage: "safari")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(.blue)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .buttonStyle(.plain)

            // Vote buttons
            HStack(spacing: 12) {
                Button {
                    Task { await viewModel.vote(item, direction: 1) }
                } label: {
                    Label("Like", systemImage: item.vote == 1 ? "hand.thumbsup.fill" : "hand.thumbsup")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(item.vote == 1 ? .green.opacity(0.2) : .secondary.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .buttonStyle(.plain)

                Button {
                    Task { await viewModel.vote(item, direction: -1) }
                } label: {
                    Label("Dislike", systemImage: item.vote == -1 ? "hand.thumbsdown.fill" : "hand.thumbsdown")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(item.vote == -1 ? .red.opacity(0.2) : .secondary.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var sourceName: String {
        guard let url = URL(string: item.article.sourceUrl),
              let host = url.host() else {
            return item.article.sourceUrl
        }
        return host.replacingOccurrences(of: "www.", with: "")
    }
}

// MARK: - Flow Layout

/// A simple flow layout for tags
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrangeSubviews(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrangeSubviews(proposal: proposal, subviews: subviews)
        for (index, frame) in result.frames.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + frame.minX, y: bounds.minY + frame.minY), proposal: .unspecified)
        }
    }

    private func arrangeSubviews(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, frames: [CGRect]) {
        let maxWidth = proposal.width ?? .infinity
        var frames: [CGRect] = []
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)

            if currentX + size.width > maxWidth && currentX > 0 {
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }

            frames.append(CGRect(x: currentX, y: currentY, width: size.width, height: size.height))
            lineHeight = max(lineHeight, size.height)
            currentX += size.width + spacing
        }

        let totalHeight = currentY + lineHeight
        return (CGSize(width: maxWidth, height: totalHeight), frames)
    }
}

#Preview {
    NavigationStack {
        ArticleDetailView(item: .preview)
    }
    .environment(FeedViewModel())
}
