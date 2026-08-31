# Correctional — done and remaining

Last updated: 2026-08-30

## Done

### Site
- Static site: hero, homepage pledge module, transparency ribbon, pledges feed, evidence stats, organizations, blog, impact pages
- Gauntlet-style polish: Inter + IBM Plex Mono, spacing, rounded panels, ribbon hover, allocation cards
- Default pledge **$150** (slider, impact readout, recommended tick)
- Hero copy simplified; desktop-only smooth scroll; deeper red on 90% bar hover
- Transparent favicon; consistent black section backgrounds; smaller hero grid
- Heading **Who the Money Helps**; pledge names one grey; nav **Ledger** → **Pledges**

### Hosting
- Repo on GitHub (`optimizeforall/correctional-website`)
- GitHub Pages at **joincorrectional.com** (Spaceship DNS + `CNAME`)
- Pushes to `master` deploy the site

### `/pledge` (local — not all of this is pushed yet)
- Dedicated page: **Pledge → Covenant → Cohort → Weekly**
- Covenant (purge + commitment), cohort of 4 / 12 weeks, weekly call format
- Launch-phase copy: 100% to IJM until Correctional can legally collect
- Nav **Pledge** links point to `/pledge/`
- `app.js` works on both homepage and `/pledge`

---

## Remaining

### This week — ship the page
- [ ] Commit and push `/pledge` plus related nav/CSS/`app.js` so live matches local
- [ ] Confirm HTTPS lock + **Enforce HTTPS** in GitHub Pages settings
- [ ] Smoke-test live: nav, slider, transparency, mobile menu, `/pledge`

### Money — pick a path, then execute it

**Decision (not either/or forever):** Stripe is the product for 90/10 once Correctional is a merchant. Charity-direct (Every.org or IJM’s donate page) is only a launch bridge so friends can pledge *before* entity + bank exist.

- [ ] **Decide launch money path**
  - **A — Stripe (own the money, keep 10%):** file entity → EIN → business bank → Stripe KYC → Checkout on `/pledge`
  - **B — Charity-direct first (no money held):** IJM / Every.org link on the pledge button → 100% to the charity this quarter → swap to Stripe when A is done
- [ ] If **A:** form LLC or start 501(c)(3) / fiscal sponsor conversation (lawyer + CPA before taking a dollar)
- [ ] If **A:** EIN + bank account in the entity’s name
- [ ] If **A:** Stripe account, Checkout (or Payment Links) wired to `#pledgeBtn`; stop calling it a tax-deductible donation unless you are a 501(c)(3) or fiscally sponsored
- [ ] If **B:** create the donate/fundraiser URL; set `data-checkout-url` on `/pledge` body
- [ ] Align homepage fine print (“Stripe planned / prototype”) with whichever path is live

### Onboarding (needed either path)
- [ ] Signup form (Tally or similar): name, email, timezone, why now, weekly availability, covenant checkboxes
- [ ] Point **Open signup form** at that URL
- [ ] Decide homepage pledge: keep the full widget, or send everyone to `/pledge`

### Community
- [ ] Discord: landing channel + one private channel per cohort of 4
- [ ] Cohort #1: you + 3 men you know; one real weekly call
- [ ] Write the leader playbook from that week
- [ ] Instagram: handle, bio → site, 9–12 posts (stat pages are ready-made)

### Honesty on the site
- [ ] Label the pledges feed and allocation ribbon as prototype / demo — or replace with real totals
- [ ] Update README recommended pledge from $100 to $150
- [ ] Impact page examples still use $100 / 90% — refresh if launch is 100% to IJM

### Later
- [ ] Automate: payment confirmed → Discord invite
- [ ] Quarterly charity rotation + published grant log
- [ ] Second cohort only when 4 vetted signups exist
- [ ] Basic SEO / sitemap
- [ ] Use `logo-emblem.png` in header/favicon if you want it

---

## Suggested order (1–2 hrs/night)

| Night | Focus |
|---|---|
| **Next** | Push `/pledge`, HTTPS, smoke test |
| **2** | Choose A or B for money; start entity *or* wire charity-direct checkout |
| **3** | Signup form + Discord skeleton |
| **4** | Recruit cohort #1; first call |
| **5** | IG live |
| **Ongoing** | If B now: one session/week on entity + bank + Stripe so 90/10 can turn on |

Stripe is not blocked by the website. It is blocked by entity + bank + (if you issue donation receipts) charity status.
