# Tests

- **Unit + API + integration:** `npm run test:run` or `npm test` (watch)
- **E2E:** `npm run test:e2e` (starts dev server if needed). First time: `npx playwright install chromium`
- **All:** `npm run test:all` or `npm run verify`

Test data is provided by mocks (Supabase, auth, payments, Gemini). For integration tests against a real DB, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.test` (see project root `.env.test.example`).
