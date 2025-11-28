import SwiftUI

/// View for managing content sources
struct SourcesView: View {
    @Environment(SupabaseService.self) private var supabase
    @State private var sources: [UserSource] = []
    @State private var isLoading = false
    @State private var isShowingAddSource = false
    @State private var isShowingOPMLImport = false
    @State private var error: Error?

    var body: some View {
        Group {
            if isLoading && sources.isEmpty {
                ProgressView("Loading sources...")
            } else if sources.isEmpty {
                emptyState
            } else {
                sourceList
            }
        }
        .navigationTitle("Sources")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                HStack(spacing: 12) {
                    Menu {
                        Button {
                            isShowingAddSource = true
                        } label: {
                            Label("Add Source", systemImage: "plus")
                        }

                        Button {
                            isShowingOPMLImport = true
                        } label: {
                            Label("Import OPML", systemImage: "doc.badge.arrow.up")
                        }
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
        }
        .sheet(isPresented: $isShowingAddSource) {
            AddSourceView { newSource in
                sources.insert(newSource, at: 0)
            }
        }
        .sheet(isPresented: $isShowingOPMLImport) {
            OPMLImportView { importedSources in
                sources.insert(contentsOf: importedSources, at: 0)
            }
        }
        .task {
            await loadSources()
        }
        .refreshable {
            await loadSources()
        }
    }

    private var emptyState: some View {
        ContentUnavailableView {
            Label("No Sources", systemImage: "list.bullet")
        } description: {
            Text("Add RSS feeds and other sources to start building your personalized feed.")
        } actions: {
            Button {
                isShowingAddSource = true
            } label: {
                Label("Add Source", systemImage: "plus")
            }
            .buttonStyle(.borderedProminent)
        }
    }

    private var sourceList: some View {
        List {
            ForEach(sources) { source in
                SourceRowView(source: source) { updatedSource in
                    if let index = sources.firstIndex(where: { $0.id == source.id }) {
                        sources[index] = updatedSource
                        Task {
                            try? await supabase.updateSource(updatedSource)
                        }
                    }
                }
            }
            .onDelete(perform: deleteSources)
        }
    }

    private func loadSources() async {
        isLoading = true
        do {
            sources = try await supabase.fetchSources()
        } catch {
            self.error = error
        }
        isLoading = false
    }

    private func deleteSources(at offsets: IndexSet) {
        let idsToDelete = offsets.map { sources[$0].id }
        sources.remove(atOffsets: offsets)

        Task {
            for id in idsToDelete {
                try? await supabase.deleteSource(id: id)
            }
        }
    }
}

/// Row view for a single source
struct SourceRowView: View {
    let source: UserSource
    let onUpdate: (UserSource) -> Void

    var body: some View {
        HStack(spacing: 12) {
            // Icon
            Image(systemName: source.type.iconName)
                .font(.title2)
                .foregroundStyle(.secondary)
                .frame(width: 32)

            // Info
            VStack(alignment: .leading, spacing: 2) {
                Text(source.name)
                    .font(.headline)

                Text(source.url)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)

                if let lastFetched = source.lastFetched {
                    Text("Last updated \(lastFetched, style: .relative) ago")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }

            Spacer()

            // Active toggle
            Toggle("", isOn: Binding(
                get: { source.isActive },
                set: { newValue in
                    var updated = source
                    updated.isActive = newValue
                    onUpdate(updated)
                }
            ))
            .labelsHidden()
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    NavigationStack {
        SourcesView()
    }
    .environment(SupabaseService.shared)
}
