# VARDAAN Enterprise

Industrial fleet, driver-safety, and IoT management platform. This repo is
being built in small, sequential, verified steps rather than all at once —
see the build order below.

## Build order

1. ✅ **Backend foundation** — Flask app factory, SQLAlchemy models (Role,
   User, Driver, Vehicle, Device), migrations wired up, `/api/health`.
2. ✅ **Frontend foundation** — Vite + React + Tailwind v4, the design
   system (tokens, Button/Card/Badge/StatusDot), the app shell
   (Sidebar/Topbar/theme toggle), routed to a sample Dashboard page.
3. ✅ **Auth, end to end** — JWT login on the backend, a login page and
   protected routes on the frontend, roles gating the sidebar.
4. ✅ **First real module: Fleet Management** — a protected CRUD API and a
   real Fleet page, full stack, no sample data.
5. ✅ **Devices** — second real module, same CRUD pattern, plus the
   `vehicle_id` link that connects the two.
6. ✅ **Drivers** — third module, narrower read access on purpose, plus
   Fleet's assigned-driver picker actually works now.
7. ✅ **Real-time layer (Phase 2 of the original roadmap)** — a real MQTT
   broker, a simulator standing in for hardware, and WebSocket pushing
   live device status into the UI without polling.
8. ✅ **Monitoring** — live status breakdown, a GPS map, and a raw
   telemetry feed, all fed by the WebSocket stream Devices already uses.
9. ✅ **Alerts** — the same telemetry stream, filtered to transitions
   worth surfacing and actually persisted, with acknowledge tracking.

## Quick start (four terminals now)

```bash
# 0. MQTT broker — install once, then leave it running in the background
#    macOS:         brew install mosquitto && brew services start mosquitto
#    Ubuntu/Debian: sudo apt install mosquitto && sudo systemctl start mosquitto
#    Windows:       installer at mosquitto.org, then start the service
#    Check it's actually up: mosquitto_sub -h localhost -t test &  then
#    mosquitto_pub -h localhost -t test -m hi  should print "hi".
#    Skipping this isn't fatal — the backend logs a warning and runs fine
#    without it, you just won't see live device updates.

# 1. backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # fill in real MySQL credentials
flask db init && flask db migrate -m "initial schema" && flask db upgrade
python seed.py                   # creates the 9 roles + one user per role
python run.py                    # → http://localhost:5000

# 2. simulator, in a second terminal (optional, but this is the point of
#    this step — without it, Devices just sits static)
cd backend && source venv/bin/activate
python simulate.py               # needs at least one device to exist first

# 3. frontend, in a third terminal
cd frontend
npm install
cp .env.example .env
npm run dev                      # → http://localhost:5173, redirects to /login
```

Log in as any seeded username (`owner`, `fleet_manager`, `driver`, etc.) —
password for all of them is printed by `seed.py` (`vardaan-dev-2026`).
That password, and the whole idea of every account sharing one password,
is dev-only — replace it with per-user credentials before this holds real
people's data.

## backend/

Flask + SQLAlchemy + MySQL. Boots clean, creates all 5 tables with no
errors (verified against SQLite; real migrations need a real MySQL
instance).

**Data model:** Role (the 9 roles from the spec) → User (login identity) →
Driver (an optional one-to-one *extension* of User, not a copy — license,
health/safety scores, and emergency contact live here so a non-driver
account never carries meaningless columns) → Vehicle (assigned driver,
registration/insurance/fitness data) → Device (edge hardware, optionally
mounted on a vehicle) → Alert (a persisted record of a telemetry
transition worth surfacing, described in its own section below). All
cross-entity foreign keys are nullable, because real fleets onboard
hardware and vehicles before they're paired up — and because an alert or
a device outliving the thing it was about should degrade cleanly, not
break.

**Auth** (`app/auth/`):
- `POST /api/auth/login` — username + password → JWT (role and username
  baked into the token claims) + user record. Same generic error for a
  wrong username and a wrong password, so the endpoint doesn't reveal
  which accounts exist.
- `GET /api/auth/me` — resolves the current user from the token; the
  frontend calls this once on load to restore a session.
- `role_required(*roles)` in `app/auth/decorators.py` — now protecting the
  three write endpoints in the Fleet API below.
- Access tokens last 12 hours (`Config.JWT_ACCESS_TOKEN_EXPIRES`). No
  refresh token yet — that's the natural next hardening step, deferred so
  this step stayed focused on the login round-trip actually working.
- CORS is now scoped to `CORS_ORIGINS` (defaults to the Vite dev origin)
  instead of allowing every origin.

**Fleet API** (`app/fleet/`) — the first real module, all under
`/api/fleet`:
- `GET /vehicles` — paginated list, optional `?status=` filter. Open to
  any authenticated role; there's no per-driver row filtering yet.
- `POST /vehicles`, `PATCH /vehicles/<id>`, `DELETE /vehicles/<id>` — all
  behind `role_required("owner", "administrator", "fleet_manager")`, the
  decorator from step 3 that had nothing using it until now.
- Registration numbers are checked for uniqueness with a real 409, not
  just the database's unique constraint surfacing as a raw 500.
- Assigning a vehicle to a driver validates the driver actually exists
  before writing the foreign key.

**Devices API** (`app/devices/`), under `/api`:
- Same CRUD shape as Fleet, but `role_required("owner", "administrator",
  "maintenance_engineer")` instead — the spec names maintenance_engineer
  as the role that manages hardware, so this deliberately isn't the same
  write-role list as Fleet.
- `status` uses the same four values as the frontend's `StatusDot`
  (`online` / `offline` / `warning` / `critical`), so nothing translates
  between what the API reports and what the UI can draw.
- A device can optionally link to a vehicle via `vehicle_id` — validated
  the same way Fleet validates `assigned_driver_id`.
- `last_heartbeat` updates for real now — see the real-time layer below.
  Nothing in this API writes it directly; the MQTT subscriber does.

**Drivers API** (`app/drivers/`), under `/api`:
- Deliberately narrower access than Fleet or Devices: reads need
  `role_required("owner", "administrator", "fleet_manager", "supervisor")`,
  not just any authenticated role, because health score, safety score, and
  emergency contact are more sensitive than a vehicle or device record.
  Writes stay at `owner` / `administrator` / `fleet_manager`, same as
  Fleet.
- `health_score` and `safety_score` are validated to whole numbers 0–100.
- Linking a Driver to a User login (`Driver.user_id`) is *not* exposed
  through this API's create/update — on purpose, not an oversight. This
  module manages the personnel record; login-linking is an Administration
  concern once real user management exists. `seed.py` still links the
  `driver` account to its Driver row directly, and that link shows up in
  read responses as `linked_user`.
- Deleting a Driver who's currently assigned to a vehicle was checked with
  real foreign-key enforcement on (SQLite doesn't enforce FKs by default,
  so earlier tests wouldn't have caught a problem here even if one
  existed) — it cleanly un-assigns the vehicle rather than blocking the
  delete or erroring.

**Alerts API** (`app/alerts/`), under `/api`:
- `GET /alerts` — open to any authenticated role, same reasoning as Fleet
  and Devices: a safety alert isn't sensitive the way a driver's health
  score is, and everyone from a driver to an owner has a reason to see
  one. Supports `?acknowledged=true|false`, and every response includes
  `unacknowledged_total` regardless of the filter, so a page can show
  "3 unacknowledged" without a second request.
- `POST /alerts/<id>/acknowledge` — restricted to `owner` /
  `administrator` / `supervisor` / `operator`. "Operator" is named in the
  spec specifically as the role that "responds to alerts," so it's in
  this list on purpose, not by coincidence.
- **No DELETE route exists for alerts, deliberately.** An alert is a
  safety and compliance record — acknowledging it is the only state
  change this API allows. Double-acknowledging returns a real 409 instead
  of silently succeeding, so two people racing to handle the same alert
  both get an accurate answer about who actually got there first.
- Alert generation lives in the MQTT subscriber, not this blueprint —
  see the real-time layer section below for how and why.

## Real-time layer (Phase 2 of the original roadmap)

This is the first piece that isn't a CRUD module — a real MQTT broker,
a simulator standing in for hardware that doesn't exist yet, and
WebSocket pushing updates into the UI as they happen.

**How data flows:** simulator (or, eventually, a real Raspberry Pi) →
publishes to `vardaan/devices/{id}/telemetry` on the MQTT broker → the
backend's subscriber (`app/realtime/mqtt_client.py`) updates that
Device's `status` and `last_heartbeat`, checks whether this transition is
alert-worthy, and if so writes an `Alert` row → emits `device:update` (and
`alert:new` when there's one) over WebSocket → the Devices page patches
that one row in place, Monitoring appends to its live feed, Alerts
prepends to its list. No polling anywhere in that chain.

**`app/realtime/mqtt_client.py`:**
- Subscribes to `vardaan/devices/+/telemetry` on startup and updates the
  matching Device on every message.
- Runs in its own background thread (paho-mqtt's `loop_start()`); every
  message handler explicitly opens `app.app_context()` since that thread
  has no Flask request context of its own to inherit.
- Rejects bad input without touching the database: an invalid status
  value, non-JSON payload, malformed topic, or a device ID that doesn't
  exist all get logged and dropped, not raised.
- **If no broker is reachable, this logs a warning and the app boots
  anyway** — `app.mqtt_client` is `None`, the REST API is entirely
  unaffected. Live telemetry is additive, not a hard dependency. Set
  `MQTT_ENABLED=false` in `.env` to skip it outright.
- **Alert detection only fires on the transition itself** — a device
  sitting at `critical` for ten straight messages produces one alert, not
  ten; `previous_status == new_status` is checked first and short-circuits
  everything else. Four types come out of this, all tied to a real signal
  rather than invented to match the spec's full alert list: an alcohol
  reading over 0.015%BAC, a pulse reading over 120bpm, any other device
  going critical, and any device going offline. Geofence violations,
  unauthorized access, and vehicle tampering aren't implemented — there's
  no geofencing, access-control, or tamper sensor behind any of them yet,
  and faking the alert without the sensor felt worse than leaving it out.

One real bug this surfaced in the data model, caught by the same
FK-enforcement check used for Vehicle/Driver/Device earlier: `Alert` only
declared its relationship to `Device` on the `Alert` side. Deleting a
Device that had an alert against it threw a raw `IntegrityError` — a 500,
not the clean 204 Vehicle and Driver deletes give when something still
points at them — because without `back_populates` on *both* sides,
SQLAlchemy has no way to know an Alert exists to detach before the delete
runs. Fixed by adding the reverse relationship on `Device`, matching the
pattern the other models already used, and re-verified the same delete
now succeeds and the alert survives with `device_id` set to `NULL`.
Went a step further while fixing it: `Alert.device_type` is now
snapshotted at creation instead of read live off the relationship, so an
alert still says what kind of device it was about even after that device
is long gone — an audit record shouldn't lose its own history just
because something it references got deleted later.

**`app/realtime/__init__.py`** — the WebSocket connection itself needs a
valid JWT in the `auth: { token }` payload the client connects with, the
same access token used for REST calls. No token, or a bad one, and the
connection is refused before it's ever accepted — live device data isn't
reachable through a side door just because it isn't a `/api/*` route.

**`simulate.py`** — publishes fake telemetry for every Device that
already exists, once every 4 seconds. Temperature, pulse, humidity, and
GPS devices get a plausible reading alongside their status; an alcohol
reading above 0.015%BAC or a pulse above 120bpm forces `critical`
regardless of anything else — the two readings where the number itself
should drive status, not the other way around. Status mostly stays put
and occasionally drifts to a neighboring
state, so watching it shows something changing instead of a wall of
constant green. This is genuinely a separate process from the backend —
run both, and confirmed (with real `mosquitto_pub`/`mosquitto_sub`, not
just Python-internal calls) that they talk to each other correctly
through the actual broker, not a mocked one.

One real bug this caught in its own first draft: the script tried to
disable its own (redundant) MQTT subscriber *after* calling
`create_app()` — too late, since that setting is only read once, at
import time. Left as written, it would have quietly run its own copy of
the subscriber alongside the real backend's, double-processing every
message it published. Fixed by setting the env var before the app import
instead of after, and re-verified the fix actually stops the redundant
subscription.

## frontend/

Vite + React 19 + Tailwind CSS v4. Verified: production build succeeds,
lint is clean.

**Design system** (`src/index.css`, `src/components/ui/`):
- Palette: graphite canvas, one restrained copper accent, three muted
  status colors (ok / warn / critical) — no bright saturated colors, per
  the spec's "minimal colors" direction.
- Type: Inter for UI (self-hosted via `@fontsource`, nothing calls out to
  Google Fonts at runtime — matters behind a factory or port's firewall),
  JetBrains Mono with tabular figures for data values so columns of
  numbers actually align.
- Dark/light: class-based, toggled in the top bar, persisted to
  `localStorage`, defaults to system preference.
- Signature motif: the live-status pulse (`StatusDot`) — reused for device
  heartbeat, alerts, and the top-bar connection indicator.

**Auth** (`src/auth/`):
- `AuthContext` — holds the current user, exposes `login()`/`logout()`,
  and on first load calls `/api/auth/me` with whatever token is in
  `localStorage` to restore a session across refreshes.
- `ProtectedRoute` — redirects to `/login` when there's no user; sends you
  back to where you were headed after a successful login.
- `Login` page — React Hook Form, matches the design system.
- **Sidebar is now role-aware**, not just build-aware: "Administration" and
  "Settings" are restricted to specific roles (`owner`/`administrator`,
  plus `fleet_manager` for Settings) and simply don't render for anyone
  else — a different treatment from the "Soon" items, which everyone sees
  but nothing routes to yet. Log in as `driver` vs `owner` to see the
  difference.
- Top bar shows the real signed-in username and role, with a working
  sign-out button.

**Fleet page** (`src/pages/Fleet.jsx`) — real data via TanStack Query, no
sample rows. A table of vehicles with status badges and assigned driver;
"Add vehicle" and the row-level edit/delete actions only render for
`owner` / `administrator` / `fleet_manager` — everyone else gets a
read-only table, matching what the API actually allows them to do.
Create/edit share one modal and one form (`src/components/ui/Modal.jsx`,
a new reusable primitive — the next module that needs a form dialog reuses
this rather than building its own).

**Devices page** (`src/pages/Devices.jsx`) — same pattern as Fleet,
reusing `Modal` and, for the first time, `StatusDot` on real data instead
of the Dashboard's sample rows. The "mount on vehicle" dropdown in the
form pulls live from `useVehicles()` in `lib/fleet.js` — the first place
two modules' data actually meet.

**Drivers page** (`src/pages/Drivers.jsx`) — matches the API's narrower
access: the page itself doesn't render (and the sidebar item doesn't even
show) for roles outside `owner` / `administrator` / `fleet_manager` /
`supervisor`. Health and safety scores render as color-coded badges
(≥80 ok, ≥50 warn, below that critical) — reusing `Badge`, not a new
component.

**Fleet's driver picker now actually works.** The "Assigned driver" field
was always accepted by the API but never existed in the Fleet form itself
until now — it pulls from `useDrivers()`, the same way Devices' vehicle
dropdown pulls from Fleet's. Only fetches when the signed-in role can
actually write to Fleet, so a role that can't use the field never fires a
doomed request for data it can't read either.

**`lib/errors.js`** — a `describeError()` helper, extracted now that the
same three-way distinction (no permission / can't reach the backend /
here's what the backend actually said) was about to be written a third
time across Fleet, Devices, and Drivers. All three pages use it now,
including the previous two, which got touched again for this.

**`realtime/SocketContext.jsx`** — connects once you're signed in (with
the same token used for REST calls), tears the connection down on
sign-out, and exposes real connection state. Two places actually use it:
- The top bar's "Live" indicator was hardcoded to always say online since
  it was first built, before there was anything real behind it — it now
  reflects the actual WebSocket connection, and says "Reconnecting…"
  instead of quietly lying if that connection drops.
- The Devices page listens for `device:update` and patches that one row
  directly in the TanStack Query cache — not a refetch of the whole list
  on every message, which would fight with the 4-second simulator cadence.

**Monitoring page** (`src/pages/Monitoring.jsx`) — the first page that's
genuinely new frontend work against infrastructure that already existed,
not a fourth CRUD module. Three panels, all from the same
`device:update` stream `SocketContext` already provides:
- A status-breakdown chart (first real use of **Recharts** — installed
  since the frontend-foundation step, unused until now) built from the
  *current* device list, so it's populated immediately, not waiting on
  live events.
- A live map (first real use of **Leaflet**, same story) plotting
  whichever devices have reported a GPS reading since the page opened.
  Leaflet's default marker icons don't resolve correctly through a
  bundler out of the box — confirmed the fix actually works by checking
  what the built bundle contains, not just that the build didn't error.
- A raw, reverse-chronological feed of incoming readings, capped at the
  last 50.
- **Deliberately holds no history from before the page was opened** —
  there's nowhere in the database that stores past readings, only the
  device's *current* status. Building that store felt like an Analytics
  concern, not a Monitoring one, so it's a named gap below rather than
  something bolted on here.

**Alerts page** (`src/pages/Alerts.jsx`) — unlike Monitoring, this one
*does* survive a refresh, since alerts are real rows in the database, not
just WebSocket events passing through. All/Unacknowledged toggle, a count
of what's still open, and an Acknowledge button that only renders for
`owner` / `administrator` / `supervisor` / `operator` — everyone else
sees the same alert with an "Open" badge instead, matching what the API
would actually let them do. New alerts arrive over the same socket
Monitoring listens on (`alert:new`, a sibling to `device:update`) and get
prepended live, whichever filter is currently active. Acknowledging
refetches on failure as well as success — if someone else acknowledges
the same alert a second earlier, the button doesn't just sit there having
silently done nothing; the row corrects itself to show who actually got
there first.

## Honest gaps, not just what's next

- **Dashboard still shows sample data.** It was built in step 2 as a
  design-system proof, before any real module existed to pull numbers
  from. Now that Fleet, Devices, and Drivers all have real data — and
  Devices has *live* data — wiring Dashboard to it is worth doing, just
  hasn't happened yet.
- **Monitoring has no memory.** It only shows telemetry received while
  the page happens to be open — refresh it and the feed and map both
  start empty again, even though devices kept reporting the whole time.
  No backend table stores readings, only each device's current status.
  That's a real gap, not a subtle one, and it's *why* it's a gap rather
  than a missing feature: persisting a full telemetry history is closer
  to what Analytics or Reports should own than something to bolt onto a
  live-status view.
- **Alerts has no de-duplication window.** A genuinely flaky sensor that
  flickers critical → online → critical every few seconds generates a
  fresh alert on every crossing — there's no "don't re-alert on the same
  device within N minutes" logic. Real hardware in Phase 3 will make this
  worth having; the simulator's random walk doesn't flicker fast enough
  for it to matter yet, which is exactly why it's easy to forget.
- **No list on any page — Fleet, Devices, Drivers, or Alerts — has a "load
  more" or page control on the frontend**, even though every one of those
  APIs already supports real pagination (`page`, `per_page`, capped at
  100). Past the first 20 results, the rest are simply invisible right
  now with no way to reach them. This has been true since Fleet in step
  4; building Alerts is just what made it obvious enough to write down.
- **The frontend bundle is at 899KB unminified, ~276KB gzipped.** Grew
  again with Alerts, as expected — still not urgent at this size, still
  the same fix later (code-splitting the heavier pages).
- **The real-time layer has no staleness detection.** A device is
  "offline" only when the simulator (or real hardware, later) explicitly
  says so — nothing notices if a device just stops publishing entirely.
  A real deployment needs a timeout sweep for that; simulating an
  explicit offline state was the simpler, honest choice for this step
  rather than building a background scheduler prematurely.
- **Seven of the spec's fifteen named modules still haven't been
  started**: Trips, Analytics, Reports, Notifications, Administration,
  Settings, Profile. Auth, Fleet, Devices, Drivers, Monitoring, and Alerts
  are real; Vehicle Management folded into Fleet. Real hardware (Phase 3)
  and analytics/multi-tenancy (Phase 4) are both still entirely ahead.

## Next up

No single obvious next step this time, unlike every prior one — worth
naming honestly rather than picking arbitrarily. Reasonable directions
from here: Dashboard finally wired to real data (four modules' worth now
exist to pull from), pagination UI to close the gap just named above, or
the next CRUD module (Trips). Whichever's actually most useful is a
better call made together than assumed.
