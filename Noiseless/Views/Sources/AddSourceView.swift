import SwiftUI

/// Smart source adding - paste URL, auto-detect everything
struct AddSourceView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(SupabaseService.self) private var supabase

    @State private var inputUrl = ""
    @State private var detectedSource: SourceDetector.DetectedSource?
    @State private var isDetecting = false
    @State private var editableName = ""
    @State private var editableType: SourceType = .rss
    @State private var error: String?
    @State private var isAdding = false

    let onAdd: (UserSource) -> Void

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // URL Input
                urlInputSection

                if isDetecting {
                    detectingView
                } else if let detected = detectedSource {
                    detectedSourceView(detected)
                } else if !inputUrl.isEmpty {
                    emptyDetectionView
                }

                Spacer()
            }
            .navigationTitle("Add Source")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        Task { await addSource() }
                    }
                    .fontWeight(.semibold)
                    .disabled(detectedSource == nil || isAdding)
                }
            }
        }
        .onChange(of: inputUrl) { _, newValue in
            debounceDetection(url: newValue)
        }
        .onAppear {
            // Auto-paste from clipboard
            #if os(iOS)
            if let clipboardUrl = UIPasteboard.general.string,
               clipboardUrl.hasPrefix("http") {
                inputUrl = clipboardUrl
            }
            #elseif os(macOS)
            if let clipboardUrl = NSPasteboard.general.string(forType: .string),
               clipboardUrl.hasPrefix("http") {
                inputUrl = clipboardUrl
            }
            #endif
        }
    }

    // MARK: - Subviews

    private var urlInputSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Paste any URL")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            HStack {
                TextField("https://...", text: $inputUrl)
                    .textFieldStyle(.plain)
                    .autocorrectionDisabled()
                    #if os(iOS)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.URL)
                    #endif

                if !inputUrl.isEmpty {
                    Button {
                        inputUrl = ""
                        detectedSource = nil
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding()
            .background(.secondary.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))

            if let error {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
        }
        .padding()
    }

    private var detectingView: some View {
        VStack(spacing: 12) {
            ProgressView()
            Text("Detecting source type...")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    private func detectedSourceView(_ detected: SourceDetector.DetectedSource) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            // Detected badge
            HStack {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(.green)
                Text("Source detected")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            // Source preview card
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 12) {
                    // Icon
                    ZStack {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(.secondary.opacity(0.1))
                            .frame(width: 44, height: 44)

                        Image(systemName: editableType.iconName)
                            .font(.title2)
                            .foregroundStyle(.primary)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        // Editable name
                        TextField("Name", text: $editableName)
                            .font(.headline)

                        // Type picker (collapsed)
                        Menu {
                            ForEach(SourceType.allCases, id: \.self) { type in
                                Button {
                                    editableType = type
                                } label: {
                                    Label(type.displayName, systemImage: type.iconName)
                                }
                            }
                        } label: {
                            HStack(spacing: 4) {
                                Text(editableType.displayName)
                                    .font(.caption)
                                Image(systemName: "chevron.up.chevron.down")
                                    .font(.caption2)
                            }
                            .foregroundStyle(.secondary)
                        }
                    }

                    Spacer()
                }

                // URL display
                Text(detected.feedUrl ?? detected.url)
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                    .lineLimit(1)
            }
            .padding()
            .background(.secondary.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .padding(.horizontal)
    }

    private var emptyDetectionView: some View {
        VStack(spacing: 12) {
            Image(systemName: "questionmark.circle")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text("Couldn't detect source type")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Text("Check the URL and try again")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    // MARK: - Detection

    @State private var detectionTask: Task<Void, Never>?

    private func debounceDetection(url: String) {
        detectionTask?.cancel()
        detectedSource = nil
        error = nil

        guard !url.isEmpty else { return }

        // Debounce 500ms
        detectionTask = Task {
            try? await Task.sleep(for: .milliseconds(500))
            guard !Task.isCancelled else { return }

            await detect(url: url)
        }
    }

    private func detect(url: String) async {
        isDetecting = true
        error = nil

        if let detected = await SourceDetector.detect(url: url) {
            detectedSource = detected
            editableName = detected.name
            editableType = detected.type
        } else {
            detectedSource = nil
            error = "Could not detect source from this URL"
        }

        isDetecting = false
    }

    // MARK: - Add Source

    private func addSource() async {
        guard let detected = detectedSource,
              let userId = supabase.effectiveUserId else {
            error = "Not signed in"
            return
        }

        isAdding = true
        error = nil

        let newSource = UserSource(
            id: UUID(),
            userId: userId,
            type: editableType,
            url: detected.feedUrl ?? detected.url,
            name: editableName.isEmpty ? detected.name : editableName,
            iconUrl: detected.iconUrl,
            category: nil,
            fetchFrequency: "1 hour",
            lastFetched: nil,
            isActive: true,
            notifyAlways: false,
            createdAt: Date()
        )

        do {
            try await supabase.addSource(newSource)
            onAdd(newSource)
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }

        isAdding = false
    }
}

#Preview {
    AddSourceView { _ in }
        .environment(SupabaseService.shared)
}
