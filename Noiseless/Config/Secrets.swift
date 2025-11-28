import Foundation

/// App secrets and configuration
enum Secrets {
    /// Supabase project URL (Flare project)
    static let supabaseUrl = "https://yfdxdlhkepgwabnjxqen.supabase.co"

    /// Supabase anonymous key (safe to embed in client)
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZHhkbGhrZXBnd2Fibmp4cWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNTYyNTMsImV4cCI6MjA3OTkzMjI1M30.zxUjTAE24zxpZF9o9FejkurTrV7mY5U0eckdR4aATgo"

    /// Check if secrets are configured
    static var isConfigured: Bool {
        !supabaseUrl.isEmpty && !supabaseAnonKey.isEmpty
    }
}
