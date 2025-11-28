import SwiftUI

/// Reusable "The Pulse" component - shows what people are saying about any topic
/// Can be embedded in article detail views, trending detail views, etc.
struct PulseView: View {
    let topic: String
    let keywords: [String]

    @State private var posts: [PulsePost] = []
    @State private var isLoading = true
    @State private var isExpanded = false

    private let service = TrendingService.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header - tappable to expand/collapse
            Button {
                withAnimation(.interpolatingSpring(stiffness: 300, damping: 25)) {
                    isExpanded.toggle()
                }
            } label: {
                pulseHeader
            }
            .buttonStyle(.plain)

            // Content - shown when expanded
            if isExpanded {
                pulseContent
                    .transition(.asymmetric(
                        insertion: .push(from: .bottom).combined(with: .opacity),
                        removal: .push(from: .top).combined(with: .opacity)
                    ))
            }
        }
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .task {
            await loadPosts()
        }
    }

    // MARK: - Header

    private var pulseHeader: some View {
        HStack(spacing: 12) {
            // Animated icon
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [.pink, .purple, .blue],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 36, height: 36)

                Image(systemName: "waveform.circle.fill")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.white)
                    .symbolEffect(.pulse, options: .repeating)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("The Pulse")
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundStyle(.primary)

                Text("See what people are saying")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Post count badge
            if !posts.isEmpty {
                Text("\(posts.count)")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(.secondary.opacity(0.2))
                    .clipShape(Capsule())
            }

            // Expand/collapse indicator
            Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)
        }
        .padding()
    }

    // MARK: - Content

    private var pulseContent: some View {
        VStack(spacing: 0) {
            Divider()

            if isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                        .padding()
                    Spacer()
                }
            } else if posts.isEmpty {
                emptyState
            } else {
                LazyVStack(spacing: 0) {
                    ForEach(posts) { post in
                        PulseCommentRow(post: post)

                        if post.id != posts.last?.id {
                            Divider()
                                .padding(.leading, 52)
                        }
                    }
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Image(systemName: "bubble.left.and.bubble.right")
                .font(.title2)
                .foregroundStyle(.tertiary)

            Text("No discussions yet")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
    }

    // MARK: - Data Loading

    private func loadPosts() async {
        isLoading = true
        // In production, this would search for posts related to the topic/keywords
        // For now, fetch general posts and pretend they're related
        posts = await service.fetchPulsePosts()
        isLoading = false
    }
}

// MARK: - Pulse Comment Row

struct PulseCommentRow: View {
    let post: PulsePost

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Avatar
            ZStack {
                Circle()
                    .fill(post.platform.brandColor.opacity(0.15))
                    .frame(width: 40, height: 40)

                Text(String(post.authorName.prefix(1)))
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(post.platform.brandColor)
            }

            VStack(alignment: .leading, spacing: 6) {
                // Author info
                HStack(spacing: 6) {
                    Text(post.authorName)
                        .font(.subheadline)
                        .fontWeight(.semibold)

                    if post.isVerified {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.caption2)
                            .foregroundStyle(.blue)
                    }

                    Text("·")
                        .foregroundStyle(.tertiary)

                    Text(post.authorHandle)
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Spacer()

                    // Platform icon
                    Image(systemName: post.platform.icon)
                        .font(.caption2)
                        .foregroundStyle(post.platform.brandColor)
                }

                // Content
                Text(post.content)
                    .font(.body)
                    .lineLimit(4)

                // Footer
                HStack(spacing: 16) {
                    // Engagement
                    Label(post.formattedEngagement, systemImage: post.engagementType == .likes ? "heart" : "arrow.up")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    // Replies
                    if let replies = post.replyCount {
                        Label("\(replies)", systemImage: "bubble.right")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    // Time
                    Text(post.timestamp, style: .relative)
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }
        }
        .padding()
    }
}

// MARK: - Inline Pulse Button

/// A compact button that opens The Pulse in a sheet
struct PulseButton: View {
    let topic: String
    let keywords: [String]

    @State private var isShowingPulse = false

    var body: some View {
        Button {
            isShowingPulse = true
        } label: {
            HStack(spacing: 6) {
                Image(systemName: "waveform.circle.fill")
                    .symbolEffect(.pulse, options: .repeating)
                Text("The Pulse")
                    .fontWeight(.medium)
            }
            .font(.subheadline)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(
                LinearGradient(
                    colors: [.pink.opacity(0.2), .purple.opacity(0.2), .blue.opacity(0.2)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .strokeBorder(
                        LinearGradient(
                            colors: [.pink.opacity(0.4), .purple.opacity(0.4), .blue.opacity(0.4)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            )
        }
        .sheet(isPresented: $isShowingPulse) {
            PulseSheet(topic: topic, keywords: keywords)
        }
    }
}

// MARK: - Pulse Sheet

struct PulseSheet: View {
    @Environment(\.dismiss) private var dismiss

    let topic: String
    let keywords: [String]

    @State private var posts: [PulsePost] = []
    @State private var isLoading = true

    private let service = TrendingService.shared

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    // Topic header
                    VStack(spacing: 8) {
                        Image(systemName: "waveform.circle.fill")
                            .font(.largeTitle)
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [.pink, .purple, .blue],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .symbolEffect(.pulse, options: .repeating)

                        Text("The Pulse")
                            .font(.title2)
                            .fontWeight(.bold)

                        Text("What people are saying about")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)

                        Text(topic)
                            .font(.headline)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(.secondary.opacity(0.1))
                            .clipShape(Capsule())
                    }
                    .padding(.vertical, 24)

                    Divider()

                    if isLoading {
                        ProgressView()
                            .padding(.vertical, 60)
                    } else if posts.isEmpty {
                        ContentUnavailableView {
                            Label("No discussions", systemImage: "bubble.left.and.bubble.right")
                        } description: {
                            Text("No one is talking about this yet.")
                        }
                    } else {
                        LazyVStack(spacing: 0) {
                            ForEach(posts) { post in
                                PulseCommentRow(post: post)

                                if post.id != posts.last?.id {
                                    Divider()
                                        .padding(.leading, 52)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("The Pulse")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .task {
                await loadPosts()
            }
        }
    }

    private func loadPosts() async {
        isLoading = true
        posts = await service.fetchPulsePosts()
        isLoading = false
    }
}

#Preview {
    VStack {
        PulseView(topic: "iOS 26", keywords: ["Apple", "iOS", "design"])
            .padding()

        PulseButton(topic: "iOS 26", keywords: ["Apple"])
            .padding()
    }
}
