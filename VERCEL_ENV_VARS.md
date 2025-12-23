# Vercel Environment Variables

Copy and paste these into Vercel → Settings → Environment Variables:

## Database (Supabase)

```
DATABASE_URL=postgres://postgres.zijxqalhcjvziqeearao:ElkH2chaU6KKISSd@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
```

```
POSTGRES_URL=postgres://postgres.zijxqalhcjvziqeearao:ElkH2chaU6KKISSd@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x
```

```
POSTGRES_URL_NON_POOLING=postgres://postgres.zijxqalhcjvziqeearao:ElkH2chaU6KKISSd@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

**Note:** Use `POSTGRES_URL_NON_POOLING` for migrations, `DATABASE_URL` for the app (with connection pooling)

## Whop API

```
WHOP_API_KEY=apik_OVnH0zomVWR0E_A2021623_C_1f71b643ff0c9f9dab703b051d942c1f279561324ba57ac17c7fa220c34bd1
```

```
NEXT_PUBLIC_WHOP_APP_ID=app_bk6tyHTr0uWc4P
```

## Webhook

```
WEBHOOK_SECRET=3e045c5bb07a56bebd202701e39c1fc70dbd097d5a1e1a3674132a1593d65ab2
```

**Important:** Use this same secret in Whop Developer Dashboard when setting up the webhook.

## App Configuration

```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```
**Note:** Update this after deployment with your actual Vercel URL

```
SERVICE_USER_USERNAME=moderators-agent
```

```
SERVICE_USER_ID=user_lB2Zd3j3plveZ
```

## Instructions

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. For each variable above:
   - Click **Add New**
   - Paste the **Key** (left side of =)
   - Paste the **Value** (right side of =)
   - Select **Production**, **Preview**, and **Development** environments
   - Click **Save**
4. After adding all variables, redeploy your app

## Database Notes

- **DATABASE_URL**: Use this for the app (with connection pooling via PgBouncer)
- **POSTGRES_URL**: Alternative pooled connection
- **POSTGRES_URL_NON_POOLING**: Use this for migrations (port 5432, no pooling)

For Prisma migrations, you may need to temporarily use `POSTGRES_URL_NON_POOLING` since migrations require a direct connection.

## Supabase Connection Pooling

Supabase uses PgBouncer for connection pooling:
- Port **6543**: Pooled connection (use for app)
- Port **5432**: Direct connection (use for migrations)

The `DATABASE_URL` uses port 6543 with pooling enabled, which is perfect for Vercel's serverless functions.
