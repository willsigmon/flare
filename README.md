# Noiseless

Personal intelligence aggregator — AI-powered news reader that surfaces what matters.

## Quick Start

### 1. Prerequisites

- Xcode 16+ (for iOS 18 / macOS 15 support)
- [Supabase account](https://supabase.com) (free tier works)
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`)

### 2. Supabase Setup

1. Create a new Supabase project
2. Go to **SQL Editor** and run the migration file:
   ```
   supabase/migrations/20241126000000_initial_schema.sql
   ```
3. Go to **Settings > API** and copy your:
   - Project URL
   - `anon` public key

4. Enable Apple Sign-In:
   - Go to **Authentication > Providers > Apple**
   - Follow the setup instructions

5. Deploy the Edge Function:
   ```bash
   supabase functions deploy fetch-rss
   ```

### 3. Configure the App

Edit `Noiseless/Config/Secrets.swift`:

```swift
enum Secrets {
    static let supabaseUrl = "https://YOUR_PROJECT.supabase.co"
    static let supabaseAnonKey = "YOUR_ANON_KEY"
}
```

### 4. Generate Xcode Project

```bash
cd /path/to/newsfeed
xcodegen generate
open Noiseless.xcodeproj
```

### 5. Run

1. Select the iOS or macOS target
2. Build and run (⌘R)
3. Sign in with Apple
4. Add an RSS feed (try `https://www.theverge.com/rss/index.xml`)
5. Pull to refresh

## Architecture

```
Client (SwiftUI)
    ↓ Supabase Swift SDK
Supabase Backend
    ├── Auth (Apple Sign-In)
    ├── Postgres (articles, sources, user states)
    └── Edge Functions (RSS fetching, AI processing)
```

## Project Structure

```
Noiseless/
├── App/                    # App entry point
├── Models/                 # Data models (Article, UserSource)
├── Views/
│   ├── Auth/              # Sign-in UI
│   ├── Feed/              # Article list and detail
│   └── Sources/           # Source management
├── ViewModels/            # @Observable view models
├── Services/              # Supabase client
└── Resources/             # Assets, Info.plist
```

## Tech Stack

- **SwiftUI** — iOS 18+ / macOS 15+
- **@Observable** — Modern state management
- **Supabase** — Backend as a service
- **Edge Functions** — Serverless RSS fetching
- **pgvector** — Semantic search (future)

## Roadmap

- [x] Phase 1: RSS feed ingestion
- [ ] Phase 2: Source management UI
- [ ] Phase 3: AI summarization (Claude API)
- [ ] Phase 4: Learning system (thumbs up/down)
- [ ] Phase 5: Additional sources (Reddit, HN, Twitter)
- [ ] Phase 6: Push notifications

## License

MIT
