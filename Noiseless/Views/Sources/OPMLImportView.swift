import SwiftUI
import UniformTypeIdentifiers

/// View for importing OPML files
struct OPMLImportView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(SupabaseService.self) private var supabase

    @State private var isShowingFilePicker = false
    @State private var parsedFeeds: [OPMLParser.OPMLFeed] = []
    @State private var selectedFeeds: Set<String> = [] // Track by xmlUrl
    @State private var isImporting = false
    @State private var error: String?
    @State private var importComplete = false

    let onImport: ([UserSource]) -> Void

    var body: some View {
        NavigationStack {
            Group {
                if parsedFeeds.isEmpty {
                    emptyState
                } else {
                    feedList
                }
            }
            .navigationTitle("Import OPML")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if !parsedFeeds.isEmpty {
                        Button("Import \(selectedFeeds.count)") {
                            Task { await importSelected() }
                        }
                        .fontWeight(.semibold)
                        .disabled(selectedFeeds.isEmpty || isImporting)
                    }
                }
            }
            .fileImporter(
                isPresented: $isShowingFilePicker,
                allowedContentTypes: [.xml, UTType(filenameExtension: "opml") ?? .xml],
                allowsMultipleSelection: false
            ) { result in
                handleFileSelection(result)
            }
            .alert("Import Complete", isPresented: $importComplete) {
                Button("Done") { dismiss() }
            } message: {
                Text("Successfully imported \(selectedFeeds.count) sources.")
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        ContentUnavailableView {
            Label("Import from OPML", systemImage: "doc.badge.arrow.up")
        } description: {
            Text("OPML is the standard format for RSS feed lists. Export from your current RSS reader and import here.")
        } actions: {
            Button {
                isShowingFilePicker = true
            } label: {
                Label("Choose File", systemImage: "folder")
            }
            .buttonStyle(.borderedProminent)

            if let error {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .padding(.top, 8)
            }
        }
    }

    // MARK: - Feed List

    private var feedList: some View {
        VStack(spacing: 0) {
            // Selection controls
            HStack {
                Text("\(parsedFeeds.count) feeds found")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Spacer()

                Button(selectedFeeds.count == parsedFeeds.count ? "Deselect All" : "Select All") {
                    if selectedFeeds.count == parsedFeeds.count {
                        selectedFeeds.removeAll()
                    } else {
                        selectedFeeds = Set(parsedFeeds.map { $0.xmlUrl })
                    }
                }
                .font(.subheadline)
            }
            .padding()

            Divider()

            // Grouped by category
            List {
                ForEach(groupedFeeds, id: \.category) { group in
                    Section(group.category ?? "Uncategorized") {
                        ForEach(group.feeds, id: \.xmlUrl) { feed in
                            FeedRow(
                                feed: feed,
                                isSelected: selectedFeeds.contains(feed.xmlUrl)
                            ) {
                                if selectedFeeds.contains(feed.xmlUrl) {
                                    selectedFeeds.remove(feed.xmlUrl)
                                } else {
                                    selectedFeeds.insert(feed.xmlUrl)
                                }
                            }
                        }
                    }
                }
            }

            if isImporting {
                ProgressView("Importing...")
                    .padding()
            }
        }
    }

    // MARK: - Grouped Feeds

    private struct FeedGroup {
        let category: String?
        let feeds: [OPMLParser.OPMLFeed]
    }

    private var groupedFeeds: [FeedGroup] {
        let grouped = Dictionary(grouping: parsedFeeds) { $0.category }
        return grouped.map { FeedGroup(category: $0.key, feeds: $0.value) }
            .sorted { ($0.category ?? "zzz") < ($1.category ?? "zzz") }
    }

    // MARK: - Feed Row

    private struct FeedRow: View {
        let feed: OPMLParser.OPMLFeed
        let isSelected: Bool
        let onTap: () -> Void

        var body: some View {
            Button(action: onTap) {
                HStack(spacing: 12) {
                    Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                        .foregroundStyle(isSelected ? .blue : .secondary)
                        .font(.title3)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(feed.title)
                            .font(.body)
                            .foregroundStyle(.primary)

                        Text(feed.xmlUrl)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - File Handling

    private func handleFileSelection(_ result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            guard let url = urls.first else { return }

            // Need to access security-scoped resource
            guard url.startAccessingSecurityScopedResource() else {
                error = "Couldn't access file"
                return
            }
            defer { url.stopAccessingSecurityScopedResource() }

            if let opmlResult = OPMLParser.parse(url: url) {
                parsedFeeds = opmlResult.feeds
                selectedFeeds = Set(opmlResult.feeds.map { $0.xmlUrl })
                error = nil
            } else {
                error = "Couldn't parse OPML file"
            }

        case .failure(let err):
            error = err.localizedDescription
        }
    }

    // MARK: - Import

    private func importSelected() async {
        guard let userId = supabase.effectiveUserId else {
            error = "Not signed in"
            return
        }

        isImporting = true
        error = nil

        let feedsToImport = parsedFeeds.filter { selectedFeeds.contains($0.xmlUrl) }
        let sources = OPMLParser.convertToSources(feeds: feedsToImport, userId: userId)

        do {
            try await supabase.addSources(sources)
            onImport(sources)
            importComplete = true
        } catch {
            self.error = error.localizedDescription
        }

        isImporting = false
    }
}

#Preview {
    OPMLImportView { _ in }
        .environment(SupabaseService.shared)
}
