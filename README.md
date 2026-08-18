# Correctional

A Christ-centered program for men fighting pornography, lust, and sin — where every
pledge funds the fight against human trafficking.

**The model:** members make an initial pledge (minimum $50, recommended $100).
90% is deployed to organizations doing documented work against trafficking and the
sexual exploitation of children (identification, aftercare, housing, prosecution,
CSAM detection). 10% runs Correctional.

## Running it

This is a static site with no build step. Open `index.html` directly in a browser,
or serve it locally:

```
python -m http.server 8000
```

then visit `http://localhost:8000`.

## What's on the page

- **Hero** — the Correc✝ional wordmark (the "t" is a red cross, representing Christ's blood)
  and the 90/10 split stated plainly.
- **Evidence** — published statistics on who money can actually help, each linked to
  the ILO/Walk Free/IOM estimates, UNODC GLOTIP 2024, Polaris, NCMEC, HUD, IJM,
  Freedom Fund, Restore NYC, and peer-reviewed aftercare research. No invented
  dollars-per-rescue conversions.
- **Pledge module** — slider that snaps to checkpoints ($50, $100, $150 … $10,000),
  an "Other / specific amount" input for custom values, and a live 90/10 breakdown.
- **Split control** — every pledger sets Correctional's share with a second slider:
  from the default 10% down to 0% (i.e. 90–100% to the charities).
- **Organizations** — eight groups that passed a documentation test (IJM, Polaris,
  NCMEC, Freedom Fund, Restore NYC, Love146, GEMS, Thorn), with their published
  numbers and links to studies. Correctional has not transferred funds to them yet.
- **Pledger feed** — prototype commitments with relative timestamps.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure, sourced statistics, organization profiles |
| `styles.css` | Black / red / white technical theme |
| `app.js` | Slider snapping, split math, prototype pledger feed |
| `assets/` | Generated logo concepts (wordmark, emblem, monogram) |

## Prototype notes — before this goes live

- **Pledger names and the pledge button are still prototype.** Payment processing
  (Stripe or similar) is the next step. Do not present the feed as live donors.
- **Do not attach fabricated donation amounts** to the named organizations.
  Partner with them formally, then restore line-by-line allocation.
- Impact copy must stay sourced. If a number cannot be linked to a study or an
  organization's published report, it does not belong on the page.
