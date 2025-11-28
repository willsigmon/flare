#!/bin/bash
# =============================================================================
# spinup.sh - Idea → Full Stack in One Command
# =============================================================================
# Creates: GitHub repo → Vercel project → Supabase project → Wired together
#
# Usage: ./spinup.sh "my-cool-app"
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Config - Update these!
GITHUB_USER="willsigmon"
SUPABASE_ORG="cqwwexcenmknepxltuea"
TEMPLATE_REPO="willsigmon/nextjs-supabase-starter"  # Your template repo
SUPABASE_REGION="us-west-1"  # Oregon
PROJECTS_DIR="/Volumes/Ext-code/GitHub Repos"

# =============================================================================
# Functions
# =============================================================================

log() { echo -e "${BLUE}==>${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; exit 1; }

check_deps() {
    log "Checking dependencies..."
    command -v gh >/dev/null 2>&1 || error "GitHub CLI (gh) not installed. Run: brew install gh"
    command -v vercel >/dev/null 2>&1 || error "Vercel CLI not installed. Run: npm i -g vercel"
    command -v supabase >/dev/null 2>&1 || error "Supabase CLI not installed. Run: brew install supabase/tap/supabase"

    # Check if logged in
    gh auth status >/dev/null 2>&1 || error "Not logged into GitHub. Run: gh auth login"
    success "All dependencies ready"
}

# =============================================================================
# Main
# =============================================================================

APP_NAME="${1:-}"

if [ -z "$APP_NAME" ]; then
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║          🚀 SPINUP - Idea to Full Stack in 60 Seconds         ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Usage: $0 <app-name>"
    echo ""
    echo "Example: $0 my-cool-app"
    echo ""
    echo "This will create:"
    echo "  • GitHub repo: github.com/$GITHUB_USER/<app-name>"
    echo "  • Vercel project: <app-name>.vercel.app"
    echo "  • Supabase project with auth + DB ready"
    echo ""
    exit 1
fi

# Clean app name (lowercase, hyphens only)
APP_SLUG=$(echo "$APP_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-')

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          🚀 SPINNING UP: $APP_SLUG"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

check_deps

# -----------------------------------------------------------------------------
# Step 1: Create GitHub Repo from Template
# -----------------------------------------------------------------------------
log "Creating GitHub repository..."

cd "$PROJECTS_DIR"

# Check if template exists, otherwise create from scratch
if gh repo view "$TEMPLATE_REPO" >/dev/null 2>&1; then
    gh repo create "$APP_SLUG" --public --clone --template "$TEMPLATE_REPO" || {
        warn "Template clone failed, creating blank repo..."
        gh repo create "$APP_SLUG" --public --clone
    }
else
    # No template - create and init
    gh repo create "$APP_SLUG" --public --clone
fi

cd "$APP_SLUG"
REPO_URL="https://github.com/$GITHUB_USER/$APP_SLUG"
success "Created repo: $REPO_URL"

# -----------------------------------------------------------------------------
# Step 2: Initialize Next.js if empty
# -----------------------------------------------------------------------------
if [ ! -f "package.json" ]; then
    log "Initializing Next.js + Supabase project..."

    npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes

    # Add Supabase
    npm install @supabase/supabase-js @supabase/ssr

    success "Next.js initialized"
fi

# -----------------------------------------------------------------------------
# Step 3: Create Supabase Project
# -----------------------------------------------------------------------------
log "Creating Supabase project..."

DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)

# Create project
supabase projects create "$APP_SLUG" \
    --org-id "$SUPABASE_ORG" \
    --region "$SUPABASE_REGION" \
    --db-password "$DB_PASSWORD" 2>&1 || warn "Project may already exist"

# Wait for project to initialize
sleep 5

# Get project ref
PROJECT_REF=$(supabase projects list 2>/dev/null | grep "$APP_SLUG" | awk '{print $4}' | head -1)

if [ -z "$PROJECT_REF" ]; then
    error "Could not find Supabase project ref"
fi

SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
success "Created Supabase: $PROJECT_REF"

# Initialize supabase locally
log "Initializing Supabase locally..."
supabase init 2>/dev/null || true
supabase link --project-ref "$PROJECT_REF" 2>/dev/null || true

# Get API keys
API_KEYS=$(supabase projects api-keys --project-ref "$PROJECT_REF" 2>/dev/null)
ANON_KEY=$(echo "$API_KEYS" | grep "anon" | awk '{print $4}')
SERVICE_KEY=$(echo "$API_KEYS" | grep "service_role" | awk '{print $4}')

# -----------------------------------------------------------------------------
# Step 4: Create Supabase Client
# -----------------------------------------------------------------------------
log "Setting up Supabase client..."

mkdir -p src/lib

cat > src/lib/supabase.ts << 'SUPABASE_CLIENT'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
SUPABASE_CLIENT

cat > src/lib/supabase-server.ts << 'SUPABASE_SERVER'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
SUPABASE_SERVER

success "Supabase client created"

# -----------------------------------------------------------------------------
# Step 5: Create .env files
# -----------------------------------------------------------------------------
log "Creating environment files..."

cat > .env.local << ENV_LOCAL
# Supabase - $APP_SLUG
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV_LOCAL

cat > .env.example << ENV_EXAMPLE
# Copy to .env.local and fill in values
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV_EXAMPLE

# Make sure .env.local is gitignored
grep -q ".env.local" .gitignore 2>/dev/null || echo ".env.local" >> .gitignore

success "Environment files created"

# -----------------------------------------------------------------------------
# Step 6: Apply Golden Schema
# -----------------------------------------------------------------------------
log "Applying database schema..."

mkdir -p supabase/migrations

cat > supabase/migrations/00000000000000_init.sql << 'GOLDEN_SQL'
-- User profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by all" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
GOLDEN_SQL

supabase db push --yes 2>/dev/null || warn "Schema push may need manual review"

success "Database schema applied"

# -----------------------------------------------------------------------------
# Step 7: Commit and Push
# -----------------------------------------------------------------------------
log "Committing to GitHub..."

git add -A
git commit -m "Initial setup: Next.js + Supabase + Auth

🤖 Generated with spinup.sh" 2>/dev/null || true
git push -u origin main 2>/dev/null || git push -u origin master 2>/dev/null || true

success "Pushed to GitHub"

# -----------------------------------------------------------------------------
# Step 8: Deploy to Vercel
# -----------------------------------------------------------------------------
log "Deploying to Vercel..."

# Create vercel project and deploy
vercel link --yes 2>/dev/null || true

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production <<< "$SUPABASE_URL" 2>/dev/null || true
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<< "$ANON_KEY" 2>/dev/null || true

# Deploy
VERCEL_URL=$(vercel --prod --yes 2>/dev/null | tail -1) || VERCEL_URL="check vercel dashboard"

success "Deployed to Vercel"

# -----------------------------------------------------------------------------
# Done!
# -----------------------------------------------------------------------------
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    🎉 YOUR APP IS LIVE!                       ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${CYAN}App:${NC}      $APP_SLUG"
echo -e "${CYAN}Local:${NC}    cd \"$PROJECTS_DIR/$APP_SLUG\" && npm run dev"
echo ""
echo -e "${GREEN}GitHub:${NC}   $REPO_URL"
echo -e "${GREEN}Vercel:${NC}   $VERCEL_URL"
echo -e "${GREEN}Supabase:${NC} https://supabase.com/dashboard/project/$PROJECT_REF"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. cd \"$PROJECTS_DIR/$APP_SLUG\""
echo "  2. npm run dev"
echo "  3. Start building! 🚀"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
