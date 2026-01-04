# Payment Setup Guide

## Stripe Payment Link Configuration

To ensure users are redirected to the activation page after payment:

### Step 1: Configure Stripe Payment Link

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Products** → **Payment Links**
3. Find your Payment Link: `bJe7sMcZ4bvC6954grcV200`
4. Click **Edit** or **Settings**

### Step 2: Set Success Redirect URL

In the Payment Link settings, find **"After payment"** section:

- **Success page URL**: `https://your-domain.com/paid`
  - Replace `your-domain.com` with your actual domain
  - For local development: `http://localhost:3000/paid`
  - For Vercel: `https://your-app.vercel.app/paid`

### Step 3: Test the Flow

1. User clicks "Subscribe" button
2. User completes payment on Stripe
3. Stripe redirects to `/paid` page
4. User sees "Payment successful 🎉"
5. User enters their email (pre-filled if already logged in)
6. User clicks "Activate Access"
7. System activates paid access
8. User is redirected to questions page with unlimited AI access

## Manual Activation

If a user has paid but hasn't activated yet:

1. They can click **"Activate Access"** button in the header
2. Or visit `/paid` page directly
3. Enter their email and activate

## Troubleshooting

**Problem**: User pays but doesn't see activation page
- **Solution**: Check Stripe Payment Link redirect URL is set to `/paid`

**Problem**: User can't activate access
- **Solution**: Make sure they enter the same email they use on the site

**Problem**: Activation doesn't work
- **Solution**: Check browser console for errors, verify API endpoint is accessible

