# Auth + Database Architecture Plan: Noiseless Newsfeed

## Executive Summary

**Recommendation: Leverage existing Supabase infrastructure already in place.**

The project already has Supabase configured for the iOS app with a comprehensive PostgreSQL schema. Rather than introducing a new auth provider and database, we should extend the existing Supabase setup to the Next.js web app. This provides:

1. **Shared backend** between iOS and web
2. **Already-configured auth** (Apple Sign-In, email, etc.)
3. **PostgreSQL with pgvector** for future AI features
4. **Row-Level Security** policies already defined
5. **Zero additional infrastructure cost** (Vercel + Supabase free tiers)

---

## Current State Analysis

### What Already Exists

**Supabase Infrastructure:**
- PostgreSQL database with comprehensive schema
- Auth configured (Apple Sign-In ready, email enabled)
- Row-Level Security (RLS) policies in place
- Edge Functions for RSS fetching
- Local development config at `supabase/config.toml`

**Database Schema (from `supabase/migrations/20241126000000_initial_schema.sql`):**

```sql
-- Already exists:
user_sources          → Per-user RSS subscriptions
articles              → Global article store
user_articles         → User-specific state (read, saved, votes, time spent)
processing_queue      → AI processing queue
```

**Key schema details:**
- `user_articles.vote` (SMALLINT) → thumbs up/down tracking
- `user_articles.time_spent_sec` → engagement tracking
- `user_articles.relevance_score` (FLOAT) → learned preferences
- `articles.banger_score` (FLOAT) → content quality signal
- `articles.topics` (TEXT[]) → topic categorization
- `articles.entities` (JSONB) → people, companies, products

**iOS App:** Already using Supabase Swift SDK with full auth flow.

**Web App:** Barebones Next.js 16 with:
- App Router structure
- Tailwind CSS v4
- Mock data from Reddit/HackerNews APIs
- No auth or database yet

### What's Missing for Web

1. Supabase client configuration
2. Auth UI components
3. API routes for preference learning
4. Database read/write operations
5. Session management
6. Environment variables setup

---

## Architecture Decision: Supabase Auth + PostgreSQL

### Why Supabase (vs alternatives)

| Consideration | Supabase | NextAuth.js | Clerk | Auth0 |
|---------------|----------|-------------|-------|-------|
| **Already set up** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Shared iOS/web** | ✅ Yes | ❌ No | ⚠️ Possible | ⚠️ Possible |
| **Database included** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Free tier** | ✅ 500MB DB | N/A | ⚠️ 10k MAU | ⚠️ 7k MAU |
| **Vercel-friendly** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Apple Sign-In** | ✅ Configured | ⚠️ Manual | ✅ Built-in | ✅ Built-in |
| **Email/password** | ✅ Enabled | ✅ Yes | ✅ Yes | ✅ Yes |
| **RLS policies** | ✅ Built-in | ❌ No | ❌ No | ❌ No |
| **Real-time subs** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Edge Functions** | ✅ Yes | ❌ No | ❌ No | ❌ No |

**Decision: Stick with Supabase.**
- Already configured and working for iOS
- Unified backend reduces complexity
- PostgreSQL with pgvector ready for AI features
- RLS policies enforce security at DB level
- No additional costs or vendors

### Why PostgreSQL (already chosen)

The existing schema is well-designed for the learning system:

**Strengths:**
1. **Structured tracking** → votes, time spent, read status
2. **Efficient indexing** → fast user preference queries
3. **RLS policies** → data isolation per user
4. **JSONB support** → flexible metadata storage
5. **pgvector ready** → semantic search future-proof
6. **Relational integrity** → foreign keys, cascades

**Alternative considered:**
- **MongoDB:** Could work, but requires new infrastructure and doesn't add value over JSONB + pgvector
- **PlanetScale:** MySQL doesn't have pgvector, and we'd lose existing schema

---

## Database Schema Extensions Needed

### New Tables for Learning System

```sql
-- User preferences learned from behavior
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    preference_type TEXT NOT NULL, -- 'topic', 'source', 'author', 'entity'
    preference_key TEXT NOT NULL, -- e.g., 'AI', 'techcrunch.com', 'John Doe'
    weight FLOAT DEFAULT 0.0, -- Learned weight (-1.0 to 1.0)
    signal_count INTEGER DEFAULT 0, -- Number of signals contributing
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, preference_type, preference_key)
);

CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_type ON user_preferences(user_id, preference_type);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);


-- User interaction events for learning
CREATE TABLE user_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL, -- 'vote', 'click', 'read', 'save', 'share', 'hide'
    interaction_value FLOAT, -- e.g., vote value, time spent seconds
    metadata JSONB, -- Additional context
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_interactions_user ON user_interactions(user_id, created_at DESC);
CREATE INDEX idx_user_interactions_article ON user_interactions(article_id);
CREATE INDEX idx_user_interactions_type ON user_interactions(user_id, interaction_type);

ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own interactions" ON user_interactions
    FOR ALL USING (auth.uid() = user_id);


-- User profile settings
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    location TEXT, -- For local news
    timezone TEXT,
    interests TEXT[], -- Explicitly selected topics
    notification_settings JSONB,
    theme TEXT DEFAULT 'system', -- 'light', 'dark', 'system'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile" ON user_profiles
    FOR ALL USING (auth.uid() = user_id);


-- Database function for atomic weight updates
CREATE OR REPLACE FUNCTION update_preference_weight(
    p_user_id UUID,
    p_type TEXT,
    p_key TEXT,
    p_signal FLOAT,
    p_learning_rate FLOAT DEFAULT 0.1
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_preferences (user_id, preference_type, preference_key, weight, signal_count)
    VALUES (p_user_id, p_type, p_key, p_signal * p_learning_rate, 1)
    ON CONFLICT (user_id, preference_type, preference_key)
    DO UPDATE SET
        weight = user_preferences.weight * (1 - p_learning_rate) + p_signal * p_learning_rate,
        signal_count = user_preferences.signal_count + 1,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Migration File Location

Create: `supabase/migrations/20241126000002_add_learning_tables.sql`

---

## Next.js Integration Architecture

### File Structure

```
web/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx                    → Login page
│   │   │   ├── signup/
│   │   │   │   └── page.tsx                    → Signup page
│   │   │   └── callback/
│   │   │       └── route.ts                    → OAuth callback handler
│   │   ├── (protected)/
│   │   │   ├── feed/
│   │   │   │   └── page.tsx                    → Protected feed (requires auth)
│   │   │   └── settings/
│   │   │       └── page.tsx                    → User settings
│   │   ├── api/
│   │   │   ├── articles/
│   │   │   │   └── route.ts                    → GET /api/articles
│   │   │   ├── interactions/
│   │   │   │   └── route.ts                    → POST /api/interactions
│   │   │   ├── preferences/
│   │   │   │   └── route.ts                    → GET/POST /api/preferences
│   │   │   └── profile/
│   │   │       └── route.ts                    → GET/PUT /api/profile
│   │   ├── layout.tsx
│   │   └── page.tsx                            → Public landing page
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthButton.tsx                  → Sign in/out button
│   │   │   ├── ProtectedRoute.tsx              → Auth wrapper
│   │   │   └── SocialProviders.tsx             → Apple/Google sign-in
│   │   ├── feed/
│   │   │   ├── ArticleCard.tsx                 → Article with vote buttons
│   │   │   ├── FeedList.tsx                    → Virtualized feed
│   │   │   └── VoteButtons.tsx                 → Thumbs up/down
│   │   └── ... (existing components)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                       → Client-side Supabase client
│   │   │   ├── server.ts                       → Server-side Supabase client
│   │   │   └── middleware.ts                   → Auth middleware
│   │   ├── services/
│   │   │   ├── articles.ts                     → Article CRUD operations
│   │   │   ├── interactions.ts                 → Track user interactions
│   │   │   ├── preferences.ts                  → Preference learning logic
│   │   │   └── profile.ts                      → User profile management
│   │   ├── types/
│   │   │   ├── database.ts                     → TypeScript types from Supabase
│   │   │   └── supabase.ts                     → Generated Supabase types
│   │   └── ... (existing files)
│   └── middleware.ts                           → Next.js middleware for auth
├── .env.local                                  → Supabase credentials (gitignored)
├── .env.example                                → Template for env vars
└── package.json
```

### Dependencies to Add

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/ssr": "^0.0.10",
    "date-fns": "^3.0.0"
  },
  "devDependencies": {
    "supabase": "^1.142.0"
  }
}
```

---

## API Routes Design

### 1. GET /api/articles
**Purpose:** Fetch personalized article feed with relevance scores

```typescript
// Request
GET /api/articles?limit=20&offset=0&platform=reddit

// Response
{
  "articles": [
    {
      "id": "uuid",
      "title": "...",
      "url": "...",
      "platform": "reddit",
      "engagement_count": 1234,
      "published_at": "2024-11-26T...",
      "user_state": {
        "is_read": false,
        "is_saved": false,
        "vote": 0,
        "relevance_score": 0.85
      }
    }
  ],
  "next_offset": 20,
  "has_more": true
}
```

**Implementation:**
- Server Component: Pre-fetch for SSR
- Uses `supabase.from('articles').select()` with join to `user_articles`
- Orders by `relevance_score DESC, published_at DESC`
- Calculates relevance score on-the-fly if not cached

### 2. POST /api/interactions
**Purpose:** Track user behavior signals

```typescript
// Request
POST /api/interactions
{
  "article_id": "uuid",
  "interaction_type": "vote", // 'vote' | 'click' | 'read' | 'save' | 'share' | 'hide'
  "interaction_value": 1, // 1 for upvote, -1 for downvote
  "metadata": {
    "time_spent_sec": 45,
    "scroll_depth": 0.8
  }
}

// Response
{
  "success": true,
  "updated_preferences": ["topic:AI", "source:reddit"]
}
```

**Implementation:**
- Insert into `user_interactions` table
- Update `user_articles` (upsert vote, time_spent, etc.)
- **Trigger preference learning** (async job or immediate)
- Return updated preference weights

### 3. GET /api/preferences
**Purpose:** Fetch user's learned preferences

```typescript
// Request
GET /api/preferences?type=topic

// Response
{
  "preferences": [
    {
      "preference_type": "topic",
      "preference_key": "AI",
      "weight": 0.75,
      "signal_count": 23
    },
    {
      "preference_type": "topic",
      "preference_key": "Climate",
      "weight": -0.3,
      "signal_count": 5
    }
  ]
}
```

**Implementation:**
- Query `user_preferences` table
- Filter by `preference_type` if provided
- Order by `ABS(weight) DESC` to show strongest preferences

### 4. PUT /api/profile
**Purpose:** Update user profile settings

```typescript
// Request
PUT /api/profile
{
  "display_name": "John Doe",
  "location": "San Francisco",
  "interests": ["AI", "Climate", "Tech"],
  "theme": "dark"
}

// Response
{
  "success": true,
  "profile": { ... }
}
```

**Implementation:**
- Upsert into `user_profiles` table
- Validate input data
- Update `interests` to bootstrap preference learning

---

## Preference Learning Algorithm

### Real-time vs Batch Processing

**Recommendation: Hybrid approach**

1. **Real-time (immediate feedback):**
   - Vote interactions (up/down) → Update `user_preferences` immediately
   - Simple weight updates: `new_weight = old_weight * 0.9 + signal * 0.1`
   - Provides instant personalization

2. **Batch processing (background jobs):**
   - Complex signals (time spent, scroll depth) → Queue for batch
   - Run hourly Edge Function to:
     - Extract topics/entities from articles
     - Calculate correlation between interactions and content
     - Update relevance scores for unread articles
     - Prune low-signal preferences

### Weight Calculation Logic

```typescript
// Simplified algorithm (in /api/interactions POST handler)

async function updatePreferences(userId: string, articleId: string, vote: number) {
  // 1. Fetch article metadata
  const article = await supabase
    .from('articles')
    .select('topics, source_url, author, entities')
    .eq('id', articleId)
    .single();

  // 2. Extract preference keys
  const preferenceUpdates = [];
  
  // Topic preferences
  article.topics?.forEach(topic => {
    preferenceUpdates.push({
      user_id: userId,
      preference_type: 'topic',
      preference_key: topic,
      signal_value: vote // 1 or -1
    });
  });

  // Source preferences
  preferenceUpdates.push({
    user_id: userId,
    preference_type: 'source',
    preference_key: new URL(article.source_url).hostname,
    signal_value: vote
  });

  // Author preferences (if exists)
  if (article.author) {
    preferenceUpdates.push({
      user_id: userId,
      preference_type: 'author',
      preference_key: article.author,
      signal_value: vote
    });
  }

  // 3. Update weights using exponential moving average
  for (const pref of preferenceUpdates) {
    await supabase.rpc('update_preference_weight', {
      p_user_id: pref.user_id,
      p_type: pref.preference_type,
      p_key: pref.preference_key,
      p_signal: pref.signal_value,
      p_learning_rate: 0.1 // Adjust based on signal strength
    });
  }
}
```

---

## Authentication Flow

### Auth Methods Enabled

1. **Email/Password** (already enabled in Supabase)
2. **Apple Sign-In** (configured for iOS, needs web setup)
3. **Google OAuth** (recommend adding for web)

### Next.js Auth Flow

**1. Sign-up Flow:**
```
User clicks "Sign Up"
  ↓
/signup page with email/password form
  ↓
supabase.auth.signUp({ email, password })
  ↓
Supabase sends confirmation email
  ↓
User clicks link → /auth/callback?token=...
  ↓
Callback route verifies token, sets session
  ↓
Redirect to /feed
```

**2. Sign-in Flow:**
```
User clicks "Sign In"
  ↓
/login page with email/password OR social buttons
  ↓
supabase.auth.signInWithPassword({ email, password })
  OR
supabase.auth.signInWithOAuth({ provider: 'google' })
  ↓
Session stored in cookies (using @supabase/ssr)
  ↓
Redirect to /feed
```

**3. Session Management:**
- Use Next.js middleware to check auth state
- Refresh tokens automatically with `@supabase/ssr`
- Protected routes wrapped in server-side auth check

### Middleware Setup

```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to login if accessing protected route
  if (!user && request.nextUrl.pathname.startsWith('/feed')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/feed/:path*', '/settings/:path*'],
}
```

---

## Environment Variables Setup

### Required Environment Variables

Create `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional: For OAuth providers
NEXT_PUBLIC_SITE_URL=http://localhost:3000 # or https://yourdomain.com

# Apple Sign-In (if enabling for web)
APPLE_CLIENT_ID=your_apple_client_id
APPLE_CLIENT_SECRET=your_apple_secret

# Google OAuth (recommended to add)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret
```

Create `.env.example` (committed to repo):

```bash
# Copy this to .env.local and fill in your values

NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional OAuth
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Vercel Deployment

Add environment variables in Vercel dashboard:
- Project Settings → Environment Variables
- Add all variables from `.env.local`
- Set `NEXT_PUBLIC_SITE_URL` to production domain

---

## Implementation Steps

### Phase 1: Database Migration (30 min)

1. **Create learning tables migration:**
   ```bash
   cd /Volumes/Ext-code/GitHub\ Repos/newsfeed
   supabase migration new add_learning_tables
   ```
   Copy SQL from "Database Schema Extensions" section above

2. **Apply migration:**
   ```bash
   supabase db push
   ```

3. **Verify tables:**
   ```bash
   supabase db reset --debug
   ```

### Phase 2: Supabase Client Setup (45 min)

1. **Install dependencies:**
   ```bash
   cd web
   npm install @supabase/supabase-js @supabase/ssr date-fns
   npm install -D supabase
   ```

2. **Create Supabase clients:**
   - `src/lib/supabase/client.ts` → Client-side client
   - `src/lib/supabase/server.ts` → Server-side client
   - `src/lib/supabase/middleware.ts` → Middleware helper

3. **Setup environment variables:**
   - Create `.env.local` with Supabase credentials
   - Add `.env.example` to repo

4. **Generate TypeScript types:**
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/types/supabase.ts
   ```

### Phase 3: Auth UI (1.5 hours)

1. **Create auth pages:**
   - `app/(auth)/login/page.tsx`
   - `app/(auth)/signup/page.tsx`
   - `app/(auth)/callback/route.ts`

2. **Build auth components:**
   - `components/auth/AuthButton.tsx` → Sign in/out
   - `components/auth/SocialProviders.tsx` → OAuth buttons
   - `components/auth/ProtectedRoute.tsx` → Wrapper for protected pages

3. **Setup middleware:**
   - `src/middleware.ts` → Auth state checking

4. **Test auth flow:**
   - Sign up with email
   - Verify email confirmation
   - Sign in/out
   - Session persistence

### Phase 4: API Routes (2 hours)

1. **Articles API:**
   - `app/api/articles/route.ts`
   - Implement personalized feed fetching
   - Join with `user_articles` for state
   - Order by relevance score

2. **Interactions API:**
   - `app/api/interactions/route.ts`
   - Track votes, clicks, reads
   - Trigger preference updates
   - Update `user_articles` table

3. **Preferences API:**
   - `app/api/preferences/route.ts`
   - Fetch learned weights
   - Expose top preferences

4. **Profile API:**
   - `app/api/profile/route.ts`
   - CRUD for user profile
   - Update settings

### Phase 5: Services Layer (1.5 hours)

1. **Create service modules:**
   - `lib/services/articles.ts` → Database operations
   - `lib/services/interactions.ts` → Tracking logic
   - `lib/services/preferences.ts` → Learning algorithm
   - `lib/services/profile.ts` → Profile management

2. **Implement preference learning:**
   - Weight update function
   - Signal extraction (topics, sources, authors)
   - Exponential moving average

3. **Add database RPC function:**
   - `update_preference_weight()` SQL function

### Phase 6: Feed UI (2 hours)

1. **Update existing components:**
   - `components/TrendingCard.tsx` → Add vote buttons
   - Create `components/feed/VoteButtons.tsx`
   - Create `components/feed/ArticleCard.tsx`

2. **Build protected feed:**
   - `app/(protected)/feed/page.tsx`
   - Fetch from `/api/articles`
   - Display personalized content
   - Handle vote interactions

3. **Add settings page:**
   - `app/(protected)/settings/page.tsx`
   - Profile editor
   - Interest management
   - Theme toggle

### Phase 7: Testing & Refinement (1 hour)

1. **Test auth flows:**
   - Sign up, email confirmation
   - Sign in/out
   - Session persistence across tabs
   - Protected route redirects

2. **Test interaction tracking:**
   - Vote on articles
   - Verify `user_interactions` inserted
   - Check `user_preferences` updated
   - Confirm weights change

3. **Test feed personalization:**
   - Vote on multiple topics
   - Refresh feed
   - Verify relevance scores change
   - Check article ordering

4. **Deploy to Vercel:**
   - Connect GitHub repo
   - Add environment variables
   - Deploy and test production

---

## Data Migration Strategy

**Good news: No migration needed!**

Starting from scratch is fine since:
- No existing user data to migrate
- Fresh database schema
- iOS app already uses this schema

**If you want to import existing articles:**

```sql
-- Import from external source (e.g., CSV)
COPY articles (source_url, url, title, author, published_at)
FROM '/path/to/articles.csv'
DELIMITER ','
CSV HEADER;
```

---

## Concerns & Trade-offs

### Concerns

1. **Cold start problem:**
   - New users have no preferences → show trending/popular
   - Solution: Default to engagement-based ranking until 10+ interactions

2. **Preference drift:**
   - User interests change over time → old signals become stale
   - Solution: Decay old signals (add `last_interaction_at` to preferences)

3. **Filter bubble:**
   - Over-optimization leads to echo chamber
   - Solution: Inject 20% random/trending content for exploration

4. **Performance:**
   - Calculating relevance scores for 1000s of articles on-the-fly is slow
   - Solution: Pre-compute scores in background job, cache in `user_articles.relevance_score`

5. **Privacy:**
   - Tracking user behavior raises privacy concerns
   - Solution: Clear privacy policy, data export/delete options

### Trade-offs

| Decision | Pro | Con |
|----------|-----|-----|
| **Real-time learning** | Instant feedback, better UX | Higher DB writes, potential race conditions |
| **Batch processing** | More efficient, complex algorithms | Delayed personalization (lag) |
| **Hybrid (chosen)** | Balance of both | More complex implementation |
| **Shared iOS/web backend** | Single source of truth, consistent UX | Tighter coupling, shared downtime risk |
| **RLS policies** | Security at DB level, less code | Harder to debug, performance overhead |
| **Exponential moving average** | Simple, stable weights | Slow to adapt to sudden changes |

### Open Questions

1. **How aggressive should personalization be?**
   - 100% personalized = filter bubble risk
   - Recommend: 80% personalized, 20% serendipity (trending/random)

2. **How to handle multiple devices?**
   - Sync works automatically (same user_id)
   - But interaction timestamps may conflict (e.g., read on phone, shows unread on web)
   - Solution: Use `last_synced_at` and merge states

3. **What's the retention policy for `user_interactions`?**
   - Grows indefinitely if not pruned
   - Recommend: Keep last 90 days, aggregate older data into `user_preferences`

4. **Should we track negative signals (hides, skips)?**
   - Yes! Hidden articles should downweight preferences
   - Add `interaction_type: 'hide'` with negative signal value

---

## Performance Optimization Strategies

### Database Indexing (already in place)
- ✅ User lookups: `idx_user_articles_user`
- ✅ Article queries: `idx_articles_published`
- ✅ Interaction history: `idx_user_interactions_user`

### Additional Optimizations Needed

1. **Materialized relevance scores:**
   ```sql
   -- Add to 20241126000002_add_learning_tables.sql
   CREATE INDEX idx_user_articles_relevance ON user_articles(user_id, relevance_score DESC NULLS LAST);
   ```

2. **Edge Function for batch scoring:**
   ```typescript
   // supabase/functions/update-relevance-scores/index.ts
   // Run hourly via cron job
   // Calculate scores for all unread articles per user
   ```

3. **Next.js caching:**
   ```typescript
   // In API routes
   export const revalidate = 60; // ISR cache for 60 seconds
   
   // Or use Vercel Edge Config for real-time personalization
   ```

4. **Connection pooling:**
   - Supabase handles this automatically
   - Use Supabase connection pooler for serverless

---

## Deployment Checklist

### Local Development Setup

- [ ] Run `supabase init` and `supabase start`
- [ ] Apply migrations: `supabase db push`
- [ ] Create `.env.local` with Supabase credentials
- [ ] Install dependencies: `npm install`
- [ ] Run dev server: `npm run dev`
- [ ] Test auth flow (signup, login, logout)
- [ ] Test vote interactions
- [ ] Verify preference updates in Supabase dashboard

### Production Deployment (Vercel + Supabase)

- [ ] Create Supabase project (or use existing)
- [ ] Run migrations on production DB
- [ ] Configure OAuth providers (Google, Apple)
- [ ] Add environment variables to Vercel
- [ ] Connect GitHub repo to Vercel
- [ ] Deploy and test auth flow
- [ ] Setup Supabase Edge Function cron jobs
- [ ] Configure custom domain (optional)
- [ ] Enable Vercel Analytics (optional)
- [ ] Setup error monitoring (Sentry, optional)

---

## Future Enhancements

### Phase 2 Features (after MVP)

1. **Semantic search with pgvector:**
   - Embed articles using OpenAI/Cohere
   - Store embeddings in `articles.embedding` (vector column)
   - Query: "Find articles similar to this one"

2. **AI summaries:**
   - Use Edge Function with Claude API
   - Store in `articles.summary_short/extended`
   - Cache aggressively

3. **Social features:**
   - Share articles with friends
   - See what friends are reading
   - Requires new `user_follows`, `shared_articles` tables

4. **Push notifications:**
   - Notify when high-relevance article matches preferences
   - Use Supabase Realtime or FCM

5. **Advanced analytics:**
   - User dashboard showing reading habits
   - Preference visualization (radar chart)
   - Time spent per topic

6. **Multi-language support:**
   - Detect article language
   - Filter/translate based on user preference

---

## Summary

**Final Architecture:**
- **Auth:** Supabase Auth (email/password + OAuth)
- **Database:** PostgreSQL via Supabase (already configured)
- **Schema:** Extend existing tables with `user_preferences`, `user_interactions`, `user_profiles`
- **API:** Next.js 16 App Router API routes
- **Learning:** Hybrid real-time + batch preference updates
- **Deployment:** Vercel (frontend) + Supabase (backend)

**Total estimated implementation time:** 8-10 hours

**Next step:** Begin with Phase 1 (database migration) and Phase 2 (Supabase client setup).

**Blockers:** None. All infrastructure already exists.

**Questions for user:**
1. Do you want to enable Google OAuth in addition to email/password?
2. Should we implement batch scoring now or defer to Phase 2?
3. What's the target for "cold start" users (how many interactions before personalization kicks in)?
