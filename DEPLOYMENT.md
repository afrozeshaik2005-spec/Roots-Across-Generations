# Deployment Guide — Roots Across Generations

> Step-by-step instructions to deploy the backend (Render), frontend (Vercel),
> Firebase Storage, and Google OAuth for production.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Backend Deployment (Render)](#2-backend-deployment-render)
3. [Frontend Deployment (Vercel)](#3-frontend-deployment-vercel)
4. [Firebase Storage Setup](#4-firebase-storage-setup)
5. [Google OAuth Setup](#5-google-oauth-setup)
6. [Post-Deployment Verification](#6-post-deployment-verification)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Prerequisites

- GitHub account with the repo `afrozeshaik2005-spec/Roots-Across-Generations`
- [Render](https://render.com) account (free tier works)
- [Vercel](https://vercel.com) account (free tier works)
- [Google Cloud Console](https://console.cloud.google.com) project
- [Firebase Console](https://console.firebase.google.com) project (optional)
- A PostgreSQL database (Render managed DB, Supabase, Neon, or similar)

---

## 2. Backend Deployment (Render)

### 2.1 Create the PostgreSQL Database

1. In Render dashboard, click **New** → **PostgreSQL**
2. Name: `roots-across-generations-db`
3. Plan: **Free**
4. Region: **Oregon (US West)**
5. Click **Create Database**
6. Once created, copy the **Internal Database URL** — it looks like:
   ```
   postgresql://user:password@ hostname:5432/roots_db
   ```
7. **Important**: Replace `hostname` with the actual host from the dashboard. The URL from Render uses spaces — remove them.

### 2.2 Deploy the Backend Service

1. In Render dashboard, click **New** → **Web Service**
2. Connect GitHub repo: `afrozeshaik2005-spec/Roots-Across-Generations`
3. Configure:
   - **Name**: `roots-across-generations-api`
   - **Region**: Oregon
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy`
   - **Start Command**: `node src/index.js`
   - **Plan**: Free

### 2.3 Set Environment Variables

In the Render service → **Environment** tab, add these variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | *(paste the Internal Database URL from step 2.1)* |
| `JWT_ACCESS_SECRET` | *(generate: run `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` locally)* |
| `JWT_REFRESH_SECRET` | *(generate another one)* |
| `CORS_ORIGINS` | *(leave blank for now — set after frontend deploys)* |
| `SERVER_URL` | *(leave blank for now — set after deploy with actual Render URL)* |
| `CLIENT_URL` | *(leave blank for now — set after frontend deploys)* |
| `FRONTEND_URL` | *(leave blank for now — set after frontend deploys)* |
| `BACKEND_URL` | *(leave blank for now — set after deploy with actual Render URL)* |
| `GOOGLE_CLIENT_ID` | *(from Google Cloud Console — see Section 5)* |
| `GOOGLE_CLIENT_SECRET` | *(from Google Cloud Console — see Section 5)* |
| `FIREBASE_PROJECT_ID` | *(from Firebase — see Section 4, optional)* |
| `FIREBASE_CLIENT_EMAIL` | *(from Firebase — see Section 4, optional)* |
| `FIREBASE_PRIVATE_KEY` | *(from Firebase — see Section 4, optional)* |
| `FIREBASE_STORAGE_BUCKET` | *(from Firebase — see Section 4, optional)* |

### 2.4 Deploy and Verify

1. Click **Save** → Render will auto-deploy
2. Watch the deploy logs for:
   - `Prisma schema loaded` ✓
   - `Database migrations applied` ✓
   - `Roots Across Generations Server running on port XXXX` ✓
3. Once live, note your backend URL: `https://roots-across-generations-api.onrender.com`
4. Verify: visit `https://roots-across-generations-api.onrender.com/health`
5. **Go back and fill in** `SERVER_URL`, `BACKEND_URL` with your actual Render URL

### 2.5 Run Database Migrations

If migrations didn't run automatically during build, use Render's **Shell** tab:

```bash
npx prisma migrate deploy
```

### 2.6 (Optional) Seed the Database

To populate with sample family data:

```bash
node seedFamilyTree.js
```

> **Warning**: The seed file generates shareable links with hardcoded localhost URLs.
> After seeding in production, you may need to update shareable links in the database.

---

## 3. Frontend Deployment (Vercel)

### 3.1 Import the Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import Git Repository → select `afrozeshaik2005-spec/Roots-Across-Generations`
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3.2 Set Environment Variables

In Vercel project → **Settings** → **Environment Variables**, add:

| Key | Value | Environment |
|-----|-------|-------------|
| `VITE_API_URL` | `https://roots-across-generations-api.onrender.com/api/v1` | Production |
| `VITE_BACKEND_URL` | `https://roots-across-generations-api.onrender.com` | Production |
| `VITE_GOOGLE_CLIENT_ID` | *(same GOOGLE_CLIENT_ID from Google Cloud Console)* | Production |

> **Important**: Vercel env vars with `VITE_` prefix are embedded at **build time**.
> If you change them, you must **redeploy** for changes to take effect.

### 3.3 Deploy

1. Click **Deploy**
2. Once live, note your frontend URL: `https://roots-across-generations.vercel.app` (or similar)
3. Verify: visit the URL and check the app loads

### 3.4 Update Backend CORS

Go back to Render → backend service → Environment, and set:

| Key | Value |
|-----|-------|
| `CORS_ORIGINS` | `https://your-frontend-url.vercel.app` |
| `CLIENT_URL` | `https://your-frontend-url.vercel.app` |
| `FRONTEND_URL` | `https://your-frontend-url.vercel.app` |

Render will auto-redeploy with the updated env vars.

---

## 4. Firebase Storage Setup

> Firebase is optional. The app gracefully falls back to local disk uploads.

### 4.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add project** → name it (e.g., `roots-across-generations`)
3. Disable Google Analytics (optional) → **Create project**

### 4.2 Enable Cloud Storage

1. In the project, click **Storage** → **Get started**
2. Choose a location (e.g., `us-central`) → **Done**
3. Set rules for production:
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

### 4.3 Generate Service Account Key

1. Go to **Project Settings** → **Service accounts**
2. Click **Generate new private key** → download the JSON file
3. Extract these values from the JSON:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`
4. For `FIREBASE_STORAGE_BUCKET`: use `<project-id>.appspot.com`
5. Set these in Render env vars (private key — paste the entire string with `\n` intact)

### 4.4 Test Upload

After deploying, test the file upload endpoint:
```bash
curl -X POST https://your-render-url/api/v1/members/MEMBER_ID/photo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "photo=@test-image.jpg"
```

---

## 5. Google OAuth Setup

### 5.1 Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select or create a project
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Configure:
   - **Application type**: Web application
   - **Name**: Roots Across Generations
   - **Authorized JavaScript origins**:
     - `https://your-frontend-url.vercel.app`
     - `http://localhost:5173` (for development)
   - **Authorized redirect URIs**:
     - `https://your-backend-url.onrender.com/api/v1/auth/google/callback`
     - `http://localhost:5000/api/v1/auth/google/callback` (for development)
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

### 5.2 Set Environment Variables

| Service | Key | Value |
|---------|-----|-------|
| Render (backend) | `GOOGLE_CLIENT_ID` | *(Client ID)* |
| Render (backend) | `GOOGLE_CLIENT_SECRET` | *(Client Secret)* |
| Vercel (frontend) | `VITE_GOOGLE_CLIENT_ID` | *(same Client ID)* |

### 5.3 Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type
3. Fill in:
   - App name: Roots Across Generations
   - User support email: your email
   - Developer contact: your email
4. Add scopes: `email`, `profile`, `openid`
5. Add test users (for testing) or publish the app

---

## 6. Post-Deployment Verification

Run through this checklist after both services are deployed:

### Backend Checks
- [ ] `GET /health` returns `{"status":"ok"}`
- [ ] `POST /api/v1/auth/signup` creates a user
- [ ] `POST /api/v1/auth/login` returns an access token
- [ ] `GET /api/v1/auth/me` returns user profile with token
- [ ] `GET /api/v1/admin/health` returns Firebase status

### Frontend Checks
- [ ] App loads without console errors
- [ ] Login/signup forms work
- [ ] Google OAuth login works (redirects back to app)
- [ ] Family creation works
- [ ] Member profile pages load

### Integration Checks
- [ ] CORS: frontend can make API calls without errors
- [ ] Cookies: refresh token cookie is set after login
- [ ] WebSocket: real-time notifications work
- [ ] File uploads: Firebase Storage (or local fallback) works

---

## 7. Troubleshooting

### "CORS origin not allowed"
→ Ensure `CORS_ORIGINS` in Render matches your exact Vercel URL (with `https://`).

### "Invalid refresh token" / 401 loops
→ The refresh token cookie uses `sameSite: none` and `secure: true`.
Ensure `NODE_ENV=production` is set in Render so cookies use HTTPS.

### "Google OAuth redirect mismatch"
→ The redirect URI in Google Cloud Console must **exactly** match:
`https://your-render-url.onrender.com/api/v1/auth/google/callback`

### Database connection refused
→ Ensure `DATABASE_URL` uses the **Internal Database URL** from Render,
not the External one (Internal is faster and stays within Render's network).

### Firebase 403 errors
→ Ensure `FIREBASE_PRIVATE_KEY` preserves `\n` characters. If the key was
copy-pasted incorrectly, re-download the JSON from Firebase Console.

### Frontend shows localhost API calls
→ Vercel env vars with `VITE_` prefix are baked in at build time.
Redeploy after changing them: **Deployments** → click **⋯** → **Redeploy**.

### Build fails on Render
→ Check that `npx prisma generate` runs after `npm install`.
The `postinstall` script in `package.json` handles this automatically.

---

## Quick Reference: Environment Variables

### Backend (Render)
```
NODE_ENV=production
DATABASE_URL=postgresql://...           # From Render PostgreSQL
JWT_ACCESS_SECRET=<random-hex>          # Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_REFRESH_SECRET=<random-hex>         # Generate separately
CORS_ORIGINS=https://your-app.vercel.app
SERVER_URL=https://your-api.onrender.com
CLIENT_URL=https://your-app.vercel.app
FRONTEND_URL=https://your-app.vercel.app
BACKEND_URL=https://your-api.onrender.com
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FIREBASE_PROJECT_ID=...                 # Optional
FIREBASE_CLIENT_EMAIL=...               # Optional
FIREBASE_PRIVATE_KEY=...                # Optional
FIREBASE_STORAGE_BUCKET=...             # Optional
```

### Frontend (Vercel)
```
VITE_API_URL=https://your-api.onrender.com/api/v1
VITE_BACKEND_URL=https://your-api.onrender.com
VITE_GOOGLE_CLIENT_ID=...               # Same as GOOGLE_CLIENT_ID above
```
