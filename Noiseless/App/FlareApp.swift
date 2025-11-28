import SwiftUI

@main
struct FlareApp: App {
    @State private var supabase = SupabaseService.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(supabase)
        }
        #if os(macOS)
        .windowStyle(.hiddenTitleBar)
        .defaultSize(width: 1200, height: 800)
        #endif
    }
}

/// Root content view with auth gate
struct ContentView: View {
    @Environment(SupabaseService.self) private var supabase

    var body: some View {
        Group {
            if supabase.isLoading {
                LoadingView()
            } else if supabase.isAuthenticated {
                MainView()
            } else {
                AuthView()
            }
        }
        .animation(.default, value: supabase.isAuthenticated)
    }
}

/// Loading state while checking auth
struct LoadingView: View {
    var body: some View {
        VStack(spacing: 16) {
            ProgressView()
            Text("Loading...")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}

/// Main app view after authentication
struct MainView: View {
    @Environment(SupabaseService.self) private var supabase
    @State private var feedViewModel = FeedViewModel()
    @State private var hasCompletedOnboarding = false
    @State private var hasSources = true // Assume true until we check
    @State private var isCheckingOnboarding = true

    var body: some View {
        Group {
            if isCheckingOnboarding {
                LoadingView()
            } else if !hasCompletedOnboarding && !hasSources {
                OnboardingView(isComplete: $hasCompletedOnboarding)
            } else {
                #if os(iOS)
                iOSMainView()
                #else
                macOSMainView()
                #endif
            }
        }
        .environment(feedViewModel)
        .task {
            await checkOnboardingStatus()
        }
        .onChange(of: hasCompletedOnboarding) { _, completed in
            if completed {
                hasSources = true // After onboarding, assume we have sources
            }
        }
    }

    private func checkOnboardingStatus() async {
        do {
            let sources = try await supabase.fetchSources()
            hasSources = !sources.isEmpty
            hasCompletedOnboarding = !sources.isEmpty
        } catch {
            // On error, skip onboarding
            hasCompletedOnboarding = true
        }
        isCheckingOnboarding = false
    }

    // MARK: - iOS Layout

    @ViewBuilder
    private func iOSMainView() -> some View {
        TabView {
            Tab("Feed", systemImage: "sparkles") {
                NavigationStack {
                    FeedView()
                }
            }

            Tab("Trending", systemImage: "chart.line.uptrend.xyaxis") {
                TrendingView()
            }

            Tab("Discover", systemImage: "globe") {
                DiscoverView()
            }

            Tab("Sources", systemImage: "list.bullet") {
                NavigationStack {
                    SourcesView()
                }
            }

            Tab("Settings", systemImage: "gear") {
                NavigationStack {
                    SettingsView()
                }
            }
        }
        .tabViewStyle(.sidebarAdaptable)
    }

    // MARK: - macOS Layout

    @ViewBuilder
    private func macOSMainView() -> some View {
        NavigationSplitView {
            SidebarView()
        } detail: {
            FeedView()
        }
    }
}

/// Sidebar navigation
struct SidebarView: View {
    @Environment(SupabaseService.self) private var supabase

    var body: some View {
        List {
            Section("Feed") {
                NavigationLink {
                    FeedView()
                } label: {
                    Label("For You", systemImage: "sparkles")
                }

                NavigationLink {
                    FeedView() // TODO: Latest view
                } label: {
                    Label("Latest", systemImage: "clock")
                }

                NavigationLink {
                    FeedView() // TODO: Saved view
                } label: {
                    Label("Saved", systemImage: "bookmark")
                }
            }

            Section("Explore") {
                NavigationLink {
                    TrendingView()
                } label: {
                    Label("Trending", systemImage: "chart.line.uptrend.xyaxis")
                }

                NavigationLink {
                    DiscoverView()
                } label: {
                    Label("Discover", systemImage: "globe")
                }
            }

            Section("Sources") {
                NavigationLink {
                    SourcesView()
                } label: {
                    Label("My Sources", systemImage: "list.bullet")
                }
            }

            Section {
                NavigationLink {
                    SettingsView()
                } label: {
                    Label("Settings", systemImage: "gear")
                }

                Button(role: .destructive) {
                    Task {
                        try? await supabase.signOut()
                    }
                } label: {
                    Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                }
            }
        }
        .navigationTitle("Flare")
        #if os(macOS)
        .navigationSplitViewColumnWidth(min: 200, ideal: 250)
        #endif
    }
}

/// Settings view
struct SettingsView: View {
    @Environment(SupabaseService.self) private var supabase

    var body: some View {
        List {
            Section("Account") {
                if let user = supabase.currentUser {
                    LabeledContent("Email", value: user.email ?? "Unknown")
                    LabeledContent("User ID", value: user.id.uuidString.prefix(8) + "...")
                }

                Button(role: .destructive) {
                    Task {
                        try? await supabase.signOut()
                    }
                } label: {
                    Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                }
            }

            Section("About") {
                LabeledContent("Version", value: "1.0.0")
                LabeledContent("Build", value: "1")
            }
        }
        .navigationTitle("Settings")
    }
}

#Preview {
    ContentView()
        .environment(SupabaseService.shared)
}
