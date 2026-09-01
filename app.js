/* ============================================================
   CORRECTIONAL — landing / pledge page logic
   Pledge feed is prototype. Evidence and organization figures
   live in index.html and are sourced there.
   ============================================================ */

"use strict";

/* ---------- pledge checkpoints ---------- */

const MIN_PLEDGE = 50;
const DEFAULT_PLEDGE = 150;
const MAX_PLEDGE = 10000;
const DEFAULT_CHARITY_PCT = 90;

/* Magnetic snap points (same set as the gauntlet slider). Between these,
   the track is continuous: $5 steps below $1,000, $25 above. */
const SNAP_POINTS = [
  150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 3000,
  4000, 5000, 6000, 7000, 8000, 9000, 10000
];

const MAJOR_TICKS = [50, 250, 500, 1000, 2000, 5000, 10000];

let currentAmount = DEFAULT_PLEDGE;
let charityPct = DEFAULT_CHARITY_PCT; // 90–100; the remainder runs Correctional

/* Piecewise-log scale: $50–$1,000 occupies the first 65% of the track. */
const SPLIT_AMOUNT = 1000;
const SPLIT_T = 0.65;
const LOG_LOW = Math.log(SPLIT_AMOUNT / MIN_PLEDGE);
const LOG_HIGH = Math.log(MAX_PLEDGE / SPLIT_AMOUNT);

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

function rawPositionToAmount(t) {
  if (t <= SPLIT_T) return MIN_PLEDGE * Math.exp((t / SPLIT_T) * LOG_LOW);
  return SPLIT_AMOUNT * Math.exp(((t - SPLIT_T) / (1 - SPLIT_T)) * LOG_HIGH);
}

function amountToPosition(amount) {
  const a = clamp(amount, MIN_PLEDGE, MAX_PLEDGE);
  if (a <= SPLIT_AMOUNT) return (SPLIT_T * Math.log(a / MIN_PLEDGE)) / LOG_LOW;
  return SPLIT_T + ((1 - SPLIT_T) * Math.log(a / SPLIT_AMOUNT)) / LOG_HIGH;
}

const SNAP_RADIUS = 0.012;
const SNAP_ZONES = SNAP_POINTS.map((snap, i) => {
  const pos = amountToPosition(snap);
  let radius = SNAP_RADIUS;
  if (i > 0) radius = Math.min(radius, (pos - amountToPosition(SNAP_POINTS[i - 1])) * 0.45);
  if (i < SNAP_POINTS.length - 1) {
    radius = Math.min(radius, (amountToPosition(SNAP_POINTS[i + 1]) - pos) * 0.45);
  }
  return { snap, pos, radius };
});

function positionToAmount(t) {
  const tc = clamp(t, 0, 1);
  let nearest = null;
  for (const zone of SNAP_ZONES) {
    const dist = Math.abs(tc - zone.pos);
    if (dist <= zone.radius && (nearest === null || dist < nearest.dist)) {
      nearest = { snap: zone.snap, dist };
    }
  }
  if (nearest) return nearest.snap;
  const raw = rawPositionToAmount(tc);
  const step = raw < SPLIT_AMOUNT ? 5 : 25;
  return clamp(Math.round(raw / step) * step, MIN_PLEDGE, MAX_PLEDGE);
}

function stepAmount(amount, direction) {
  if (direction > 0) {
    if (amount >= MAX_PLEDGE) return Math.max(amount, MAX_PLEDGE);
    if (amount < 150) return Math.min(150, Math.floor(amount / 10) * 10 + 10);
    for (const snap of SNAP_POINTS) {
      if (snap > amount) return snap;
    }
    return MAX_PLEDGE;
  }
  if (amount > MAX_PLEDGE) return MAX_PLEDGE;
  if (amount <= 150) return Math.max(MIN_PLEDGE, Math.ceil(amount / 10) * 10 - 10);
  for (let i = SNAP_POINTS.length - 1; i >= 0; i--) {
    if (SNAP_POINTS[i] < amount) return SNAP_POINTS[i];
  }
  return MIN_PLEDGE;
}

/* ---------- recent pledges (prototype feed) ---------- */

const PLEDGES = [
  { name: "Marcus T.", amount: 100, charityPct: 90, minsAgo: 4 },
  { name: "Anonymous", amount: 250, charityPct: 92, minsAgo: 11 },
  { name: "David R.", amount: 100, charityPct: 90, minsAgo: 26 },
  { name: "Jonathan K.", amount: 500, charityPct: 90, minsAgo: 47 },
  { name: "Anonymous", amount: 50, charityPct: 90, minsAgo: 63 },
  { name: "Caleb M.", amount: 1000, charityPct: 95, minsAgo: 118 },
  { name: "Stephen A.", amount: 100, charityPct: 90, minsAgo: 176 },
  { name: "Anonymous", amount: 150, charityPct: 93, minsAgo: 243 },
  { name: "Luis O.", amount: 300, charityPct: 90, minsAgo: 380 },
  { name: "Nathan P.", amount: 100, charityPct: 90, minsAgo: 1495 },
  { name: "Anonymous", amount: 2000, charityPct: 95, minsAgo: 1730 },
  { name: "Elijah W.", amount: 75, charityPct: 90, minsAgo: 2980 },
  { name: "Thomas B.", amount: 100, charityPct: 92, minsAgo: 4460 },
  { name: "Anonymous", amount: 5000, charityPct: 100, minsAgo: 7300 }
];

/* ============================================================
   helpers
   ============================================================ */

const $ = (id) => document.getElementById(id);

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const fmtMoney = (n, cents = false) =>
  "$" + n.toLocaleString("en-US", {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0
  });

const fmtAgo = (mins) => {
  if (mins < 1) return "just now";
  if (mins < 60) return `${Math.floor(mins)} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

/* ============================================================
   pledge slider + impact
   ============================================================ */

const amountEl = $("pledgeAmount");
const btnAmountEl = $("pledgeBtnAmount");
const split90El = $("split90");
const split10El = $("split10");
const impactBaseEl = $("impactBase");
const splitSlider = $("splitSlider");
const isPledgePage = document.body.dataset.page === "pledge";
if (isPledgePage) charityPct = 100;

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function renderAmount() {
  const deployed = currentAmount * (charityPct / 100);
  const kept = currentAmount - deployed;

  setText("splitPctCharity", charityPct + "%");
  setText("splitPctCorr", (100 - charityPct) + "%");
  if (amountEl) amountEl.textContent = fmtMoney(currentAmount);
  if (btnAmountEl) btnAmountEl.textContent = fmtMoney(currentAmount);
  if (split90El) split90El.textContent = fmtMoney(deployed, true);
  if (split10El) split10El.textContent = fmtMoney(kept, true);
  if (impactBaseEl) impactBaseEl.textContent = fmtMoney(deployed, true);
  setText("labelPctCharity", charityPct + "%");
  setText("labelPctCorr", (100 - charityPct) + "%");

  setImpactTargets(deployed);
  updateThumb();
}

/* Partner-average unit costs. Each row is an alternative reading of the
   same deployed dollars — not a stack of four outcomes. */
const AFTERCARE_DAY_USD = 45;
const INTERCEPTION_USD = 150;
const INVESTIGATION_HOUR_USD = 35;
const COUNSELING_USD = 80;
const LEGAL_HOUR_USD = 60;
const FULL_RESCUE_USD = 4000;

const impactTargets = { aftercare: 0, intercept: 0, hours: 0, counsel: 0, legal: 0, rescue: 0 };
const impactShown = { aftercare: 0, intercept: 0, hours: 0, counsel: 0, legal: 0, rescue: 0 };
let impactRaf = 0;

function setImpactTargets(deployed) {
  impactTargets.aftercare = deployed / AFTERCARE_DAY_USD;
  impactTargets.intercept = deployed / INTERCEPTION_USD;
  impactTargets.hours = deployed / INVESTIGATION_HOUR_USD;
  impactTargets.counsel = deployed / COUNSELING_USD;
  impactTargets.legal = deployed / LEGAL_HOUR_USD;
  impactTargets.rescue = deployed / FULL_RESCUE_USD;
  if (!impactRaf) impactRaf = requestAnimationFrame(tickImpact);
}

function formatImpactCount(n) {
  if (n < 10) return n.toFixed(1);
  return Math.round(n).toLocaleString("en-US");
}

function paintImpact(key, n) {
  const numEl = document.querySelector('[data-impact="' + key + '"]');
  const labelEl = document.querySelector('[data-impact-label="' + key + '"]');
  if (!numEl) return;

  if (key === "rescue") {
    if (n < 1) {
      const pct = n * 100;
      numEl.textContent = (pct < 10 ? pct.toFixed(1) : pct.toFixed(0)) + "%";
      if (labelEl) labelEl.textContent = "Share of one documented rescue";
    } else {
      numEl.textContent = formatImpactCount(n);
      if (labelEl) {
        labelEl.textContent = n < 1.05
          ? "Documented rescue, start to finish"
          : "Documented rescues, start to finish";
      }
    }
    return;
  }

  numEl.textContent = formatImpactCount(n);
  if (!labelEl) return;
  if (key === "aftercare") {
    labelEl.textContent = n < 1.05
      ? "Day of aftercare housing, food, and casework"
      : "Days of aftercare housing, food, and casework";
  } else if (key === "intercept") {
    labelEl.textContent = n < 1.05
      ? "Border or transit interception"
      : "Border or transit interceptions";
  } else if (key === "hours") {
    labelEl.textContent = n < 1.05
      ? "Investigation hour"
      : "Investigation hours";
  } else if (key === "counsel") {
    labelEl.textContent = n < 1.05
      ? "Trauma-informed counseling session"
      : "Trauma-informed counseling sessions";
  } else if (key === "legal") {
    labelEl.textContent = n < 1.05
      ? "Hour of survivor legal casework"
      : "Hours of survivor legal casework";
  }
}

function tickImpact() {
  let moving = false;
  for (const key of Object.keys(impactTargets)) {
    const target = impactTargets[key];
    const shown = impactShown[key];
    const next = shown + (target - shown) * 0.24;
    if (Math.abs(target - next) > 0.002) {
      impactShown[key] = next;
      moving = true;
    } else {
      impactShown[key] = target;
    }
    paintImpact(key, impactShown[key]);
  }
  impactRaf = moving ? requestAnimationFrame(tickImpact) : 0;
}

function tickLabel(v) {
  return v >= 1000 ? "$" + v / 1000 + "K" : "$" + v;
}

function buildTicks() {
  const track = $("sliderTrack");
  const labelsEl = $("sliderLabels");
  const thumb = $("pledgeThumb");
  if (!track || !labelsEl || !thumb) return;

  const majorSet = new Set(MAJOR_TICKS);
  const ticks = SNAP_POINTS.map((v) => {
    const pct = (amountToPosition(v) * 100).toFixed(4);
    const kind = majorSet.has(v) ? "major" : "minor";
    return `<span class="slider-tick slider-tick--${kind}" style="left:${pct}%"></span>`;
  }).join("");

  const minTick = `<span class="slider-tick slider-tick--major" style="left:0%"></span>`;
  const recPct = (amountToPosition(DEFAULT_PLEDGE) * 100).toFixed(4);
  const recMark = `<span class="slider-mark" style="left:${recPct}%" title="Recommended $150"></span>`;

  track.insertAdjacentHTML("afterbegin", minTick + ticks + recMark);

  labelsEl.innerHTML = MAJOR_TICKS.map((v, idx) => {
    const pct = (amountToPosition(v) * 100).toFixed(4);
    const shift = idx === 0 ? "0" : idx === MAJOR_TICKS.length - 1 ? "-100%" : "-50%";
    return `<span class="slider-label" style="left:${pct}%;transform:translateX(${shift})">${tickLabel(v)}</span>`;
  }).join("");
}

function updateThumb() {
  const thumb = $("pledgeThumb");
  if (!thumb) return;
  const t = amountToPosition(currentAmount);
  thumb.style.left = (t * 100).toFixed(4) + "%";
  const shown = Math.round(currentAmount);
  thumb.setAttribute("aria-valuenow", String(Math.min(shown, MAX_PLEDGE)));
  thumb.setAttribute("aria-valuetext", fmtMoney(shown));
}

function initPledgeSlider() {
  const area = $("sliderTrackArea");
  const track = $("sliderTrack");
  const thumb = $("pledgeThumb");
  if (!area || !track || !thumb) return;

  let dragging = false;
  let trackRect = null;

  const commitFromClientX = (clientX) => {
    if (!trackRect || trackRect.width === 0) return;
    const next = positionToAmount((clientX - trackRect.left) / trackRect.width);
    if (next !== currentAmount) {
      currentAmount = next;
      renderAmount();
    }
  };

  area.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    trackRect = track.getBoundingClientRect();
    area.setPointerCapture(e.pointerId);
    dragging = true;
    area.classList.add("is-dragging");
    thumb.focus({ preventScroll: true });
    commitFromClientX(e.clientX);
  });

  area.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    commitFromClientX(e.clientX);
  });

  const endDrag = () => {
    dragging = false;
    area.classList.remove("is-dragging");
  };

  area.addEventListener("pointerup", endDrag);
  area.addEventListener("pointercancel", endDrag);
  area.addEventListener("lostpointercapture", endDrag);

  thumb.addEventListener("keydown", (e) => {
    let next;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = stepAmount(currentAmount, 1);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = stepAmount(currentAmount, -1);
        break;
      case "Home":
        next = MIN_PLEDGE;
        break;
      case "End":
        next = MAX_PLEDGE;
        break;
      default:
        return;
    }
    e.preventDefault();
    if (next !== currentAmount) {
      currentAmount = next;
      renderAmount();
    }
  });
}

/* custom / "other" amount */

function initPledgeControls() {
  if (!amountEl) return;

  if (splitSlider) {
    splitSlider.addEventListener("input", () => {
      charityPct = Number(splitSlider.value);
      renderAmount();
    });
  }

  const otherToggle = $("otherToggle");
  const customWrap = $("customAmountWrap");
  const customInput = $("customAmount");
  const customApply = $("customApply");

  if (otherToggle && customWrap && customInput) {
    otherToggle.addEventListener("click", () => {
      customWrap.hidden = !customWrap.hidden;
      if (!customWrap.hidden) customInput.focus();
    });
  }

  function applyCustom() {
    const v = Math.floor(Number(customInput.value));
    if (!v || v < MIN_PLEDGE) {
      customInput.value = MIN_PLEDGE;
      currentAmount = MIN_PLEDGE;
    } else {
      currentAmount = v;
    }
    renderAmount();
  }

  if (customApply) customApply.addEventListener("click", applyCustom);
  if (customInput) {
    customInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") applyCustom();
    });
  }

  const pledgeBtn = $("pledgeBtn");
  if (!pledgeBtn) return;

  pledgeBtn.addEventListener("click", () => {
    if (isPledgePage) {
      const checkoutUrl = document.body.dataset.checkoutUrl;
      if (checkoutUrl) {
        const url = checkoutUrl.replace("{amount}", String(currentAmount));
        window.open(url, "_blank", "noopener,noreferrer");
        scrollToEl($("next"));
        return;
      }
      scrollToEl($("checkout"));
      return;
    }

    addPledgeRow({ name: "You", amount: currentAmount, charityPct, minsAgo: 0 }, true);
    pledgeBtn.textContent = "Pledge received — thank you, brother.";
    pledgeBtn.disabled = true;
    setTimeout(() => {
      pledgeBtn.innerHTML = `Pledge <span id="pledgeBtnAmount">${fmtMoney(currentAmount)}</span>`;
      pledgeBtn.disabled = false;
    }, 4000);
    scrollToEl($("donors"));
  });
}

/* ---------- allocation data (gauntlet ledger) ---------- */

const TOTAL_RAISED = 487230;
const OPERATIONS_USD = 48723;
const OPERATIONS_NARRATIVE =
  "Payment processing, hosting, accountability software, Instagram / Facebook / YouTube ads to gain members, and one part-time administrator. Every operational dollar is itemized here because you deserve to know.";
const UNALLOCATED_NARRATIVE =
  "Pledged in the last 45 days and not yet granted. Funds are disbursed to partners quarterly after due diligence. Nothing is held longer than one quarter.";

const CHARITIES = [
  {
    id: "ijm",
    name: "International Justice Mission",
    shortName: "IJM",
    url: "https://www.ijm.org",
    color: "#e5232e",
    allocatedUsd: 152000,
    focus: "Rescue operations and casework with local law enforcement",
    regions: ["Philippines", "Dominican Republic", "Ghana"],
    usedFor: [
      { label: "Rescue operations (casework, field teams)", amountUsd: 89000 },
      { label: "Legal prosecution of traffickers", amountUsd: 41000 },
      { label: "Survivor aftercare partnerships", amountUsd: 22000 }
    ],
    outcomes: [
      { value: "63", label: "people brought out of exploitation" },
      { value: "11", label: "traffickers convicted" },
      { value: "204", label: "aftercare days funded" }
    ],
    narrative:
      "Funds supported casework in three field offices, including two online sexual exploitation operations in the Philippines that removed 19 minors from abuse.",
    disbursements: [
      { date: "2026-07-02", amountUsd: 54000, memo: "Q3 casework grant" },
      { date: "2026-04-01", amountUsd: 61000, memo: "Q2 casework grant" },
      { date: "2026-01-06", amountUsd: 37000, memo: "Q1 casework grant" }
    ]
  },
  {
    id: "destiny-rescue",
    name: "Destiny Rescue",
    shortName: "Destiny Rescue",
    url: "https://www.destinyrescue.org",
    color: "#b3121c",
    allocatedUsd: 118400,
    focus: "Covert rescue of children from sexual exploitation",
    regions: ["Thailand", "Cambodia", "Uganda"],
    usedFor: [
      { label: "Covert rescue missions", amountUsd: 71000 },
      { label: "Border interception units", amountUsd: 29400 },
      { label: "Reintegration programs", amountUsd: 18000 }
    ],
    outcomes: [
      { value: "48", label: "children rescued" },
      { value: "312", label: "border interceptions screened" },
      { value: "35", label: "children reintegrated with family" }
    ],
    narrative:
      "Funded rescue agents working undercover in red-light districts and two border units that intercept children being moved across trafficking corridors.",
    disbursements: [
      { date: "2026-06-15", amountUsd: 43400, memo: "Rescue agent funding" },
      { date: "2026-03-10", amountUsd: 45000, memo: "Border unit grant" },
      { date: "2026-01-06", amountUsd: 30000, memo: "Q1 mission grant" }
    ]
  },
  {
    id: "a21",
    name: "The A21 Campaign",
    shortName: "A21",
    url: "https://www.a21.org",
    color: "#ffffff",
    allocatedUsd: 87300,
    focus: "Survivor aftercare and trafficking hotlines",
    regions: ["Greece", "Bulgaria", "United States"],
    usedFor: [
      { label: "Freedom center aftercare", amountUsd: 44300 },
      { label: "National hotline operations", amountUsd: 25000 },
      { label: "Legal advocacy for survivors", amountUsd: 18000 }
    ],
    outcomes: [
      { value: "29", label: "survivors in residential aftercare" },
      { value: "1,847", label: "hotline calls answered" },
      { value: "17", label: "court cases supported" }
    ],
    narrative:
      "Sustained two freedom centers providing housing, trauma counseling, and vocational training, and kept a national trafficking hotline staffed around the clock.",
    disbursements: [
      { date: "2026-05-20", amountUsd: 47300, memo: "Aftercare center grant" },
      { date: "2026-02-14", amountUsd: 40000, memo: "Hotline + legal fund" }
    ]
  },
  {
    id: "hope-for-justice",
    name: "Hope for Justice",
    shortName: "Hope for Justice",
    url: "https://hopeforjustice.org",
    color: "#8c8c8c",
    allocatedUsd: 46000,
    focus: "Investigative hubs and victim identification",
    regions: ["United Kingdom", "Ethiopia", "Vietnam"],
    usedFor: [
      { label: "Investigative hub casework", amountUsd: 26000 },
      { label: "Victim identification training for police", amountUsd: 12000 },
      { label: "Independent modern slavery advocates", amountUsd: 8000 }
    ],
    outcomes: [
      { value: "22", label: "victims identified and removed" },
      { value: "410", label: "frontline officers trained" },
      { value: "14", label: "survivors given legal advocates" }
    ],
    narrative:
      "Funded investigators who build victim-centered cases and trained police units to recognize trafficking indicators during routine operations.",
    disbursements: [
      { date: "2026-06-01", amountUsd: 24000, memo: "Investigative hub grant" },
      { date: "2026-02-02", amountUsd: 22000, memo: "Training + advocacy" }
    ]
  }
];

const ALLOCATED_USD = CHARITIES.reduce((s, c) => s + c.allocatedUsd, 0);
const UNALLOCATED_USD = TOTAL_RAISED - OPERATIONS_USD - ALLOCATED_USD;

const PARTITIONS = [
  ...CHARITIES.map((c) => ({
    id: c.id,
    name: c.name,
    shortName: c.shortName,
    amountUsd: c.allocatedUsd,
    focus: c.focus,
    kind: "charity",
    color: c.color,
    charity: c
  })),
  {
    id: "unallocated",
    name: "Unallocated",
    shortName: "Unallocated",
    amountUsd: UNALLOCATED_USD,
    focus: "Pledged, not yet granted — disbursed to partners quarterly",
    kind: "unallocated"
  },
  {
    id: "operations",
    name: "Correctional operations",
    shortName: "Operations",
    amountUsd: OPERATIONS_USD,
    focus: "Exactly 10% of every dollar raised runs the program",
    kind: "operations"
  }
];

function percentLabels(amounts, total) {
  const exact = amounts.map((a) => (a / total) * 1000);
  const floored = exact.map(Math.floor);
  let deficit = 1000 - floored.reduce((s, v) => s + v, 0);
  const byRemainder = exact
    .map((v, i) => ({ i, rem: v - Math.floor(v) }))
    .sort((a, b) => b.rem - a.rem);
  for (let k = 0; k < deficit; k++) floored[byRemainder[k].i] += 1;
  return floored.map((v) => (v / 10).toFixed(1));
}

const PCT_LABELS = percentLabels(PARTITIONS.map((p) => p.amountUsd), TOTAL_RAISED);
const pctOf = (id) => PCT_LABELS[PARTITIONS.findIndex((p) => p.id === id)];

function fillClass(p) {
  if (p.kind === "unallocated") return "rib-fill--unallocated";
  if (p.kind === "operations") return "rib-fill--operations";
  return "";
}

function chipStyle(p) {
  return p.color ? `background:${p.color}` : "";
}

function rowsHtml(items, valueKey, extraClass) {
  return items.map((u) => `
    <tr>
      ${extraClass ? `<td class="date">${u.date}</td>` : ""}
      <td class="lbl">${u.label || u.memo}</td>
      <td class="amt">${typeof u[valueKey] === "number" ? fmtMoney(u[valueKey]) : u[valueKey]}</td>
    </tr>`).join("");
}

function charityDetailHtml(c) {
  const usedTotal = c.usedFor.reduce((s, u) => s + u.amountUsd, 0);
  const disbTotal = c.disbursements.reduce((s, d) => s + d.amountUsd, 0);
  return `
    <dl class="rib-meta">
      <div><dt>Regions</dt><dd>${c.regions.join(" \u00B7 ")}</dd></div>
      <div><dt>Focus</dt><dd>${c.focus}</dd></div>
    </dl>
    <div class="rib-cols">
      <section>
        <span class="rib-sec-label">Use of funds</span>
        <table class="rib-table">
          <tbody>
            ${rowsHtml(c.usedFor, "amountUsd")}
            <tr class="total"><td class="lbl">Total</td><td class="amt">${fmtMoney(usedTotal)}</td></tr>
          </tbody>
        </table>
      </section>
      <section>
        <span class="rib-sec-label">Outcomes</span>
        <table class="rib-table">
          <tbody>${c.outcomes.map((o) => `<tr><td class="lbl">${o.label}</td><td class="amt">${o.value}</td></tr>`).join("")}</tbody>
        </table>
      </section>
    </div>
    <p class="rib-narrative">${c.narrative}</p>
    <section class="rib-card-sec">
      <span class="rib-sec-label">Disbursement log</span>
      <table class="rib-table">
        <tbody>
          ${rowsHtml(c.disbursements, "amountUsd", true)}
          <tr class="total"><td class="date"></td><td class="lbl">Disbursed to date</td><td class="amt">${fmtMoney(disbTotal)}</td></tr>
        </tbody>
      </table>
    </section>`;
}

function detailHtml(p) {
  const body = p.charity
    ? charityDetailHtml(p.charity)
    : `<p class="rib-narrative">${p.kind === "unallocated" ? UNALLOCATED_NARRATIVE : OPERATIONS_NARRATIVE}</p>
       ${p.kind === "unallocated" ? `<section class="rib-card-sec"><span class="rib-sec-label">Disbursement log</span><p class="rib-empty">None yet — these funds entered within the current quarter and leave in the next grant cycle.</p></section>` : ""}`;
  return `
    <article class="rib-card" aria-label="${p.name} details">
      <header class="rib-card-head">
        <span class="rib-chip ${fillClass(p)}" style="${chipStyle(p)}" aria-hidden="true"></span>
        <h3 class="rib-card-title">${p.charity && p.charity.url
          ? `<a href="${p.charity.url}" target="_blank" rel="noopener noreferrer">${p.name}</a>`
          : p.name}</h3>
        <div class="rib-card-amount">
          <span class="rib-card-amt">${fmtMoney(p.amountUsd)}</span>
          <span class="rib-card-pct">${pctOf(p.id)}% of ${fmtMoney(TOTAL_RAISED)}</span>
        </div>
        <button class="rib-close" type="button" data-rib-close aria-label="Close details">\u00D7</button>
      </header>
      ${body}
    </article>`;
}

function buildAllocBar() {
  const root = $("rib");
  if (!root) return;

  root.innerHTML = `
    <div class="rib-barwrap">
      <div class="rib-bar" role="group" aria-label="Allocation of ${fmtMoney(TOTAL_RAISED)} raised, by partition">
        ${PARTITIONS.map((p) => `
          <button type="button" class="rib-seg ${fillClass(p)}" data-id="${p.id}"
            style="flex-grow:${p.amountUsd / TOTAL_RAISED};${chipStyle(p)}"
            aria-label="${p.name} — ${fmtMoney(p.amountUsd)}, ${pctOf(p.id)}% of total"
            aria-expanded="false" aria-controls="alloc-detail"></button>`).join("")}
      </div>
      <div class="rib-tip" id="ribTip" hidden></div>
    </div>
    <div class="rib-legend">
      ${PARTITIONS.map((p) => `
        <button type="button" class="rib-legend-item" data-id="${p.id}"
          aria-label="${p.name} — ${fmtMoney(p.amountUsd)}, ${pctOf(p.id)}% of total"
          aria-expanded="false" aria-controls="alloc-detail">
          <span class="rib-chip ${fillClass(p)}" style="${chipStyle(p)}" aria-hidden="true"></span>
          <span class="rib-legend-name">${p.shortName}</span>
          <span class="rib-legend-amt">${fmtMoney(p.amountUsd)}</span>
          <span class="rib-legend-pct">${pctOf(p.id)}%</span>
        </button>`).join("")}
    </div>
    <div class="rib-recon">
      <span class="rib-recon-note">Sum of all partitions</span>
      <span class="rib-recon-fig">= ${fmtMoney(TOTAL_RAISED)} \u00B7 100.0%</span>
    </div>
    <div id="alloc-detail" class="rib-detail" aria-hidden="true">
      <div class="rib-detail-clip" id="ribDetailClip"></div>
    </div>`;

  const bar = root.querySelector(".rib-bar");
  const wrap = root.querySelector(".rib-barwrap");
  const tip = $("ribTip");
  const detail = $("alloc-detail");
  const clip = $("ribDetailClip");
  let openId = null;

  function partition(id) { return PARTITIONS.find((p) => p.id === id); }

  function setTip(id, btn) {
    const p = partition(id);
    if (!p || !tip) return;
    tip.innerHTML = `
      <div class="rib-tip-row">
        <span class="rib-tip-name">${p.name}</span>
        <span class="rib-tip-amt">${fmtMoney(p.amountUsd)}</span>
      </div>
      <div class="rib-tip-pct">${pctOf(p.id)}%</div>
      <div class="rib-tip-focus">${p.focus}</div>`;
    tip.hidden = false;
    tip.style.animation = "none";
    void tip.offsetWidth;
    tip.style.animation = "";
    const max = Math.max(wrap.clientWidth - tip.offsetWidth, 0);
    const center = btn.offsetLeft + btn.offsetWidth / 2;
    tip.style.left = Math.round(Math.min(Math.max(center - tip.offsetWidth / 2, 0), max)) + "px";
    bar.classList.add("is-dimming");
    root.querySelectorAll(".rib-seg").forEach((el) => el.classList.toggle("is-hot", el.dataset.id === id));
  }

  function hideTip() {
    if (tip) tip.hidden = true;
    // Keep the open partition highlighted — tip dismiss must not undo the pop
    if (openId) {
      bar.classList.add("is-dimming");
      root.querySelectorAll(".rib-seg").forEach((el) => {
        el.classList.toggle("is-hot", el.dataset.id === openId);
      });
      return;
    }
    bar.classList.remove("is-dimming");
    root.querySelectorAll(".rib-seg").forEach((el) => el.classList.remove("is-hot"));
  }

  function setOpen(id, opts) {
    const force = opts && opts.force;
    const next = force ? id : (id && id === openId ? null : id);
    openId = next;
    root.querySelectorAll("[aria-controls='alloc-detail']").forEach((el) => {
      el.setAttribute("aria-expanded", el.dataset.id === openId ? "true" : "false");
    });
    root.querySelectorAll(".rib-legend-item").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.id === openId);
    });
    root.querySelectorAll(".rib-seg").forEach((el) => {
      el.classList.toggle("is-hot", el.dataset.id === openId);
    });
    bar.classList.toggle("is-dimming", Boolean(openId));
    if (openId) {
      clip.innerHTML = detailHtml(partition(openId));
      detail.classList.add("is-open");
      detail.setAttribute("aria-hidden", "false");
    } else {
      detail.classList.remove("is-open");
      detail.setAttribute("aria-hidden", "true");
    }
  }

  root.querySelectorAll(".rib-seg").forEach((btn) => {
    btn.addEventListener("mouseenter", () => setTip(btn.dataset.id, btn));
    btn.addEventListener("mouseleave", hideTip);
    btn.addEventListener("focus", () => setTip(btn.dataset.id, btn));
    btn.addEventListener("blur", hideTip);
  });
  root.addEventListener("click", (e) => {
    if (e.target.closest("[data-rib-close]")) { setOpen(null); return; }
    const btn = e.target.closest(".rib-seg, .rib-legend-item");
    if (btn) setOpen(btn.dataset.id);
  });
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(null);
  });

  window.__openAlloc = (id) => setOpen(id, { force: true });
}

function renderTotals() {
  const el = $("raisedTotal");
  if (el) el.textContent = fmtMoney(TOTAL_RAISED);
}
/* ============================================================
   pledger feed
   ============================================================ */

const pledgerRows = $("pledgerRows");
const startTime = Date.now();

function rowHtml(p) {
  const elapsed = (Date.now() - startTime) / 60000;
  const pct = p.charityPct ?? DEFAULT_CHARITY_PCT;
  const ops = 100 - pct;
  const tip = ops === 0
    ? "100% of this pledge went to the charities \u2014 Correctional took nothing."
    : pct + "% of this pledge went to the charities. " + ops + "% runs Correctional.";
  const anon = p.name === "Anonymous" ? " feed-name--anon" : "";
  return `
    <span class="feed-name${anon}">${p.name}</span>
    <span class="feed-amount">${fmtMoney(p.amount)}</span>
    <span class="feed-split" tabindex="0" aria-label="${tip}">${pct}%<span class="feed-split-tip" role="tooltip" aria-hidden="true">${tip}</span></span>
    <span class="feed-time">${fmtAgo(p.minsAgo + elapsed)}</span>`;
}

function renderPledgers() {
  if (!pledgerRows) return;
  pledgerRows.innerHTML = PLEDGES.map((p) => `<li class="feed-row">${rowHtml(p)}</li>`).join("");
}

function addPledgeRow(p, flash) {
  if (!pledgerRows) return;
  PLEDGES.unshift(p);
  const li = document.createElement("li");
  li.className = "feed-row";
  li.innerHTML = rowHtml(p);
  pledgerRows.prepend(li);
  if (flash) {
    void li.offsetWidth;
    li.classList.add("feed-row--new");
  }
  while (pledgerRows.children.length > 16) pledgerRows.lastElementChild.remove();
  PLEDGES.length = Math.min(PLEDGES.length, 16);
}

if (pledgerRows) {
  setInterval(() => {
    [...pledgerRows.children].forEach((tr, i) => {
      const cell = tr.querySelector(".feed-time");
      const elapsed = (Date.now() - startTime) / 60000;
      if (cell && PLEDGES[i]) cell.textContent = fmtAgo(PLEDGES[i].minsAgo + elapsed);
    });
  }, 30000);

  const NAME_POOL = ["Luke H.", "Peter S.", "James O.", "Ryan C.", "Tom B.", "Micah D.", "Eli F.", "Chris N.", "Aaron G.", "Ben L."];
  const AMOUNT_WEIGHTS = [[50, 24], [100, 28], [150, 16], [250, 18], [500, 8], [1000, 5], [2500, 1]];
  const TOTAL_WEIGHT = AMOUNT_WEIGHTS.reduce((s, [, w]) => s + w, 0);

  function drawAmount() {
    let roll = Math.random() * TOTAL_WEIGHT;
    for (const [amount, weight] of AMOUNT_WEIGHTS) {
      roll -= weight;
      if (roll <= 0) return amount;
    }
    return 100;
  }

  function drawSplit() {
    const roll = Math.random();
    if (roll < 0.72) return 90;
    if (roll < 0.88) return 91 + Math.floor(Math.random() * 5);
    if (roll < 0.97) return 96 + Math.floor(Math.random() * 4);
    return 100;
  }

  function scheduleLivePledge() {
    const delay = 25000 + Math.random() * 65000;
    setTimeout(() => {
      addPledgeRow({
        name: Math.random() < 0.5 ? "Anonymous" : NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)],
        amount: drawAmount(),
        charityPct: drawSplit(),
        minsAgo: 0
      }, true);
      scheduleLivePledge();
    }, delay);
  }
  scheduleLivePledge();
}

/* ============================================================
   init
   ============================================================ */

if (amountEl) {
  buildTicks();
  initPledgeSlider();
  initPledgeControls();
  renderAmount();
}

if ($("rib")) {
  buildAllocBar();
  renderTotals();
}

if ($("pledgerRows")) {
  renderPledgers();
}

/* ============================================================
   smooth scroll + hero grid parallax
   ============================================================ */

function scrollToEl(el, block) {
  if (!el) return;
  if (window.__smoothScrollTo) {
    window.__smoothScrollTo(el, block);
    return;
  }
  el.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
    block: block === "nearest" ? "nearest" : "start"
  });
}

function initMotion() {
  const content = $("smoothContent");
  const heroGrid = $("heroGrid");
  const headerH = () => document.querySelector(".site-header")?.offsetHeight || 56;
  if (!content) return;

  /* Desktop only (matches styles.css 860px). Native wheel/scrollbar still
     jumps window.scrollY; the page is position:fixed and we lerp toward
     scrollY. On mobile we leave native scrolling alone. */
  const DESKTOP_MQ = window.matchMedia("(min-width: 861px)");
  const DEPTH = 0.82;
  const LERP = 0.085;

  let enabled = false;
  let rafId = 0;
  let current = window.scrollY;
  let target = window.scrollY;

  function setSpacer() {
    if (!enabled) return;
    document.body.style.height = content.scrollHeight + "px";
  }

  function tick() {
    if (!enabled) return;
    current += (target - current) * LERP;
    if (Math.abs(target - current) < 0.15) current = target;

    content.style.transform = `translate3d(0, ${-current}px, 0)`;
    if (heroGrid) {
      heroGrid.style.transform = `translate3d(0, ${current * DEPTH}px, 0)`;
    }
    rafId = requestAnimationFrame(tick);
  }

  function enable() {
    if (enabled) return;
    enabled = true;
    current = window.scrollY;
    target = window.scrollY;
    setSpacer();
    rafId = requestAnimationFrame(tick);
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    cancelAnimationFrame(rafId);
    rafId = 0;
    document.body.style.height = "";
    content.style.transform = "";
    if (heroGrid) heroGrid.style.transform = "";
  }

  function syncMode() {
    if (DESKTOP_MQ.matches) enable();
    else disable();
  }

  if (window.ResizeObserver) {
    new ResizeObserver(setSpacer).observe(content);
  }
  window.addEventListener("resize", setSpacer);
  window.addEventListener("scroll", () => {
    if (!enabled) return;
    target = window.scrollY;
  }, { passive: true });

  if (typeof DESKTOP_MQ.addEventListener === "function") {
    DESKTOP_MQ.addEventListener("change", syncMode);
  } else {
    DESKTOP_MQ.addListener(syncMode);
  }
  syncMode();

  window.__smoothScrollTo = (el, block) => {
    if (!enabled) {
      el.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: block === "nearest" ? "nearest" : "start"
      });
      return;
    }
    const topGap = headerH() + 12;
    const rect = el.getBoundingClientRect();
    let y;
    if (block === "nearest") {
      if (rect.top >= topGap && rect.bottom <= window.innerHeight) return;
      if (rect.top < topGap) y = current + rect.top - topGap;
      else y = current + rect.bottom - window.innerHeight + 16;
    } else {
      y = current + rect.top - topGap;
    }
    window.scrollTo(0, Math.max(0, y));
  };

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id === "#") {
        e.preventDefault();
        window.scrollTo(0, 0);
        return;
      }
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      window.__smoothScrollTo(el);
      const openAlloc = a.getAttribute("data-open-alloc");
      if (openAlloc && window.__openAlloc) window.__openAlloc(openAlloc);
    });
  });
}

initMotion();
initHeroVerses();

function initHeroVerses() {
  const root = $("heroVerse");
  const track = $("heroVerseTrack");
  if (!root || !track) return;

  const verses = [
    {
      quote: "Defend the weak and the fatherless; uphold the cause of the poor and the oppressed. Rescue the weak and the needy; deliver them from the hand of the wicked.",
      cite: "Psalm 82:3-4"
    },
    {
      quote: "Speak up for those who cannot speak for themselves; ensure justice for those being crushed. Yes, speak up for the poor and helpless, and see that they get justice.",
      cite: "Proverbs 31:8-9",
      version: "NLT"
    },
    {
      quote: "Rescue those being led away to death; hold back those staggering toward slaughter.",
      cite: "Proverbs 24:11"
    },
    {
      quote: "He has sent me to comfort the brokenhearted and to proclaim that captives will be released and prisoners will be freed.",
      cite: "Isaiah 61:1",
      version: "NLT"
    },
    {
      quote: "I discipline my body and keep it under control, lest after preaching to others I myself should be disqualified.",
      cite: "1 Corinthians 9:27"
    },
    {
      quote: "Like a city whose walls are broken through is a man who lacks self-control.",
      cite: "Proverbs 25:28"
    },
    {
      quote: "For God gave us a spirit not of fear but of power and love and self-control.",
      cite: "2 Timothy 1:7"
    },
    {
      quote: "No discipline seems pleasant at the time, but painful. Later on, however, it produces a harvest of righteousness and peace for those who have been trained by it.",
      cite: "Hebrews 12:11"
    },
    {
      quote: "Religion that is pure and undefiled before God the Father is this: to visit orphans and widows in their affliction, and to keep oneself unstained from the world.",
      cite: "James 1:27",
      version: "ESV"
    },
    {
      quote: "Flee from sexual immorality\u2026 You are not your own, for you were bought with a price. So glorify God in your body.",
      cite: "1 Corinthians 6:18-20",
      version: "ESV"
    }
  ];

  const gatewayUrl = (v) =>
    "https://www.biblegateway.com/passage/?search=" +
    encodeURIComponent(v.cite) +
    "&version=" +
    encodeURIComponent(v.version || "NIV");

  const itemHtml = (v, set) => `
    <div class="hero-verse-item"${set === 1 ? ' aria-hidden="true"' : ""}>
      <div class="hero-verse-block">
        <p class="hero-verse-quote">${v.quote}</p>
        <a class="hero-verse-cite" href="${gatewayUrl(v)}" target="_blank" rel="noopener noreferrer" draggable="false"${set === 1 ? ' tabindex="-1"' : ""}>${v.cite}</a>
      </div>
    </div>`;

  track.innerHTML =
    verses.map((v) => itemHtml(v, 0)).join("") +
    verses.map((v) => itemHtml(v, 1)).join("");

  const AUTO_PX_PER_SEC = -22;
  const DRAG_THRESHOLD = 8;
  const FRICTION = 2.4; // 1/s exponential decay after throw
  const SETTLE = 8; // resume auto-scroll below this |px/s|
  const MAX_THROW = 2400;

  let loopW = 0;
  let x = 0;
  let vel = AUTO_PX_PER_SEC;
  let dragging = false;
  let dragged = false;
  let pointerId = null;
  let lastClientX = 0;
  let lastT = 0;
  let samples = [];
  let raf = 0;
  let prevT = 0;

  function measure() {
    loopW = track.scrollWidth / 2;
  }

  function wrap() {
    if (loopW <= 0) return;
    while (x <= -loopW) x += loopW;
    while (x > 0) x -= loopW;
  }

  function paint() {
    wrap();
    track.style.transform = "translate3d(" + x + "px,0,0)";
  }

  function sampleVelocity() {
    if (samples.length < 2) return 0;
    const newest = samples[samples.length - 1];
    let oldest = samples[0];
    for (let i = samples.length - 2; i >= 0; i--) {
      if (newest.t - samples[i].t > 80) {
        oldest = samples[i];
        break;
      }
      oldest = samples[i];
    }
    const dt = newest.t - oldest.t;
    if (dt < 1) return 0;
    return ((newest.x - oldest.x) / dt) * 1000;
  }

  function tick(now) {
    if (!prevT) prevT = now;
    const dt = Math.min(40, now - prevT) / 1000;
    prevT = now;

    if (!dragging) {
      if (Math.abs(vel - AUTO_PX_PER_SEC) > 0.5) {
        vel *= Math.exp(-FRICTION * dt);
        if (Math.abs(vel) < SETTLE) vel = AUTO_PX_PER_SEC;
      } else {
        vel = AUTO_PX_PER_SEC;
      }
      x += vel * dt;
      paint();
    }

    raf = requestAnimationFrame(tick);
  }

  root.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    dragging = true;
    dragged = false;
    pointerId = e.pointerId;
    lastClientX = e.clientX;
    lastT = performance.now();
    samples = [{ x: e.clientX, t: lastT }];
    vel = 0;
    root.classList.add("is-dragging");
    try { root.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
  });

  root.addEventListener("pointermove", (e) => {
    if (!dragging || e.pointerId !== pointerId) return;
    const now = performance.now();
    const dx = e.clientX - lastClientX;
    if (Math.abs(dx) > 0) {
      x += dx;
      paint();
      if (Math.abs(e.clientX - samples[0].x) > DRAG_THRESHOLD) dragged = true;
    }
    lastClientX = e.clientX;
    lastT = now;
    samples.push({ x: e.clientX, t: now });
    while (samples.length > 8) samples.shift();
    if (dragged) e.preventDefault();
  });

  function endDrag(e) {
    if (!dragging || (e && e.pointerId !== pointerId)) return;
    dragging = false;
    root.classList.remove("is-dragging");
    const throwVel = sampleVelocity();
    vel = Math.max(-MAX_THROW, Math.min(MAX_THROW, throwVel));
    if (Math.abs(vel) < SETTLE) vel = AUTO_PX_PER_SEC;
    pointerId = null;
    samples = [];
  }

  root.addEventListener("pointerup", endDrag);
  root.addEventListener("pointercancel", endDrag);
  root.addEventListener("lostpointercapture", endDrag);

  root.addEventListener("click", (e) => {
    if (!dragged) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  root.addEventListener("dragstart", (e) => e.preventDefault());

  measure();
  paint();
  raf = requestAnimationFrame(tick);

  window.addEventListener("resize", () => {
    const before = loopW;
    measure();
    if (before > 0 && loopW > 0) x = (x / before) * loopW;
    paint();
  });
}

