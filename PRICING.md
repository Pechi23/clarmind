# Stillnova — Premium pricing plan

Two auto-renewing subscriptions on the `premium` entitlement, both with a **7-day
free trial**: a **Monthly** and an **Annual** (annual ~50% cheaper per month, and
it collects a year upfront, which covers the recurring AI cost).

**These prices are set in the stores, not in the app.** Enter them per country in
App Store Connect and Google Play Console; RevenueCat then shows the local price
automatically (the paywall already reads it). No app change or rebuild needed.

## Prices to enter

| Market | Monthly | Annual | Annual / month | Notes |
|---|---|---|---|---|
| **Romania (RON)** | **14.99 RON** | **89.99 RON** | ~7.50 RON | ~$3.3; the cheap home + diaspora test market |
| **Brazil (BRL)** | **R$ 15.90** | **R$ 95.90** | ~R$ 8.00 | ~$3; round local equivalent of the RON price |
| **Default (US and most of the world)** | **$4.99** | **$29.99** | ~$2.50 | Full price. Play/App Store convert to local currency, but override the markets below. |
| Spain / Italy / Portugal (EUR) | €3.99 | €24.99 | ~€2.08 | Mid tier (optional; tune after launch) |
| Germany / France (EUR) | €4.99 | €29.99 | ~€2.50 | Full price |

Both plans in every market keep the **7-day free trial** and the **~50% annual
discount** (which drives the "Save 50%" badge the paywall computes automatically).

## How to set it up

1. **App Store Connect** → your app → Subscriptions → create a subscription group
   (e.g. "Stillnova Premium") with two products: `stillnova_monthly` and
   `stillnova_annual`. Set the base price, then use **price overrides per country**
   for RO and BR (and the EUR markets if you want). Add an **Introductory Offer**
   → Free → 7 days to each.
2. **Google Play Console** → Monetize → Subscriptions → create the same two
   products (one base plan each: monthly / yearly). Set **regional prices** for RO
   and BR. Add a **free trial** offer (7 days) to each base plan.
3. **RevenueCat** → create/verify the `premium` entitlement, attach both products,
   and put them in the **current Offering** as the Annual and Monthly packages.
   The paywall shows Annual (highlighted, with the save %) next to Monthly the
   moment the offering is live.

## Why recurring, not one-time

AI cost (Gemini) is per-use and recurring. A one-time payment is bounded revenue
against unbounded ongoing cost. Annual + trial keeps it recurring while collecting
a year upfront. The proxy's server-side per-device daily cap bounds cost for every
plan, so even a future capped "lifetime" promo would be safe.
