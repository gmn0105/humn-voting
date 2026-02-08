This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Alien Mini App – Auth & Payments

- **Auth**: The app uses the [Alien React SDK](https://docs.alien.org/react-sdk) (`@alien_org/react`). Users must open the app inside the Alien app to vote or submit proposals. The backend verifies JWTs with `@alien_org/auth-client` (JWKS from Alien).
- **Payments**: Contributions use the SDK’s `usePayment` hook. Configure:
  - **Treasury recipient (ALIEN)**: `TREASURY_ALIEN_PROVIDER_ADDRESS` — your Alien provider address from the [Developer Portal](https://docs.alien.org).
  - **Treasury recipient (USDC/SOL on Solana)**: `TREASURY_SOLANA_ADDRESS` — your Solana wallet address.
  - **Webhook**: Register a payment webhook in the Alien Dev Portal and set `WEBHOOK_PUBLIC_KEY` (Ed25519 public key, hex) to verify webhook signatures.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
