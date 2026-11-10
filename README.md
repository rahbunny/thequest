# Autumn Adventure v1.2 — Connected Supabase Accounts

Open `index.html` (or publish on GitHub Pages). Keep the assets folder alongside it. Internet is required for the Supabase script and accounts.

## Connected project
- Project URL and publishable key are in `supabase-config.js`. These are public frontend values. Never put a service-role/secret key in the website.
- Uses Supabase Auth for real email/password sign-up, sign-in, sign-out and reset-email initiation.
- Signed-in accounts get a `public.profiles` row with their username, using your RLS-protected schema.
- Users can register at the end of a quest or sign in from the opening page.
- Existing story, random squirrel, Traveler animation, 2-second lantern transitions, staggered answers, end hub and artwork are preserved.

## Critical limits (not production launch ready)
- Game attempt completion and item rewards are NOT written to the database.
- Guild leaderboards and inventories remain local previews. Never trust client-submitted outcome values.
- Newsletter opt-in is NOT recorded or sent anywhere.
- `?shadow=1` is still a prototype test override. Remove before release.
- Account confirmation email links can redirect to the game only after setting the published game's URL in Supabase Authentication -> URL Configuration (Site URL and Additional Redirect URLs).
- For public launches configure custom SMTP, CAPTCHA/rate limits, privacy disclosures and a server-side validated scoring/reward function.

## Suggested test
1. Launch the site via GitHub Pages or a local HTTP server (not file:// for email redirects).
2. Open the game and click SIGN IN to see the login screen. Switch to CREATE ACCOUNT.
3. Register with a new email, then follow the confirmation email link.
4. Return and sign in, and verify a row in `public.profiles` and a user in Authentication > Users.
5. Complete a route and check that your username is shown, but note your prize is not saved yet.

## Important caveat
This website is client-only and does not implement a trustworthy backend for outcomes, 10% shadow chance, retries or guild scores. Do not run a public competition until server-side validation is in place.
