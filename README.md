# Autumn Adventure v1.3 — reward claims + retry timer

## Before publishing
1. In the SAME Supabase project, open SQL Editor and run `supabase_gameplay_setup.sql` once.
2. After the script succeeds, upload `index.html`, `game.js`, `auth.js`, `quest.js`, `styles.css`, `supabase-config.js`, and the entire `assets/` folder to GitHub repository root.
3. Test signup with a NEW email and confirm it on the SAME browser (the guest run receipt is saved in that browser's localStorage).
4. The server validates the player choices and 10% secret-route availability and saves the resulting item in `player_inventory`.
5. Failure retry: on the Guild hub, open SHARE, click COPY ADVENTURE LINK; the five-minute timer counts down and TRY AGAIN unlocks. The timer survives page refresh on the same browser.

## Important limitations
- The run receipt is stored on the device until claimed. Complete email confirmation on that same browser; another device won't have the receipt.
- Existing rewards from v1.2 cannot be recovered, as no completed run was stored then. Replay once on v1.3.
- The guest run URL token is a bearer secret and must not be shared. The Supabase database stores it privately.
- Retry cooldown is browser-side; it can be bypassed by clearing browser data or switching devices. For abuse-resistant retries, add account-bound server cooldowns later.
- This guest run function is open to anonymous clients and needs rate limits/CAPTCHA for a high-traffic public launch.
- The Guild panel still shows a local preview rather than a true cross-player leaderboard.
- No newsletter opt-in is sent to a mailing service.
