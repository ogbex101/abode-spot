# Deploying AbodeSpot to Vercel

## Prerequisites
- A [Vercel](https://vercel.com) account
- A [Supabase](https://supabase.com) project with the schema applied (see `supabase/schema.sql`)

---

## Step 1 — Push to GitHub

Make sure your project is in a GitHub (or GitLab/Bitbucket) repository.
Do **not** commit your `.env` file — it's in `.gitignore`.

---

## Step 2 — Import project on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"** and select your repo
3. Vercel will auto-detect the framework as **Vite**

**Build settings (auto-detected, but verify):**

| Setting | Value |
|---|---|
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

---

## Step 3 — Add Environment Variables

In Vercel: **Project → Settings → Environment Variables**

Add these two variables for **Production**, **Preview**, and **Development**:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://YOUR_PROJECT_ID.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `your_anon_key_here` |

Get both values from:
**Supabase Dashboard → Your Project → Settings → API**

> ⚠️ Never expose your `service_role` key. Only use the `anon` (public) key here.

---

## Step 4 — Deploy

Click **Deploy**. Vercel will:
1. Install dependencies
2. Run `tsc -b && vite build`
3. Deploy the `dist/` folder as a static site
4. Apply the SPA rewrites from `vercel.json` so all routes work

---

## Step 5 — Configure Supabase Auth Redirect URLs

After deploying, copy your Vercel production URL (e.g. `https://abodespot.vercel.app`) and add it to Supabase:

**Supabase Dashboard → Authentication → URL Configuration**

| Setting | Value |
|---|---|
| Site URL | `https://your-app.vercel.app` |
| Redirect URLs | `https://your-app.vercel.app/**` |

This is required for email verification and OAuth to work correctly.

---

## Troubleshooting

**White screen / 404 on page refresh**
→ Check that `vercel.json` rewrites are present (they are, don't delete it).

**"supabase not configured" warning**
→ Verify your environment variables are set in Vercel and redeploy.

**Build fails on TypeScript errors**
→ Run `npm run build` locally first to catch errors before pushing.

**Auth not working after deploy**
→ Make sure your Vercel URL is added to Supabase's Redirect URLs (Step 5).
