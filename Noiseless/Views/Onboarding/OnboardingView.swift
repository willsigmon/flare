import SwiftUI

/// Beautiful onboarding experience for first-time users
struct OnboardingView: View {
    @Environment(SupabaseService.self) private var supabase
    @Binding var isComplete: Bool

    @State private var currentPage = 0
    @State private var selectedCategories: Set<DiscoverCategory> = []
    @State private var selectedSources: Set<String> = []
    @State private var isSubscribing = false

    private let pages = [
        OnboardingPage(
            title: "Welcome to Noiseless",
            subtitle: "Your personal intelligence feed",
            description: "Cut through the noise. Get the signal.",
            icon: "waveform.circle.fill"
        ),
        OnboardingPage(
            title: "All Your Sources",
            subtitle: "One unified feed",
            description: "RSS, newsletters, Reddit, Twitter, YouTube - everything in one place.",
            icon: "square.stack.3d.up.fill"
        ),
        OnboardingPage(
            title: "AI-Powered",
            subtitle: "Summarized & ranked",
            description: "Smart summaries, deduplication, and relevance scoring tailored to you.",
            icon: "brain.head.profile.fill"
        )
    ]

    var body: some View {
        ZStack {
            // Animated background
            AnimatedMeshGradient()
                .opacity(0.6)

            // Content
            VStack(spacing: 0) {
                if currentPage < pages.count {
                    introPages
                } else if currentPage == pages.count {
                    categorySelection
                } else {
                    sourceSelection
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - Intro Pages

    private var introPages: some View {
        VStack(spacing: 32) {
            Spacer()

            // Icon
            Image(systemName: pages[currentPage].icon)
                .font(.system(size: 80))
                .foregroundStyle(.white)
                .symbolEffect(.pulse, options: .repeating)

            // Text
            VStack(spacing: 12) {
                Text(pages[currentPage].title)
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)

                Text(pages[currentPage].subtitle)
                    .font(.title2)
                    .foregroundStyle(.white.opacity(0.9))

                Text(pages[currentPage].description)
                    .font(.body)
                    .foregroundStyle(.white.opacity(0.7))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            Spacer()

            // Page indicators
            HStack(spacing: 8) {
                ForEach(0..<pages.count + 2, id: \.self) { index in
                    Circle()
                        .fill(index == currentPage ? .white : .white.opacity(0.3))
                        .frame(width: 8, height: 8)
                        .scaleEffect(index == currentPage ? 1.2 : 1.0)
                        .animation(.interpolatingSpring(stiffness: 300, damping: 20), value: currentPage)
                }
            }
            .padding(.bottom, 16)

            // Continue button
            Button {
                withAnimation(.interpolatingSpring(stiffness: 300, damping: 25)) {
                    currentPage += 1
                }
            } label: {
                Text("Continue")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(.white)
                    .foregroundStyle(.black)
                    .clipShape(Capsule())
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 32)
        }
        .transition(.asymmetric(
            insertion: .move(edge: .trailing).combined(with: .opacity),
            removal: .move(edge: .leading).combined(with: .opacity)
        ))
    }

    // MARK: - Category Selection

    private var categorySelection: some View {
        VStack(spacing: 24) {
            // Header
            VStack(spacing: 8) {
                Text("What interests you?")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)

                Text("Pick a few topics to get started")
                    .font(.body)
                    .foregroundStyle(.white.opacity(0.7))
            }
            .padding(.top, 60)

            // Category grid
            ScrollView {
                LazyVGrid(
                    columns: [
                        GridItem(.flexible(), spacing: 12),
                        GridItem(.flexible(), spacing: 12)
                    ],
                    spacing: 12
                ) {
                    ForEach(DiscoverCategory.allCases) { category in
                        OnboardingCategoryCard(
                            category: category,
                            isSelected: selectedCategories.contains(category)
                        ) {
                            withAnimation(.interpolatingSpring(stiffness: 400, damping: 25)) {
                                if selectedCategories.contains(category) {
                                    selectedCategories.remove(category)
                                } else {
                                    selectedCategories.insert(category)
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)
            }

            // Continue button
            Button {
                withAnimation(.interpolatingSpring(stiffness: 300, damping: 25)) {
                    currentPage += 1
                }
            } label: {
                Text(selectedCategories.isEmpty ? "Skip" : "Continue")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(selectedCategories.isEmpty ? .white.opacity(0.3) : .white)
                    .foregroundStyle(selectedCategories.isEmpty ? .white : .black)
                    .clipShape(Capsule())
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 32)
        }
        .transition(.asymmetric(
            insertion: .move(edge: .trailing).combined(with: .opacity),
            removal: .move(edge: .leading).combined(with: .opacity)
        ))
    }

    // MARK: - Source Selection

    private var sourceSelection: some View {
        VStack(spacing: 24) {
            // Header
            VStack(spacing: 8) {
                Text("Popular Sources")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)

                Text("Select sources to follow")
                    .font(.body)
                    .foregroundStyle(.white.opacity(0.7))
            }
            .padding(.top, 60)

            // Source list
            ScrollView {
                LazyVStack(spacing: 8) {
                    ForEach(suggestedSources) { source in
                        OnboardingSourceRow(
                            source: source,
                            isSelected: selectedSources.contains(source.feedUrl)
                        ) {
                            withAnimation(.interpolatingSpring(stiffness: 400, damping: 25)) {
                                if selectedSources.contains(source.feedUrl) {
                                    selectedSources.remove(source.feedUrl)
                                } else {
                                    selectedSources.insert(source.feedUrl)
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)
            }

            // Finish button
            Button {
                Task { await finishOnboarding() }
            } label: {
                HStack {
                    if isSubscribing {
                        ProgressView()
                            .tint(.black)
                    } else {
                        Text(selectedSources.isEmpty ? "Skip & Finish" : "Add \(selectedSources.count) Sources")
                    }
                }
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(.white)
                .foregroundStyle(.black)
                .clipShape(Capsule())
            }
            .disabled(isSubscribing)
            .padding(.horizontal, 32)
            .padding(.bottom, 32)
        }
        .transition(.asymmetric(
            insertion: .move(edge: .trailing).combined(with: .opacity),
            removal: .move(edge: .leading).combined(with: .opacity)
        ))
    }

    // MARK: - Computed

    private var suggestedSources: [SuggestedSource] {
        if selectedCategories.isEmpty {
            return CuratedSources.popular + Array(CuratedSources.all.prefix(10))
        }
        return selectedCategories.flatMap { CuratedSources.sources(for: $0) }
    }

    // MARK: - Actions

    private func finishOnboarding() async {
        guard let userId = supabase.effectiveUserId else {
            isComplete = true
            return
        }

        if selectedSources.isEmpty {
            isComplete = true
            return
        }

        isSubscribing = true

        let sourcesToAdd = suggestedSources.filter { selectedSources.contains($0.feedUrl) }
        let userSources = sourcesToAdd.map { source in
            UserSource(
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
        }

        do {
            try await supabase.addSources(userSources)
        } catch {
            // Continue anyway
        }

        isSubscribing = false
        isComplete = true
    }
}

// MARK: - Supporting Types

struct OnboardingPage {
    let title: String
    let subtitle: String
    let description: String
    let icon: String
}

// MARK: - Onboarding Category Card

struct OnboardingCategoryCard: View {
    let category: DiscoverCategory
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 12) {
                Image(systemName: category.icon)
                    .font(.title)
                    .foregroundStyle(isSelected ? .white : category.gradient.first ?? .blue)

                Text(category.rawValue)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(isSelected ? .white : .primary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background(
                isSelected
                    ? AnyShapeStyle(LinearGradient(colors: category.gradient, startPoint: .topLeading, endPoint: .bottomTrailing))
                    : AnyShapeStyle(.ultraThinMaterial)
            )
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(
                        isSelected ? .clear : .white.opacity(0.2),
                        lineWidth: 1
                    )
            )
        }
        .buttonStyle(.plain)
        .scaleEffect(isSelected ? 1.02 : 1.0)
        .animation(.interpolatingSpring(stiffness: 400, damping: 25), value: isSelected)
    }
}

// MARK: - Onboarding Source Row

struct OnboardingSourceRow: View {
    let source: SuggestedSource
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
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
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundStyle(.white)

                    Text(source.category.rawValue)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.6))
                }

                Spacer()

                // Selection indicator
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundStyle(isSelected ? .green : .white.opacity(0.4))
            }
            .padding(12)
            .background {
                if isSelected {
                    Color.white.opacity(0.15)
                } else {
                    Rectangle().fill(.ultraThinMaterial)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .strokeBorder(isSelected ? .green.opacity(0.5) : .clear, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    OnboardingView(isComplete: .constant(false))
        .environment(SupabaseService.shared)
}
