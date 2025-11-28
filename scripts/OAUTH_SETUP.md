# OAuth Setup Checklist

Quick reference for adding Google and Apple auth to a new Supabase project.

---

## 🔐 Google OAuth (One-time setup + per-project)

### One-time: Create Google Cloud OAuth App
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID (Web application)
3. Save the **Client ID** and **Client Secret**

### Per-project: Add Supabase Callback
1. In Google Cloud Console → OAuth Client → Authorized redirect URIs
2. Add: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
3. In Supabase Dashboard → Auth → Providers → Google:
   - Enable Google
   - Paste Client ID
   - Paste Client Secret
   - Save

**Example redirect URIs in your Google OAuth app:**
```
https://yfdxdlhkepgwabnjxqen.supabase.co/auth/v1/callback  # Flare
https://kudhjqnrjghktmntzpan.supabase.co/auth/v1/callback  # Noiseless
https://tpvmxgksakbgsnakrawu.supabase.co/auth/v1/callback  # Castaway Council
```

---

## 🍎 Apple Sign In (Per-project)

### Prerequisites
- Apple Developer account ($99/year)
- App ID with Sign in with Apple enabled
- Service ID for web auth

### Per-project Setup
1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers)

2. **Add Domain to Service ID:**
   - Identifiers → Your Service ID → Edit
   - Domains: `YOUR_PROJECT_REF.supabase.co`
   - Return URLs: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

3. **In Supabase Dashboard → Auth → Providers → Apple:**
   - Enable Apple
   - Service ID: `com.yourcompany.service` (your Service ID identifier)
   - Secret Key: (paste your .p8 key contents)
   - Key ID: (from Apple)
   - Team ID: (from Apple)
   - Save

### Your Apple Service ID Domains:
```
yfdxdlhkepgwabnjxqen.supabase.co  # Flare
kudhjqnrjghktmntzpan.supabase.co  # Noiseless
tpvmxgksakbgsnakrawu.supabase.co  # Castaway Council
```

---

## 📧 Email Templates

Copy these from your "golden" project to each new project:

1. Supabase Dashboard → Auth → Email Templates
2. Copy/paste each template:
   - Confirm signup
   - Invite user
   - Magic link
   - Change email
   - Reset password

**Pro tip:** Keep a `email-templates/` folder with your branded templates.

---

## 🚀 Vercel Environment Variables

Required for every project:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Optional (for server-side operations):
```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

---

## 📋 Quick Checklist

```
[ ] Create Supabase project (./scripts/new-app.sh appname)
[ ] Apply golden schema (supabase db push)
[ ] Add Google callback URL to Google Cloud
[ ] Enable Google in Supabase Auth
[ ] Add domain/callback to Apple Service ID
[ ] Enable Apple in Supabase Auth
[ ] Copy email templates from golden project
[ ] Create Vercel project
[ ] Add env vars to Vercel
[ ] Deploy and test each auth method
```

---

## 🔧 Useful Commands

```bash
# Create new project
./scripts/new-app.sh my-app us-west-1

# Link to existing project
supabase link --project-ref PROJECT_REF

# Push migrations
supabase db push

# Get API keys
supabase projects api-keys --project-ref PROJECT_REF

# List all projects
supabase projects list
```
