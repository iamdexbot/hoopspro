# 🏀 Hoops Pro — TypeScript Setup Guide

Full step-by-step instructions to get your project on GitHub, Supabase, and Vercel.

---

## 📁 Project Structure

```
hoops-pro/
├── src/
│   ├── app/
│   │   ├── layout.tsx          ← Root layout + fonts
│   │   ├── globals.css         ← Global styles
│   │   ├── page.tsx            ← Redirects / → /login
│   │   ├── login/page.tsx      ← Sign in page
│   │   ├── register/page.tsx   ← Create account
│   │   ├── dashboard/          ← Coach dashboard
│   │   ├── scoreboard/         ← Admin scoreboard (main)
│   │   ├── viewer/             ← Live display screen
│   │   ├── overlay/            ← OBS streaming overlay
│   │   └── stats/              ← Public stats & history
│   ├── lib/
│   │   ├── game.ts             ← Game logic, localStorage helpers
│   │   └── supabase/
│   │       ├── client.ts       ← Browser Supabase client
│   │       └── server.ts       ← Server Supabase client
│   ├── middleware.ts            ← Route protection (auth guard)
│   └── types/index.ts          ← All TypeScript types
├── supabase-setup.sql           ← Run this in Supabase SQL Editor
├── package.json
├── tsconfig.json
├── next.config.ts
├── .env.local.example           ← Copy to .env.local and fill in keys
└── .gitignore
```

---

## 🗄️ STEP 1 — Set Up Supabase

### 1.1 Create Account & Project
1. Go to **[supabase.com](https://supabase.com)** → click **Start your project**
2. Sign in with GitHub
3. Click **New project**
4. Fill in:
   - **Name:** `hoops-pro` (or anything you like)
   - **Database Password:** create a strong password — **save it!**
   - **Region:** choose closest to your location
5. Click **Create new project** — wait ~2 minutes

### 1.2 Run the Database SQL
1. In your Supabase project, go to left sidebar → **SQL Editor**
2. Click **New query**
3. Open `supabase-setup.sql` from this project
4. Copy the entire contents → paste into the SQL Editor
5. Click **Run**

✅ You should see: `"Success. No rows returned"`

This creates these tables with Row Level Security (each user sees only their own data):
- `profiles` — user display names
- `game_state` — live scoreboard sync
- `pro_data` — roster, stats, standings, history
- `upcoming_games` — scheduled games

### 1.3 Get Your API Keys
1. In Supabase → left sidebar → **Project Settings** (gear icon) → **API**
2. Copy these two values — you'll need them in Step 3:

```
Project URL:   https://xxxxxxxxxxxxxxxx.supabase.co
anon public:   eyJhbGci...  (very long JWT)
```

### 1.4 Enable Google OAuth (Optional)
1. Supabase → **Authentication** → **Providers** → **Google** → toggle ON
2. You need a Google OAuth Client. Get it at [console.cloud.google.com](https://console.cloud.google.com):
   - Create/select a project
   - Go to **APIs & Services → Credentials**
   - Click **Create Credentials → OAuth 2.0 Client IDs**
   - Application type: **Web application**
   - Authorized redirect URIs — add:
     ```
     https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
     ```
   - Copy **Client ID** and **Client Secret**
3. Paste them into the Supabase Google provider → **Save**

> Skip this if you only want email/password login. The Google button will just show an error.

---

## 💻 STEP 2 — Set Up Your Local Project

### 2.1 Install Node.js
If you don't have Node.js installed:
1. Go to [nodejs.org](https://nodejs.org) → download **LTS** version → install it
2. Verify: open Terminal and run `node --version` — should show v18 or higher

### 2.2 Set Up the Project
1. Download/extract this project folder to your computer
2. Open **Terminal** (Mac/Linux) or **Command Prompt** (Windows)
3. Navigate to the project folder:
   ```bash
   cd path/to/hoops-pro
   ```
4. Install dependencies:
   ```bash
   npm install
   ```

### 2.3 Add Your Supabase Keys
1. In the project folder, find `.env.local.example`
2. **Copy** it and rename the copy to `.env.local`
3. Open `.env.local` in a text editor and replace the placeholder values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
   ```
4. Save the file

> ⚠️ **Never commit `.env.local` to GitHub.** It's already in `.gitignore` to protect your keys.

### 2.4 Run Locally (Optional but recommended to test)
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) — you should see the login page.

---

## 🐙 STEP 3 — Push to GitHub

### 3.1 Install Git
If you don't have Git:
- Mac: install Xcode Command Line Tools — run `git --version` in Terminal, it will prompt you
- Windows: download from [git-scm.com](https://git-scm.com)

### 3.2 Create a GitHub Account
Go to [github.com](https://github.com) and create an account if you don't have one.

### 3.3 Create a New Repository
1. Go to [github.com/new](https://github.com/new)
2. Repository name: `hoops-pro`
3. Set to **Public** (required for free Vercel deployment)
4. **Do NOT** check "Add a README file" — your project already has one
5. Click **Create repository**

### 3.4 Push Your Project to GitHub
In your Terminal, inside the project folder, run these commands one by one:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: Hoops Pro TypeScript"

# Connect to your GitHub repo (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/hoops-pro.git

# Push to GitHub
git branch -M main
git push -u origin main
```

✅ Refresh your GitHub repo page — you should see all your files there.

> **Note:** GitHub may ask you to sign in. Use your GitHub username and password, or a Personal Access Token if you have 2FA enabled.

---

## ▲ STEP 4 — Deploy on Vercel

### 4.1 Create Vercel Account
Go to [vercel.com](https://vercel.com) → **Sign Up** → **Continue with GitHub** (use same GitHub account)

### 4.2 Import Your Repository
1. In Vercel dashboard → click **Add New → Project**
2. Find your `hoops-pro` repository → click **Import**

### 4.3 Add Environment Variables
**Before clicking Deploy**, expand **Environment Variables** and add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project-id.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-anon-key` |

### 4.4 Deploy
Click **Deploy**. Vercel will build and deploy your app in ~60 seconds.

You'll get a URL like: `https://hoops-pro-abc123.vercel.app`

### 4.5 Set Supabase Auth Redirect URL
Now that you have your Vercel URL:
1. Go to Supabase → **Authentication** → **URL Configuration**
2. Set:
   - **Site URL:** `https://hoops-pro-abc123.vercel.app`
   - **Redirect URLs → Add:** `https://hoops-pro-abc123.vercel.app/**`
3. Click **Save**

---

## 🔗 Your App URLs

After deployment, your clean URLs (no .html):

| URL | Page |
|-----|------|
| `yourdomain.vercel.app` | Redirects to /login |
| `yourdomain.vercel.app/login` | Sign in |
| `yourdomain.vercel.app/register` | Create account |
| `yourdomain.vercel.app/dashboard` | Coach dashboard |
| `yourdomain.vercel.app/scoreboard` | Admin scoreboard |
| `yourdomain.vercel.app/viewer` | Live display (open on TV/tablet) |
| `yourdomain.vercel.app/overlay` | OBS streaming overlay |
| `yourdomain.vercel.app/stats` | Public stats & history |

---

## 🔧 Troubleshooting

### "Module not found" error during build
Run `npm install` again, then try `npm run build` locally to see the error.

### Auth redirect loop (keeps going back to /login)
1. Check your `.env.local` — make sure both values are correct (no extra spaces)
2. In Supabase → Authentication → URL Configuration → make sure your Vercel domain is in Redirect URLs

### "Invalid API key" or Supabase errors
Double-check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel's Environment Variables exactly match what's in your Supabase project settings.

### Data not saving between sessions
Data is stored in the browser's `localStorage`. This means:
- Data is per-browser, per-device
- Clearing browser cache clears data
- Different browsers/devices won't share data unless you implement Supabase DB sync

### Viewer/overlay shows old data
The viewer and overlay refresh every 50ms from `localStorage`. Both must be opened in the **same browser** as the scoreboard for live sync to work. For cross-device sync, see the Supabase game_state table — you can extend the code to save/read from there.

### TypeScript errors
Run `npm run type-check` to see all type errors. Most common fix: make sure all imports match the types defined in `src/types/index.ts`.

---

## 🚀 Deploying Updates

After you make changes to your code locally:
```bash
git add .
git commit -m "describe your change here"
git push
```
Vercel will automatically rebuild and redeploy within ~30 seconds.

---

## 📱 Using the App

1. **Register** an account at `/register`
2. **Confirm your email** (check inbox)
3. **Sign in** at `/login`
4. Go to **Dashboard** → click **Scoreboard** to open the main control panel
5. Add players in the **Roster** tab
6. Score points in the **Scoreboard** tab — select a player first to auto-credit stats
7. Open **Viewer** on a TV or secondary screen for the live display
8. Open **Overlay** in OBS as a Browser Source for stream overlays
9. **Save Game** to record results in History and update Standings

---

*Built with Next.js 14, TypeScript, Supabase, and deployed on Vercel.*
