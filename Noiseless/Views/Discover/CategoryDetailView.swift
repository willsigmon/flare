import SwiftUI

/// Detail view for a category showing all sources
struct CategoryDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(SupabaseService.self) private var supabase

    let category: DiscoverCategory
    @Binding var subscribedUrls: Set<String>
    let namespace: Namespace.ID

    @State private var selectedSources: Set<String> = []
    @State private var isSubscribing = false

    private var sources: [SuggestedSource] {
        CuratedSources.sources(for: category)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    // Hero header
                    headerView

                    // Source list
                    LazyVStack(spacing: 0) {
                        ForEach(sources) { source in
                            SourceSelectRow(
                                source: source,
                                isSelected: selectedSources.contains(source.feedUrl),
                                isSubscribed: subscribedUrls.contains(source.feedUrl)
                            ) {
                                toggleSelection(source)
                            }
                            .padding(.horizontal)
                            .padding(.vertical, 6)

                            if source.id != sources.last?.id {
                                Divider()
                                    .padding(.leading, 68)
                            }
                        }
                    }
                    .padding(.vertical)
                }
            }
            .navigationTitle(category.rawValue)
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }

                ToolbarItem(placement: .confirmationAction) {
                    if !selectedSources.isEmpty {
                        Button {
                            Task { await subscribeToSelected() }
                        } label: {
                            if isSubscribing {
                                ProgressView()
                            } else {
                                Text("Add \(selectedSources.count)")
                                    .fontWeight(.semibold)
                            }
                        }
                        .disabled(isSubscribing)
                    }
                }
            }
            .safeAreaInset(edge: .bottom) {
                if !selectedSources.isEmpty {
                    subscribeBar
                }
            }
        }
    }

    // MARK: - Header

    private var headerView: some View {
        ZStack(alignment: .bottomLeading) {
            // Gradient background
            LinearGradient(
                colors: category.gradient + [category.gradient.last?.opacity(0.5) ?? .clear],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .frame(height: 200)

            // Content
            VStack(alignment: .leading, spacing: 8) {
                Image(systemName: category.icon)
                    .font(.largeTitle)
                    .foregroundStyle(.white)
                    .padding(16)
                    .background(.ultraThinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 16))

                Text(category.description)
                    .font(.title3)
                    .foregroundStyle(.white.opacity(0.9))

                Text("\(sources.count) sources available")
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.7))
            }
            .padding()
            .padding(.bottom, 8)
        }
    }

    // MARK: - Subscribe Bar

    private var subscribeBar: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 2) {
                Text("\(selectedSources.count) selected")
                    .font(.headline)

                Text("Tap sources to select")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Button {
                Task { await subscribeToSelected() }
            } label: {
                HStack {
                    if isSubscribing {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "plus")
                        Text("Subscribe")
                    }
                }
                .font(.headline)
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
                .background(category.gradient.first ?? .blue)
                .foregroundStyle(.white)
                .clipShape(Capsule())
            }
            .disabled(isSubscribing)
        }
        .padding()
        .background(.ultraThinMaterial)
    }

    // MARK: - Actions

    private func toggleSelection(_ source: SuggestedSource) {
        if subscribedUrls.contains(source.feedUrl) { return }

        withAnimation(.interpolatingSpring(stiffness: 400, damping: 25)) {
            if selectedSources.contains(source.feedUrl) {
                selectedSources.remove(source.feedUrl)
            } else {
                selectedSources.insert(source.feedUrl)
            }
        }
    }

    private func subscribeToSelected() async {
        guard let userId = supabase.effectiveUserId else { return }

        isSubscribing = true

        let sourcesToAdd = sources.filter { selectedSources.contains($0.feedUrl) }
        let userSources = sourcesToAdd.map { source in
            UserSource(
                id: UUID(),
                userId: userId,
                type: .rss,
                url: source.feedUrl,
                name: source.name,
                iconUrl: source.faviconUrl,
                category: category.rawValue,
                fetchFrequency: "1 hour",
                lastFetched: nil,
                isActive: true,
                notifyAlways: false,
                createdAt: Date()
            )
        }

        do {
            try await supabase.addSources(userSources)
            subscribedUrls.formUnion(selectedSources)
            selectedSources.removeAll()
        } catch {
            // Handle error
        }

        isSubscribing = false
    }
}

// MARK: - Source Select Row

struct SourceSelectRow: View {
    let source: SuggestedSource
    let isSelected: Bool
    let isSubscribed: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                // Selection indicator
                ZStack {
                    Circle()
                        .strokeBorder(
                            isSubscribed ? .green : (isSelected ? source.category.gradient.first ?? .blue : .secondary.opacity(0.3)),
                            lineWidth: 2
                        )
                        .frame(width: 24, height: 24)

                    if isSelected || isSubscribed {
                        Circle()
                            .fill(isSubscribed ? .green : source.category.gradient.first ?? .blue)
                            .frame(width: 16, height: 16)

                        Image(systemName: "checkmark")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundStyle(.white)
                    }
                }
                .animation(.interpolatingSpring(stiffness: 400, damping: 20), value: isSelected)

                // Favicon
                AsyncImage(url: URL(string: source.faviconUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                } placeholder: {
                    Image(systemName: source.category.icon)
                        .foregroundStyle(source.category.gradient.first ?? .blue)
                }
                .frame(width: 36, height: 36)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 8))

                // Info
                VStack(alignment: .leading, spacing: 2) {
                    HStack {
                        Text(source.name)
                            .font(.body)
                            .fontWeight(.medium)
                            .foregroundStyle(.primary)

                        if isSubscribed {
                            Text("Subscribed")
                                .font(.caption2)
                                .foregroundStyle(.green)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(.green.opacity(0.1))
                                .clipShape(Capsule())
                        }
                    }

                    Text(source.description)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                Spacer()
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(isSubscribed)
        .opacity(isSubscribed ? 0.6 : 1.0)
    }
}

#Preview {
    @Previewable @Namespace var namespace
    @Previewable @State var subscribedUrls: Set<String> = []

    CategoryDetailView(
        category: .technology,
        subscribedUrls: $subscribedUrls,
        namespace: namespace
    )
    .environment(SupabaseService.shared)
}
