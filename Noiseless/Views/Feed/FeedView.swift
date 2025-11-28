import SwiftUI

/// Main feed view displaying articles
struct FeedView: View {
    @Environment(FeedViewModel.self) private var viewModel
    @Environment(SupabaseService.self) private var supabase
    @State private var isShowingAddSource = false

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.feedItems.isEmpty {
                ProgressView("Loading feed...")
            } else if viewModel.feedItems.isEmpty {
                EmptyFeedView(onAddSource: { isShowingAddSource = true })
            } else {
                articleList
            }
        }
        .navigationTitle("For You")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.large)
        #endif
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                HStack(spacing: 12) {
                    Button {
                        isShowingAddSource = true
                    } label: {
                        Image(systemName: "plus")
                            .fontWeight(.semibold)
                    }

                    Button {
                        Task { await viewModel.refresh() }
                    } label: {
                        if viewModel.isRefreshing {
                            ProgressView()
                        } else {
                            Image(systemName: "arrow.clockwise")
                        }
                    }
                    .disabled(viewModel.isRefreshing)
                }
            }
        }
        .sheet(isPresented: $isShowingAddSource) {
            AddSourceView { _ in
                Task { await viewModel.refresh() }
            }
        }
        .task {
            if viewModel.feedItems.isEmpty {
                await viewModel.loadFeed()
            }
        }
        .refreshable {
            await viewModel.refresh()
        }
    }

    private var articleList: some View {
        List(viewModel.feedItems) { item in
            NavigationLink {
                ArticleDetailView(item: item)
            } label: {
                ArticleRowView(item: item)
            }
            .swipeActions(edge: .trailing) {
                Button {
                    Task { await viewModel.vote(item, direction: -1) }
                } label: {
                    Image(systemName: "hand.thumbsdown")
                }
                .tint(.red)
            }
            .swipeActions(edge: .leading) {
                Button {
                    Task { await viewModel.vote(item, direction: 1) }
                } label: {
                    Image(systemName: "hand.thumbsup")
                }
                .tint(.green)

                Button {
                    Task { await viewModel.toggleSaved(item) }
                } label: {
                    Image(systemName: item.isSaved ? "bookmark.fill" : "bookmark")
                }
                .tint(.blue)
            }
        }
        .listStyle(.plain)
    }
}

/// Empty state when no articles
struct EmptyFeedView: View {
    var onAddSource: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            // Animated icon
            Image(systemName: "newspaper")
                .font(.system(size: 60))
                .foregroundStyle(.secondary)
                .symbolEffect(.pulse, options: .repeating)

            VStack(spacing: 8) {
                Text("Your Feed is Empty")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("Discover sources to fill your feed with articles tailored to your interests.")
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            VStack(spacing: 12) {
                Button {
                    onAddSource()
                } label: {
                    Label("Add Source", systemImage: "plus")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)

                Text("or browse the Discover tab")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
            .padding(.horizontal, 48)
        }
    }
}

#Preview {
    NavigationStack {
        FeedView()
    }
    .environment(FeedViewModel())
    .environment(SupabaseService.shared)
}
