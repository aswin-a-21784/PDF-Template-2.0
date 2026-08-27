/* Blanket Purchase Order prototype — Procurement SaaS
   Fixed "today" so the seeded demo data (auto-release-on-date) behaves deterministically. */
const TODAY = "2026-08-08";

/* ---------------------------------------------------------------------- */
/* Utilities                                                               */
/* ---------------------------------------------------------------------- */
let uidCounter = 100;
function uid(prefix) {
  uidCounter += 1;
  return `${prefix}-${uidCounter}`;
}

function currency(value) {
  const n = Number(value) || 0;
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function toDisplayDate(iso) {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function addInterval(iso, amount, unit) {
  const d = new Date(iso + "T00:00:00");
  if (unit === "day") d.setDate(d.getDate() + amount);
  else if (unit === "week") d.setDate(d.getDate() + amount * 7);
  else if (unit === "month") d.setMonth(d.getMonth() + amount);
  else if (unit === "year") d.setFullYear(d.getFullYear() + amount);
  return d.toISOString().slice(0, 10);
}

function dateLte(a, b) {
  return a <= b;
}

function statusLabel(status) {
  return status
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function badge(status, solid) {
  return `<span class="badge badge-${status} ${solid ? "badge-solid" : ""}">${statusLabel(status)}</span>`;
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------------------------------------------------------------------- */
/* Data model helpers                                                      */
/* ---------------------------------------------------------------------- */
function committedValue(item) {
  return item.type === "goods" ? item.committedQty * item.rate : item.committedAmount;
}

function releasedSum(bpo, itemId) {
  return bpo.releases
    .filter((r) => r.status === "released")
    .reduce((sum, r) => sum + (r.allocations[itemId] || 0), 0);
}

function scheduledSum(bpo, itemId, excludeReleaseId) {
  return bpo.releases
    .filter((r) => r.status === "scheduled" && r.id !== excludeReleaseId)
    .reduce((sum, r) => sum + (r.allocations[itemId] || 0), 0);
}

function itemReleasedValue(bpo, item) {
  const amt = releasedSum(bpo, item.id);
  return item.type === "goods" ? amt * item.rate : amt;
}

function itemCommittedRemaining(bpo, item) {
  // committed minus what has actually been released (real consumption)
  const consumed = releasedSum(bpo, item.id);
  const total = item.type === "goods" ? item.committedQty : item.committedAmount;
  return total - consumed;
}

function availableForScheduling(bpo, item, excludeReleaseId) {
  return itemCommittedRemaining(bpo, item) - scheduledSum(bpo, item.id, excludeReleaseId);
}

function releaseAllocationValue(bpo, allocations) {
  return bpo.items.reduce((sum, item) => {
    const v = allocations[item.id] || 0;
    return sum + (item.type === "goods" ? v * item.rate : v);
  }, 0);
}

function bpoTotals(bpo) {
  const committed = bpo.items.reduce((sum, i) => sum + committedValue(i), 0);
  const released = bpo.items.reduce((sum, i) => sum + itemReleasedValue(bpo, i), 0);
  const remaining = committed - released;
  const pct = committed > 0 ? Math.round((released / committed) * 100) : 0;
  return { committed, released, remaining, pct };
}

function releasedPoCount(bpo) {
  return bpo.releases.filter((r) => r.status === "released").length;
}

function logActivity(bpo, title, note) {
  bpo.activity.unshift({ title, note, when: toDisplayDate(TODAY) });
}

// Any scheduled release whose date has arrived is auto-released (background job simulation).
function processAutoReleases(bpo) {
  bpo.releases.forEach((r) => {
    if (r.status === "scheduled" && dateLte(r.releaseDate, TODAY)) {
      r.status = "released";
      r.poNumber = r.poNumber || nextPoNumber(bpo);
      r.subStatus = r.subStatus || "Issued";
      logActivity(bpo, `Purchase Order ${r.poNumber} released`, `Auto-released on scheduled date ${toDisplayDate(r.releaseDate)}`);
    }
  });
}

function nextPoNumber(bpo) {
  const n = bpo.releases.filter((r) => r.poNumber).length + 1;
  return `PO-${String(n).padStart(3, "0")}`;
}

function findActiveBpoForVendor(vendorName) {
  return state.bpos.find((b) => b.vendor.name === vendorName && b.status === "active");
}

/* ---------------------------------------------------------------------- */
/* Seed data                                                               */
/* ---------------------------------------------------------------------- */
function buildGenericItems(committedTotal) {
  const goodsTotal = Math.round(committedTotal * 0.6);
  const serviceTotal = committedTotal - goodsTotal;
  return [
    { id: uid("itm"), name: "General Hardware Supplies", sku: "GEN/HW/001", type: "goods", unit: "PCS", committedQty: 100, rate: goodsTotal / 100, taxLabel: "Standard Rate (16%)", taxRate: 16 },
    { id: uid("itm"), name: "General Maintenance Service", sku: null, type: "service", committedAmount: serviceTotal, taxLabel: "Exempt Rate (0%)", taxRate: 0 }
  ];
}

function addr() {
  return { line1: "152, 3rd street", line2: "city", line3: "Baden-Württemberg 12345", line4: "Germany" };
}

function makeBpo(opts) {
  return {
    id: opts.id,
    bpoNumber: opts.id,
    vendor: { name: opts.vendor, billing: addr(), shipping: addr() },
    currency: "INR",
    reference: opts.reference || `RR-${opts.id.split("-")[1]}`,
    bpoDate: opts.bpoDate,
    validityStart: opts.validityStart,
    validityEnd: opts.validityEnd,
    paymentTerms: "Net 30",
    warehouse: "Head Office",
    selectionType: "Multiple Location",
    status: opts.status,
    items: opts.items,
    notes: opts.notes || "Thanks for your business.",
    terms: opts.terms || "",
    releases: opts.releases || [],
    activity: opts.activity || [{ title: "Blanket Purchase Order Created", note: "Created as Draft", when: toDisplayDate(opts.bpoDate) }]
  };
}

function seedBpos() {
  const bpo1 = makeBpo({
    id: "BPO-0001",
    vendor: "Vendor 001",
    reference: "RR-0001",
    bpoDate: "2026-07-06",
    validityStart: "2026-08-01",
    validityEnd: "2027-07-31",
    status: "draft",
    items: [
      { id: "itm-steel", name: "TMT Steel bar Fe500D", sku: "STL/TMT/500D", type: "goods", unit: "KG", committedQty: 200, rate: 317.5, taxLabel: "Standard Rate (16%)", taxRate: 16 },
      { id: "itm-angle", name: "MS Angle 50x50x5", sku: "STL/50X50X5", type: "goods", unit: "PCS", committedQty: 500, rate: 120, taxLabel: "Zero Rate (0%)", taxRate: 0 },
      { id: "itm-fab", name: "Site fabrication service", sku: null, type: "service", committedAmount: 50000, taxLabel: "Exempt Rate (0%)", taxRate: 0 }
    ]
  });

  const bpo2 = makeBpo({ id: "BPO-0002", vendor: "Vendor 002", bpoDate: "2026-08-11", validityStart: "2026-08-11", validityEnd: "2027-08-11", status: "awaiting-approval", items: buildGenericItems(125750) });
  const bpo3 = makeBpo({ id: "BPO-0003", vendor: "Vendor 003", bpoDate: "2026-09-23", validityStart: "2026-09-23", validityEnd: "2027-09-23", status: "approved", items: buildGenericItems(76430) });
  const bpo4 = makeBpo({ id: "BPO-0004", vendor: "Vendor 004", bpoDate: "2026-10-15", validityStart: "2026-10-15", validityEnd: "2027-10-15", status: "on-hold", items: buildGenericItems(142500) });
  const bpo5 = makeBpo({ id: "BPO-0005", vendor: "Vendor 005", bpoDate: "2026-11-02", validityStart: "2026-11-02", validityEnd: "2027-11-02", status: "rejected", items: buildGenericItems(89300) });
  const bpo6 = makeBpo({ id: "BPO-0006", vendor: "Vendor 006", bpoDate: "2026-12-18", validityStart: "2026-12-18", validityEnd: "2027-12-18", status: "cancelled", items: buildGenericItems(110200) });

  const bpo7Items = buildGenericItems(134950);
  const bpo7 = makeBpo({
    id: "BPO-0007",
    vendor: "Vendor 007",
    bpoDate: "2026-01-29",
    validityStart: "2026-01-29",
    validityEnd: "2027-06-29",
    status: "active",
    items: bpo7Items,
    releases: [
      { id: uid("rel"), releaseDate: "2026-03-01", deliveryDate: "2026-03-03", allocations: { [bpo7Items[0].id]: 25, [bpo7Items[1].id]: Math.round(bpo7Items[1].committedAmount / 4) }, status: "released", poNumber: "PO-001", subStatus: "Issued" },
      { id: uid("rel"), releaseDate: "2026-06-01", deliveryDate: "2026-06-03", allocations: { [bpo7Items[0].id]: 25, [bpo7Items[1].id]: Math.round(bpo7Items[1].committedAmount / 4) }, status: "released", poNumber: "PO-002", subStatus: "Issued" },
      { id: uid("rel"), releaseDate: "2026-09-01", deliveryDate: "2026-09-03", allocations: { [bpo7Items[0].id]: 25, [bpo7Items[1].id]: Math.round(bpo7Items[1].committedAmount / 4) }, status: "scheduled", poNumber: null },
      { id: uid("rel"), releaseDate: "2026-12-01", deliveryDate: "2026-12-03", allocations: { [bpo7Items[0].id]: 25, [bpo7Items[1].id]: Math.round(bpo7Items[1].committedAmount / 4) }, status: "scheduled", poNumber: null }
    ]
  });

  const bpo8Items = buildGenericItems(97800);
  const bpo8 = makeBpo({
    id: "BPO-0008",
    vendor: "Vendor 008",
    bpoDate: "2026-02-14",
    validityStart: "2026-02-14",
    validityEnd: "2026-06-30",
    status: "expired",
    items: bpo8Items,
    releases: [{ id: uid("rel"), releaseDate: "2026-03-01", deliveryDate: "2026-03-03", allocations: { [bpo8Items[0].id]: 40, [bpo8Items[1].id]: Math.round(bpo8Items[1].committedAmount / 2) }, status: "released", poNumber: "PO-001", subStatus: "Issued" }]
  });

  const bpo9Items = buildGenericItems(121650);
  const bpo9 = makeBpo({
    id: "BPO-0009",
    vendor: "Vendor 009",
    bpoDate: "2026-03-30",
    validityStart: "2026-03-30",
    validityEnd: "2027-09-30",
    status: "closed",
    items: bpo9Items,
    releases: [{ id: uid("rel"), releaseDate: "2026-04-15", deliveryDate: "2026-04-17", allocations: { [bpo9Items[0].id]: 60, [bpo9Items[1].id]: Math.round(bpo9Items[1].committedAmount * 0.6) }, status: "released", poNumber: "PO-001", subStatus: "Issued" }]
  });

  return [bpo1, bpo2, bpo3, bpo4, bpo5, bpo6, bpo7, bpo8, bpo9];
}

/* ---------------------------------------------------------------------- */
/* State                                                                   */
/* ---------------------------------------------------------------------- */
const state = {
  route: "bpo-list",
  bpos: seedBpos(),
  selectedBpoId: "BPO-0001",
  detailTab: "details",
  formDraft: null,
  configure: null,
  releaseDraft: null,
  poDetailsId: null,
  newPoVendor: null,
  newPoMode: null
};

state.bpos.forEach(processAutoReleases);

function getBpo(id) {
  return state.bpos.find((b) => b.id === id);
}

function selectedBpo() {
  return getBpo(state.selectedBpoId) || state.bpos[0];
}

/* ---------------------------------------------------------------------- */
/* DOM roots                                                               */
/* ---------------------------------------------------------------------- */
const pageRoot = document.getElementById("page-root");
const overlayRoot = document.getElementById("overlay-root");
const toastRoot = document.getElementById("toast-root");
const sidebarRoot = document.getElementById("sidebar");

function toast(msg) {
  toastRoot.innerHTML = `<div class="toast">${escapeHtml(msg)}</div>`;
  setTimeout(() => { toastRoot.innerHTML = ""; }, 2600);
}

function goto(route, extra) {
  state.route = route;
  Object.assign(state, extra || {});
  render();
  window.scrollTo(0, 0);
}

function closeOverlay() {
  overlayRoot.innerHTML = "";
}

/* ---------------------------------------------------------------------- */
/* Sidebar                                                                 */
/* ---------------------------------------------------------------------- */
const NAV_ITEMS = [
  { id: "home", icon: "&#8962;", label: "Home" },
  { id: "requests", icon: "&#128196;", label: "My Requests" },
  { id: "approvals", icon: "&#9989;", label: "Approvals" },
  { id: "items", icon: "&#128230;", label: "Items" },
  { id: "vendors", icon: "&#128101;", label: "Vendors" }
];

const PROCUREMENT_SUB = [
  { id: "purchase-requests", label: "Purchase Requests" },
  { id: "rfq", label: "Request for Quotes" },
  { id: "blanket-po", label: "Blanket PO" },
  { id: "new-po", label: "Purchase Orders" },
  { id: "purchase-receives", label: "Purchase Receives" }
];

const NAV_ITEMS_AFTER = [
  { id: "payables", icon: "&#128179;", label: "Payables" },
  { id: "budgets", icon: "&#128202;", label: "Budgets" },
  { id: "analytics", icon: "&#128200;", label: "Analytics" }
];

function renderSidebar() {
  const inertBtn = (item) => `<button class="nav-item" data-inert="${item.id}"><span class="ic">${item.icon}</span>${item.label}</button>`;

  const subHtml = PROCUREMENT_SUB.map((s) => {
    const isCurrent = (s.id === "blanket-po" && ["bpo-list", "bpo-form", "configure-releases", "release-po", "po-details"].includes(state.route)) || (s.id === "new-po" && state.route === "new-po");
    return `<button class="nav-item ${isCurrent ? "current" : ""}" data-nav="${s.id}">${s.label}</button>`;
  }).join("");

  sidebarRoot.innerHTML = `
    ${NAV_ITEMS.map(inertBtn).join("")}
    <div class="nav-group">
      <button class="nav-item active"><span class="ic">&#128274;</span>Procurement</button>
      <div class="nav-sub">${subHtml}</div>
    </div>
    ${NAV_ITEMS_AFTER.map(inertBtn).join("")}
  `;

  sidebarRoot.querySelectorAll("[data-inert]").forEach((b) => b.addEventListener("click", () => toast("This module isn't part of the prototype.")));
  sidebarRoot.querySelectorAll("[data-nav]").forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.dataset.nav;
      if (id === "blanket-po") goto("bpo-list");
      else if (id === "new-po") goto("new-po", { newPoVendor: null, newPoMode: null });
      else toast("This module isn't part of the prototype.");
    });
  });
}

/* ---------------------------------------------------------------------- */
/* Page: Blanket PO list + detail                                          */
/* ---------------------------------------------------------------------- */
function whatsNext(bpo) {
  const totals = bpoTotals(bpo);
  const nextScheduled = bpo.releases.filter((r) => r.status === "scheduled").sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))[0];

  if (bpo.status === "draft") {
    return { text: "Submit this Blanket Purchase Order for approval.", actions: [{ label: "Submit For Approval", primary: true, action: "submit" }] };
  }
  if (bpo.status === "awaiting-approval") {
    return { text: "This Blanket Purchase Order is awaiting approval.", actions: [{ label: "Approve", primary: true, action: "approve" }, { label: "Reject", action: "reject" }] };
  }
  if (bpo.status === "approved") {
    return { text: "The Blanket Purchase Order has been approved. Schedule future purchase order releases.", actions: [{ label: "Mark as Active", primary: true, action: "mark-active" }] };
  }
  if (bpo.status === "on-hold") {
    return { text: "This Blanket Purchase Order is currently on hold.", actions: [{ label: "Resume", primary: true, action: "resume" }] };
  }
  if (bpo.status === "active") {
    if (bpo.releases.length === 0) {
      return { text: "The Blanket Purchase Order is active. Schedule future releases or create a Purchase Order manually.", actions: [{ label: "Schedule", action: "configure" }, { label: "Create Purchase Order", primary: true, action: "create-po" }] };
    }
    if (nextScheduled) {
      return { text: `Next release scheduled on "${toDisplayDate(nextScheduled.releaseDate)}".`, actions: [{ label: "Release Now", primary: true, action: "release-now-next", id: nextScheduled.id }] };
    }
    if (totals.remaining > 0) {
      return { text: "All scheduled releases are complete. Remaining commitment is still available to release.", actions: [{ label: "Configure Releases", action: "configure" }, { label: "Create Purchase Order", primary: true, action: "create-po" }] };
    }
    return { text: "The entire committed value has been released.", actions: [{ label: "Close Blanket PO", action: "close" }] };
  }
  if (bpo.status === "expired") {
    return { text: "Validity period has ended. No new releases can be created.", actions: [] };
  }
  if (bpo.status === "closed") {
    return null;
  }
  if (bpo.status === "cancelled" || bpo.status === "rejected") {
    return null;
  }
  return null;
}

function headActions(bpo) {
  const btns = [];
  const hasReleasedPo = releasedPoCount(bpo) > 0;

  if (bpo.status === "draft") {
    btns.push({ label: "Edit", action: "edit" }, { label: "Delete", action: "delete", danger: true });
  } else if (bpo.status === "awaiting-approval") {
    btns.push({ label: "Approve", action: "approve", primary: true }, { label: "Reject", action: "reject" }, { label: "Edit", action: "edit" });
  } else if (bpo.status === "approved") {
    btns.push({ label: "Mark Active", action: "mark-active", primary: true }, { label: "Configure Releases", action: "configure" }, { label: "Cancel Blanket", action: "cancel", danger: true });
  } else if (bpo.status === "on-hold") {
    btns.push({ label: "Resume", action: "resume", primary: true }, { label: "Cancel Blanket", action: "cancel", danger: true });
  } else if (bpo.status === "active") {
    btns.push({ label: "Create Purchase Order", action: "create-po", primary: true });
    btns.push({ label: "Configure Releases", action: "configure" });
    if (bpo.releases.some((r) => r.status === "scheduled")) btns.push({ label: "Release Now", action: "release-menu" });
    if (!hasReleasedPo) btns.push({ label: "Cancel Blanket", action: "cancel", danger: true });
    else btns.push({ label: "Close Blanket", action: "close" });
  } else if (bpo.status === "expired") {
    btns.push({ label: "Create Purchase Order", action: "create-po", disabled: true });
    btns.push({ label: "Configure Releases", action: "configure", disabled: true });
  } else if (bpo.status === "closed" || bpo.status === "cancelled" || bpo.status === "rejected") {
    // read-only, no actions
  }
  btns.push({ label: "PDF/Print", action: "pdf" });
  return btns;
}

function handleHeadAction(bpo, action, extra) {
  if (action === "pdf") { toast("Generating PDF preview…"); return; }
  if (action === "edit") { goto("bpo-form", { formDraft: cloneForEdit(bpo) }); return; }
  if (action === "delete") { state.bpos = state.bpos.filter((b) => b.id !== bpo.id); state.selectedBpoId = state.bpos[0]?.id; goto("bpo-list"); toast("Draft deleted."); return; }
  if (action === "submit") { bpo.status = "awaiting-approval"; logActivity(bpo, "Submitted for Approval", "Sent to procurement approver"); render(); return; }
  if (action === "approve") { bpo.status = "approved"; logActivity(bpo, "Blanket Purchase Order Approved", "Approved by Procurement Manager"); render(); return; }
  if (action === "reject") { bpo.status = "rejected"; logActivity(bpo, "Blanket Purchase Order Rejected", "Rejected by Procurement Manager"); render(); return; }
  if (action === "mark-active") { bpo.status = "active"; logActivity(bpo, "Blanket Purchase Order Activated", "Marked as Active"); render(); return; }
  if (action === "resume") { bpo.status = "approved"; logActivity(bpo, "Resumed from Hold", ""); render(); return; }
  if (action === "cancel") {
    if (releasedPoCount(bpo) > 0) { toast("Cannot cancel — Purchase Orders already released."); return; }
    bpo.status = "cancelled"; logActivity(bpo, "Blanket Purchase Order Cancelled", "Cancelled before any release"); render(); return;
  }
  if (action === "close") { bpo.status = "closed"; logActivity(bpo, "Blanket Purchase Order Closed", "Closed with remaining commitment retained"); render(); return; }
  if (action === "configure") { openConfigureEntry(bpo); return; }
  if (action === "create-po") { openReleasePo(bpo, null); return; }
  if (action === "release-now-next" || action === "release-now") { openReleasePo(bpo, extra.id); return; }
  if (action === "release-menu") { openReleaseMenu(bpo); return; }
}

function cloneForEdit(bpo) {
  return JSON.parse(JSON.stringify(bpo));
}

function renderBpoList() {
  const bpo = selectedBpo();
  const totals = bpoTotals(bpo);

  const rows = state.bpos
    .map((b) => {
      const t = bpoTotals(b);
      return `
      <div class="bpo-row ${b.id === bpo.id ? "active" : ""}" data-select="${b.id}">
        <div class="bpo-row-top">
          <div>
            <div class="bpo-row-vendor">${escapeHtml(b.vendor.name)}</div>
            <div class="bpo-row-meta">${b.id} · ${toDisplayDate(b.bpoDate)}</div>
          </div>
          ${badge(b.status)}
        </div>
        <div class="bpo-row-amount">${currency(t.committed)}</div>
      </div>`;
    })
    .join("");

  pageRoot.innerHTML = `
    <div class="page-header">
      <div>
        <div class="breadcrumb">Location: Head Office</div>
        <h1>#${bpo.id}</h1>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" id="create-bpo">+ Create Blanket PO</button>
      </div>
    </div>
    <div class="split-layout">
      <section class="list-panel">
        <div class="list-panel-head"><span>All Blanket Purchase Orders</span></div>
        <div>${rows}</div>
      </section>
      <section class="detail-panel" id="detail-panel"></section>
    </div>
  `;

  document.getElementById("create-bpo").addEventListener("click", () => goto("bpo-form", { formDraft: newDraft() }));
  pageRoot.querySelectorAll("[data-select]").forEach((row) => {
    row.addEventListener("click", () => { state.selectedBpoId = row.dataset.select; state.detailTab = "details"; renderBpoList(); });
  });

  renderDetailPanel(bpo, totals);
}

function renderDetailPanel(bpo, totals) {
  const panel = document.getElementById("detail-panel");
  const next = whatsNext(bpo);
  const actions = headActions(bpo);
  const releasesLabel = bpo.releases.length ? `Releases (${bpo.releases.length})` : "Releases";
  const tabs = [
    { id: "details", label: "Details" },
    { id: "releases", label: releasesLabel },
    { id: "activity", label: "Activity Logs" }
  ];

  panel.innerHTML = `
    <div class="detail-head">
      <div class="detail-head-top">
        <div><strong>#${bpo.id}</strong></div>
        <div class="detail-head-actions">
          ${actions.map((a, i) => `<button class="btn ${a.primary ? "btn-primary" : ""} ${a.danger ? "btn-danger" : ""}" data-action="${a.action}" data-idx="${i}" ${a.disabled ? "disabled" : ""}>${a.label}</button>`).join("")}
        </div>
      </div>
    </div>
    <div class="detail-summary">
      <div class="detail-summary-top">
        <div>
          <div class="muted" style="font-size:11px">Vendor Name</div>
          <p class="detail-vendor-name">${escapeHtml(bpo.vendor.name)}</p>
          ${badge(bpo.status, true)}
        </div>
        <div class="detail-metrics">
          <div class="detail-metric"><label>Committed</label><strong>${currency(totals.committed)}</strong></div>
          <div class="detail-metric"><label>Released Value</label><strong>${currency(totals.released)}</strong></div>
          <div class="detail-metric"><label>Remaining</label><strong>${currency(totals.remaining)}</strong></div>
          <div class="detail-metric consumption-bar-wrap">
            <label>Consumption Status &nbsp;${totals.pct}%</label>
            <div class="progress"><span style="width:${Math.min(totals.pct, 100)}%"></span></div>
          </div>
        </div>
      </div>
      <div class="meta-line">
        <span>Expiry Date: <b>${toDisplayDate(bpo.validityEnd)}</b></span>
        <span>Purchase Period: <b>${toDisplayDate(bpo.validityStart)} - ${toDisplayDate(bpo.validityEnd)}</b></span>
        <span>${releasedPoCount(bpo)} Purchase Order${releasedPoCount(bpo) === 1 ? "" : "s"}</span>
      </div>
    </div>
    ${
      next
        ? `<div class="whats-next"><div><span class="wn-label">What's Next</span><span class="wn-text">${next.text}</span></div><div class="wn-actions">${next.actions.map((a) => `<button class="btn ${a.primary ? "btn-primary" : ""}" data-next="${a.action}" data-nid="${a.id || ""}">${a.label}</button>`).join("")}</div></div>`
        : bpo.status === "cancelled"
        ? `<div class="readonly-banner">This Blanket Purchase Order has been cancelled and is read-only.</div>`
        : bpo.status === "closed"
        ? `<div class="readonly-banner">This Blanket Purchase Order is closed.${totals.remaining > 0 ? ` Remaining commitment of ${currency(totals.remaining)} will not be released further.` : ""}</div>`
        : bpo.status === "rejected"
        ? `<div class="readonly-banner">This Blanket Purchase Order was rejected.</div>`
        : ""
    }
    <div class="tabs">${tabs.map((t) => `<button class="tab-btn ${state.detailTab === t.id ? "active" : ""}" data-tab="${t.id}">${t.label}</button>`).join("")}</div>
    <div class="tab-body" id="tab-body"></div>
  `;

  panel.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => handleHeadAction(bpo, btn.dataset.action));
  });
  panel.querySelectorAll("[data-next]").forEach((btn) => {
    btn.addEventListener("click", () => handleHeadAction(bpo, btn.dataset.next, { id: btn.dataset.nid }));
  });
  panel.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => { state.detailTab = btn.dataset.tab; renderBpoList(); });
  });

  renderTabBody(bpo);
}

function renderTabBody(bpo) {
  const body = document.getElementById("tab-body");
  if (state.detailTab === "details") {
    body.innerHTML = renderDetailsTab(bpo);
    return;
  }
  if (state.detailTab === "activity") {
    body.innerHTML = bpo.activity.length
      ? bpo.activity.map((e) => `<div class="activity-item"><h4>${escapeHtml(e.title)}</h4><p>${escapeHtml(e.note)}</p><p>${e.when}</p></div>`).join("")
      : `<p class="muted">No activity yet.</p>`;
    return;
  }
  if (state.detailTab === "releases") {
    body.innerHTML = renderReleasesTab(bpo);
    wireReleasesTab(bpo);
  }
}

function renderDetailsTab(bpo) {
  const itemRows = bpo.items
    .map((item) => {
      const committed = committedValue(item);
      const released = itemReleasedValue(bpo, item);
      const pct = committed > 0 ? Math.min(100, Math.round((released / committed) * 100)) : 0;
      const qtyLabel = item.type === "goods" ? `${item.committedQty} ${item.unit}` : "-";
      const releasedLabel = item.type === "goods" ? `${releasedSum(bpo, item.id)} / ${item.committedQty} ${item.unit}` : `${currency(released)} / ${currency(committed)}`;
      return `
      <tr>
        <td><div class="item-name">${escapeHtml(item.name)}</div><div class="item-sub">${item.sku ? item.sku : ""} <span class="tag ${item.type === "goods" ? "tag-goods" : "tag-service"}">${item.type === "goods" ? "Goods" : "Service"}</span></div></td>
        <td>${qtyLabel}</td>
        <td>${item.type === "goods" ? currency(item.rate) : "-"}</td>
        <td>${item.taxLabel}</td>
        <td>${currency(committed)}</td>
        <td>
          <div class="progress" style="width:110px"><span style="width:${pct}%"></span></div>
          <div class="muted" style="font-size:10.5px;margin-top:3px">${releasedLabel}</div>
        </td>
      </tr>`;
    })
    .join("");

  const totals = bpoTotals(bpo);

  return `
    <div class="form-grid" style="margin-bottom:16px">
      <div class="address-box"><strong>Vendor</strong>${escapeHtml(bpo.vendor.name)}<br/>${bpo.vendor.billing.line1}, ${bpo.vendor.billing.line2}<br/>${bpo.vendor.billing.line3}, ${bpo.vendor.billing.line4}</div>
      <div class="address-box"><strong>Purchase Information</strong>Period: ${toDisplayDate(bpo.validityStart)} - ${toDisplayDate(bpo.validityEnd)}<br/>Payment Terms: ${bpo.paymentTerms}</div>
      <div class="address-box"><strong>Order Details</strong>Reference: ${bpo.reference}<br/>Warehouse: ${bpo.warehouse}</div>
    </div>
    <div class="section-title">Items</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Item</th><th>Committed Qty</th><th>Rate</th><th>Tax</th><th>Amount</th><th>Consumption</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>
    <div class="totals-box" style="margin-top:14px">
      <div class="totals-row"><span>Sub Total</span><span>${currency(totals.committed)}</span></div>
      <div class="totals-row"><span>Released Value</span><span>${currency(totals.released)}</span></div>
      <div class="totals-row grand"><span>Total Committed</span><span>${currency(totals.committed)}</span></div>
    </div>
    <div class="form-grid" style="margin-top:20px">
      <div class="field"><label>Notes</label><textarea disabled>${escapeHtml(bpo.notes)}</textarea></div>
      <div class="field"><label>Terms and Conditions</label><textarea disabled>${bpo.terms ? escapeHtml(bpo.terms) : "No Terms and Conditions"}</textarea></div>
    </div>
  `;
}

function releaseItemsSummary(bpo, release) {
  const goods = bpo.items.filter((i) => i.type === "goods" && release.allocations[i.id]).length;
  const services = bpo.items.filter((i) => i.type === "service" && release.allocations[i.id]).length;
  const parts = [];
  if (goods) parts.push(`${goods} Item${goods > 1 ? "s" : ""}`);
  if (services) parts.push(`${services} Service${services > 1 ? "s" : ""}`);
  return parts.join(", ") || "-";
}

function renderReleasesTab(bpo) {
  if (!bpo.releases.length) {
    return `
      <div class="empty-state">
        <div class="empty-illustration">&#128203;</div>
        <h3>No Releases Configured</h3>
        <p>Plan future Purchase Orders by configuring release schedules, or create one manually right away.</p>
        <div class="empty-actions">
          <button class="btn" data-empty="configure">Configure Releases</button>
          <button class="btn btn-primary" data-empty="create-po">Create Purchase Order</button>
        </div>
      </div>`;
  }

  const rows = bpo.releases
    .map((r, idx) => {
      const amount = releaseAllocationValue(bpo, r.allocations);
      let actionBtn = "";
      if (r.status === "released") actionBtn = `<button class="btn btn-sm" data-view-po="${r.id}">View PO</button>`;
      else if (r.status === "scheduled") actionBtn = `<button class="btn btn-sm" data-view-schedule="${r.id}">View Details</button>`;
      else actionBtn = `<button class="btn btn-sm" data-view-schedule="${r.id}">View</button>`;

      return `
      <tr>
        <td>${idx + 1}</td>
        <td>${toDisplayDate(r.releaseDate)}</td>
        <td>${r.poNumber ? `<a href="#" data-view-po="${r.id}" class="btn-text" style="padding:0">${r.poNumber}</a>` : "-"}</td>
        <td>${toDisplayDate(r.deliveryDate)}</td>
        <td>${releaseItemsSummary(bpo, r)}</td>
        <td>${badge(r.status)}</td>
        <td>${currency(amount)}</td>
        <td>${actionBtn}</td>
      </tr>`;
    })
    .join("");

  return `
    <div class="section-title" style="display:flex;justify-content:space-between;align-items:center">
      <span>Releases</span>
      ${bpo.status === "active" ? `<button class="btn btn-sm" data-empty="configure">Configure Releases</button>` : ""}
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>S.No</th><th>Release Date</th><th>Purchase Order</th><th>Delivery Date</th><th>Items</th><th>Status</th><th>Amount</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function wireReleasesTab(bpo) {
  const body = document.getElementById("tab-body");
  body.querySelectorAll("[data-empty]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.empty === "configure") openConfigureEntry(bpo);
      else openReleasePo(bpo, null);
    });
  });
  body.querySelectorAll("[data-view-po]").forEach((btn) => {
    btn.addEventListener("click", (e) => { e.preventDefault(); goto("po-details", { poDetailsId: btn.dataset.viewPo }); });
  });
  body.querySelectorAll("[data-view-schedule]").forEach((btn) => {
    btn.addEventListener("click", () => openScheduleDrawer(bpo.id, btn.dataset.viewSchedule));
  });
}

function openReleaseMenu(bpo) {
  const scheduled = bpo.releases.filter((r) => r.status === "scheduled").sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
  overlayRoot.innerHTML = `
    <div class="overlay-backdrop" id="ov-bg"></div>
    <div class="modal-center">
      <div class="modal" style="width:min(420px,92vw)">
        <div class="modal-head"><strong>Release a scheduled Purchase Order</strong><button class="close-x" id="ov-close">&times;</button></div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-primary" data-release-all>Release All</button>
          ${scheduled.map((r) => `<button class="btn" data-release="${r.id}">Release ${toDisplayDate(r.releaseDate)} · ${currency(releaseAllocationValue(bpo, r.allocations))}</button>`).join("")}
        </div>
      </div>
    </div>`;
  document.getElementById("ov-close").addEventListener("click", closeOverlay);
  document.getElementById("ov-bg").addEventListener("click", closeOverlay);
  overlayRoot.querySelectorAll("[data-release]").forEach((b) => b.addEventListener("click", () => { closeOverlay(); openReleasePo(bpo, b.dataset.release); }));
  const allBtn = overlayRoot.querySelector("[data-release-all]");
  if (allBtn) allBtn.addEventListener("click", () => {
    scheduled.forEach((r) => { r.status = "released"; r.poNumber = nextPoNumber(bpo); r.subStatus = "Issued"; });
    logActivity(bpo, "All scheduled releases issued", "Released ahead of schedule");
    closeOverlay();
    render();
  });
}

/* ---------------------------------------------------------------------- */
/* Schedule details drawer                                                 */
/* ---------------------------------------------------------------------- */
function openScheduleDrawer(bpoId, releaseId) {
  const bpo = getBpo(bpoId);
  const r = bpo.releases.find((x) => x.id === releaseId);
  if (!r) return;

  const rows = bpo.items
    .filter((i) => r.allocations[i.id])
    .map((i) => `<tr><td>${escapeHtml(i.name)}</td><td>${i.type === "goods" ? `${r.allocations[i.id]} ${i.unit}` : currency(r.allocations[i.id])}</td></tr>`)
    .join("");

  const amount = releaseAllocationValue(bpo, r.allocations);
  const editable = r.status === "scheduled";

  overlayRoot.innerHTML = `
    <div class="overlay-backdrop" id="ov-bg"></div>
    <aside class="drawer">
      <div class="drawer-head">
        <div><strong>Scheduled Release</strong><div class="muted" style="font-size:11px">${bpo.id}</div></div>
        <button class="close-x" id="ov-close">&times;</button>
      </div>
      <div class="drawer-body">
        <div class="form-grid" style="grid-template-columns:1fr 1fr">
          <div class="field"><label>Release Date</label><input type="date" id="sched-date" value="${r.releaseDate}" ${editable ? "" : "disabled"}/></div>
          <div class="field"><label>Delivery Date</label><input type="date" id="sched-delivery" value="${r.deliveryDate}" ${editable ? "" : "disabled"}/></div>
        </div>
        <div class="section-title" style="margin-top:16px">Items</div>
        <div class="table-wrap"><table><thead><tr><th>Item</th><th>Allocation</th></tr></thead><tbody>${rows}</tbody></table></div>
        <div class="totals-row grand" style="margin-top:12px"><span>Release Amount</span><span>${currency(amount)}</span></div>
        ${!editable ? `<div class="readonly-banner" style="margin-top:14px">${r.status === "released" ? "This release has been issued as a Purchase Order." : "This schedule was cancelled and is read-only."}</div>` : ""}
      </div>
      <div class="drawer-foot">
        ${editable ? `<button class="btn btn-primary" id="sched-release-now">Release Now</button><button class="btn" id="sched-save">Save</button><button class="btn btn-danger" id="sched-cancel">Cancel Schedule</button><button class="btn btn-danger" id="sched-delete">Delete</button>` : r.status === "released" ? `<button class="btn btn-primary" id="sched-view-po">View Purchase Order</button>` : `<button class="btn" id="ov-close2">Close</button>`}
      </div>
    </aside>`;

  document.getElementById("ov-close").addEventListener("click", closeOverlay);
  document.getElementById("ov-bg").addEventListener("click", closeOverlay);
  const closeBtn2 = document.getElementById("ov-close2");
  if (closeBtn2) closeBtn2.addEventListener("click", closeOverlay);

  const viewPoBtn = document.getElementById("sched-view-po");
  if (viewPoBtn) viewPoBtn.addEventListener("click", () => { closeOverlay(); goto("po-details", { poDetailsId: r.id }); });

  const releaseNowBtn = document.getElementById("sched-release-now");
  if (releaseNowBtn) releaseNowBtn.addEventListener("click", () => { closeOverlay(); openReleasePo(bpo, r.id); });

  const saveBtn = document.getElementById("sched-save");
  if (saveBtn) saveBtn.addEventListener("click", () => {
    r.releaseDate = document.getElementById("sched-date").value || r.releaseDate;
    r.deliveryDate = document.getElementById("sched-delivery").value || r.deliveryDate;
    closeOverlay();
    render();
    toast("Schedule updated.");
  });

  const cancelBtn = document.getElementById("sched-cancel");
  if (cancelBtn) cancelBtn.addEventListener("click", () => {
    r.status = "cancelled";
    logActivity(bpo, "Scheduled release cancelled", `${toDisplayDate(r.releaseDate)} schedule cancelled; allocation returned`);
    closeOverlay();
    render();
  });

  const deleteBtn = document.getElementById("sched-delete");
  if (deleteBtn) deleteBtn.addEventListener("click", () => {
    bpo.releases = bpo.releases.filter((x) => x.id !== r.id);
    closeOverlay();
    render();
  });
}

/* ---------------------------------------------------------------------- */
/* Configure Releases                                                      */
/* ---------------------------------------------------------------------- */
function openConfigureEntry(bpo) {
  const hasExisting = bpo.releases.some((r) => r.status === "scheduled" || r.status === "released");
  if (hasExisting) {
    state.configure = { bpoId: bpo.id, sourceIsAuto: true, rows: buildTempScheduleFromBpo(bpo) };
    goto("configure-releases");
  } else {
    goto("configure-choice", { configure: { bpoId: bpo.id } });
  }
}

function buildTempScheduleFromBpo(bpo) {
  return bpo.releases
    .filter((r) => r.status === "released" || r.status === "scheduled")
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
    .map((r) => ({ id: r.id, releaseDate: r.releaseDate, deliveryDate: r.deliveryDate, locked: r.status === "released", allocations: { ...r.allocations } }));
}

function renderConfigureChoice() {
  const bpo = getBpo(state.configure.bpoId);
  pageRoot.innerHTML = `
    <div class="page-header">
      <div><div class="breadcrumb">${bpo.id}</div><h1>Schedule Releases For Blanket Purchase Order</h1></div>
      <button class="btn" id="cc-cancel">Cancel</button>
    </div>
    <div class="card">
      <div class="choice-wrap">
        <div class="empty-illustration" style="margin:0 auto">&#128197;</div>
        <h3>Plan future Purchase Orders</h3>
        <p class="muted">Generate release schedules automatically or configure them manually.</p>
        <div class="choice-actions">
          <button class="btn btn-primary" id="cc-auto">Auto Generate Schedules</button>
          <button class="btn" id="cc-manual">Schedule Manually</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById("cc-cancel").addEventListener("click", () => goto("bpo-list"));
  document.getElementById("cc-auto").addEventListener("click", () => openAutoGenerateModal(bpo, false));
  document.getElementById("cc-manual").addEventListener("click", () => {
    state.configure = { bpoId: bpo.id, sourceIsAuto: false, rows: [{ id: uid("rel"), releaseDate: "", deliveryDate: "", locked: false, allocations: {} }] };
    goto("configure-releases");
  });
}

function openAutoGenerateModal(bpo, fromMatrix) {
  const today = fromMatrix ? state.configure.rows.find((r) => !r.locked)?.releaseDate || TODAY : bpo.validityStart;
  overlayRoot.innerHTML = `
    <div class="overlay-backdrop" id="ov-bg"></div>
    <div class="modal-center">
      <div class="modal">
        <div class="modal-head"><strong>Auto Generate Schedules</strong><button class="close-x" id="ov-close">&times;</button></div>
        <div class="modal-body">
          <div class="form-grid" style="grid-template-columns:1fr 1fr">
            <div class="field"><label>Generate From <span class="req">*</span></label><input type="date" id="ag-from" value="${today}"/></div>
            <div class="field"><label>Generate Until <span class="req">*</span></label><input type="date" id="ag-until" value="${bpo.validityEnd}"/></div>
          </div>
          <div class="field" style="margin-top:12px">
            <label>Frequency <span class="req">*</span></label>
            <div style="display:flex;gap:8px">
              <input type="number" min="1" id="ag-interval" value="1" style="width:80px"/>
              <select id="ag-unit">
                <option value="day">Day(s)</option>
                <option value="week">Week(s)</option>
                <option value="month" selected>Month(s)</option>
                <option value="year">Year(s)</option>
              </select>
            </div>
          </div>
          <div class="field" style="margin-top:12px"><label>First Release Date <span class="req">*</span></label><input type="date" id="ag-first" value="${today}"/></div>
          <div class="notice" style="margin-top:14px">The committed item quantities and service amounts will be distributed evenly across all schedules. For service line items, the amount will be allocated based on the rate for each schedule.</div>
          <p class="muted" id="ag-preview" style="margin-top:10px"></p>
        </div>
        <div class="modal-foot">
          <button class="btn" id="ov-close2">Cancel</button>
          <button class="btn btn-primary" id="ag-generate">Generate & View Schedules</button>
        </div>
      </div>
    </div>`;

  function updatePreview() {
    const from = document.getElementById("ag-first").value;
    const until = document.getElementById("ag-until").value;
    const n = Number(document.getElementById("ag-interval").value) || 1;
    const unit = document.getElementById("ag-unit").value;
    if (!from || !until) { document.getElementById("ag-preview").textContent = ""; return; }
    const dates = computeScheduleDates(from, until, n, unit);
    document.getElementById("ag-preview").textContent = `Total Releases: ${dates.length}  ·  Last Release Date: ${toDisplayDate(dates[dates.length - 1] || from)}`;
  }
  ["ag-first", "ag-until", "ag-interval", "ag-unit"].forEach((id) => document.getElementById(id).addEventListener("input", updatePreview));
  updatePreview();

  document.getElementById("ov-close").addEventListener("click", closeOverlay);
  document.getElementById("ov-close2").addEventListener("click", closeOverlay);
  document.getElementById("ov-bg").addEventListener("click", closeOverlay);

  document.getElementById("ag-generate").addEventListener("click", () => {
    const from = document.getElementById("ag-first").value;
    const until = document.getElementById("ag-until").value;
    const n = Number(document.getElementById("ag-interval").value) || 1;
    const unit = document.getElementById("ag-unit").value;
    if (!from || !until) { toast("Please select both dates."); return; }

    const lockedRows = fromMatrix ? state.configure.rows.filter((r) => r.locked) : buildTempScheduleFromBpo(bpo).filter((r) => r.locked);
    const dates = computeScheduleDates(from, until, n, unit);
    const editableRows = dates.map((d) => ({ id: uid("rel"), releaseDate: d, deliveryDate: addInterval(d, 2, "day"), locked: false, allocations: {} }));

    bpo.items.forEach((item) => {
      const avail = availableForScheduling(bpo, item, null); // locked (released) rows already excluded via releasedSum
      const per = editableRows.length ? Math.floor(avail / editableRows.length) : 0;
      editableRows.forEach((row, idx) => {
        const value = idx === editableRows.length - 1 ? avail - per * (editableRows.length - 1) : per;
        row.allocations[item.id] = Math.max(0, item.type === "goods" ? Math.round(value) : Math.round(value * 100) / 100);
      });
    });

    state.configure = { bpoId: bpo.id, sourceIsAuto: true, rows: [...lockedRows, ...editableRows] };
    closeOverlay();
    goto("configure-releases");
  });
}

function computeScheduleDates(from, until, n, unit) {
  const dates = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= until && guard < 200) {
    dates.push(cursor);
    cursor = addInterval(cursor, n, unit);
    guard += 1;
  }
  return dates;
}

function renderConfigureReleases() {
  const bpo = getBpo(state.configure.bpoId);
  const rows = state.configure.rows;

  function itemAllocatedTotal(itemId) {
    return rows.reduce((sum, r) => sum + (r.allocations[itemId] || 0), 0);
  }

  const anyOver = bpo.items.some((item) => {
    const editableTotal = rows.filter((r) => !r.locked).reduce((s, r) => s + (r.allocations[item.id] || 0), 0);
    return editableTotal > availableForScheduling(bpo, item, null) + 0.001;
  });

  const colHeads = rows
    .map(
      (r, idx) => `
    <th>
      <div class="matrix-col-head">
        <span>Release #${idx + 1}${r.locked ? "" : ""}</span>
        ${r.locked ? `<span class="lock" title="Released">&#128274;</span>` : `<button class="matrix-del" data-del-col="${r.id}" title="Remove">&times;</button>`}
      </div>
    </th>`
    )
    .join("");

  const dateRow = (field) => rows.map((r, idx) => `<td>${r.locked ? toDisplayDate(r[field]) : `<input type="date" class="matrix-input" data-idx="${idx}" data-field="${field}" value="${r[field] || ""}"/>`}</td>`).join("");

  const itemRows = bpo.items
    .map((item) => {
      const committed = item.type === "goods" ? item.committedQty : item.committedAmount;
      const allocated = itemAllocatedTotal(item.id);
      const pct = committed > 0 ? Math.min(100, Math.round((allocated / committed) * 100)) : 0;
      const editableTotal = rows.filter((r) => !r.locked).reduce((s, r) => s + (r.allocations[item.id] || 0), 0);
      const over = editableTotal > availableForScheduling(bpo, item, null) + 0.001;
      const label = item.type === "goods" ? `${allocated} / ${committed} ${item.unit}` : `${currency(allocated)} / ${currency(committed)}`;

      const cells = rows
        .map((r, idx) => {
          const v = r.allocations[item.id] || 0;
          if (r.locked) return `<td><div class="matrix-static">${item.type === "goods" ? `${v} ${item.unit}` : currency(v)}</div></td>`;
          return `<td><input class="matrix-input ${over ? "over" : ""}" data-idx="${idx}" data-item="${item.id}" type="number" min="0" value="${v}"/></td>`;
        })
        .join("");

      return `
      <tr>
        <td><div class="item-name">${escapeHtml(item.name)}</div><div class="item-sub">${item.sku || ""} <span class="tag ${item.type === "goods" ? "tag-goods" : "tag-service"}">${item.type === "goods" ? "Goods" : "Service"}</span></div></td>
        ${cells}
        <td class="col-alloc">
          <div class="alloc-row">
            <div class="alloc-row-label"><span>${label}</span></div>
            <div class="progress ${over ? "over" : ""}"><span style="width:${Math.min(pct, 100)}%"></span></div>
            ${over ? `<div class="alloc-warning">&#9888; Scheduling quantities cannot exceed the committed quantities.</div>` : ""}
          </div>
        </td>
      </tr>`;
    })
    .join("");

  const releaseValueRow = rows.map((r) => `<td>${currency(releaseAllocationValue(bpo, r.allocations))}</td>`).join("");

  const canMarkActive = bpo.status !== "active";

  pageRoot.innerHTML = `
    <div class="page-header">
      <div><div class="breadcrumb">#${bpo.id}</div><h1>Schedule Releases For Blanket Purchase Order</h1></div>
      <button class="btn-text" id="toggle-auto">${state.configure.sourceIsAuto ? "Re-Generate Schedules" : "Auto Generate Schedules"}</button>
    </div>
    <div class="notice" style="margin-bottom:12px">Purchase Orders will be released on their scheduled dates. Any unallocated quantities or service amounts remain available and can be released manually at any time before the Blanket Purchase Order expires.</div>
    <div class="matrix-scroll">
      <table class="matrix-table">
        <thead>
          <tr><th>Schedule Details</th>${colHeads}<th class="col-alloc">Allocation<button class="matrix-add-col" id="add-col" title="Add release">+</button></th></tr>
        </thead>
        <tbody>
          <tr class="matrix-group"><td>Order Details</td>${rows.map(() => "<td></td>").join("")}<td></td></tr>
          <tr><td>Release Date</td>${dateRow("releaseDate")}<td class="muted">-</td></tr>
          <tr><td>Delivery Date</td>${dateRow("deliveryDate")}<td class="muted">-</td></tr>
          <tr class="matrix-group"><td>Items</td>${rows.map(() => "<td></td>").join("")}<td></td></tr>
          ${itemRows}
          <tr class="matrix-group"><td>Order Summary</td>${rows.map(() => "<td></td>").join("")}<td></td></tr>
          <tr><td>Release Value</td>${releaseValueRow}<td class="muted">${currency(rows.reduce((s, r) => s + releaseAllocationValue(bpo, r.allocations), 0))}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="form-footer" style="margin-top:14px;border-radius:10px;border:1px solid var(--border)">
      ${canMarkActive ? `<button class="btn btn-primary" id="save-activate" ${anyOver ? "disabled" : ""}>Save & Mark as Active</button>` : ""}
      <button class="btn" id="save-only" ${anyOver ? "disabled" : ""}>Save</button>
      <button class="btn" id="cfg-cancel">Cancel</button>
    </div>
  `;

  document.getElementById("cfg-cancel").addEventListener("click", () => goto("bpo-list"));
  document.getElementById("toggle-auto").addEventListener("click", () => openAutoGenerateModal(bpo, true));
  document.getElementById("add-col").addEventListener("click", () => {
    state.configure.rows.push({ id: uid("rel"), releaseDate: "", deliveryDate: "", locked: false, allocations: {} });
    renderConfigureReleases();
  });

  pageRoot.querySelectorAll("[data-del-col]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.configure.rows = state.configure.rows.filter((r) => r.id !== btn.dataset.delCol);
      renderConfigureReleases();
    });
  });

  pageRoot.querySelectorAll(".matrix-input[data-field]").forEach((input) => {
    input.addEventListener("change", () => {
      rows[Number(input.dataset.idx)][input.dataset.field] = input.value;
      renderConfigureReleases();
    });
  });
  pageRoot.querySelectorAll(".matrix-input[data-item]").forEach((input) => {
    input.addEventListener("change", () => {
      rows[Number(input.dataset.idx)].allocations[input.dataset.item] = Number(input.value) || 0;
      renderConfigureReleases();
    });
  });

  const saveActivate = document.getElementById("save-activate");
  if (saveActivate) saveActivate.addEventListener("click", () => saveConfigureReleases(bpo, true));
  document.getElementById("save-only").addEventListener("click", () => saveConfigureReleases(bpo, false));
}

function saveConfigureReleases(bpo, markActive) {
  const kept = bpo.releases.filter((r) => r.status === "released" || r.status === "cancelled");
  const editable = state.configure.rows.filter((r) => !r.locked && r.releaseDate);
  const newScheduled = editable.map((r) => ({ id: r.id, releaseDate: r.releaseDate, deliveryDate: r.deliveryDate || addInterval(r.releaseDate, 2, "day"), allocations: r.allocations, status: "scheduled", poNumber: null }));
  bpo.releases = [...kept, ...newScheduled];
  processAutoReleases(bpo);
  logActivity(bpo, "Release schedule configured", `${newScheduled.length} release(s) scheduled`);
  if (markActive) bpo.status = "active";
  state.configure = null;
  goto("bpo-list");
  toast("Release schedule saved.");
}

/* ---------------------------------------------------------------------- */
/* Release Purchase Order screen                                          */
/* ---------------------------------------------------------------------- */
function openReleasePo(bpo, scheduleId) {
  const schedule = scheduleId ? bpo.releases.find((r) => r.id === scheduleId) : null;
  const rows = bpo.items.map((item) => ({
    itemId: item.id,
    selected: schedule ? !!schedule.allocations[item.id] : false,
    value: schedule ? schedule.allocations[item.id] || 0 : 0
  }));

  state.releaseDraft = {
    bpoId: bpo.id,
    scheduleId: schedule ? schedule.id : null,
    poDate: schedule ? schedule.releaseDate : TODAY,
    deliveryDate: schedule ? schedule.deliveryDate : addInterval(TODAY, 2, "day"),
    rows
  };
  goto("release-po");
}

function renderReleasePo() {
  const draft = state.releaseDraft;
  const bpo = getBpo(draft.bpoId);

  const itemRows = bpo.items
    .map((item, idx) => {
      const row = draft.rows[idx];
      const balance = itemCommittedRemaining(bpo, item);
      const availableToRelease = balance - scheduledSum(bpo, item.id, draft.scheduleId);
      const amount = item.type === "goods" ? row.value * item.rate : row.value;
      return `
      <tr>
        <td class="checkbox-cell"><input type="checkbox" data-row-select="${idx}" ${row.selected ? "checked" : ""}/></td>
        <td><div class="item-name">${escapeHtml(item.name)}</div><div class="item-sub">${item.sku || ""}</div></td>
        <td>Cost of Goods Sold</td>
        <td>${item.type === "goods" ? `${balance} ${item.unit}` : currency(balance)}</td>
        <td>${item.type === "goods" ? `${availableToRelease} ${item.unit}` : currency(availableToRelease)}</td>
        <td>${item.type === "goods" ? currency(item.rate) : "-"}</td>
        <td>${item.taxLabel}</td>
        <td>
          <input type="number" min="0" max="${availableToRelease}" class="matrix-input" data-row-value="${idx}" value="${row.value}" ${row.selected ? "" : "disabled"}/>
          <div class="muted" style="font-size:10.5px;margin-top:3px">${currency(amount)}</div>
        </td>
      </tr>`;
    })
    .join("");

  const subTotal = bpo.items.reduce((sum, item, idx) => {
    const row = draft.rows[idx];
    if (!row.selected) return sum;
    return sum + (item.type === "goods" ? row.value * item.rate : row.value);
  }, 0);
  const tax = bpo.items.reduce((sum, item, idx) => {
    const row = draft.rows[idx];
    if (!row.selected) return sum;
    const amt = item.type === "goods" ? row.value * item.rate : row.value;
    return sum + amt * (item.taxRate / 100);
  }, 0);

  pageRoot.innerHTML = `
    <div class="page-header">
      <div><div class="breadcrumb">${bpo.id} · ${draft.scheduleId ? "Scheduled Release" : "Manual Release"}</div><h1>Release Purchase Order</h1></div>
    </div>
    <div class="notice notice-warn">Only unreleased quantities/amount are available for release. Select the required items to release PO.</div>
    <div class="card" style="margin-top:12px">
      <div class="card-section">
        <div class="form-grid">
          <div class="field"><label>Vendor Name</label><input value="${escapeHtml(bpo.vendor.name)}" disabled/></div>
          <div class="field"><label>Purchase Order Date <span class="req">*</span></label><input type="date" id="rel-po-date" value="${draft.poDate}"/></div>
          <div class="field"><label>Delivery Date <span class="req">*</span></label><input type="date" id="rel-delivery-date" value="${draft.deliveryDate}"/></div>
          <div class="field"><label>Reference #</label><input value="${bpo.id}" disabled/></div>
          <div class="field"><label>Payment Terms</label><input value="${bpo.paymentTerms}" disabled/></div>
          <div class="field"><label>Warehouse</label><input value="${bpo.warehouse}" disabled/></div>
        </div>
      </div>
      <div class="card-section">
        <div class="section-title">Item Table</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th></th><th>Item Details</th><th>Account</th><th>Balance</th><th>Available to Release</th><th>Rate</th><th>Tax</th><th>Release Qty / Amount</th></tr></thead>
            <tbody>${itemRows}</tbody>
          </table>
        </div>
      </div>
      <div class="card-section">
        <div class="totals-box">
          <div class="totals-row"><span>Sub Total</span><span>${currency(subTotal)}</span></div>
          <div class="totals-row"><span>Tax</span><span>${currency(tax)}</span></div>
          <div class="totals-row grand"><span>Total</span><span>${currency(subTotal + tax)}</span></div>
        </div>
      </div>
      <div class="form-footer">
        <button class="btn" id="rel-draft">Save as Draft</button>
        <button class="btn btn-primary" id="rel-submit">Save & Submit</button>
        <button class="btn" id="rel-cancel">Cancel</button>
      </div>
    </div>
  `;

  pageRoot.querySelectorAll("[data-row-select]").forEach((cb) => {
    cb.addEventListener("change", () => { draft.rows[Number(cb.dataset.rowSelect)].selected = cb.checked; renderReleasePo(); });
  });
  pageRoot.querySelectorAll("[data-row-value]").forEach((input) => {
    input.addEventListener("change", () => {
      const idx = Number(input.dataset.rowValue);
      const max = Number(input.max) || 0;
      let v = Number(input.value) || 0;
      if (v > max) { v = max; toast("Value clamped to available balance."); }
      draft.rows[idx].value = v;
      renderReleasePo();
    });
  });

  document.getElementById("rel-cancel").addEventListener("click", () => goto("bpo-list"));
  document.getElementById("rel-draft").addEventListener("click", () => submitReleasePo(bpo, "Draft"));
  document.getElementById("rel-submit").addEventListener("click", () => submitReleasePo(bpo, "Issued"));
}

function submitReleasePo(bpo, subStatus) {
  const draft = state.releaseDraft;
  draft.poDate = document.getElementById("rel-po-date").value || draft.poDate;
  draft.deliveryDate = document.getElementById("rel-delivery-date").value || draft.deliveryDate;

  const allocations = {};
  bpo.items.forEach((item, idx) => {
    const row = draft.rows[idx];
    if (row.selected && row.value > 0) allocations[item.id] = row.value;
  });

  if (Object.keys(allocations).length === 0) { toast("Select at least one item to release."); return; }

  let poNumber;
  if (draft.scheduleId) {
    const r = bpo.releases.find((x) => x.id === draft.scheduleId);
    r.releaseDate = draft.poDate;
    r.deliveryDate = draft.deliveryDate;
    r.allocations = allocations;
    r.status = "released";
    poNumber = nextPoNumber(bpo);
    r.poNumber = poNumber;
    r.subStatus = subStatus;
  } else {
    poNumber = nextPoNumber(bpo);
    bpo.releases.push({ id: uid("rel"), releaseDate: draft.poDate, deliveryDate: draft.deliveryDate, allocations, status: "released", poNumber, subStatus });
  }

  logActivity(bpo, `Purchase Order ${poNumber} created`, `Released ${subStatus === "Draft" ? "as draft" : "and submitted"}`);
  state.releaseDraft = null;
  goto("bpo-list", { detailTab: "releases" });
  toast("Purchase Order released.");
}

/* ---------------------------------------------------------------------- */
/* Purchase Order details (read-only)                                     */
/* ---------------------------------------------------------------------- */
function renderPoDetails() {
  let bpo = null;
  let release = null;
  for (const b of state.bpos) {
    const r = b.releases.find((x) => x.id === state.poDetailsId);
    if (r) { bpo = b; release = r; break; }
  }
  if (!release) { goto("bpo-list"); return; }

  const rows = bpo.items
    .filter((i) => release.allocations[i.id])
    .map((i) => `<tr><td>${escapeHtml(i.name)}</td><td>${i.sku || "-"}</td><td>${i.type === "goods" ? `${release.allocations[i.id]} ${i.unit}` : "-"}</td><td>${currency(i.type === "goods" ? release.allocations[i.id] * i.rate : release.allocations[i.id])}</td></tr>`)
    .join("");

  pageRoot.innerHTML = `
    <div class="page-header">
      <div><div class="breadcrumb">Location: Head Office · ${bpo.id}</div><h1>#${release.poNumber}</h1></div>
      <div class="header-actions"><button class="btn" id="po-back">Back</button><button class="btn">PDF/Print</button></div>
    </div>
    <div class="card">
      <div class="card-section">
        <div class="form-grid">
          <div class="field"><label>Vendor</label><input value="${escapeHtml(bpo.vendor.name)}" disabled/></div>
          <div class="field"><label>Order Date</label><input value="${toDisplayDate(release.releaseDate)}" disabled/></div>
          <div class="field"><label>Delivery Date</label><input value="${toDisplayDate(release.deliveryDate)}" disabled/></div>
          <div class="field"><label>Status</label><input value="${release.subStatus || "Issued"}" disabled/></div>
          <div class="field"><label>Reference</label><input value="${bpo.id}" disabled/></div>
          <div class="field"><label>Release Value</label><input value="${currency(releaseAllocationValue(bpo, release.allocations))}" disabled/></div>
        </div>
      </div>
      <div class="card-section">
        <div class="section-title">Items</div>
        <div class="table-wrap"><table><thead><tr><th>Item</th><th>SKU</th><th>Qty</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table></div>
      </div>
    </div>
  `;
  document.getElementById("po-back").addEventListener("click", () => goto("bpo-list", { selectedBpoId: bpo.id, detailTab: "releases" }));
}

/* ---------------------------------------------------------------------- */
/* Create / Edit Blanket PO form                                          */
/* ---------------------------------------------------------------------- */
function newDraft() {
  return {
    id: uid("BPO"),
    vendorName: "",
    reference: "",
    bpoDate: TODAY,
    validityStart: TODAY,
    validityEnd: addInterval(TODAY, 1, "year"),
    paymentTerms: "Net 30",
    warehouse: "Head Office",
    items: [{ id: uid("itm"), name: "", sku: "", type: "goods", unit: "PCS", committedQty: 0, rate: 0, committedAmount: 0, taxLabel: "Standard Rate (16%)", taxRate: 16 }],
    notes: "",
    terms: ""
  };
}

function renderBpoForm() {
  const draft = state.formDraft;
  const isEdit = state.bpos.some((b) => b.id === draft.id);

  const rows = draft.items
    .map(
      (item, idx) => `
    <tr>
      <td><input value="${escapeHtml(item.name)}" data-f="name" data-idx="${idx}" placeholder="Item name"/></td>
      <td>
        <select data-f="type" data-idx="${idx}">
          <option value="goods" ${item.type === "goods" ? "selected" : ""}>Goods</option>
          <option value="service" ${item.type === "service" ? "selected" : ""}>Service</option>
        </select>
      </td>
      <td>${item.type === "goods" ? `<input type="number" min="0" value="${item.committedQty}" data-f="committedQty" data-idx="${idx}"/>` : "-"}</td>
      <td>${item.type === "goods" ? `<input type="number" min="0" value="${item.rate}" data-f="rate" data-idx="${idx}"/>` : `<input type="number" min="0" value="${item.committedAmount}" data-f="committedAmount" data-idx="${idx}"/>`}</td>
      <td>${item.taxLabel}</td>
      <td>${currency(item.type === "goods" ? item.committedQty * item.rate : item.committedAmount)}</td>
      <td><button class="btn btn-sm btn-danger" data-remove-item="${idx}">Remove</button></td>
    </tr>`
    )
    .join("");

  const subTotal = draft.items.reduce((sum, i) => sum + (i.type === "goods" ? i.committedQty * i.rate : i.committedAmount), 0);

  pageRoot.innerHTML = `
    <div class="page-header">
      <div><div class="breadcrumb">Procurement · Blanket PO</div><h1>${isEdit ? "Edit" : "New"} Blanket Purchase Order</h1></div>
    </div>
    <div class="card">
      <div class="card-section">
        <div class="form-grid">
          <div class="field"><label>Vendor Name <span class="req">*</span></label><input id="f-vendor" value="${escapeHtml(draft.vendorName)}" placeholder="Select or type vendor"/></div>
          <div class="field"><label>Currency</label><input value="INR - Indian Rupee" disabled/></div>
          <div class="field"><label>Blanket Purchase Order # <span class="req">*</span></label><input value="${draft.id}" disabled/></div>
          <div class="field"><label>Reference #</label><input id="f-reference" value="${escapeHtml(draft.reference)}"/></div>
          <div class="field"><label>Blanket Purchase Order Date <span class="req">*</span></label><input type="date" id="f-bpodate" value="${draft.bpoDate}"/></div>
          <div class="field"><label>Payment Terms <span class="req">*</span></label><input id="f-terms" value="${escapeHtml(draft.paymentTerms)}"/></div>
          <div class="field"><label>Purchase Validity Period — Start <span class="req">*</span></label><input type="date" id="f-start" value="${draft.validityStart}"/></div>
          <div class="field"><label>Purchase Validity Period — End <span class="req">*</span></label><input type="date" id="f-end" value="${draft.validityEnd}"/></div>
          <div class="field"><label>Warehouse Location</label><input id="f-warehouse" value="${escapeHtml(draft.warehouse)}"/></div>
        </div>
        <div class="form-grid" style="margin-top:12px">
          <div class="address-box"><strong>Billing Address</strong>152, 3rd street, city<br/>Baden-Württemberg 12345, Germany</div>
          <div class="address-box"><strong>Shipping Address</strong>152, 3rd street, city<br/>Baden-Württemberg 12345, Germany</div>
        </div>
      </div>
      <div class="card-section">
        <div class="section-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>Item Table</span>
          <button class="btn btn-sm" id="add-item-row">+ Add New Row</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Item</th><th>Type</th><th>Committed Qty</th><th>Rate / Amount</th><th>Tax</th><th>Committed Amount</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="totals-box" style="margin-top:12px">
          <div class="totals-row grand"><span>Sub Total</span><span>${currency(subTotal)}</span></div>
        </div>
      </div>
      <div class="card-section">
        <div class="form-grid" style="grid-template-columns:1fr 1fr">
          <div class="field"><label>Notes</label><textarea id="f-notes" placeholder="Will be displayed on your blanket purchase order">${escapeHtml(draft.notes)}</textarea></div>
          <div class="field"><label>Terms &amp; Conditions</label><textarea id="f-conditions" placeholder="Enter the terms and conditions of your business">${escapeHtml(draft.terms)}</textarea></div>
        </div>
      </div>
      <div class="form-footer">
        <button class="btn" id="f-save-draft">Save as Draft</button>
        <button class="btn btn-primary" id="f-save-submit">Save &amp; Submit</button>
        <button class="btn" id="f-cancel">Cancel</button>
      </div>
    </div>
  `;

  document.getElementById("f-cancel").addEventListener("click", () => goto("bpo-list"));
  document.getElementById("add-item-row").addEventListener("click", () => {
    draft.items.push({ id: uid("itm"), name: "", sku: "", type: "goods", unit: "PCS", committedQty: 0, rate: 0, committedAmount: 0, taxLabel: "Standard Rate (16%)", taxRate: 16 });
    renderBpoForm();
  });
  pageRoot.querySelectorAll("[data-remove-item]").forEach((btn) => {
    btn.addEventListener("click", () => { draft.items.splice(Number(btn.dataset.removeItem), 1); renderBpoForm(); });
  });
  pageRoot.querySelectorAll("[data-f]").forEach((el) => {
    el.addEventListener("change", () => {
      const idx = Number(el.dataset.idx);
      const field = el.dataset.f;
      const item = draft.items[idx];
      if (field === "committedQty" || field === "rate" || field === "committedAmount") item[field] = Number(el.value) || 0;
      else item[field] = el.value;
      renderBpoForm();
    });
  });

  document.getElementById("f-save-draft").addEventListener("click", () => persistForm("draft"));
  document.getElementById("f-save-submit").addEventListener("click", () => persistForm("awaiting-approval"));
}

function persistForm(status) {
  const draft = state.formDraft;
  draft.vendorName = document.getElementById("f-vendor").value || "Unnamed Vendor";
  draft.reference = document.getElementById("f-reference").value;
  draft.bpoDate = document.getElementById("f-bpodate").value;
  draft.paymentTerms = document.getElementById("f-terms").value;
  draft.validityStart = document.getElementById("f-start").value;
  draft.validityEnd = document.getElementById("f-end").value;
  draft.warehouse = document.getElementById("f-warehouse").value;
  draft.notes = document.getElementById("f-notes").value;
  draft.terms = document.getElementById("f-conditions").value;

  const items = draft.items
    .filter((i) => i.name)
    .map((i) => ({ id: i.id, name: i.name, sku: i.sku || null, type: i.type, unit: i.unit || "PCS", committedQty: i.committedQty, rate: i.rate, committedAmount: i.type === "service" ? i.committedAmount : i.committedQty * i.rate, taxLabel: i.taxLabel, taxRate: i.taxRate }));

  if (!items.length) { toast("Add at least one item."); return; }

  const existing = getBpo(draft.id);
  const bpoObj = makeBpo({ id: draft.id, vendor: draft.vendorName, reference: draft.reference, bpoDate: draft.bpoDate, validityStart: draft.validityStart, validityEnd: draft.validityEnd, status, items, notes: draft.notes, terms: draft.terms });
  bpoObj.paymentTerms = draft.paymentTerms;
  bpoObj.warehouse = draft.warehouse;

  if (existing) {
    bpoObj.releases = existing.releases;
    bpoObj.activity = existing.activity;
    Object.assign(existing, bpoObj);
    logActivity(existing, status === "draft" ? "Draft saved" : "Submitted for Approval", "");
  } else {
    state.bpos.unshift(bpoObj);
  }

  state.formDraft = null;
  goto("bpo-list", { selectedBpoId: draft.id });
  toast(status === "draft" ? "Saved as draft." : "Submitted for approval.");
}

/* ---------------------------------------------------------------------- */
/* New standalone PO with BPO detection                                   */
/* ---------------------------------------------------------------------- */
function renderNewPo() {
  const vendorNames = [...new Set(state.bpos.map((b) => b.vendor.name))];
  const activeBpo = state.newPoVendor ? findActiveBpoForVendor(state.newPoVendor) : null;

  pageRoot.innerHTML = `
    <div class="page-header"><div><h1>New Purchase Order</h1></div></div>
    <div class="card">
      <div class="card-section">
        <div class="form-grid">
          <div class="field">
            <label>Vendor Name <span class="req">*</span></label>
            <select id="npo-vendor">
              <option value="">Select a vendor</option>
              ${vendorNames.map((v) => `<option value="${escapeHtml(v)}" ${state.newPoVendor === v ? "selected" : ""}>${escapeHtml(v)}</option>`).join("")}
            </select>
          </div>
        </div>
      </div>
      ${
        activeBpo && state.newPoMode !== "ignored"
          ? `<div class="card-section"><div class="bpo-detect-banner"><span>1 Active Blanket Purchase Order found for <b>${escapeHtml(state.newPoVendor)}</b>.</span><div style="display:flex;gap:8px"><button class="btn" id="npo-ignore">Continue Without</button><button class="btn btn-primary" id="npo-choose">Use Blanket Purchase Order</button></div></div></div>`
          : ""
      }
      ${
        state.newPoVendor && (!activeBpo || state.newPoMode === "ignored")
          ? `<div class="card-section">
              ${state.newPoMode === "ignored" ? `<div class="notice notice-warn">Continuing as a standalone Purchase Order. This order will not consume any Blanket Purchase Order commitment.</div>` : ""}
              <div class="section-title" style="margin-top:12px">Item Table</div>
              <div class="table-wrap"><table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody><tr><td colspan="4" class="muted" style="text-align:center;padding:20px">Add items to this standalone Purchase Order</td></tr></tbody></table></div>
             </div>
             <div class="form-footer"><button class="btn btn-primary" id="npo-save">Save &amp; Submit</button><button class="btn" id="npo-cancel">Cancel</button></div>`
          : ""
      }
    </div>
  `;

  document.getElementById("npo-vendor").addEventListener("change", (e) => { state.newPoVendor = e.target.value || null; state.newPoMode = null; renderNewPo(); });

  const ignoreBtn = document.getElementById("npo-ignore");
  if (ignoreBtn) ignoreBtn.addEventListener("click", () => { state.newPoMode = "ignored"; renderNewPo(); });

  const chooseBtn = document.getElementById("npo-choose");
  if (chooseBtn) chooseBtn.addEventListener("click", () => openReleasePo(activeBpo, null));

  const saveBtn = document.getElementById("npo-save");
  if (saveBtn) saveBtn.addEventListener("click", () => { toast("Standalone Purchase Order created (demo)."); goto("new-po", { newPoVendor: null, newPoMode: null }); });

  const cancelBtn = document.getElementById("npo-cancel");
  if (cancelBtn) cancelBtn.addEventListener("click", () => goto("new-po", { newPoVendor: null, newPoMode: null }));
}

/* ---------------------------------------------------------------------- */
/* Router                                                                  */
/* ---------------------------------------------------------------------- */
function render() {
  renderSidebar();
  closeOverlay();
  if (state.route === "bpo-list") renderBpoList();
  else if (state.route === "bpo-form") renderBpoForm();
  else if (state.route === "configure-choice") renderConfigureChoice();
  else if (state.route === "configure-releases") renderConfigureReleases();
  else if (state.route === "release-po") renderReleasePo();
  else if (state.route === "po-details") renderPoDetails();
  else if (state.route === "new-po") renderNewPo();
  else renderBpoList();
}

render();
