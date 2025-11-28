import SwiftUI

/// Main discovery view for finding new sources - Flipboard/Feedly style
struct DiscoverView: View {
    @Environment(SupabaseService.self) private var supabase
    @State private var searchText = ""
    @State private var selectedCategory: DiscoverCategory?
    @State private var subscribedUrls: Set<String> = []
    @State private var isShowingOPMLImport = false

    @Namespace private var namespace

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Hero section with popular picks
                    heroSection

                    // Quick actions
                    quickActions

                    // Category grid
                    categoryGrid

                    // Popular sources
                    popularSourcesSection
                }
                .padding(.bottom, 32)
            }
            .navigationTitle("Discover")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.large)
            #endif
            .searchable(text: $searchText, prompt: "Search sources...")
            .sheet(item: $selectedCategory) { category in
                CategoryDetailView(
                    category: category,
                    subscribedUrls: $subscribedUrls,
                    namespace: namespace
                )
            }
            .sheet(isPresented: $isShowingOPMLImport) {
                OPMLImportView { sources in
                    subscribedUrls.formUnion(sources.map { $0.url })
                }
            }
            .task {
                await loadSubscribedSources()
            }
        }
    }

    // MARK: - Hero Section

    private var heroSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Find Your Sources")
                .font(.title2)
                .fontWeight(.bold)
                .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(CuratedSources.popular) { source in
                        HeroSourceCard(
                            source: source,
                            isSubscribed: subscribedUrls.contains(source.feedUrl)
                        ) {
                            await subscribe(to: source)
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
        .padding(.top, 8)
    }

    // MARK: - Quick Actions

    private var quickActions: some View {
        HStack(spacing: 12) {
            QuickActionButton(
                title: "Import OPML",
                icon: "doc.badge.arrow.up",
                color: .blue
            ) {
                isShowingOPMLImport = true
            }

            QuickActionButton(
                title: "Paste URL",
                icon: "link",
                color: .purple
            ) {
                // Will be handled by AddSourceView
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Category Grid

    private var categoryGrid: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Browse by Topic")
                .font(.title3)
                .fontWeight(.semibold)
                .padding(.horizontal)

            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: 12),
                    GridItem(.flexible(), spacing: 12)
                ],
                spacing: 12
            ) {
                ForEach(DiscoverCategory.allCases) { category in
                    CategoryCard(category: category) {
                        selectedCategory = category
                    }
                    .matchedTransitionSource(id: category.id, in: namespace)
                }
            }
            .padding(.horizontal)
        }
    }

    // MARK: - Popular Sources Section

    private var popularSourcesSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Popular Sources")
                    .font(.title3)
                    .fontWeight(.semibold)

                Spacer()

                Text("\(CuratedSources.all.count) available")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal)

            LazyVStack(spacing: 8) {
                ForEach(CuratedSources.all.prefix(10)) { source in
                    SourceRowCard(
                        source: source,
                        isSubscribed: subscribedUrls.contains(source.feedUrl)
                    ) {
                        await subscribe(to: source)
                    }
                }
            }
            .padding(.horizontal)
        }
    }

    // MARK: - Actions

    private func loadSubscribedSources() async {
        do {
            let sources = try await supabase.fetchSources()
            subscribedUrls = Set(sources.map { $0.url })
        } catch {
            // Ignore errors, just start with empty set
        }
    }

    private func subscribe(to source: SuggestedSource) async {
        guard let userId = supabase.effectiveUserId else { return }

        let newSource = UserSource(
            id: UUID(),
            userId: userId,
            type: .rss,
            url: source.feedUrl,
            name: source.name,
            iconUrl: source.faviconUrl,
            category: source.category.rawValue,
            fetchFrequency: "1 hour",
            lastFetched: nil,
            isActive: true,
            notifyAlways: false,
            createdAt: Date()
        )

        do {
            try await supabase.addSource(newSource)
            subscribedUrls.insert(source.feedUrl)
        } catch {
            // Handle error silently for now
        }
    }
}

// MARK: - Hero Source Card

struct HeroSourceCard: View {
    let source: SuggestedSource
    let isSubscribed: Bool
    let onSubscribe: () async -> Void

    @State private var isPressed = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Icon and category
            HStack {
                AsyncImage(url: URL(string: source.faviconUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                } placeholder: {
                    Image(systemName: source.category.icon)
                        .font(.title2)
                        .foregroundStyle(.white)
                }
                .frame(width: 32, height: 32)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 8))

                Spacer()

                Text(source.category.rawValue)
                    .font(.caption2)
                    .fontWeight(.medium)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(.ultraThinMaterial)
                    .clipShape(Capsule())
            }

            Spacer()

            // Source info
            VStack(alignment: .leading, spacing: 4) {
                Text(source.name)
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)

                Text(source.description)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.8))
                    .lineLimit(2)
            }

            // Subscribe button
            Button {
                Task { await onSubscribe() }
            } label: {
                HStack {
                    Image(systemName: isSubscribed ? "checkmark" : "plus")
                    Text(isSubscribed ? "Subscribed" : "Subscribe")
                }
                .font(.subheadline)
                .fontWeight(.semibold)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(isSubscribed ? .white.opacity(0.2) : .white)
                .foregroundStyle(isSubscribed ? .white : .black)
                .clipShape(Capsule())
            }
            .disabled(isSubscribed)
        }
        .padding()
        .frame(width: 200, height: 200)
        .background(
            LinearGradient(
                colors: source.category.gradient,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .shadow(color: source.category.gradient.first?.opacity(0.4) ?? .clear, radius: 10, y: 5)
        .scaleEffect(isPressed ? 0.95 : 1.0)
        .animation(.interpolatingSpring(stiffness: 300, damping: 20), value: isPressed)
        .onLongPressGesture(minimumDuration: .infinity, pressing: { pressing in
            isPressed = pressing
        }, perform: {})
    }
}

// MARK: - Quick Action Button

struct QuickActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.body)
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .strokeBorder(color.opacity(0.3), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Category Card

struct CategoryCard: View {
    let category: DiscoverCategory
    let action: () -> Void

    @State private var isHovered = false

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: category.icon)
                        .font(.title2)
                        .foregroundStyle(category.gradient.first ?? .blue)

                    Spacer()

                    Text("\(CuratedSources.sources(for: category).count)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(category.rawValue)
                        .font(.headline)
                        .foregroundStyle(.primary)

                    Text(category.description)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(
                        LinearGradient(
                            colors: [category.gradient.first?.opacity(0.3) ?? .clear, .clear],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            )
        }
        .buttonStyle(.plain)
        .scaleEffect(isHovered ? 1.02 : 1.0)
        .animation(.interpolatingSpring(stiffness: 400, damping: 25), value: isHovered)
        #if os(macOS)
        .onHover { hovering in
            isHovered = hovering
        }
        #endif
    }
}

// MARK: - Source Row Card

struct SourceRowCard: View {
    let source: SuggestedSource
    let isSubscribed: Bool
    let onSubscribe: () async -> Void

    var body: some View {
        HStack(spacing: 12) {
            // Favicon
            AsyncImage(url: URL(string: source.faviconUrl)) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            } placeholder: {
                Image(systemName: source.category.icon)
                    .foregroundStyle(source.category.gradient.first ?? .blue)
            }
            .frame(width: 40, height: 40)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 10))

            // Info
            VStack(alignment: .leading, spacing: 2) {
                Text(source.name)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(source.description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            // Subscribe button
            Button {
                Task { await onSubscribe() }
            } label: {
                Image(systemName: isSubscribed ? "checkmark.circle.fill" : "plus.circle")
                    .font(.title2)
                    .foregroundStyle(isSubscribed ? .green : .blue)
            }
            .buttonStyle(.plain)
            .disabled(isSubscribed)
        }
        .padding(12)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

#Preview {
    DiscoverView()
        .environment(SupabaseService.shared)
}
