import SwiftUI

/// Unified trending view - dense aggregated feed matching web design
struct TrendingView: View {
    @State private var sections: [TrendingSection] = []
    @State private var isLoading = true
    @State private var selectedPlatform: TrendingPlatform?

    private let service = TrendingService.shared

    /// All items flattened and sorted by engagement
    private var allItems: [TrendingItem] {
        let items = sections.flatMap { $0.items }
        return items.sorted { ($0.engagementCount ?? 0) > ($1.engagementCount ?? 0) }
    }

    /// Filtered items based on selected platform
    private var filteredItems: [TrendingItem] {
        guard let platform = selectedPlatform else {
            return allItems
        }
        return allItems.filter { $0.platform == platform }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 0) {
                    // Platform filter pills
                    platformFilter
                        .padding(.bottom, 16)

                    if isLoading {
                        loadingView
                    } else if filteredItems.isEmpty {
                        emptyView
                    } else {
                        // Featured - Top 2 stories as hero cards
                        if selectedPlatform == nil {
                            featuredSection
                        }

                        // Dense unified feed
                        feedSection
                    }
                }
                .padding(.bottom, 100) // Account for tab bar
            }
            .navigationTitle("Trending")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.large)
            #endif
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        Task { await refresh() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .disabled(isLoading)
                }
            }
            .refreshable {
                await refresh()
            }
            .task {
                if sections.isEmpty {
                    await loadTrends()
                }
            }
        }
    }

    // MARK: - Platform Filter

    private var platformFilter: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                // All filter
                FilterChip(
                    title: "All",
                    isSelected: selectedPlatform == nil,
                    color: .blue
                ) {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                        selectedPlatform = nil
                    }
                }

                // Platform filters
                ForEach(TrendingPlatform.filterablePlatforms) { platform in
                    FilterChip(
                        title: platform.rawValue,
                        icon: platform.icon,
                        isSelected: selectedPlatform == platform,
                        color: platform.brandColor
                    ) {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            selectedPlatform = platform
                        }
                    }
                }
            }
            .padding(.horizontal)
        }
    }

    // MARK: - Featured Section (Top 2)

    private var featuredSection: some View {
        VStack(spacing: 12) {
            ForEach(Array(filteredItems.prefix(2).enumerated()), id: \.element.id) { index, item in
                if let url = item.url, let itemURL = URL(string: url) {
                    Link(destination: itemURL) {
                        UnifiedHeroCard(item: item, rank: index + 1)
                    }
                    .buttonStyle(.plain)
                } else {
                    UnifiedHeroCard(item: item, rank: index + 1)
                }
            }
        }
        .padding(.horizontal)
        .padding(.bottom, 16)
    }

    // MARK: - Dense Feed Section

    private var feedSection: some View {
        VStack(spacing: 0) {
            // Section background
            VStack(spacing: 0) {
                let startIndex = selectedPlatform == nil ? 2 : 0
                let items = Array(filteredItems.dropFirst(startIndex))

                ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                    if let url = item.url, let itemURL = URL(string: url) {
                        Link(destination: itemURL) {
                            UnifiedFeedRow(item: item, rank: startIndex + index + 1)
                        }
                        .buttonStyle(.plain)
                    } else {
                        UnifiedFeedRow(item: item, rank: startIndex + index + 1)
                    }

                    if index < items.count - 1 {
                        Divider()
                            .padding(.leading, 52)
                    }
                }
            }
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(.ultraThinMaterial)
            )
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .padding(.horizontal)
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 16) {
            // Skeleton hero cards
            ForEach(0..<2, id: \.self) { _ in
                RoundedRectangle(cornerRadius: 16)
                    .fill(.quaternary)
                    .frame(height: 120)
            }
            .padding(.horizontal)

            // Skeleton list
            VStack(spacing: 0) {
                ForEach(0..<15, id: \.self) { _ in
                    HStack(spacing: 12) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(.quaternary)
                            .frame(width: 28, height: 16)

                        RoundedRectangle(cornerRadius: 4)
                            .fill(.quaternary)
                            .frame(width: 20, height: 32)

                        VStack(alignment: .leading, spacing: 6) {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(.quaternary)
                                .frame(height: 14)

                            RoundedRectangle(cornerRadius: 4)
                                .fill(.quaternary)
                                .frame(width: 180, height: 12)
                        }
                    }
                    .padding(.vertical, 12)
                    .padding(.horizontal)

                    Divider()
                        .padding(.leading, 52)
                }
            }
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(.ultraThinMaterial)
            )
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .padding(.horizontal)
        }
        .redacted(reason: .placeholder)
        .shimmering()
    }

    // MARK: - Empty View

    private var emptyView: some View {
        ContentUnavailableView {
            Label("No Trends", systemImage: "chart.line.uptrend.xyaxis")
        } description: {
            Text("Unable to fetch trending content. Pull to refresh.")
        }
        .padding(.top, 60)
    }

    // MARK: - Actions

    private func loadTrends() async {
        isLoading = true
        sections = await service.fetchAllTrends()
        isLoading = false
    }

    private func refresh() async {
        sections = await service.fetchAllTrends()
    }
}

// MARK: - Filter Chip (renamed from FilterPill for clarity)

struct FilterChip: View {
    let title: String
    var icon: String?
    let isSelected: Bool
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 5) {
                if let icon {
                    Image(systemName: icon)
                        .font(.caption2)
                }
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(isSelected ? color : Color(.systemGray6))
            .foregroundStyle(isSelected ? .white : .primary)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Shimmer Effect

struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geo in
                    LinearGradient(
                        colors: [.clear, .white.opacity(0.3), .clear],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geo.size.width * 2)
                    .offset(x: -geo.size.width + (geo.size.width * 2 * phase))
                }
                .mask(content)
            )
            .onAppear {
                withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
    }
}

extension View {
    func shimmering() -> some View {
        modifier(ShimmerModifier())
    }
}

#Preview {
    TrendingView()
}
