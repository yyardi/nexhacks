# Arden AI Mental Health Companion - Setup Guide

Welcome to Arden! This guide will help you set up the project from scratch and get it running locally.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Installation Steps](#installation-steps)
4. [Supabase Setup](#supabase-setup)
5. [API Keys Configuration](#api-keys-configuration)
6. [Running Locally](#running-locally)
7. [Deploying to Production](#deploying-to-production)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **bun** (faster alternative)
- **Git** - [Download here](https://git-scm.com/)
- **Supabase CLI** (optional but recommended) - [Install guide](https://supabase.com/docs/guides/cli)

---

## Project Structure

```
nexhacks/
├── src/                      # Frontend React application
│   ├── pages/               # Route pages
│   ├── components/          # React components
│   ├── hooks/               # Custom React hooks
│   └── integrations/        # Supabase client setup
├── supabase/
│   ├── functions/           # Edge Functions (Deno/TypeScript)
│   └── migrations/          # Database migrations
├── public/                  # Static assets
├── .env.example             # Environment variables template
├── package.json             # Dependencies
└── vite.config.ts           # Vite configuration
```

---

## Installation Steps

### Step 1: Clone and Install Dependencies

```bash
# Navigate to the project directory
cd nexhacks

# Install dependencies
npm install

# OR using bun (faster)
bun install
```

This will install all required dependencies including:
- React, React Router, React Query
- Supabase client
- UI components (Radix UI, shadcn/ui)
- Form handling (React Hook Form, Zod)
- Styling (Tailwind CSS)

---

## Supabase Setup


#### Option A: Using Supabase Dashboard (Easier)

1. Go to **SQL Editor** in your Supabase dashboard
2. Open each migration file in `supabase/migrations/` folder:
   - `20250103221702_lucky_peak.sql`
   - `20250103234701_warm_river.sql`
   - `20250104000729_shrill_darkness.sql`
   - `20250104012618_dusty_paper.sql`
   - `20250104013433_quick_lake.sql`
3. Copy and paste the SQL content
4. Click **"Run"** for each migration

#### Option B: Using Supabase CLI (Advanced)

```bash
# Link your project
supabase link --project-ref YOUR_PROJECT_ID

# Push migrations
supabase db push
```

### Step 4: Set Up Authentication

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Enable **Email** provider (it's usually enabled by default)
3. Configure email templates if needed (**Authentication** → **Email Templates**)

### Step 5: Deploy Edge Functions

The project uses 7 Edge Functions. You need to deploy them to your Supabase project.

#### Deploy via Supabase CLI:

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_ID

# Deploy all functions
supabase functions deploy interview-orchestrator
supabase functions deploy analyze-psychiatric
supabase functions deploy generate-session-insights
supabase functions deploy transcribe-audio
supabase functions deploy transcribe-audio-file
supabase functions deploy translate-to-english
supabase functions deploy realtime-chat
```

#### Set Edge Function Environment Variables:

```bash
# Set Gemini API key for all functions
supabase secrets set GEMINI_API_KEY=your-gemini-api-key-here

# Verify secrets are set
supabase secrets list
```

---

## API Keys Configuration

### Step 1: Create .env File

Copy the example file:

```bash
cp .env.example .env
```

### Step 2: Fill in Your Credentials

Open `.env` and add your API keys:

#### Required for Basic Functionality:

1. **Supabase** (from Step 2 of Supabase Setup):
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

2. **Gemini API** (for Edge Functions & Sentiment Analysis):
   - Get your API key from: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
   - Note: This is set in Supabase secrets (see above), NOT in .env
   - Per Arden Spec: Gemini is required for transcript sentiment analysis (Milestone 3.5)
   ```env
   GEMINI_API_KEY=your-gemini-api-key-here
   ```

#### Required for Arden Real-Time Companion (New Spec):

3. **LiveKit** (for real-time voice/video):
   - Sign up at: [https://cloud.livekit.io](https://cloud.livekit.io)
   - Create a new project
   - Go to **Settings** → **Keys**
   - Copy API Key and API Secret
   ```env
   LIVEKIT_API_KEY=your-livekit-api-key
   LIVEKIT_API_SECRET=your-livekit-api-secret
   LIVEKIT_URL=wss://your-project.livekit.cloud
   ```

4. **Overshoot RealtimeVision** (for emotional perception):
   - Sign up at: [https://overshoot.ai](https://overshoot.ai)
   - Get your API key from dashboard
   ```env
   OVERSHOOT_API_KEY=your-overshoot-api-key
   ```

---

## Running Locally

### Step 1: Start the Development Server

```bash
# Using npm
npm run dev

# OR using bun
bun run dev
```

The app will be available at: **http://localhost:8080**

### Step 2: Create an Account

1. Open [http://localhost:8080](http://localhost:8080)
2. Click **"Get Started"** or **"Create Account"**
3. Enter your email and password
4. Check your email for verification (if enabled)
5. Sign in and start using the app

### Step 3: Verify Everything Works

✅ **Check Auth**: Can you sign up and sign in?
✅ **Check Database**: Does the Dashboard page load?
✅ **Check Edge Functions**: Try creating a test session
✅ **Check UI**: All pages render without errors

---

## Deploying to Production

### Option 1: Vercel (Recommended)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Add environment variables in Vercel dashboard:
   - Go to your project → **Settings** → **Environment Variables**
   - Add all variables from your `.env` file

### Option 2: Netlify

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Deploy:
   ```bash
   netlify deploy --prod --dir=dist
   ```

4. Add environment variables in Netlify dashboard

### Option 3: Custom Server

```bash
# Build the project
npm run build

# Serve the dist/ folder with any static file server
# Example with serve:
npx serve -s dist -p 8080
```

---

## Troubleshooting

### Issue: "VITE_SUPABASE_URL is not defined"

**Solution**: Make sure you've created a `.env` file with the correct Supabase credentials.

```bash
# Check if .env exists
ls -la .env

# If not, create it from example
cp .env.example .env
```

### Issue: "Failed to fetch" or CORS errors

**Solution**: Check your Supabase project settings:

1. Go to **Settings** → **API**
2. Under **CORS Allowed Origins**, add your local URL: `http://localhost:8080`
3. For production, add your production URL

### Issue: Edge Functions failing with "GEMINI_API_KEY not configured"

**Solution**: Set the secret in Supabase:

```bash
supabase secrets set GEMINI_API_KEY=your-gemini-key-here
```

### Issue: Database migrations failed

**Solution**: Manually run migrations in SQL Editor:

1. Go to Supabase Dashboard → **SQL Editor**
2. Copy content from `supabase/migrations/` files
3. Run them one by one in order

### Issue: Face-api.js models not loading

**Solution**: The models should be in `public/models/`. If missing:

1. Download from: [https://github.com/justadudewhohacks/face-api.js-models](https://github.com/justadudewhohacks/face-api.js-models)
2. Place in `public/models/` directory

### Issue: npm install fails

**Solution**: Try clearing cache:

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Issue: Port 8080 already in use

**Solution**: Either:

1. Kill the process using port 8080:
   ```bash
   # On Linux/Mac
   lsof -ti:8080 | xargs kill -9

   # On Windows
   netstat -ano | findstr :8080
   taskkill /PID <PID> /F
   ```

2. Or change the port in `vite.config.ts`:
   ```typescript
   server: {
     port: 3000, // Change to your preferred port
   }
   ```

---

## Next Steps

Now that you have the project running:

1. **Explore the current features** - Try the psychiatric assessment tools
2. **Implement the Arden Spec** - Build the real-time AI mental health companion features:
   - LiveKit integration for voice conversation
   - Overshoot RealtimeVision for emotional perception
   - Real-time emotional adaptation
   - Distress and safety response system

3. **Customize the UI** - Update branding, colors, and components
4. **Add your domain** - Configure custom domain in your hosting provider
5. **Set up analytics** - Add tracking for user engagement

---

## Support

If you encounter issues not covered here:

1. Check the GitHub issues
2. Review Supabase documentation: [https://supabase.com/docs](https://supabase.com/docs)
3. Check LiveKit docs: [https://docs.livekit.io](https://docs.livekit.io)
4. Review Overshoot docs: [https://docs.overshoot.ai](https://docs.overshoot.ai)

---

**Happy building with Arden! 🧠💜**
