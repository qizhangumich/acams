# Environment Variables Setup

## Required Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/acams_learning?schema=public"

# JWT Secret (generate a strong random string, min 32 characters)
JWT_SECRET="change-me-to-a-strong-random-secret-min-32-characters"

# Email Service (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxxx"
RESEND_FROM_EMAIL="noreply@acams-learning.com"

# App URL (for magic links)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Node Environment
NODE_ENV="development"
```

## Getting Values

### DATABASE_URL
- **Neon PostgreSQL**: Get from Neon Dashboard → Connection String
- **Vercel Postgres**: Get from Vercel Dashboard → Storage → Postgres → Connection String
- Format: `postgresql://user:password@host:port/database?schema=public`

### JWT_SECRET
Generate a strong random string:
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use online generator (32+ characters)
```

### RESEND_API_KEY
1. Sign up at https://resend.com
2. Create API key
3. Copy to `.env.local`

### RESEND_FROM_EMAIL
- Must be verified in Resend dashboard
- Format: `noreply@yourdomain.com`
- For testing: Use Resend's test domain

### NEXT_PUBLIC_APP_URL
- Development: `http://localhost:3000`
- Production: `https://yourdomain.com`

## Security Notes

- Never commit `.env.local` to git
- Use different secrets for dev/staging/production
- Rotate secrets periodically
- Keep JWT_SECRET strong (32+ characters)

