This is a [Next.js](https://nextjs.org) project for **HUMN** (humn-voting): the verified polling app for the Alien ecosystem. One Human. One Voice.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Environment variables

### Local development

1. Copy the example file:  
   `cp .env.example .env.local`
2. Edit `.env.local` and set at least the **Supabase** values (required for polls and voting). The file is git-ignored; never commit real secrets.

### Production (e.g. Vercel)

1. Open your project on [Vercel](https://vercel.com) → **Settings** → **Environment Variables**.
2. Add the same variables there. You can scope them to **Production**, **Preview**, or both.
3. Redeploy after changing env vars.

### Variables reference

| Variable | Where | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Polls, votes, auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as above | Polls, votes, auth |
| `GEMINI_API_KEY` | [Google AI](https://aistudio.google.com/apikey) | Optional: `/api/summary` (AI summarization; not used in this version). |
| `TREASURY_ALIEN_PROVIDER_ADDRESS` | Alien Developer Portal | Optional: only if you want to **accept** user contributions (Contribute flow). |
| `TREASURY_SOLANA_ADDRESS` | Solana wallet | Optional: same, for SOL/USDC contributions. |
| `WEBHOOK_PUBLIC_KEY` | Alien payment webhook (hex) | Optional: verify payment webhooks if using contributions. |

**No wallet required for the app operator.** Voting and creating polls only need Supabase (+ Alien in-app). For **capital polls**, the **poll creator** (or sponsor) sends the prize by tapping **"Send prize"** in the app after the poll closes; they approve the payment in Alien and their wallet sends to the winner. Each option has a recipient and amount; the winning option’s amount is sent when the creator completes the payment.

**Note:** Names starting with `NEXT_PUBLIC_` are exposed to the browser; use them only for non-secret config (e.g. Supabase URL and anon key).

## HUMN – Auth & Voting

- **Auth**: The app uses the [Alien React SDK](https://docs.alien.org/react-sdk) (`@alien_org/react`). Users must open the app inside the Alien app to vote or create polls. The backend verifies JWTs with `@alien_org/auth-client` (JWKS from Alien).
- **Database**: Supabase (polls, poll_options, votes, poll_audience). Run the SQL in `supabase/migrations/` to create the schema.
- **Payments** (capital polls): The **poll creator** taps "Send prize" after closing a capital poll and approves the payment in Alien; their wallet sends the winning option’s amount to that option’s recipient. No app-operator wallet involved.

## Project

- **App name**: HUMN  
- **Project/repo**: humn-voting (Vercel, Supabase, GitHub)

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Alien SDK](https://docs.alien.org)

## Deploy on Vercel

Deploy the Next.js app to [Vercel](https://vercel.com). The project is intended to be named **humn-voting** on Vercel and GitHub.
