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
