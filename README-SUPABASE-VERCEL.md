# fixing the sync between Vercel and Supabase

Hello! I have investigated the repository and fixed the schema and analytics page crashes. 

The last issue you mentioned was that Vercel and Supabase are getting "out of sync". This happens because Prisma requires two separate connection URLs to work reliably with Supabase when deployed on serverless platforms like Vercel.

Here is exactly how you need to configure your environment variables in both your local `.env` and **Vercel Project Settings**:

## 1. Get Your URLs from Supabase
Go to your Supabase project dashboard -> Settings -> Database.

Scroll down to **Connection String** and make sure **Use connection pooling** is checked.
*   **Transaction Mode** should be selected (Port 6543).
*   Copy this string. It will look like: `postgres://[user]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true`

Now, uncheck **Use connection pooling** so you see the direct connection.
*   Copy this string. It will look like: `postgres://[user]:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`

## 2. Set Your Environment Variables

### Local `.env` file
You need both of these defined in your root `.env` file:
```env
# The Transaction connection pooler string (Port 6543, pgbouncer=true)
DATABASE_URL="postgres://[user]:[password]@[host]:6543/postgres?pgbouncer=true&connection_limit=1"

# The Direct Database connection string (Port 5432)
DIRECT_URL="postgres://[user]:[password]@[host]:5432/postgres"
```

### Vercel settings
Go to your Vercel Project -> Settings -> Environment Variables.
Add both `DATABASE_URL` and `DIRECT_URL` exactly as you did in your local `.env` file.

*Why do we do this?*
Prisma needs the `DIRECT_URL` to run schema migrations (like creating tables). But during normal usage, it needs `DATABASE_URL` to efficiently pool thousands of Vercel serverless connections to Supabase so it doesn't crash the database by exhausting connections.

## 3. Deployment
Once you set these, trigger a new deployment on Vercel or run `npx prisma db push` locally to ensure the new schema defaults and cascade rules are synced identically.
