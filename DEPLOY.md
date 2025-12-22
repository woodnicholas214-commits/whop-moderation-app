# Deploying to Vercel

This guide will help you deploy the Whop AutoMod app to Vercel so it can be accessed via a base URL and integrated with Whop.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. A PostgreSQL database (Vercel Postgres, Supabase, or Railway recommended)
3. Your Whop API credentials

## Step 1: Set Up Production Database

SQLite won't work on Vercel. You need a PostgreSQL database:

### Option A: Vercel Postgres (Recommended)
1. Go to your Vercel dashboard
2. Create a new Postgres database
3. Copy the connection string

### Option B: Supabase (Free tier available)
1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings > Database
4. Copy the connection string (use the "URI" format)

### Option C: Railway
1. Sign up at [railway.app](https://railway.app)
2. Create a new PostgreSQL database
3. Copy the connection string

## Step 2: Update Prisma Schema for Production

The schema is already set up for PostgreSQL. Just make sure to update the datasource:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## Step 3: Deploy to Vercel

### Method 1: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Follow the prompts to:
   - Link to existing project or create new
   - Set up environment variables (see Step 4)

### Method 2: Deploy via GitHub

1. Push your code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings

## Step 4: Configure Environment Variables

In your Vercel project settings, add these environment variables:

### Required Variables:

```
DATABASE_URL=postgresql://user:password@host:port/database?schema=public
WHOP_API_KEY=apik_OVnH0zomVWR0E_A2021623_C_1f71b643ff0c9f9dab703b051d942c1f279561324ba57ac17c7fa220c34bd1
NEXT_PUBLIC_WHOP_APP_ID=app_bk6tyHTr0uWc4P
WEBHOOK_SECRET=your-secure-random-secret-here
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
SERVICE_USER_USERNAME=moderators-agent
SERVICE_USER_ID=user_lB2Zd3j3plveZ
```

### Setting Environment Variables in Vercel:

1. Go to your project on Vercel dashboard
2. Click **Settings** → **Environment Variables**
3. Add each variable:
   - **Key**: The variable name (e.g., `DATABASE_URL`)
   - **Value**: The actual value
   - **Environment**: Select "Production", "Preview", and "Development" as needed
4. Click **Save**

## Step 5: Run Database Migrations

After deployment, you need to run migrations:

### Option 1: Via Vercel CLI
```bash
vercel env pull .env.local
npx prisma migrate deploy
```

### Option 2: Via Vercel Postgres Dashboard
If using Vercel Postgres, you can run SQL directly in the dashboard.

### Option 3: Create a migration script
Add this to your `package.json`:
```json
"db:migrate:prod": "prisma migrate deploy"
```

Then run it after deployment.

## Step 6: Seed the Database (Optional)

To add starter rules, you can:
1. Use Vercel CLI to run the seed script:
```bash
vercel env pull .env.local
npm run db:seed
```

Or manually create the company and rules via the app UI.

## Step 7: Configure Webhook in Whop

1. Get your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
2. Go to Whop Developer Dashboard
3. Register webhook URL: `https://your-app.vercel.app/api/webhook`
4. Select events:
   - `message.created`
   - `message.updated`
   - `forum_post.created`
   - `forum_post.updated`
5. Set the webhook secret (must match `WEBHOOK_SECRET` in Vercel)

## Step 8: Update App URL

Make sure `NEXT_PUBLIC_APP_URL` in Vercel matches your actual deployment URL.

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check if your database allows connections from Vercel's IPs
- For Supabase: Make sure connection pooling is configured correctly

### Build Failures
- Check that all environment variables are set
- Verify Prisma schema is correct for PostgreSQL
- Check build logs in Vercel dashboard

### Webhook Not Working
- Verify `WEBHOOK_SECRET` matches in both Vercel and Whop
- Check Vercel function logs for errors
- Ensure webhook URL is accessible (not behind auth)

## Production Checklist

- [ ] PostgreSQL database set up
- [ ] Environment variables configured in Vercel
- [ ] Database migrations run
- [ ] Webhook URL registered in Whop
- [ ] `NEXT_PUBLIC_APP_URL` set correctly
- [ ] Test webhook endpoint
- [ ] Test app functionality
- [ ] Set up custom domain (optional)

## Custom Domain (Optional)

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_APP_URL` to your custom domain

## Monitoring

- Check Vercel dashboard for deployment status
- Monitor function logs for errors
- Use Vercel Analytics (if enabled)
- Check database connection pool usage

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check function logs in Vercel dashboard
3. Verify all environment variables are set
4. Test database connection locally with production URL

