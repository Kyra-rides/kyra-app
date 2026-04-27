# FEATURES.md — Kyra First Working Version

---

## 1. Who is the primary user?

**Aanya** — a working woman, mid-20s to early 40s, commuting daily in Bengaluru
by auto, metro, or bike-taxi.

Her real problem isn't price or traffic. It's that every ride is a small
negotiation with her own safety and dignity. Male drivers stare in the rear-view
mirror, refuse short rides, deviate from the route, comment on her clothes, drive
recklessly, take calls they shouldn't. The metro is crowded and unsafe at night.
The bus is worse. Every day she pays a tax — in alertness, in time, in two
cancelled Olas before one finally accepts — just to get to work.

She doesn't want a cheaper ride. She wants a ride where she doesn't have to
think about being a woman.

---

## 2. What is the single most important thing she should be able to do?

**Book a ride and travel with another woman who treats her with respect** —
no leering, no commentary, no haggling, no rejection, no detours. Just a normal
commute, like men have always had.

---

## 3 & 4. Features for a first working version

- [ ] **Verified Women-Only Onboarding**
  Confirms via Aadhaar and a live selfie that every rider and every driver on the
  platform is a woman, so the women-only promise is a fact, not a marketing claim.

- [ ] **Book a Ride**
  Lets Aanya enter where she's going, see the flat fare upfront, tap once, and have
  a verified woman driver assigned to her within 90 seconds — no negotiation, no
  surge, no "where do you want to go?" before the driver agrees.

- [ ] **Ride OTP**
  Generates a short code the rider shares with the driver only at pickup, so the
  ride cannot start until the right driver is confirmed in person — prevents
  impersonation, scam pickups, and silent driver swaps.

- [ ] **Live Trip Sharing**
  Automatically sends a real-time tracking link to her chosen emergency contacts
  the moment the ride starts and a "safely arrived" message the moment it ends —
  someone is always watching every ride, without her needing to remember.

- [ ] **SOS Emergency Button**
  One press held for 2 seconds alerts the Kyra safety team, sends a live-location
  link to her emergency contacts, and opens a line to police — all at once, even
  if the app is in her pocket.

- [ ] **Driver Earnings Dashboard**
  Shows each woman driver how much she earned today, this week, and this month, and
  tracks her daily platform-fee payment so she always knows where she stands.

- [ ] **Trip History & Receipts**
  Lets riders review past rides, download receipts for expense reports, and rate
  their driver after the trip.

---

## 5. Which are MVP and which can wait?

| Feature | Status |
|---|---|
| Verified Women-Only Onboarding | **MVP** |
| Book a Ride | **MVP** |
| Ride OTP | **MVP** |
| Live Trip Sharing | **MVP** |
| SOS Emergency Button | Important — ship in week 2–3 of pilot |
| Driver Earnings Dashboard | Can wait |
| Trip History & Receipts | Can wait |

### Why these are MVP

Kyra's safety promise rests on **prevention**, not reaction. The four MVP features
each block a different category of harm before it happens:

- **Verified Onboarding** — blocks the wrong people from being on the platform.
- **Book a Ride** — blocks the everyday friction that pushes Aanya back to Ola.
- **Ride OTP** — blocks impersonation and scam pickups at the moment of contact.
- **Live Trip Sharing** — blocks isolation; someone she trusts is watching every ride.

If all four work, the probability of ever needing the SOS button drops sharply.
That's the design intent.

### Why SOS is fast-follow, not MVP

SOS is the *reactive* layer — it activates when something has already gone wrong.
In a closed pilot (one zone, hand-picked drivers, ops team monitoring live rides),
the prevention layer carries most of the load. SOS still ships, just two to three
weeks after launch.

**Watch-out:** until SOS is live, the rider's emergency path is "call Kyra ops
manually" or "call 100." Keep the ops safety desk on 24/7 manual standby for the
entire pre-SOS window, and prioritize SOS as the very first post-launch ship.

### Why the rest can wait

The Earnings Dashboard and Trip History are useful but not load-bearing. A pilot
of 50 drivers and 1,000 riders can run for 8 weeks without them — drivers can be
paid via WhatsApp summaries, receipts can be emailed on request. Build them after
launch, based on what real users actually ask for first.
