🎯 Overall Goal

Refactor the account and payment flow to support a two-stage identity model:

A temporary / low-commitment identity when the user first enters the site

A primary paid identity (email) that is confirmed only at subscription time

Subscription is treated as an account upgrade, not account verification.

🧠 Core Product Principles (Must Follow)

Users may enter any email or placeholder email when first accessing the site

This initial email is NOT authoritative

The subscription email is the only authoritative identity

Users must be allowed to use a different email at subscription time

Payment confirms identity seriousness, not the first visit

🧩 Identity Model
User states:

Temporary user

Email may be empty, fake, or placeholder

Can access free content

Progress is saved locally

Paid user

Email confirmed at subscription time

Email becomes the primary account identifier

Full access unlocked

🗃️ Data Model (Minimal, No Over-Engineering)

Use a single user record with upgradable identity:

user {
  id: string,
  email: string | null,   // authoritative ONLY after subscription
  is_paid: boolean,
  paid_at?: timestamp
}


Rules:

Before payment: email may be null or unreliable

After payment: email MUST be set and trusted

If a subscription email is provided, it overwrites any previous email

🧭 User Flow
1️⃣ Initial Entry (No Commitment)

User enters the site

Optionally inputs any email (or none)

System:

creates a temporary user

saves progress

Do NOT treat this email as authoritative

UI copy example:

“You can start learning right away.”

2️⃣ Subscribe Action (Critical Step)

When the user clicks “Subscribe / Unlock Full Access”:

Navigate to /subscribe

Show a dedicated email confirmation page

🖥️ /subscribe Page Requirements
Copy (Important):

Display a clear warning:

⚠️ Important
The email you enter below will be used as your paid account identity.
You will use this email to access paid content in the future.

Also display reassurance text:

You may use a different email than the one you entered earlier.

UI Elements:

Email input (required)

Button: “Continue to Payment”

🔗 Payment Redirection Logic

When user submits email on /subscribe:

Validate email format

Store email temporarily (localStorage or state)

Redirect to Stripe Payment Link with email prefilled

Example:

const paymentUrl =
  "https://buy.stripe.com/XXXX" +
  "?prefilled_email=" + encodeURIComponent(email);

window.location.href = paymentUrl;


Do NOT:

Call Stripe API

Store payment state yet

🔁 Stripe Configuration (Manual Step)

Stripe Payment Link must redirect to:

https://acams.vercel.app/paid

🟢 /paid Page Logic (Account Upgrade)

On page load:

Retrieve subscription email from:

URL query param, OR

localStorage fallback

Call backend API to upgrade account

🔧 Backend API: Account Upgrade
Endpoint:
POST /api/payment/activate

Input:
{ "email": "paid-user@example.com" }

Logic:

Normalize email

Find current user (temporary)

Upgrade user:

set email = subscription email

set is_paid = true

set paid_at = now

Persist changes

Return success

Rules:

Do NOT create a second user

This is an upgrade, not a merge

🔐 Access Control

Only users with is_paid === true can access full content

All future logins rely on the subscription email

🧪 Edge Cases

User refreshes /paid: activation must be idempotent

User entered fake email initially: overwritten safely

User subscribes without prior email: allowed

🚫 Explicit Non-Goals

Do NOT implement:

Email verification

Magic links

Passwords

OAuth

Stripe API / webhook

Subscription cancellation logic

✅ Definition of Done

Users can explore freely with low commitment

Subscription requires explicit email confirmation

Paid email becomes authoritative identity

Full access is unlocked automatically after payment

System remains simple and stable

🧠 Final Instruction to Cursor

This is a product-driven refactor, not an auth system.

Favor:

Clarity

Minimalism

Upgrade-over-replacement logic

Avoid:

Over-engineering

Premature automation