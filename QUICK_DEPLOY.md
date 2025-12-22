# Quick Deploy to Vercel

## Fastest Way to Deploy

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Ready for deployment"
git remote add origin <your-github-repo>
git push -u origin main
```

### 2. Deploy on Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel will auto-detect Next.js

### 3. Set Environment Variables
In Vercel project → Settings → Environment Variables, add:

```
DATABASE_URL=postgresql://... (from your database provider)
WHOP_API_KEY=apik_OVnH0zomVWR0E_A2021623_C_1f71b643ff0c9f9dab703b051d942c1f279561324ba57ac17c7fa220c34bd1
NEXT_PUBLIC_WHOP_APP_ID=app_bk6tyHTr0uWc4P
WEBHOOK_SECRET=your-secret-here
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
SERVICE_USER_USERNAME=moderators-agent
SERVICE_USER_ID=user_lB2Zd3j3plveZ
```

### 4. Get a Database

**Easiest: Vercel Postgres**
- In Vercel dashboard → Storage → Create Database
- Select Postgres
- Copy the connection string to `DATABASE_URL`

**Or use Supabase (Free)**
- Sign up at supabase.com
- Create project → Settings → Database
- Copy connection string

### 5. Deploy!
Click "Deploy" in Vercel. Your app will be live at:
`https://your-app.vercel.app`

### 6. Set Up Webhook in Whop
1. Go to Whop Developer Dashboard
2. Add webhook: `https://your-app.vercel.app/api/webhook`
3. Set secret to match `WEBHOOK_SECRET`

Done! 🎉

