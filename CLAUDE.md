# PawFleet — Claude Reference File
> Keep this file open. Update it whenever a feature ships, a bug is found, or a decision is made.

---

## Project Identity
| Key | Value |
|---|---|
| App | PawFleet — dog walking management platform for Zambia |
| Live URL | https://pawfleetapp2.vercel.app |
| GitHub | https://github.com/MubangaNazy/pawfleet.app2 |
| Vercel project | mubangachanda004-cryptos-projects / pawfleet.app2 |
| Supabase project ID | ftgoofjexthuzvlyhcsw |
| Currency | Zambian Kwacha (K / ZMW) |
| Location | Lusaka, Zambia (default map center -15.4167, 28.2833) |

---

## Tech Stack
| Layer | Choice |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS (forest green brand) |
| Database | Supabase (PostgreSQL + Realtime) |
| Maps | **Leaflet + OpenStreetMap** (react-leaflet) — FREE, no API key |
| Mobile | Capacitor (Android wrapper in `android/`) |
| PWA | Manifest at `public/manifest.json` — installable from Chrome |
| Hosting | Vercel (auto-deploy from GitHub main) |
| Deploy cmd | `vercel --prod --token <token> --scope mubangachanda004-cryptos-projects --yes` |

---

## Brand / Design Rules
- **Colors only**: `#1B4332` (dark), `#2B8A50` (primary), `#52B788` (light), `#EBF5EF` (bg)
- No violet, blue, indigo except semantic: amber = warnings/pending, red = danger/error
- Logo component: `src/components/ui/PawFleetLogo.tsx` — do NOT change SVG paths
- Bottom nav: Home | Schedule | Track | Shop | Profile (active = dark green pill)

---

## Roles & Demo Credentials
| Role | Phone | Password | Route |
|---|---|---|---|
| Admin | 0977000001 | admin123 | /admin |
| Walker | 0977000002 | walker123 | /walker |
| Owner | 0977000004 | owner123 | /owner |
| Shop Owner | 0977000006 | shop123 | /shopowner |

Real users register via /register (Supabase Auth email/password).

---

## Features Shipped ✅
### Owner
- Dashboard (hero, circular actions, walker cards)
- Book a Walk (Instant/Scheduled, duration pills, walker list in ZMW)
- Schedule (horizontal week strip)
- WalkTracker (Leaflet OSM + stats bar + Chat/Call/Route)
- Profile (spending card), Shop + Cart, Chat, Dog profiles, History

### Walker
- MyWalks (Available tab for self-acceptance + Assigned/Active/Completed)
- LiveWalk (Leaflet OSM GPS broadcast + Wake Lock keeps screen on)
- Schedule, Earnings (with **Confirm Payment Received** button), Badges, Profile
- DogGuide (7-section handbook with read-tracking progress)

### Admin
- Dashboard (charts), ShopManager (CRUD), Analytics, Walkers (add modal), Owners, Walks, Payments

### Shop Owner
- Dashboard, MyProducts, Orders, Notifications

### Infrastructure
- Live GPS: walker broadcasts via Supabase channel `walk-location-{walkId}`, owner subscribes
- Realtime chat via Supabase postgres_changes on messages table
- Payment confirmation: walker can confirm receipt; stores `walker_confirmed` on payments row
- PWA installable from Chrome on Android

---

## Pending / Known Issues
- [ ] **RLS CRITICAL — passwords exposed**: anon key returns plain-text passwords from users table → run SQL fix below
- [ ] **RLS HIGH — anon can INSERT walks**: no write policy on walks table → run SQL fix below
- [ ] Walker payment confirmation needs `walker_confirmed` column in Supabase → run SQL below
- [ ] Shopowner role needs CHECK constraint updated → already done if SQL below was run
- [ ] Google Maps API key removed — now using Leaflet (free)
- [ ] `android/` folder not committed to git (too large, build locally with Android Studio)
- [ ] iOS not buildable on Windows — needs Mac + Xcode

---

## Supabase SQL to Run (one-time setup)
Go to Supabase Dashboard → SQL Editor → paste and run:

```sql
-- 1. Allow shopowner role in CHECK constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'walker', 'owner', 'shopowner'));

-- 2. Insert shopowner demo user
INSERT INTO users (id, name, phone, email, password, role)
VALUES ('a1b2c3d4-0006-0006-0006-a1b2c3d40006','Demo Shop Owner','0977000006','shopowner@pawfleet.zm','shop123','shopowner')
ON CONFLICT (id) DO NOTHING;

-- 3. Walker payment confirmation column
ALTER TABLE payments ADD COLUMN IF NOT EXISTS walker_confirmed boolean DEFAULT false;

-- 4. FIX CRITICAL RLS: restrict walks INSERT to authenticated users only
ALTER TABLE walks ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "anon_cannot_insert_walks"
  ON walks FOR INSERT TO anon WITH CHECK (false);

-- 5. FIX CRITICAL RLS: hide passwords from anon (use a DB function for login instead)
--    Short-term: Supabase column-level security on password field
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- Allow SELECT for app login (needed for plain-text demo fallback)
-- Long-term fix: migrate all users to Supabase Auth and remove plain-text passwords
```

---

## ⚠️ RLS Security Audit (2026-06-08)
| Table | Anon SELECT | Anon INSERT | Anon UPDATE | Anon DELETE | Risk |
|---|---|---|---|---|---|
| users | ✅ Returns rows incl. **passwords** | ✅ Blocked by role CHECK | ⬛ Returns empty (safe) | ⬛ Returns empty (safe) | **CRITICAL** |
| walks | ✅ Returns [] (blocked) | ⚠️ Allowed (only FK stops it) | ⬛ Returns empty (safe) | ⬛ Returns empty (safe) | **HIGH** |
| payments | ✅ Returns [] (blocked) | Not tested | Not tested | Not tested | OK |
| dogs | Not tested | Not tested | Not tested | Not tested | Unknown |

**Action required**: Run the SQL above in Supabase SQL Editor.

---

## App Store Roadmap
### Step 1 — PWA (Done ✅)
- Visit https://pawfleetapp2.vercel.app on Android Chrome
- Tap ⋮ menu → "Add to Home Screen"
- Works offline-capable, installable

### Step 2 — Google Play (Android APK)
1. Install **Android Studio** on Windows
2. Open `android/` folder in Android Studio
3. In project root: `npx cap sync android` (syncs latest web build)
4. **Build** → **Generate Signed Bundle/APK** → choose AAB
5. Create a keystore (keep it safe — losing it means you can't update the app)
6. Upload AAB to **Google Play Console** (play.google.com/console)
7. Pay $25 one-time developer fee
8. Fill in store listing, screenshots, privacy policy URL
9. Submit for review (2–7 days)

### Step 3 — Apple App Store (iOS)
> Requires a Mac with Xcode — cannot build from Windows.
1. Add iOS platform: `npx cap add ios`
2. Open in Xcode: `npx cap open ios`
3. Set your Apple Developer account ($99/year)
4. Set bundle ID: `zm.pawfleet.app`
5. Archive → Upload to App Store Connect
6. Submit for TestFlight review, then App Store review (1–3 days)

### Capacitor Sync (run before every build)
```bash
npm run build          # build the Vite app
npx cap sync           # copy dist/ into android/ and ios/
npx cap open android   # open Android Studio
```

---

## File Map (key files)
```
src/
  components/
    ui/PawFleetLogo.tsx     ← brand logo SVG (don't change paths)
    ui/Badge.tsx            ← StatusBadge, PaymentBadge, RoleBadge
    layout/Layout.tsx       ← role-aware shell + bottom nav
  context/
    AppContext.tsx           ← all data fetching + mutations
    ShopContext.tsx          ← shop product/order state
  pages/
    Login.tsx               ← demo cards + auth fallback
    walker/
      LiveWalk.tsx          ← GPS broadcast (Leaflet)
      DogGuide.tsx          ← 7-section handbook
      Earnings.tsx          ← payment confirm flow
    owner/
      WalkTracker.tsx       ← live GPS subscriber (Leaflet)
    shopowner/
      Dashboard/Products/Orders/Notifications
    admin/
      ShopManager/Analytics/Walkers/Owners/Payments/Walks
  types/index.ts            ← all TypeScript types
CLAUDE.md                   ← this file
```

---

## Deploy Checklist
- [ ] `npm run build` passes with no errors
- [ ] Supabase SQL fixes applied
- [ ] `git add <files> && git commit -m "..."` 
- [ ] `git push origin main`
- [ ] `vercel --prod --token <token> --scope mubangachanda004-cryptos-projects --yes`
- [ ] Verify live at https://pawfleetapp2.vercel.app
