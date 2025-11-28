#!/bin/bash
# =============================================================================
# new-app.sh - Create a new Supabase + Vercel app with standard auth setup
# =============================================================================
# Usage: ./scripts/new-app.sh <app-name> [region]
# Example: ./scripts/new-app.sh my-cool-app us-west-1
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Config - Update these!
ORG_ID="cqwwexcenmknepxltuea"  # Your Supabase org ID
DEFAULT_REGION="us-west-1"     # Oregon
TEMPLATE_REPO="willsigmon/app-template"  # Your GitHub template repo

# =============================================================================
# Functions
# =============================================================================

log_step() {
    echo -e "\n${BLUE}==>${NC} ${GREEN}$1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# =============================================================================
# Main Script
# =============================================================================

APP_NAME="${1:-}"
REGION="${2:-$DEFAULT_REGION}"

if [ -z "$APP_NAME" ]; then
    echo "Usage: $0 <app-name> [region]"
    echo ""
    echo "Regions: us-west-1 (Oregon), us-east-1 (Virginia), eu-west-1 (Ireland),"
    echo "         ap-southeast-1 (Singapore), ap-northeast-1 (Tokyo)"
    exit 1
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              🚀 NEW APP SETUP: $APP_NAME"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# -----------------------------------------------------------------------------
# Step 1: Create Supabase Project
# -----------------------------------------------------------------------------
log_step "Creating Supabase project: $APP_NAME"

# Generate a random DB password
DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)

PROJECT_OUTPUT=$(supabase projects create "$APP_NAME" \
    --org-id "$ORG_ID" \
    --region "$REGION" \
    --db-password "$DB_PASSWORD" 2>&1) || {
    log_error "Failed to create Supabase project: $PROJECT_OUTPUT"
}

# Extract project ref from output
PROJECT_REF=$(echo "$PROJECT_OUTPUT" | grep -oE '[a-z]{20}' | head -1)

if [ -z "$PROJECT_REF" ]; then
    # Try to get it from the projects list
    sleep 3
    PROJECT_REF=$(supabase projects list 2>/dev/null | grep "$APP_NAME" | awk '{print $4}')
fi

if [ -z "$PROJECT_REF" ]; then
    log_error "Could not determine project reference ID"
fi

log_success "Created project: $PROJECT_REF"

# -----------------------------------------------------------------------------
# Step 2: Link to project
# -----------------------------------------------------------------------------
log_step "Linking to project..."

supabase link --project-ref "$PROJECT_REF" || {
    log_warn "Link failed, project may still be initializing. Waiting 10s..."
    sleep 10
    supabase link --project-ref "$PROJECT_REF"
}

log_success "Linked to $PROJECT_REF"

# -----------------------------------------------------------------------------
# Step 3: Apply migrations
# -----------------------------------------------------------------------------
log_step "Applying database migrations..."

if [ -d "supabase/migrations" ] && [ "$(ls -A supabase/migrations/*.sql 2>/dev/null)" ]; then
    supabase db push --yes || log_warn "Some migrations may have failed"
    log_success "Migrations applied"
else
    log_warn "No migrations found in supabase/migrations/"
fi

# -----------------------------------------------------------------------------
# Step 4: Get API Keys
# -----------------------------------------------------------------------------
log_step "Fetching API keys..."

API_KEYS=$(supabase projects api-keys --project-ref "$PROJECT_REF" 2>/dev/null)
ANON_KEY=$(echo "$API_KEYS" | grep "anon" | awk '{print $4}')
SERVICE_KEY=$(echo "$API_KEYS" | grep "service_role" | awk '{print $4}')

SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

# -----------------------------------------------------------------------------
# Step 5: Generate .env.local
# -----------------------------------------------------------------------------
log_step "Generating .env.local..."

cat > .env.local << EOF
# Supabase Configuration - $APP_NAME
# Generated: $(date)
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY

# OAuth Redirect URL (update for production domain)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Database (for direct access if needed)
# DB_PASSWORD=$DB_PASSWORD
EOF

log_success "Created .env.local"

# -----------------------------------------------------------------------------
# Step 6: Print summary and next steps
# -----------------------------------------------------------------------------
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    🎉 SETUP COMPLETE!                         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Project:${NC} $APP_NAME"
echo -e "${GREEN}Ref:${NC}     $PROJECT_REF"
echo -e "${GREEN}Region:${NC}  $REGION"
echo -e "${GREEN}URL:${NC}     $SUPABASE_URL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}VERCEL ENVIRONMENT VARIABLES:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}MANUAL STEPS REMAINING:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. 🔐 Google OAuth:"
echo "   - Go to: https://console.cloud.google.com/apis/credentials"
echo "   - Add redirect URI: $SUPABASE_URL/auth/v1/callback"
echo "   - Copy Client ID/Secret to Supabase Auth → Google"
echo ""
echo "2. 🍎 Apple Sign In:"
echo "   - Go to: https://developer.apple.com/account/resources/identifiers"
echo "   - Add domain: ${PROJECT_REF}.supabase.co"
echo "   - Add return URL: $SUPABASE_URL/auth/v1/callback"
echo "   - Copy Service ID/Key to Supabase Auth → Apple"
echo ""
echo "3. 📧 Email Templates:"
echo "   - Supabase Dashboard → Auth → Email Templates"
echo "   - Copy templates from your golden project"
echo ""
echo "4. 🚀 Vercel:"
echo "   - Create project from repo"
echo "   - Add env vars above"
echo "   - Deploy!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Dashboard:${NC} https://supabase.com/dashboard/project/$PROJECT_REF"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
