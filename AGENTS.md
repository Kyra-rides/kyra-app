# kyra-rider — AGENTS.md

This is the **Rider** app. The user of this app is Aanya — a woman commuting
in Bengaluru. Build only features that a *rider* does on her own phone.

## Belongs here
- Sign-up / verification flows (phone, OTP, Aadhaar, live selfie)
- Pickup/dropoff entry, fare display, ride request
- Driver-approaching tracking, in-ride map, ride OTP display
- Live trip sharing, SOS button (rider-side)
- Rating, trip history, receipts, profile

## Does NOT belong here
- Anything a driver does → build in `../kyra-driver/`
- Anything Kyra ops staff does → build in `../kyra-admin/`

## Branches
Default to **`feat/shivansh`** (Shivansh's branch) for all feature work.
Switch to it and merge `main` before building:

```bash
git checkout main && git pull
git checkout feat/shivansh && git merge main
```

The other teammate branches (`feat/divyashri`, `feat/latisha`, `feat/dev`,
`feat/avni`) are reserved for future engineers; do not commit to them
unless explicitly asked. Never build features directly on `main`.

## Workspace context
For workspace-wide routing rules and strategy docs, see `../AGENTS.md`
and the parent `/Kyra/` folder.
