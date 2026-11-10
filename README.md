# The Quest — Autumn Adventure v1.4

This version builds on the existing v1.3 Supabase installation. It keeps the artwork, animated Traveler, branching plot, secret gnoll encounter, prize reveal, inventory, Guild preview, and map.

## MUST DO BEFORE UPDATING GITHUB

1. Go to your existing Supabase project (the same one v1.3 uses).
2. Under Authentication → Sign In / Providers (or Auth Settings), **enable Anonymous Sign-Ins**. Supabase anonymous users receive real authenticated user IDs; their sessions persist in the same browser until signed out or browser data is cleared. Consider CAPTCHA / auth rate limits for public launch.
3. In SQL Editor, run the **entire `supabase_v14_migration.sql`**. This changes the existing guest-run functions; DO NOT rerun the older v1.3 gameplay setup afterward.
4. Keep your GitHub Pages URL in Authentication → URL Configuration:
   - Site URL: `https://rahbunny.github.io/thequest/`
   - Redirect URL: `https://rahbunny.github.io/thequest/`
5. Upload/replace the website files in the **root** of the `rahbunny/thequest` GitHub repository: index.html, styles.css, game.js, auth.js, quest.js, supabase-config.js, and the assets folder. Commit them; the SQL migration does not need to be published on GitHub.
6. After GitHub Pages deploys, hard refresh the live game.

## What's changed

- Players enter a username at the beginning, no email/password required.
- An anonymous Supabase Auth user is created (or a previous browser session reused). This account's ID owns the run from the outset.
- Every finish is verified and claimed in Supabase, even for anonymous users. Anonymous items persist while that browser retains its session.
- To keep items across browsers/devices, an anonymous user verifies their email first and **then** sets a password using the account screen. Their Supabase user ID stays the same.
- BAD endings: clicking **Copy Adventure Link** successfully must happen before the five-minute countdown begins. Copy action recorded on the server; retry runs checked server-side and blocked until both conditions are satisfied.
- Refreshing or signing in with the same account does not reset the server timer.
- Newsletter check box is optional; the consent choice is stored privately in Supabase after verified email and account upgrade. Returning users can manage or unsubscribe from the ending hub using **KEEP ACCOUNT / EMAIL**.

## Testing

**Fresh browser without an existing account:**
1. Open game homepage → enter `TestTraveler123` (choose a unique name) → Enter Forest.
2. Take Bright Path → River → Golden Pebble. Finish and view 5-second reveal.
3. The account form should ask for email only (newsletter checkbox optional). Use CONTINUE TO RESULT to skip email temporarily.
4. Open Inventory; the Golden Pebble should show as unlocked. Reload and verify that a new play uses the same name.
5. To keep it permanently, choose KEEP ACCOUNT / EMAIL in the ending hub, enter email, and confirm from the same browser. On return, set password.
6. In Supabase Table Editor, verify the player ID in profiles, player_inventory, game_attempts, and (if opted in) newsletter_subscriptions.

**Failure/cooldown test:**
1. Use a fresh player identity, choose Turn around and leave.
2. Continue to result and open SHARE. Retry is locked before Copy Link.
3. Click COPY ADVENTURE LINK; timer should show 05:00.
4. Refresh: the last failure screen is restored; the same timer remains.
5. Clicking Enter Forest before expiry is refused by the database. After five minutes the Try Again button unlocks.

## Security and limitations

- The backend records **that the Copy Link action was reported**, not proof a message was sent to another person. Browsers cannot verify actual sharing.
- A user who clears browser data or opens incognito may create another anonymous account, bypassing account-specific cooldowns. To fully prevent that would require stronger identity verification, which changes your low-friction guest experience.
- A browser's anonymous session cannot be recovered after the browser data is cleared or the user signs out before linking email. Show players this caveat.
- Signing in to an **existing separate account** will not automatically merge rewards from a new anonymous identity. The UI warns about this. Email/password upgrading the **current** anonymous account preserves its items.
- Older v1.3 runs without an owner user ID cannot be converted automatically. Already-claimed rewards and profiles remain intact.
- Emails aren't sent by this project; newsletter_subscriptions records opt-in only. Configure an email platform and unsubscribe sending workflow before actually mailing marketing emails.
- Guild rankings continue as preview UI. Secure multiplayer rankings still require more work.
- The v1.4 SQL was prepared and JS syntax-checked, but could not be tested against your live Supabase project. Test on a staging project or back up your current project before applying the migration.

## File overview

- `index.html`: page structure
- `styles.css`: art, movement, and UI
- `game.js`: story decisions, end scene, hub
- `auth.js`: anonymous session, username, email verification, password setup, optional newsletter preferences
- `quest.js`: server-backed run, inventory, retry status and link-copy action
- `supabase-config.js`: public URL and publishable key (no secret keys)
- `supabase_v14_migration.sql`: database upgrade; run in Supabase SQL Editor
- `assets/`: existing pixel-art graphics
