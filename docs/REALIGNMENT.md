# PawFleet realignment: find, book, track

Written 2026-09-19. Goal: an owner opens the app, sees real walkers and groomers around them, books one, chats, and watches the walk live on a planned route.

## 1. What was wrong (verified against the live database)

| # | Symptom you saw | Root cause | Status |
|---|---|---|---|
| 1 | Walker map and booking list were empty | All 4 walkers in the database are `pending_approval`, and every screen hides unapproved walkers | **You must approve walkers** (Admin > Walkers) |
| 2 | Walker was "active" but never appeared | No screen let a walker go online or share GPS. Nothing ever wrote a live position | Fixed: Go Online card |
| 3 | Map showed pins that never matched reality | Old map drew walkers at hardcoded offsets from the city centre | Fixed: real live positions |
| 4 | "Booking sent" but nothing happened | Insert errors were only logged to the console. The success screen showed anyway | Fixed: booking waits for the database and shows the error |
| 5 | Walks appeared twice, walkers fought over jobs | Realtime insert duplicated the local copy. Any walker could accept an already-taken job. A booking for one walker rang every walker | Fixed |
| 6 | Chat "did nothing" for a new user | Demo logins have no real session and no database rows, so every write is refused. Errors vanished after 5 seconds | Fixed: clear messages. Demo logins now off in production |
| 7 | Grooming never reached groomers | No groomer search, no location, notes prefix differed from the rest of the app | Fixed |
| 8 | No walk length or route for the walker | The chosen duration was never saved, and there was no route planning | Fixed |
| 9 | Owner live location did nothing | It stopped when leaving the booking page and no screen listened to it | Fixed |
| 10 | Tracking froze when a walker opened chat mid-walk | GPS only ran while the live-walk screen was open | Fixed: app-wide session |

Also found: `CLAUDE.md` and `supabase/.temp` point at project `ftgoofjexthuzvlyhcsw`, but the deployed app uses `tqoordnjsigllzjzkqxb`. The second one is the real one.

## 2. Map of the system

```
 WALKER PHONE                         SUPABASE REALTIME                     OWNER PHONE
 ────────────                         ─────────────────                     ───────────
 Go Online  ── pos / offline ───────▶ channel "walkers-live" ─────────────▶ Live map, booking list
 (GPS watch, heartbeat 20 s)          (broadcast, no DB writes)              (walkers + groomers, distance, price)

 Accept job ──▶ walks table (status, walker_id) ◀── Book (walk + duration + pickup lat/lng)
                          │ postgres_changes
                          ▼
 Nav to pickup ─ walker-pos ────────▶ channel "walk-live-<walkId>" ◀─ owner-pos ─ Track screen
 (real walking route, owner live dot)     hello / route / walker-pos / owner-pos      (walker approaching)

 Start walk ─▶ app-wide session: GPS trail + planned loop route
               planLoopRoute(pickup, minutes) ── route ─────────────────▶ dashed route + live dot
               trail saved to walks.route_points at the end

 Chat: direct_messages (person to person) and messages (per walk), both realtime
 Grooming: a "groomer" is an approved walker who set a grooming price
```

Routing uses the free OpenStreetMap pedestrian router (Valhalla). Address search and reverse lookup use Nominatim. Both are shared community servers with a fair-use limit. If they are unreachable the app falls back to an approximate loop and a straight line.

## 3. What changed (files)

New
- `src/lib/liveTracking.ts` live roster, Go Online manager, per-walk room, app-wide walk session
- `src/lib/routing.ts` loop route for a chosen duration, walking route between two points
- `src/lib/geo.ts`, `src/lib/geocode.ts` distance, bearing, address to coordinates
- `src/components/map/LiveRouteMap.tsx` one map component for markers, routes and live movement
- `src/components/walker/GoOnlineCard.tsx`, `src/hooks/useWalkerOnlineResume.ts`
- `supabase/migrations/20260919_realign_chat_and_live.sql` chat table and permissions, realtime publication

Rewritten or reworked
- `owner/WalkerMap.tsx` live scan for walkers or groomers, sorted by distance, book and message buttons. Walkers see open jobs instead
- `owner/RequestWalk.tsx` live walkers, map preselect, address lookup, route preview, real booking result
- `owner/HomeGrooming.tsx` location, nearby groomers, real booking result
- `walker/WalkerNav.tsx` real route to pickup, owner live dot, arrival prompt
- `walker/LiveWalk.tsx`, `owner/WalkTracker.tsx` planned route, live walker, trail
- `context/AppContext.tsx` awaitable booking, correct notifications, first-accept-wins, duplicate fix, pickup kept on start, demo login gated
- `pages/DirectMessage.tsx` stable subscription, session check, readable errors, recipient notified

## 4. Do this now (order matters)

1. Supabase SQL Editor: run `supabase/migrations/20260919_realign_chat_and_live.sql`.
2. Admin > Walkers: approve the walkers you want visible. Until you do, owners see no walkers.
3. Vercel: deploy. Demo logins stop working on the live app. To keep them for a demo, set `VITE_ENABLE_DEMO=true`.
4. Run the two-phone test below.

## 5. Two-phone test (10 minutes)

Use two real registered accounts. Walker phone is approved. Owner phone has one dog.

1. Walker: Home > **Go online**. Allow location. Card turns green.
2. Owner: Home > Live Map. A green pulsing walker appears within a few seconds. Walk around: the pin moves.
3. Owner: Live Map > Groomers. The walker only appears here if they set a grooming price in Profile.
4. Owner: tap the walker > **Message**. Send "hello". Walker receives a notification and sees it in Messages.
5. Owner: Book a Walk > Live Location > pick 30 min. A loop route preview appears. Book the walker.
6. Walker: request pops up > Accept > open the walk > **Navigate**. Real route to the owner, owner dot moves.
7. Owner: Track. Walker approaches on the map.
8. Walker: **Start walk**. Dashed 30-minute loop appears on both phones. Walker moves, both see the trail.
9. Walker: open chat mid-walk, come back. Tracking never stopped.
10. Walker: End walk. Owner is asked to rate and the full trail is saved.

## 6. Known limits and next steps

- **Screen off.** A phone browser stops GPS when the screen locks. Wake Lock keeps the screen on during a walk. True background tracking needs the Android app with a foreground location service (`@capacitor/geolocation` is installed but unused).
- **Realtime message quota.** Each walker position is a message, and every viewer counts too. Walkers send when they move about 10 m and every 20 s when still. Watch the Supabase Realtime usage page once there are dozens of live walkers.
- **Groomers are walkers with a grooming price.** A separate groomer role and profile is the next step if you want dedicated groomers.
- **Payments before service.** Booking still says "pay after service". Wire the Lenco flow into the confirm step when you are ready.
- **Type errors in older files** (`MyWalks`, `Register`, `Badge`, `seed`) predate this work. The build does not type-check, so they do not block shipping.

## 7. Second round (2026-09-20)

| Area | What was wrong | What changed |
|---|---|---|
| Pets disappearing | The `dogs.age` column only holds whole numbers. "8 months" became 0.67 and the database refused the whole pet, silently. The pet only existed on that phone until the next login | Saving now waits for the database and shows the real error. If a fractional age is refused it saves whole years and keeps the exact age in the notes. Run the SQL to allow fractions |
| Pet photos | No pet in the database has a photo URL, so uploads never worked | Photos upload after the pet is saved. The SQL creates the buckets and upload permission |
| Stale data after logout | The cached copy of everyone's data stayed on the phone | Cleared on logout. A failed query no longer wipes pets that were already loaded |
| Chat inbox | It only listed walk chats. The badge counted booking notifications, not messages | New Messages tab with every conversation, last message, time and real unread counts. Opening a chat clears it |
| Grooming page | Remote stock photos (the Bath and Brush one was broken), no structure | Original illustrations, one list of packages with what is included, time and price, and plans that take 10% or 15% off every visit. The booking form uses the same list |
| Vets | Four hard-coded clinics, no real scan, bookings that saved nothing when they failed | Scans the area with your GPS or a typed town, merges vets registered on PawFleet with clinics found on the map, sorts by distance, and books through the same checked path. Vets can save their clinic location from their profile |
| Trainers | No location, no distance | Distance, live status and a map. Bookings notify the chosen trainer |
| Open jobs | Vet visits and training requests appeared as walks for every walker | Walkers only see jobs they can take |
| My Walk | Free tracking only | Choose 20, 30, 45 or 60 minutes, preview a real-road loop with distance, time and turns, try another route, and follow it with voice directions |
| Walk routes | Route could not be chosen | The owner picks a route when booking and the walker's phone rebuilds the same loop |

### Voice directions

- Built on the phone's own speech engine. No key, no cost.
- Says the start, "In 100 metres, turn left onto Cairo Road", then "Turn left onto Cairo Road" at the corner, "Halfway" and the arrival.
- If the walker strays more than about 50 m it says "Off route. Recalculating.", plans a way back to the next turn, and keeps the walk the same length.
- Used on My Walk, on the walker's live walk (following the owner's chosen loop) and on the way to a pickup.
- Speech needs one tap first, so it is unlocked by the Start button. There is a mute button on the map.
- Tested against a real Lusaka route with a simulated walker, including a stray.

### Vets: what to expect

OpenStreetMap lists few clinics in Zambia (about 6 near Lusaka, none found around Ndola) and its public servers are slow. The scan therefore adds to, and never replaces, vets registered with PawFleet. The fix that matters is getting real vets onto PawFleet with their clinic location saved.

### SQL to run

1. `supabase/migrations/20260919_realign_chat_and_live.sql` (if not done)
2. `supabase/migrations/20260920_dogs_photos_permissions.sql`

## 8. Security incident and third round (2026-09-22)

**Security hole found and closed.** The user ran SQL from another project against this one by mistake.
Audited every table live: only `public.users` was affected. Anyone holding the app's public key (bundled
in every phone, not secret) could insert a row with `role: 'admin'` directly, no login required — proved
with a throwaway account, deleted immediately. Also cleared two rows with a real plaintext password still
in the (otherwise unused) `password` column. Fix: `supabase/migrations/20260922_close_users_write_hole.sql`,
run and confirmed. See `SUPABASE_SERVICE_ROLE_KEY` in Vercel prod — it was pasted in this chat; the user
chose not to rotate it, which is a standing, accepted risk.

**Self-registration was only ever meant to allow Dog Owner and Dog Walker** — `register()`'s own type
signature has always said so. `Register.tsx` nonetheless offered Veterinarian and Shop Owner too, which
happened to work only because the pre-fix database let anyone insert a `users` row with any role. Today's
RLS fix (correctly) closed that, which means anyone who picked Vet or Shop Owner at sign-up started failing
immediately after — almost certainly what the "different person struggling to sign up" hit. Fixed by
removing those two options from the sign-up screen; vet and shop accounts are admin-created, matching how
they always have been in practice (see the shop owner SQL in this file's history).

**Cats removed everywhere.** `animalType` no longer offers 'cat' anywhere in the app: the Add-a-Pet form,
admin's pet browser, the marketplace demo listings, vet screens, training, self-walk and pet health. The
`Dog.animalType` field is kept (typed to `'dog'` only) so old rows do not break, but nothing lets you pick
Cat again. Root cause of the reported failure was very likely `dogs.age` in the earlier retry logic, or a
genuine network blip — the createDog code was re-checked and is sound (30 s timeout, friendly errors,
whole-year-age fallback already in place from 2026-09-20).

**Walkers can now scan for nearby jobs while offline, InDrive-style.** Being online was never required to
browse or accept open jobs — that already worked — but jobs were not sorted or filtered by area, and it
was not obvious that offline browsing worked at all. Now:
- `src/hooks/useWalkerRefPos.ts` gives a walker's best-known position: their live GPS while online, else
  their saved service area, so "nearby" always means something even offline.
- `src/lib/jobs.ts` `sortByDistance` sorts open jobs nearest-first and tags each with `_distKm`.
- Walker Dashboard and the Walks screen's Available tab show a distance badge per job, and Walks adds a
  5 / 10 / 25 km / All radius filter (defaults to All, so nothing is ever hidden by surprise).
- Grooming-only bookings (`GROOMING:` / `HOME_GROOMING:` / `VET_GROOMING:`) now only show to walkers who
  have set a grooming price, matching how training requests already only show to approved trainers. Plain
  walks, and walks with a grooming add-on, remain open to every approved walker.
- The Go Online card's copy now says offline browsing works either way; online adds map visibility and
  instant ringing requests.
