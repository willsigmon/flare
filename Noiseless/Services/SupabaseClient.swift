import Foundation
import Supabase
import Auth

/// Centralized Supabase client for database and auth operations
@MainActor
@Observable
final class SupabaseService {
    static let shared = SupabaseService()

    private let client: SupabaseClient
    private(set) var currentUser: User?
    private(set) var isAuthenticated = false
    private(set) var isLoading = true

    #if DEBUG
    /// Dev mode bypasses auth - uses a fake user ID
    private(set) var isDevMode = false
    private let devUserId = UUID(uuidString: "00000000-0000-0000-0000-000000000000")!

    func enableDevMode() {
        isDevMode = true
        isAuthenticated = true
        isLoading = false
    }

    /// Returns dev user ID when in dev mode, otherwise real user ID
    var effectiveUserId: UUID? {
        isDevMode ? devUserId : currentUser?.id
    }
    #else
    var effectiveUserId: UUID? {
        currentUser?.id
    }
    #endif

    private init() {
        guard Secrets.isConfigured else {
            fatalError("Supabase credentials not configured. Update Secrets.swift with your project URL and anon key.")
        }

        client = SupabaseClient(
            supabaseURL: URL(string: Secrets.supabaseUrl)!,
            supabaseKey: Secrets.supabaseAnonKey
        )

        Task {
            await checkSession()
            setupAuthListener()
        }
    }

    // MARK: - Auth

    /// Check for existing session on launch
    private func checkSession() async {
        isLoading = true
        do {
            let session = try await client.auth.session
            currentUser = session.user
            isAuthenticated = true
        } catch {
            currentUser = nil
            isAuthenticated = false
        }
        isLoading = false
    }

    /// Listen for auth state changes
    private func setupAuthListener() {
        Task {
            for await (event, session) in client.auth.authStateChanges {
                switch event {
                case .signedIn:
                    currentUser = session?.user
                    isAuthenticated = true
                case .signedOut:
                    currentUser = nil
                    isAuthenticated = false
                default:
                    break
                }
            }
        }
    }

    /// Sign in with Apple ID token from ASAuthorizationAppleIDCredential
    func signInWithApple(idToken: String, nonce: String) async throws {
        let response = try await client.auth.signInWithIdToken(
            credentials: .init(
                provider: .apple,
                idToken: idToken,
                nonce: nonce
            )
        )
        currentUser = response.user
        isAuthenticated = true
    }

    /// Sign in with email and password
    func signIn(email: String, password: String) async throws {
        let response = try await client.auth.signIn(email: email, password: password)
        currentUser = response.user
        isAuthenticated = true
    }

    /// Sign up with email and password
    func signUp(email: String, password: String) async throws {
        let response = try await client.auth.signUp(email: email, password: password)
        currentUser = response.user
        isAuthenticated = true
    }

    /// Sign out current user
    func signOut() async throws {
        try await client.auth.signOut()
        currentUser = nil
        isAuthenticated = false
    }

    /// Get the OAuth URL for Google Sign In
    func getGoogleOAuthURL() async throws -> URL {
        let redirectURL = URL(string: "flare://auth/callback")!
        let url = try await client.auth.getOAuthSignInURL(
            provider: .google,
            redirectTo: redirectURL
        )
        return url
    }

    /// Handle OAuth callback from Google Sign In
    func handleOAuthCallback(url: URL) async throws {
        let session = try await client.auth.session(from: url)
        currentUser = session.user
        isAuthenticated = true
    }

    // MARK: - Sources

    /// Fetch user's subscribed sources
    func fetchSources() async throws -> [UserSource] {
        guard let userId = effectiveUserId else {
            throw SupabaseError.notAuthenticated
        }

        let response: [UserSource] = try await client
            .from("user_sources")
            .select()
            .eq("user_id", value: userId.uuidString)
            .order("created_at", ascending: false)
            .execute()
            .value

        return response
    }

    /// Add a new source
    func addSource(_ source: UserSource) async throws {
        try await client
            .from("user_sources")
            .insert(source)
            .execute()
    }

    /// Add multiple sources (bulk import)
    func addSources(_ sources: [UserSource]) async throws {
        guard !sources.isEmpty else { return }
        try await client
            .from("user_sources")
            .insert(sources)
            .execute()
    }

    /// Update a source
    func updateSource(_ source: UserSource) async throws {
        try await client
            .from("user_sources")
            .update(source)
            .eq("id", value: source.id.uuidString)
            .execute()
    }

    /// Delete a source
    func deleteSource(id: UUID) async throws {
        try await client
            .from("user_sources")
            .delete()
            .eq("id", value: id.uuidString)
            .execute()
    }

    // MARK: - Articles

    /// Fetch articles from user's subscribed sources
    func fetchArticles(limit: Int = 50, offset: Int = 0) async throws -> [Article] {
        guard effectiveUserId != nil else {
            throw SupabaseError.notAuthenticated
        }

        // First get user's source URLs
        let sources = try await fetchSources()
        let sourceUrls = sources.filter { $0.isActive }.map { $0.url }

        guard !sourceUrls.isEmpty else {
            return []
        }

        // Fetch articles from those sources
        let articles: [Article] = try await client
            .from("articles")
            .select()
            .in("source_url", values: sourceUrls)
            .order("published_at", ascending: false)
            .limit(limit)
            .execute()
            .value

        return articles
    }

    /// Fetch user's article states
    func fetchUserArticleStates(articleIds: [UUID]) async throws -> [UserArticle] {
        guard let userId = effectiveUserId else {
            throw SupabaseError.notAuthenticated
        }

        guard !articleIds.isEmpty else {
            return []
        }

        let states: [UserArticle] = try await client
            .from("user_articles")
            .select()
            .eq("user_id", value: userId.uuidString)
            .in("article_id", values: articleIds.map { $0.uuidString })
            .execute()
            .value

        return states
    }

    /// Update or create user article state
    func upsertUserArticleState(_ state: UserArticle) async throws {
        try await client
            .from("user_articles")
            .upsert(state)
            .execute()
    }

    // MARK: - Edge Functions

    /// Trigger RSS fetch for a source URL
    func triggerRSSFetch(sourceUrl: String) async throws {
        struct FetchRequest: Encodable {
            let feedUrl: String
        }

        try await client.functions.invoke(
            "fetch-rss",
            options: .init(body: FetchRequest(feedUrl: sourceUrl))
        )
    }
}

// MARK: - Errors

enum SupabaseError: LocalizedError {
    case notAuthenticated
    case invalidResponse

    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "You must be signed in to perform this action."
        case .invalidResponse:
            return "Received an invalid response from the server."
        }
    }
}
