# PawFleet — Claude Reference File
> Keep this file open. Update it whenever a feature ships, a bug is found, or a decision is made.

---

## Project Identity
| Key | Value |
|---|---|
| App | PawFleet — dog walking / grooming / vet booking platform for Zambia |
| Live URL | https://www.pawfleetapp.com |
| GitHub | https://github.com/MubangaNazy/pawfleet.app2 |
| Vercel project | mubangachanda004-cryptos-projects / pawfleet.app2 |
| Supabase project ID | `tqoordnjsigllzjzkqxb` (the one in `.env` and used by the live app; `ftgoofjexthuzvlyhcsw`, referenced in `supabase/.temp/linked-project.json`, is an unrelated old project — never run migrations against it) |
| Android app ID | `com.pawfleet.app` (matches `android/`, Firebase `google-services.json` and `capacitor.config.ts`; permanent once on Google Play) |
| Currency | Zambian Kwacha (K / ZMW) |
| Location | Lusaka, Zambia (default map center -15.4167, 28.2833) |

---

## Tech Stack
| Layer | Choice |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS (forest green brand) |
| Database / Auth | Supabase (PostgreSQL + Realtime + Supabase Auth, email/password) |
| Maps | **MapLibre GL** (`src/components/map/LiveRouteMap.tsx`), tiles from `tiles.openfreemap.org/styles/liberty` — free, no API key. Geocoding via OpenStreetMap Nominatim (`src/lib/geocode.ts`) |
| Mobile | Capacitor (Android wrapper in `android/`; iOS not yet added — needs a Mac + active Apple Developer account) |
| Native plugins | `@capacitor/geolocation`, `@capgo/background-geolocation` (GPS survives screen lock), `@capacitor/push-notifications`, `@capacitor-community/text-to-speech` (turn-by-turn voice) |
| Push notifications | Firebase Cloud Messaging — web SDK for browsers/PWA, native Capacitor plugin for Android, one shared `requestNotificationPermission()` in `src/lib/firebase.ts` |
| Email | Resend. Templates + awaited `sendTemplate()` in `api/_lib/email.js`; `api/send-email.js` is the app-facing endpoint and needs a login (people can only email themselves; admins can send walker approved/rejected; a brand-new account can get its welcome email). Sending domain `mail.pawfleetapp.com`; every send is logged to `public.email_log` |
| Payments | Lenco mobile money collection (Airtel/MTN/Zamtel) through `api/payments.js` only (`create` / `status`). Server prices the order, reuses a pending prompt for 3 min, max 3 prompts per 10 min, records each prompt in `payment_intents`, applies success once (creates shop orders / extends subscriptions server-side). Client: `src/lib/lenco.ts`, `PaymentModal.tsx` |
| Monitoring | Sentry (errors) + PostHog (behavioural analytics), both wired in `src/lib/monitoring.ts` |
| Scheduled jobs | `api/cron/reminders.js` — Vercel Cron (daily, Hobby-plan limit) **and** `.github/workflows/reminders-cron.yml` (every 15 min, free, does the real work) |
| Hosting | Vercel (manual deploy from `main`, not auto-deploy) |
| Deploy cmd | `vercel --prod --yes` (CLI is already authenticated — no token flag needed) |

---

## Brand / Design Rules
- **Colors only**: `#1B4332` (dark), `#2B8A50` (primary), `#52B788` (light), `#EBF5EF` (bg). Amber = warnings/pending, red = danger/error. Vets get teal (`#0F766E`/`#0891B2`), shops get amber/gold (`#B45309`/`#F59E0B`) as secondary accents.
- Logo component: `src/components/ui/PawFleetLogo.tsx` — do NOT change SVG paths.
- No cats — the platform is dogs (and other pets via "Add pet") only; cat references were deliberately removed everywhere.
- Landing page (`/landing`) only: palette is sampled from the puppy photo (mint, gold, caramel, cream, forest), by the owner's request. The 3D puppy is five photos (front, side, back, three-quarter, top) on sculpted meshes that cross-fade as it turns (`src/components/landing/puppyScene.ts`, textures in `public/landing/`, rebuilt by `scripts/landing/make_puppy_assets.py`). Its spot per chapter and the map route live in `src/components/landing/puppyPath.ts`. The dog walks across the screen following the scroll on a clock-driven walk, and finishes the walk by itself if scrolling stops (owner's call: it must stay on screen, never walk off and back in). The map route and gold line are locked to the scroll. three.js loads only on this page via dynamic import. Performance: phones don't use three.js at all; they slide pre-rendered frames (`src/components/landing/puppySprite.ts`, `public/landing/sprite-*.webp`, rebuilt by `scripts/landing/make_puppy_sprites.py`). Both versions share `puppyWalker.ts`. On desktop the canvas is only a box around the dog, and machines with 4 or fewer CPU cores use `*-sm.webp` and a lighter shader.

---

## Roles & Onboarding
| Role | How they get an account | Route |
|---|---|---|
| Owner | Self-registers at `/register` | `/owner` |
| Walker | Self-registers at `/register`, starts `walker_status = 'pending_approval'`, admin approves | `/walker` |
| Vet / Shop Owner | **No self sign-up** — admin creates the account (Admin → Vets & Shop Owners), which creates a real Supabase Auth login + emails the person their password | `/vet`, `/shopowner` |
| Admin | Created manually (no self-serve admin creation flow exists) | `/admin` |
| Trainer | A walker whose `pricing.trainerStatus` is `'approved'` — not a separate role | `/walker` |

Demo/seeded logins are **off** by default (`VITE_ENABLE_DEMO=true` would re-enable them; they have no real session or DB rows behind them and should not be relied on). All real accounts go through Supabase Auth.

Forgot password: self-service at `/forgot-password` → emailed link → `/reset-password`, both steps in `api/password-reset.js` (case-insensitive email match, awaited send, max 3 per hour). Signup stores emails lower-case.

---

## Features Shipped ✅
### Owner
- Dashboard, Book a Walk (Instant/Scheduled, duration pills, nearest-walker sort)
- **Pin-drop pickup picker** (`src/components/map/PinDropPicker.tsx`) — drag-the-map-under-a-fixed-pin location picker, more accurate than typing an address. Used on Book a Walk, Home Grooming, and Vet Booking's transport pickup.
- Home Grooming, Vet Booking (real map of PawFleet-registered vets + OSM-scanned nearby clinics + a few hardcoded known ones, sorted by distance)
- Shop (with a live map of registered shop owners who've set a location, "Shops near you")
- Live walk tracking (MapLibre), chat, dog/pet profiles with health logs, account deletion, change password

### Walker
- Available-jobs browsing while offline (InDrive-style — distance-sorted, not gated on being "online"), Online/Offline toggle
- Live GPS broadcast that survives screen lock/app close (native background geolocation on Android)
- Turn-by-turn voice guidance, Earnings + payment confirmation, Badges, DogGuide handbook

### Admin
- Dashboard, Walks, Create Walk, Live Map, Walkers (add + approve/reject), Owners, All Pets, Payments, Shop Manager, **Vets & Shop Owners** (create real logins + set/update their map location), **Notification & Email History**, Analytics, Profit Management

### Infrastructure
- Live GPS via Supabase **broadcast** channels (not Presence — Presence had a staleness bug)
- Realtime chat, direct messages inbox
- Real transactional email (welcome, walker approved/rejected, account-created-by-admin, password reset, payment receipts) — all logged to `email_log`
- Real push notifications (FCM), web + native Android
- Scheduled reminders: ~30 min before a booking, walker-hasn't-gone-online nudge, stale-pending-booking follow-up, unpaid-booking follow-up
- Resilient networking: `src/lib/supabase.ts` retries through a `/sb` proxy (`vercel.json` rewrite) when a phone/network can't reach `*.supabase.co` directly; auth uses `processLock` (not the browser Web Locks API) to avoid a `Lock "..." was released` failure mode

---

## Live finding, booking and tracking (2026-09-19)
See `docs/REALIGNMENT.md` for the diagnosis, system map and two-phone test.
- Walker "Go Online" broadcasts GPS on realtime channel `walkers-live`; owners read it in `useWalkersLive` (`src/lib/liveTracking.ts`).
- Walkers are hidden from owners until an admin approves them (`walker_status = 'active'`).
- A groomer is an approved walker with `pricing.grooming` set.
- Booking uses `createWalkAsync` (waits for the DB). The chosen length is stored as `DURATION:<min>` in `walks.notes`.
- Planned route: `planLoopRoute` in `src/lib/routing.ts`. Walker's app-wide walk session broadcasts it on `walk-live-<walkId>`.
- Chat SQL and realtime publication: `supabase/migrations/20260919_realign_chat_and_live.sql`.
- Pets/photos SQL: `supabase/migrations/20260920_dogs_photos_permissions.sql`. `dogs.age` was an integer, which silently rejected fractional ages. `createDog` is now awaited and retries with whole years.
- Chat inbox: `src/lib/directMessages.ts` (conversations, unread counts kept per device).
- Turn-by-turn: `src/lib/guidance.ts` (pure, tested), `src/hooks/useTurnByTurn.ts`, `src/lib/voice.ts` (phone speech), `src/components/map/GuidanceBanner.tsx`.
- Nearby vets: `src/lib/nearbyPlaces.ts` (OpenStreetMap, sparse in Zambia) merged with vets registered on PawFleet.
- Grooming packages and plans live in `src/lib/groomingPackages.ts`; illustrations in `src/components/ui/GroomIllustrations.tsx`.

## Security & data-integrity incidents (2026-09)
- **Critical — closed**: an accidentally-run foreign SQL script left `public.users` with a permissive write policy — anon key could INSERT a row with `role: 'admin'`, no auth required. Fixed in `supabase/migrations/20260922_close_users_write_hole.sql` (drops all write policies, reinstalls ownership-based ones: self can create/keep only an owner/walker row, never admin; an admin can write any row). Two stray plaintext passwords found in the unused `password` column were cleared. Key was **not** rotated (owner's explicit call — accepted risk, don't re-raise unless asked).
- **Orphaned accounts — closed**: `users.phone` was `UNIQUE NOT NULL`, and `register()`/`login()`'s auto-heal path silently swallowed insert errors on a duplicate phone, leaving real Supabase Auth logins with no `public.users` row (surfaced as "your account or your dog's profile is not fully saved yet"). Fixed by `supabase/migrations/20260924_phone_not_unique.sql` + retry-once-with-null-phone logic in `AppContext.tsx`. 7 real accounts repaired directly.
- **"Add Walker" never created a real login — closed**: `addUser()` used to do a client-side `users` insert with `password: ''` hardcoded, discarding whatever the admin typed. Replaced with `api/admin-create-account.js` (creates a real Supabase Auth login + profile, used by both Admin → Walkers and Admin → Vets & Shop Owners).

## Launch round (2026-11-26)
- Android app calls the server through `apiUrl()` (`src/lib/api.ts`). Never use a bare `fetch('/api/...')`: inside the APK it hits `https://localhost`.
- Every `api/*` handler uses `cors()` from `api/_lib/server.js` (allows the site and `https://localhost`). `getCaller(req)` = who is calling, from their token.
- Function count is 11 of Vercel Hobby's 12 (create/verify-payment merged into `payments.js`).
- Home Services = three photo plan cards (`src/lib/plans.ts`, **sample pricing**, photos in `public/images/plans/`), opening `/owner/plans/:planId`. Plan checkout (purchases, sessions, availability) is the next phase; design is in the launch plan.
- Shop redesigned (white cards, Sort + Filter sheets). Cart items carry the product photo.
- Marketplace → **Adopt a Pet** (`/owner/adopt`, `src/lib/adoption.ts`); admin review at `/admin/adoptions`.
- Breeds: `src/lib/breeds.ts` + `components/ui/BreedPicker.tsx` (any typed breed allowed; Boerboel, Africanis added).
- Walk safety: starting a walk asks for a pickup photo (`components/walker/PickupPhotoSheet.tsx`); both sides can send photos in the walk chat (`src/lib/walkPhotos.ts`). Ending a walk from any screen saves the route (`takeWalkTrail`).
- Android back button: `components/AndroidBackButton.tsx` (`@capacitor/app`). Release signing reads `android/keystore.properties` (gitignored).

## Accounts and approvals (2026-11-26)
- `users.approvals` jsonb: `walking` / `grooming` / `training` / `breeder`, each `applied | approved | rejected`. Helpers in `src/lib/providers.ts` (`isWalker`, `isGroomer`, `isTrainer`, `isBreeder`). Never test `pricing.grooming` or `trainerStatus` directly any more.
- Walkers and groomers are both `role = 'walker'` in the database (shared jobs/chat/tracking); the approvals decide what they see. A grooming business never gets walk jobs; a walker is not a groomer until approved.
- Breeders/shelters are `role = 'owner'` with `approvals.breeder`; only approved ones can insert into `adoption_listings` (RLS).
- Trigger `trg_users_protect` (`20261126_service_approvals.sql`): non-admins cannot change their own role, walker_status, subscription dates, or set an approval to approved/rejected. Admins, the service role and the SQL editor can.
- Admin review: `/admin/applications` (walkers, groomers, trainers, breeders, per-service on/off). Vets and shops are still admin-created in `/admin/partners`.
- Deploy order matters: run the migration **before** deploying code that reads `approvals`, or nobody counts as approved.

## Fair use, caching, iPhone layout (2026-11-28)
- AI Health Assistant limits: 10 questions/day and 25,000 tokens/month per person (admins unlimited), env `AI_DAILY_QUESTIONS` / `AI_MONTHLY_TOKENS`. Usage in `ai_usage` (`20261128_ai_usage.sql`), added by RPC `pf_ai_record`. If the table is missing the endpoint doesn't block anyone.
- Picture cache: `public/firebase-messaging-sw.js` also caches images (stale-while-revalidate, 250 max), registered on the website from `main.tsx` (not in the native app). Unique-name uploads use `cacheControl: '31536000'`.
- Floating buttons above the bottom menu use `.above-nav` / `.above-nav-tight`, and page padding uses `.pb-nav` (`index.css`). These include the iPhone home-bar inset. Never use a bare `bottom-20` for that.
- Community: no more base64 photos saved in posts (upload or show an error); broken pictures hide; a failed load shows "Try again" (it used to show a misleading "table not set up" SQL banner).

## Admin sections, applications, payouts, trails (2026-11-28)
- Application forms (breeder / grooming / training) are defined once in `src/lib/applications.ts` and rendered by `components/apply/ApplicationForm.tsx`. Used by: Register (Groomer, **Trainer**, Breeder kinds), `ApplyServiceSheet` (walker dashboard: also offer grooming, become a trainer), Adopt a Pet's breeder application. Answers live in `users.applications[service]`; photos are uploaded to `avatars/nrc/apply-...` and never stored as data URLs in the row.
- Admin sections: `/admin/groomers`, `/admin/trainers`, `/admin/breeders` = `Applications` with `lock`; `/admin/applications` still shows everything.
- Shop payouts: Shop Manager → "Shops & payouts" (`/admin/shop?tab=shops`, `pages/admin/ShopPayouts.tsx`). Owed = online (`mobile_money`) shop_orders - `shop_payouts`. Pay on delivery is never owed. Recording a payout notifies the shop.
- Trails: table `trails`, filled by trigger `trg_walks_trail` when a walk completes with `route_points` (backfilled once). Admin page `/admin/trails`.
- `20261128_admin_sections.sql` must run **before** deploying: sign-up writes `users.applications`.

## Pending / Known Issues
- [ ] iOS: needs a Mac + an **active** Apple Developer account ($99/yr) before `npx cap add ios` + Xcode work can start
- [ ] WhatsApp OTP: needs the owner to set up a WhatsApp Business API account first
- [ ] Main JS bundle (~575 KB, after making Firebase, PostHog and Layout load on demand) and the MapLibre GL chunk (~1.05 MB) are both over Vite's 500 KB warning threshold
- [ ] `android/` folder not committed to git (too large; build locally with Android Studio, `npx cap sync android` before each build)
- [ ] Google Play submission not yet done (APK has been built and tested locally, not published)
- [x] Everything in "Security & data-integrity incidents" above

---

## Database migrations
Source of truth is `supabase/migrations/*.sql`, run manually in the Supabase SQL Editor (no CLI link is configured — `supabase/.temp/linked-project.json` points at an unrelated old project, ignore it). Most recent ones, in order:
- `20260919_realign_chat_and_live.sql`, `20260920_dogs_photos_permissions.sql`
- `20260922_close_users_write_hole.sql` — security fix, see above
- `20260924_phone_not_unique.sql` — orphaned-account fix, see above
- `20260926_password_reset_tokens.sql` — forgot-password tokens (server-only table)
- `20260927_email_log.sql` — email send history (server-only table)
- `20261126_payment_intents.sql` — one row per Lenco prompt; `shop_orders.payment_reference`
- `20261126_adoption_listings.sql` — Adopt a Pet listings, admin approval enforced by RLS + trigger
- `20261126_chat_security.sql` — walk chat readable only by owner/walker/admin; `chat-images` bucket
- `20261126_service_approvals.sql` — per-service approvals + `trg_users_protect`
- `20261128_ai_usage.sql` — AI assistant fair-use counter
- `20261128_shop_marketplace.sql` — shop products editable only by their shop; orders private
- `20261128_admin_sections.sql` — users.applications, shop_payouts, trails + trigger

When adding a new one: write the file, tell the owner the exact SQL to paste into the SQL Editor, and don't assume it's applied until they confirm (there's no automated way to run it from here).

---

## App Store Roadmap
### Step 1 — PWA (Done ✅)
Visit https://www.pawfleetapp.com on Android Chrome → ⋮ menu → "Add to Home Screen". iOS Safari web push only works 16.4+ and only when opened from the home-screen icon, never a plain tab.

### Step 2 — Google Play (Android APK) — built & tested locally, not yet submitted
1. `npm run build` then `npx cap sync android`
2. Open `android/` in Android Studio → **Build** → **Generate Signed Bundle/APK** → AAB
3. Keep the keystore safe — losing it means you can't update the app
4. Upload AAB to Google Play Console, pay the $25 one-time developer fee, fill in the store listing, submit

### Step 3 — Apple App Store (iOS) — blocked on Apple Developer account
> Requires a Mac with Xcode.
1. `npx cap add ios`, `npx cap open ios`
2. Apple Developer Program membership ($99/year — covers building, TestFlight, push, and App Store submission, no extra fee)
3. Firebase iOS app + `GoogleService-Info.plist`, APNs key upload, Xcode Push Notifications capability
4. Bundle ID `zm.pawfleet.app`, archive → upload to App Store Connect → TestFlight → App Store review

---

## File Map (key files)
```
api/
  admin-create-account.js   ← admin creates a real login (walker/vet/shopowner)
  admin-history.js          ← admin-only read of notifications + email_log
  password-reset.js         ← forgot password, both steps
  payments.js               ← Lenco prompts + status (the only payment endpoint)
  send-email.js             ← app-facing email endpoint (auth-checked)
  _lib/email.js, _lib/server.js ← templates/sendTemplate, cors/getCaller/adminFetch
  cron/reminders.js         ← scheduled reminders (see Tech Stack)
  _lib/logEmail.js          ← shared email-log writer (underscore = not its own route)
src/
  components/
    map/LiveRouteMap.tsx    ← MapLibre GL map, marker kinds incl. 'shop'
    map/PinDropPicker.tsx   ← full-screen drag-to-pin location picker
    account/ChangePassword.tsx, DeleteAccount.tsx
  context/
    AppContext.tsx          ← all data fetching + mutations (large — read before editing)
  hooks/useMyLocation.ts    ← GPS / typed-address / pin location, shared
  lib/
    supabase.ts             ← client, resilient fetch + proxy fallback, processLock
    netguard.ts             ← sessionState(), OFFLINE_MESSAGE, isNetworkFailure
    geocode.ts               ← Nominatim forward/reverse geocoding
    liveTracking.ts, routing.ts, voice.ts, jobs.ts, groomingPackages.ts
  pages/
    admin/Partners.tsx      ← Vets & Shop Owners onboarding + map pins
    admin/History.tsx       ← Notification & Email History
    ForgotPassword.tsx, ResetPassword.tsx
    owner/RequestWalk.tsx, HomeGrooming.tsx, VetBooking.tsx, Shop.tsx
  types/index.ts             ← all TypeScript types
vercel.json                  ← rewrites (incl. /sb proxy), cache headers, cron schedule
.github/workflows/reminders-cron.yml ← free 15-min trigger for the reminders cron
CLAUDE.md                    ← this file
```

---

## Deploy Checklist
- [ ] `npx tsc --noEmit -p .` — check for **new** errors only (a handful of pre-existing ones in `MapView.tsx`, `Badge.tsx`, `walker/MyWalks.tsx`, `utils/seed.ts` are known and unrelated)
- [ ] `npx vite build` passes
- [ ] New/changed `supabase/migrations/*.sql`? Tell the owner the exact SQL to run — don't assume it's applied
- [ ] `git add <files> && git commit -m "..."` (end message with the required Co-Authored-By line)
- [ ] `git push origin main`
- [ ] `vercel --prod --yes`
- [ ] Verify live at https://www.pawfleetapp.com
