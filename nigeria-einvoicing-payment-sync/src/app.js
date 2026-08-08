// Nigeria E-Invoicing — Payment Synchronization prototype
//
// Design principle (kept intentionally minimal):
// Invoice submission to FIRS MBS and payment reporting are two separate lifecycles.
// Once an invoice is submitted, any payment recorded against it is pushed to FIRS MBS
// automatically in the background — silently, with no UI noise on success.
// The payment-sync UI only needs to show up when that automatic push FAILS (or is
// actively in progress), so the user knows payment info in Books hasn't reached FIRS
// MBS yet and can push it again. This is surfaced consistently in three places:
// Invoice Details, Invoices List, and Payments Received.

const contentNode = document.getElementById("page-content");
const navNode = document.getElementById("main-nav");

/* ----------------------------- Utilities ----------------------------- */

function formatCurrency(amount, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

function nowStamp() {
  const d = new Date();
  return d.toLocaleString("en-NG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ------------------------------- Data --------------------------------- */

function makeInvoice(cfg) {
  return {
    id: cfg.id,
    number: cfg.number,
    customer: cfg.customer,
    email: cfg.email,
    invoiceDate: cfg.invoiceDate,
    dueDate: cfg.dueDate,
    currency: "NGN",
    total: cfg.total,
    items: cfg.items,
    submission: cfg.submission,
    booksPaymentStatus: cfg.booksPaymentStatus,
    paidAmount: cfg.paidAmount || 0,
    balanceDue: cfg.total - (cfg.paidAmount || 0),
    firsPaymentStatus: cfg.firsPaymentStatus,
    // push tracks the *automatic* background attempt to report Books payment status
    // to FIRS MBS after the invoice has already been submitted/approved.
    push: cfg.push,
    payments: cfg.payments || [],
    activity: cfg.activity
  };
}

const state = {
  page: "dashboard", // dashboard | invoices | invoice-details | payments
  selectedInvoiceId: null,
  invoiceFilter: "all",
  detailsTab: "overview",
  recentEvents: [],
  pushBanner: null, // transient result banner after a bulk "Push Payment Info" from Payments Received
  invoices: [
    makeInvoice({
      id: "inv-2041",
      number: "INV-2041",
      customer: "Aaron Brown",
      email: "ap@novatech.be",
      invoiceDate: "18 Jul 2026",
      dueDate: "17 Aug 2026",
      total: 245000,
      items: [{ name: "Consulting Services", qty: 1, price: 245000 }],
      submission: { status: "approved", irn: "IRN-NG-2041-8842", csid: "CSID-77291A", submittedAt: "18 Jul 2026, 10:02 AM" },
      booksPaymentStatus: "Pending",
      firsPaymentStatus: "Pending Payment",
      push: { status: "idle", error: null, lastPushedAt: null, attempts: 0 },
      activity: [
        { type: "success", title: "Invoice Submitted to FIRS", note: "Validated and approved by FIRS MBS Portal. IRN and CSID generated.", when: "18 Jul 2026, 10:02 AM" }
      ]
    }),
    makeInvoice({
      id: "inv-2040",
      number: "INV-2040",
      customer: "Global Traders NG",
      email: "accounts@globaltraders.ng",
      invoiceDate: "10 Jul 2026",
      dueDate: "09 Aug 2026",
      total: 612000,
      items: [{ name: "Office Furniture Supply", qty: 4, price: 153000 }],
      submission: { status: "approved", irn: "IRN-NG-2040-6631", csid: "CSID-55210B", submittedAt: "10 Jul 2026, 09:20 AM" },
      booksPaymentStatus: "Partially Paid",
      paidAmount: 300000,
      firsPaymentStatus: "Partially Paid",
      push: { status: "synced", error: null, lastPushedAt: "12 Jul 2026, 03:41 PM", attempts: 1 },
      payments: [{ id: "pay-2040-1", date: "12 Jul 2026", amount: 300000, mode: "Bank Transfer" }],
      activity: [
        { type: "success", title: "Invoice Submitted to FIRS", note: "Validated and approved by FIRS MBS Portal.", when: "10 Jul 2026, 09:20 AM" },
        { type: "neutral", title: "Payment Recorded", note: "Partial payment of ₦300,000 recorded in Books.", when: "12 Jul 2026, 03:38 PM" },
        { type: "success", title: "Payment Info Pushed to FIRS", note: "FIRS MBS Payment Status updated to Partially Paid.", when: "12 Jul 2026, 03:41 PM" }
      ]
    }),
    makeInvoice({
      id: "inv-2039",
      number: "INV-2039",
      customer: "Lagos Textiles Ltd",
      email: "finance@lagostextiles.com",
      invoiceDate: "02 Jul 2026",
      dueDate: "01 Aug 2026",
      total: 890000,
      items: [{ name: "Fabric Rolls (Assorted)", qty: 20, price: 44500 }],
      submission: { status: "approved", irn: "IRN-NG-2039-1120", csid: "CSID-90871C", submittedAt: "02 Jul 2026, 11:05 AM" },
      booksPaymentStatus: "Paid",
      paidAmount: 890000,
      firsPaymentStatus: "Paid",
      push: { status: "synced", error: null, lastPushedAt: "05 Jul 2026, 01:12 PM", attempts: 1 },
      payments: [{ id: "pay-2039-1", date: "05 Jul 2026", amount: 890000, mode: "Card" }],
      activity: [
        { type: "success", title: "Invoice Submitted to FIRS", note: "Validated and approved by FIRS MBS Portal.", when: "02 Jul 2026, 11:05 AM" },
        { type: "neutral", title: "Payment Recorded", note: "Full payment of ₦890,000 recorded in Books.", when: "05 Jul 2026, 01:09 PM" },
        { type: "success", title: "Payment Info Pushed to FIRS", note: "FIRS MBS Payment Status updated to Paid.", when: "05 Jul 2026, 01:12 PM" }
      ]
    }),
    makeInvoice({
      id: "inv-2038",
      number: "INV-2038",
      customer: "NovaTech Belgium",
      email: "ap@novatech.be",
      invoiceDate: "15 Jul 2026",
      dueDate: "15 Aug 2026",
      total: 24703,
      items: [
        { name: "Bag", qty: 1, price: 5000 },
        { name: "Commercial Invoice", qty: 2, price: 5000 },
        { name: "Packing List", qty: 1, price: 700 },
        { name: "Export Declaration", qty: 3, price: 3600 }
      ],
      submission: { status: "approved", irn: "IRN-NG-2038-3305", csid: "CSID-44120D", submittedAt: "15 Jul 2026, 02:00 PM" },
      booksPaymentStatus: "Paid",
      paidAmount: 24703,
      firsPaymentStatus: "Pending Payment",
      push: { status: "pushing", error: null, lastPushedAt: null, attempts: 1 },
      payments: [{ id: "pay-2038-1", date: "31 Jul 2026", amount: 24703, mode: "Bank Transfer" }],
      activity: [
        { type: "success", title: "Invoice Submitted to FIRS", note: "Validated and approved by FIRS MBS Portal.", when: "15 Jul 2026, 02:00 PM" },
        { type: "neutral", title: "Payment Recorded", note: "Full payment of ₦24,703 recorded in Books.", when: "31 Jul 2026, 09:14 AM" },
        { type: "info", title: "Payment Push Started", note: "Automatically attempting to push updated payment status to FIRS MBS Portal.", when: "31 Jul 2026, 09:15 AM" }
      ]
    }),
    makeInvoice({
      id: "inv-2037",
      number: "INV-2037",
      customer: "Whitfield Imports",
      email: "billing@whitfield.co",
      invoiceDate: "08 Jul 2026",
      dueDate: "07 Aug 2026",
      total: 415500,
      items: [{ name: "Industrial Fittings", qty: 30, price: 13850 }],
      submission: { status: "approved", irn: "IRN-NG-2037-9012", csid: "CSID-11983E", submittedAt: "08 Jul 2026, 08:40 AM" },
      booksPaymentStatus: "Paid",
      paidAmount: 415500,
      firsPaymentStatus: "Pending Payment",
      push: {
        status: "failed",
        error: "Unable to reach FIRS MBS Portal. The connection timed out after 3 attempts.",
        lastPushedAt: null,
        attempts: 3
      },
      payments: [{ id: "pay-2037-1", date: "29 Jul 2026", amount: 415500, mode: "Bank Transfer" }],
      activity: [
        { type: "success", title: "Invoice Submitted to FIRS", note: "Validated and approved by FIRS MBS Portal.", when: "08 Jul 2026, 08:40 AM" },
        { type: "neutral", title: "Payment Recorded", note: "Full payment of ₦415,500 recorded in Books.", when: "29 Jul 2026, 04:02 PM" },
        { type: "info", title: "Payment Push Started", note: "Automatically attempting to push updated payment status to FIRS MBS Portal.", when: "29 Jul 2026, 04:03 PM" },
        { type: "danger", title: "Payment Push Failed", note: "Unable to reach FIRS MBS Portal. The connection timed out after 3 attempts.", when: "29 Jul 2026, 04:06 PM" }
      ]
    }),
    makeInvoice({
      id: "inv-2036",
      number: "INV-2036",
      customer: "Kaduna Foods Co",
      email: "accounts@kadunafoods.ng",
      invoiceDate: "05 Jul 2026",
      dueDate: "04 Aug 2026",
      total: 178200,
      items: [{ name: "Packaged Grains (Bulk)", qty: 90, price: 1980 }],
      submission: { status: "approved", irn: "IRN-NG-2036-4471", csid: "CSID-27641F", submittedAt: "05 Jul 2026, 12:15 PM" },
      booksPaymentStatus: "Partially Paid",
      paidAmount: 90000,
      firsPaymentStatus: "Pending Payment",
      push: {
        status: "failed",
        error: "FIRS MBS Portal rejected the update. Payment details could not be validated.",
        lastPushedAt: null,
        attempts: 1
      },
      payments: [{ id: "pay-2036-1", date: "28 Jul 2026", amount: 90000, mode: "Cash" }],
      activity: [
        { type: "success", title: "Invoice Submitted to FIRS", note: "Validated and approved by FIRS MBS Portal.", when: "05 Jul 2026, 12:15 PM" },
        { type: "neutral", title: "Payment Recorded", note: "Partial payment of ₦90,000 recorded in Books.", when: "28 Jul 2026, 11:00 AM" },
        { type: "info", title: "Payment Push Started", note: "Automatically attempting to push updated payment status to FIRS MBS Portal.", when: "28 Jul 2026, 11:01 AM" },
        { type: "danger", title: "Payment Push Failed", note: "FIRS MBS Portal rejected the update. Payment details could not be validated.", when: "28 Jul 2026, 11:03 AM" }
      ]
    }),
    makeInvoice({
      id: "inv-2035",
      number: "INV-2035",
      customer: "Abuja Steel Works",
      email: "procurement@abujasteel.ng",
      invoiceDate: "30 Jul 2026",
      dueDate: "29 Aug 2026",
      total: 502000,
      items: [{ name: "Rebar Steel Coils", qty: 8, price: 62750 }],
      submission: { status: "draft", irn: null, csid: null, submittedAt: null },
      booksPaymentStatus: "Pending",
      firsPaymentStatus: null,
      push: { status: "idle", error: null, lastPushedAt: null, attempts: 0 },
      activity: [
        { type: "neutral", title: "Invoice Created", note: "Draft invoice created in Books.", when: "30 Jul 2026, 09:00 AM" }
      ]
    }),
    makeInvoice({
      id: "inv-2034",
      number: "INV-2034",
      customer: "Port Harcourt Traders",
      email: "info@phtraders.ng",
      invoiceDate: "22 Jul 2026",
      dueDate: "21 Aug 2026",
      total: 133400,
      items: [{ name: "Warehouse Supplies", qty: 12, price: 11116 }],
      submission: { status: "approved", irn: "IRN-NG-2034-2290", csid: "CSID-66120G", submittedAt: "22 Jul 2026, 03:30 PM" },
      booksPaymentStatus: "Pending",
      firsPaymentStatus: "Pending Payment",
      push: { status: "idle", error: null, lastPushedAt: null, attempts: 0 },
      activity: [
        { type: "success", title: "Invoice Submitted to FIRS", note: "Validated and approved by FIRS MBS Portal.", when: "22 Jul 2026, 03:30 PM" }
      ]
    }),
    makeInvoice({
      id: "inv-2033",
      number: "INV-2033",
      customer: "Enugu Textiles",
      email: "billing@enugutextiles.ng",
      invoiceDate: "18 Jun 2026",
      dueDate: "18 Jul 2026",
      total: 356000,
      items: [{ name: "Cotton Fabric", qty: 40, price: 8900 }],
      submission: { status: "approved", irn: "IRN-NG-2033-7734", csid: "CSID-38820H", submittedAt: "18 Jun 2026, 09:50 AM" },
      booksPaymentStatus: "Paid",
      paidAmount: 356000,
      firsPaymentStatus: "Paid",
      push: { status: "synced", error: null, lastPushedAt: "20 Jun 2026, 10:30 AM", attempts: 1 },
      payments: [{ id: "pay-2033-1", date: "20 Jun 2026", amount: 356000, mode: "Bank Transfer" }],
      activity: [
        { type: "success", title: "Invoice Submitted to FIRS", note: "Validated and approved by FIRS MBS Portal.", when: "18 Jun 2026, 09:50 AM" },
        { type: "neutral", title: "Payment Recorded", note: "Full payment of ₦356,000 recorded in Books.", when: "20 Jun 2026, 10:27 AM" },
        { type: "success", title: "Payment Info Pushed to FIRS", note: "FIRS MBS Payment Status updated to Paid.", when: "20 Jun 2026, 10:30 AM" }
      ]
    }),
    makeInvoice({
      id: "inv-2032",
      number: "INV-2032",
      customer: "Ibadan Metals",
      email: "accounts@ibadanmetals.ng",
      invoiceDate: "26 Jul 2026",
      dueDate: "25 Aug 2026",
      total: 267500,
      items: [{ name: "Aluminum Sheets", qty: 25, price: 10700 }],
      submission: { status: "approved", irn: "IRN-NG-2032-5561", csid: "CSID-99271I", submittedAt: "26 Jul 2026, 01:10 PM" },
      booksPaymentStatus: "Partially Paid",
      paidAmount: 120000,
      firsPaymentStatus: "Pending Payment",
      push: { status: "pushing", error: null, lastPushedAt: null, attempts: 1 },
      payments: [{ id: "pay-2032-1", date: "31 Jul 2026", amount: 120000, mode: "Card" }],
      activity: [
        { type: "success", title: "Invoice Submitted to FIRS", note: "Validated and approved by FIRS MBS Portal.", when: "26 Jul 2026, 01:10 PM" },
        { type: "neutral", title: "Payment Recorded", note: "Partial payment of ₦120,000 recorded in Books.", when: "31 Jul 2026, 05:40 PM" },
        { type: "info", title: "Payment Push Started", note: "Automatically attempting to push updated payment status to FIRS MBS Portal.", when: "31 Jul 2026, 05:41 PM" }
      ]
    })
  ]
};

/* ----------------------------- State helpers --------------------------- */

function getInvoice(id) {
  return state.invoices.find((inv) => inv.id === id);
}

function addActivity(inv, type, title, note) {
  const when = nowStamp();
  inv.activity.unshift({ type, title, note, when });
  state.recentEvents.unshift({ type, title, note, when, invoiceId: inv.id, invoiceNumber: inv.number, customer: inv.customer });
  state.recentEvents = state.recentEvents.slice(0, 20);
}

// The payment-push state only matters when it needs the user's attention.
// "not_applicable" covers drafts and invoices with no payment recorded yet —
// there is nothing to push to FIRS MBS, so no indicator is shown for them.
function derivePushState(inv) {
  if (inv.submission.status !== "approved") return "not_applicable";
  if (inv.booksPaymentStatus === "Pending" && inv.push.status === "idle") return "not_applicable";
  return inv.push.status; // 'pushing' | 'failed' | 'synced'
}

function pushBadgeHtml(inv) {
  const s = derivePushState(inv);
  if (s === "failed") return `<span class="chip chip-danger"><span class="chip-dot"></span>Push Failed</span>`;
  if (s === "pushing") return `<span class="chip chip-info chip-spin"><span class="chip-dot"></span>Pushing…</span>`;
  if (s === "synced") return `<span class="muted">✓ Synced</span>`;
  return `<span class="muted">—</span>`;
}

/* ------------------------------ Actions --------------------------------- */

function submitInvoiceToFirs(invoiceId) {
  const inv = getInvoice(invoiceId);
  if (!inv) return;
  inv.submission = {
    status: "approved",
    irn: `IRN-NG-${inv.number.split("-")[1]}-${Math.floor(1000 + Math.random() * 8999)}`,
    csid: `CSID-${uid("").slice(1).toUpperCase()}`,
    submittedAt: nowStamp()
  };
  inv.firsPaymentStatus = "Pending Payment";
  addActivity(inv, "success", "Invoice Submitted to FIRS", "Validated and approved by FIRS MBS Portal. IRN and CSID generated.");
  render();
}

function recordPayment(invoiceId, kind) {
  const inv = getInvoice(invoiceId);
  if (!inv) return;
  const amount = kind === "full" ? inv.total - inv.paidAmount : Math.round((inv.total - inv.paidAmount) * 0.5);
  inv.paidAmount += amount;
  inv.balanceDue = inv.total - inv.paidAmount;
  inv.booksPaymentStatus = inv.balanceDue <= 0 ? "Paid" : "Partially Paid";
  inv.payments.push({ id: uid("pay"), date: nowStamp(), amount, mode: kind === "full" ? "Bank Transfer" : "Card" });
  addActivity(
    inv,
    "neutral",
    "Payment Recorded",
    `${kind === "full" ? "Full" : "Partial"} payment of ${formatCurrency(amount, inv.currency)} recorded in Books.`
  );
  // Payment reporting is a separate lifecycle: the system now tries to push this
  // update to FIRS MBS automatically, in the background, without any extra user action.
  const willFailTransient = kind === "partial";
  pushPaymentInfo(invoiceId, { auto: true, forceFail: willFailTransient });
}

// Pushes the current Books payment status to FIRS MBS. Used both for the automatic
// attempt right after a payment is recorded, and for the manual "Push Payment Info"
// retry shown once an automatic attempt has failed.
function pushPaymentInfo(invoiceId, { auto = false, forceFail = false } = {}) {
  const inv = getInvoice(invoiceId);
  if (!inv) return;
  inv.push.status = "pushing";
  inv.push.attempts += 1;
  addActivity(
    inv,
    "info",
    auto ? "Payment Push Started" : "Retrying Payment Push",
    auto
      ? "Automatically attempting to push updated payment status to FIRS MBS Portal."
      : "User manually retried pushing payment status to FIRS MBS Portal."
  );
  render();
  setTimeout(() => {
    if (forceFail) {
      inv.push.status = "failed";
      inv.push.error = "Unable to reach FIRS MBS Portal. The connection timed out after multiple attempts.";
      addActivity(inv, "danger", "Payment Push Failed", inv.push.error);
    } else {
      inv.push.status = "synced";
      inv.push.error = null;
      inv.push.lastPushedAt = nowStamp();
      inv.firsPaymentStatus = inv.booksPaymentStatus;
      addActivity(inv, "success", "Payment Info Pushed to FIRS", `FIRS MBS Payment Status updated to ${inv.booksPaymentStatus}.`);
    }
    render();
  }, 1400);
}

function retryPush(invoiceId) {
  pushPaymentInfo(invoiceId, { auto: false, forceFail: false });
}

// Retries every invoice whose automatic push is currently failed. Used by the
// "Push Payment Info" call to action on the Payments Received band.
function pushAllFailed() {
  const targets = state.invoices.filter((inv) => derivePushState(inv) === "failed");
  if (!targets.length) return;
  state.pushBanner = { total: targets.length, done: 0 };
  targets.forEach((inv) => {
    inv.push.status = "pushing";
    inv.push.attempts += 1;
    addActivity(inv, "info", "Retrying Payment Push", "Bulk action: retrying payment push to FIRS MBS Portal.");
  });
  render();
  targets.forEach((inv, idx) => {
    setTimeout(() => {
      inv.push.status = "synced";
      inv.push.error = null;
      inv.push.lastPushedAt = nowStamp();
      inv.firsPaymentStatus = inv.booksPaymentStatus;
      addActivity(inv, "success", "Payment Info Pushed to FIRS", `FIRS MBS Payment Status updated to ${inv.booksPaymentStatus} via bulk push.`);
      state.pushBanner.done += 1;
      render();
    }, 1200 + idx * 550);
  });
}

/* -------------------------------- Nav ------------------------------------ */

const NAV = [
  { id: "dashboard", label: "Home", top: true },
  { section: "Items" },
  { section: "Inventory" },
  {
    section: "Sales",
    children: [
      { label: "Customers" },
      { label: "Quotes" },
      { label: "Retainer Invoices" },
      { label: "Sales Orders" },
      { id: "invoices", label: "Invoices" },
      { label: "Recurring Invoices" },
      { label: "Payment Links" },
      { id: "payments", label: "Payments Received" },
      { label: "Credit Notes" },
      { label: "Bill of Lading" }
    ]
  },
  { section: "Purchases" },
  { section: "Time Tracking" },
  { section: "Banking" },
  { section: "XML Manager" },
  { section: "Accountant" },
  { section: "Reports" },
  { section: "Documents" },
  { section: "Custom Modules" }
];

function renderNav() {
  let html = "";
  NAV.forEach((entry) => {
    if (entry.top) {
      html += `<button class="nav-link ${state.page === entry.id ? "active" : ""}" data-nav="${entry.id}">${entry.label}</button>`;
    } else if (entry.children) {
      html += `<div class="nav-section-label">${entry.section}</div>`;
      entry.children.forEach((child) => {
        if (child.id) {
          html += `<button class="nav-link nav-sub ${state.page === child.id || (state.page === "invoice-details" && child.id === "invoices") ? "active" : ""}" data-nav="${child.id}">${child.label}</button>`;
        } else {
          html += `<button class="nav-link nav-sub disabled" disabled>${child.label}</button>`;
        }
      });
    } else {
      html += `<div class="nav-section-label">${entry.section}</div>`;
    }
  });
  navNode.innerHTML = html;
  navNode.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.page = btn.dataset.nav;
      if (state.page === "invoices") state.invoiceFilter = "all";
      render();
    });
  });
}

/* ---------------------------- Page: Dashboard ----------------------------- */

function renderDashboard() {
  const approved = state.invoices.filter((i) => i.submission.status === "approved");
  const failed = approved.filter((i) => derivePushState(i) === "failed");
  const pushing = approved.filter((i) => derivePushState(i) === "pushing");
  const recent = state.recentEvents.slice(0, 8);

  contentNode.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Nigeria E-Invoicing</h1>
        <p class="muted">Invoice submission to FIRS MBS and payment reporting are separate lifecycles.</p>
      </div>
    </div>

    ${
      failed.length
        ? `<div class="card">
            <div class="push-band tone-danger">
              <div class="pb-left">
                <span class="pb-icon">⚠</span>
                <div>
                  <div class="pb-title">${failed.length} invoice(s) have payment info that failed to push to FIRS MBS</div>
                  <div class="pb-desc">Books is up to date, but FIRS MBS hasn't received the latest payment status yet.</div>
                </div>
              </div>
              <button class="btn btn-primary btn-sm" data-goto-filter="failed">View invoices</button>
            </div>
          </div>`
        : `<div class="card">
            <div class="push-band tone-success">
              <div class="pb-left">
                <span class="pb-icon">✓</span>
                <div>
                  <div class="pb-title">All payment info is in sync with FIRS MBS</div>
                  <div class="pb-desc">No action needed right now.</div>
                </div>
              </div>
            </div>
          </div>`
    }
    ${
      pushing.length
        ? `<div class="card">
            <div class="push-band tone-info">
              <div class="pb-left">
                <span class="pb-icon">⟳</span>
                <div>
                  <div class="pb-title">${pushing.length} invoice(s) currently pushing payment info to FIRS MBS</div>
                  <div class="pb-desc">This usually completes within a few seconds.</div>
                </div>
              </div>
              <button class="btn btn-outline btn-sm" data-goto-filter="pushing">View</button>
            </div>
          </div>`
        : ""
    }

    <div class="card">
      <div class="card-title-row">
        <h3>Recent Activity</h3>
        <button class="btn btn-outline btn-sm" data-nav-page="invoices">View all invoices</button>
      </div>
      ${
        recent.length
          ? `<div class="timeline">
              ${recent
                .map(
                  (ev) => `
                <div class="timeline-item type-${ev.type}">
                  <span class="timeline-dot"></span>
                  <div class="timeline-title">${ev.title} · <a class="invoice-link" data-goto-invoice="${ev.invoiceId}">${ev.invoiceNumber}</a></div>
                  <div class="timeline-note">${ev.note}</div>
                  <div class="timeline-when">${ev.when} · ${ev.customer}</div>
                </div>`
                )
                .join("")}
            </div>`
          : `<div class="empty-state">No activity yet. Record a payment on an invoice to see updates here.</div>`
      }
    </div>
  `;

  contentNode.querySelectorAll("[data-goto-filter]").forEach((el) => {
    el.addEventListener("click", () => {
      state.page = "invoices";
      state.invoiceFilter = el.dataset.gotoFilter;
      render();
    });
  });
  contentNode.querySelectorAll("[data-goto-invoice]").forEach((el) => {
    el.addEventListener("click", () => {
      state.page = "invoice-details";
      state.selectedInvoiceId = el.dataset.gotoInvoice;
      state.detailsTab = "overview";
      render();
    });
  });
  contentNode.querySelectorAll("[data-nav-page]").forEach((el) => {
    el.addEventListener("click", () => {
      state.page = el.dataset.navPage;
      render();
    });
  });
}

/* ---------------------------- Page: Invoices List -------------------------- */

const INVOICE_FILTERS = [
  { key: "all", label: "All" },
  { key: "failed", label: "Push Failed", match: (s) => s === "failed" },
  { key: "pushing", label: "Pushing", match: (s) => s === "pushing" }
];

function renderInvoicesList() {
  const filterDef = INVOICE_FILTERS.find((f) => f.key === state.invoiceFilter) || INVOICE_FILTERS[0];
  const rows = state.invoices.filter((inv) => {
    if (filterDef.key === "all") return true;
    return filterDef.match(derivePushState(inv));
  });

  const countFor = (key) => {
    if (key === "all") return state.invoices.length;
    const f = INVOICE_FILTERS.find((x) => x.key === key);
    return state.invoices.filter((inv) => f.match(derivePushState(inv))).length;
  };

  const failedCount = countFor("failed");

  contentNode.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Invoices</h1>
        <p class="muted">Invoice submission status and FIRS payment push status are tracked separately.</p>
      </div>
    </div>

    ${
      failedCount
        ? `<div class="card">
            <div class="push-band tone-danger">
              <div class="pb-left">
                <span class="pb-icon">⚠</span>
                <div>
                  <div class="pb-title">${failedCount} invoice(s) have payment info that failed to push to FIRS MBS</div>
                  <div class="pb-desc">The invoice itself was submitted successfully — only the payment update needs to be pushed again.</div>
                </div>
              </div>
              <button class="btn btn-primary btn-sm" data-filter="failed">View</button>
            </div>
          </div>`
        : ""
    }

    <div class="filter-bar">
      ${INVOICE_FILTERS.map(
        (f) => `
        <button class="filter-chip ${state.invoiceFilter === f.key ? "active" : ""}" data-filter="${f.key}">
          ${f.label} <span class="count">${countFor(f.key)}</span>
        </button>`
      ).join("")}
    </div>

    <div class="card" style="padding:0;">
      <table>
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Customer</th>
            <th>Invoice Date</th>
            <th>Total</th>
            <th>Submission Status</th>
            <th>Books Payment Status</th>
            <th>FIRS Payment Push</th>
          </tr>
        </thead>
        <tbody>
          ${
            rows.length
              ? rows
                  .map(
                    (inv) => `
              <tr class="clickable" data-open-invoice="${inv.id}">
                <td><span class="invoice-link">${inv.number}</span></td>
                <td>${inv.customer}</td>
                <td>${inv.invoiceDate}</td>
                <td>${formatCurrency(inv.total, inv.currency)}</td>
                <td>
                  <span class="chip ${inv.submission.status === "approved" ? "chip-success" : "chip-neutral"}">
                    <span class="chip-dot"></span>${inv.submission.status === "approved" ? "Approved" : "Draft"}
                  </span>
                </td>
                <td>
                  <span class="chip ${inv.booksPaymentStatus === "Paid" ? "chip-success" : inv.booksPaymentStatus === "Partially Paid" ? "chip-warning" : "chip-neutral"}">
                    <span class="chip-dot"></span>${inv.booksPaymentStatus}
                  </span>
                </td>
                <td>${pushBadgeHtml(inv)}</td>
              </tr>`
                  )
                  .join("")
              : `<tr><td colspan="7"><div class="empty-state">No invoices match this filter.</div></td></tr>`
          }
        </tbody>
      </table>
    </div>
  `;

  contentNode.querySelectorAll("[data-filter]").forEach((el) => {
    el.addEventListener("click", () => {
      state.invoiceFilter = el.dataset.filter;
      render();
    });
  });
  contentNode.querySelectorAll("[data-open-invoice]").forEach((el) => {
    el.addEventListener("click", () => {
      state.page = "invoice-details";
      state.selectedInvoiceId = el.dataset.openInvoice;
      state.detailsTab = "overview";
      render();
    });
  });
}

/* --------------------------- Page: Invoice Details -------------------------- */

// The push band is the whole point of this feature: it only shows up when the
// automatic push to FIRS MBS is currently running or has failed. When everything
// is fine, payment status is folded quietly into the submission card below.
function paymentPushBandHtml(inv) {
  const s = derivePushState(inv);
  if (s === "pushing") {
    return `
      <div class="push-band tone-info">
        <div class="pb-left">
          <span class="pb-icon">⟳</span>
          <div>
            <div class="pb-title">Pushing payment info to FIRS MBS…</div>
            <div class="pb-desc">Books shows <strong>${inv.booksPaymentStatus}</strong>. FIRS MBS is being updated now — this usually takes a few seconds. Repeated actions are disabled while this is in progress.</div>
          </div>
        </div>
        <button class="btn btn-outline btn-sm" disabled>Pushing…</button>
      </div>`;
  }
  if (s === "failed") {
    return `
      <div class="push-band tone-danger">
        <div class="pb-left">
          <span class="pb-icon">⚠</span>
          <div>
            <div class="pb-title">Payment info not yet synced with FIRS MBS</div>
            <div class="pb-desc">Books shows <strong>${inv.booksPaymentStatus}</strong>, but FIRS MBS still shows <strong>${inv.firsPaymentStatus || "Pending Payment"}</strong> because the automatic push failed. ${inv.push.error}</div>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" data-action="push-payment" data-id="${inv.id}">Push Payment Info</button>
      </div>`;
  }
  return "";
}

// Quiet, single-line payment status shown inside the submission card when there is
// nothing that needs the user's attention (no payment yet, or already in sync).
function paymentStatusLineHtml(inv) {
  const s = derivePushState(inv);
  if (s === "not_applicable" && inv.booksPaymentStatus === "Pending") {
    return `
      <div class="field-row">
        <span class="fl">Payment Status</span>
        <span class="fv">
          <span class="muted">${inv.booksPaymentStatus} — no payment recorded yet</span>
          <button class="btn btn-ghost btn-sm" data-action="record-payment" data-kind="full" data-id="${inv.id}">Record Full Payment</button>
          <button class="btn btn-ghost btn-sm" data-action="record-payment" data-kind="partial" data-id="${inv.id}">Record Partial Payment</button>
        </span>
      </div>`;
  }
  if (s === "synced") {
    return `<div class="field-row"><span class="fl">Payment Status</span><span class="fv">${inv.booksPaymentStatus} <span class="muted">· synced with FIRS MBS on ${inv.push.lastPushedAt}</span></span></div>`;
  }
  return "";
}

function einvoiceCardHtml(inv) {
  if (inv.submission.status !== "approved") {
    return `
      <div class="card">
        <div class="einvoice-banner tone-info">
          <div class="banner-icon">⚡</div>
          <div class="banner-body">
            <div class="banner-title">What's next?</div>
            <div class="banner-desc">Submit this invoice to the FIRS MBS Portal for validation. Once approved, you'll receive an Invoice Reference Number (IRN) and CSID.</div>
            <div class="banner-actions">
              <button class="btn btn-primary btn-sm" data-action="submit-firs" data-id="${inv.id}">Submit to FIRS</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  const band = paymentPushBandHtml(inv);

  return `
    ${band ? `<div class="card">${band}</div>` : ""}
    <div class="card">
      <div class="card-title-row">
        <h3>E-Invoice Submission</h3>
        <span class="chip chip-success"><span class="chip-dot"></span>Approved</span>
      </div>
      <div class="field-row"><span class="fl">Invoice Reference Number (IRN)</span><span class="fv">${inv.submission.irn}</span></div>
      <div class="field-row"><span class="fl">CSID</span><span class="fv">${inv.submission.csid}</span></div>
      <div class="field-row"><span class="fl">Submitted On</span><span class="fv">${inv.submission.submittedAt}</span></div>
      ${paymentStatusLineHtml(inv)}
    </div>
  `;
}

function renderInvoiceDetails() {
  const inv = getInvoice(state.selectedInvoiceId) || state.invoices[0];

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "activity", label: "Activity" },
    { id: "payments", label: `Payments (${inv.payments.length})` }
  ];

  let tabBody = "";
  if (state.detailsTab === "overview") {
    tabBody = `
      <div class="card">
        <div class="card-title-row"><h3>Invoice Details</h3></div>
        <div class="detail-grid">
          <div>
            <div class="field-row"><span class="fl">Invoice Number</span><span class="fv">${inv.number}</span></div>
            <div class="field-row"><span class="fl">Invoice Date</span><span class="fv">${inv.invoiceDate}</span></div>
            <div class="field-row"><span class="fl">Due Date</span><span class="fv">${inv.dueDate}</span></div>
          </div>
          <div>
            <div class="field-row"><span class="fl">Customer</span><span class="fv">${inv.customer}</span></div>
            <div class="field-row"><span class="fl">Email</span><span class="fv">${inv.email}</span></div>
            <div class="field-row"><span class="fl">Total</span><span class="fv">${formatCurrency(inv.total, inv.currency)}</span></div>
          </div>
        </div>
      </div>
      <div class="card" style="padding:0;">
        <table>
          <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead>
          <tbody>
            ${inv.items
              .map(
                (it) => `<tr><td>${it.name}</td><td>${it.qty}</td><td>${formatCurrency(it.price, inv.currency)}</td><td>${formatCurrency(it.qty * it.price, inv.currency)}</td></tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  } else if (state.detailsTab === "activity") {
    tabBody = `
      <div class="card">
        <div class="card-title-row"><h3>Lifecycle Activity</h3></div>
        <div class="section-note">This timeline audits both the invoice submission lifecycle and the separate payment-push lifecycle with FIRS MBS.</div>
        <div class="timeline">
          ${inv.activity
            .map(
              (ev) => `
            <div class="timeline-item type-${ev.type}">
              <span class="timeline-dot"></span>
              <div class="timeline-title">${ev.title}</div>
              <div class="timeline-note">${ev.note}</div>
              <div class="timeline-when">${ev.when}</div>
            </div>`
            )
            .join("")}
        </div>
      </div>
    `;
  } else if (state.detailsTab === "payments") {
    tabBody = `
      <div class="card" style="padding:0;">
        <table>
          <thead><tr><th>Date</th><th>Amount</th><th>Mode</th><th>FIRS Payment Push</th></tr></thead>
          <tbody>
            ${
              inv.payments.length
                ? inv.payments
                    .map(
                      (p) => `<tr><td>${p.date}</td><td>${formatCurrency(p.amount, inv.currency)}</td><td>${p.mode}</td><td>${pushBadgeHtml(inv)}</td></tr>`
                    )
                    .join("")
                : `<tr><td colspan="4"><div class="empty-state">No payments recorded yet for this invoice.</div></td></tr>`
            }
          </tbody>
        </table>
      </div>
    `;
  }

  contentNode.innerHTML = `
    <button class="back-link" data-nav-page="invoices">← Back to Invoices</button>
    <div class="invoice-head">
      <div>
        <div class="breadcrumb">Location: Head Office</div>
        <h1>${inv.number}</h1>
      </div>
      <div class="invoice-actions">
        <button class="btn btn-outline btn-sm" disabled>Edit</button>
        <button class="btn btn-outline btn-sm" disabled>Send</button>
        <button class="btn btn-outline btn-sm" disabled>PDF/Print</button>
      </div>
    </div>

    ${einvoiceCardHtml(inv)}

    <div class="tabs">
      ${tabs.map((t) => `<button class="tab-btn ${state.detailsTab === t.id ? "active" : ""}" data-tab="${t.id}">${t.label}</button>`).join("")}
    </div>

    ${tabBody}
  `;

  contentNode.querySelectorAll("[data-nav-page]").forEach((el) => {
    el.addEventListener("click", () => {
      state.page = el.dataset.navPage;
      render();
    });
  });
  contentNode.querySelectorAll("[data-tab]").forEach((el) => {
    el.addEventListener("click", () => {
      state.detailsTab = el.dataset.tab;
      render();
    });
  });
  contentNode.querySelectorAll("[data-action='submit-firs']").forEach((el) => {
    el.addEventListener("click", () => submitInvoiceToFirs(el.dataset.id));
  });
  contentNode.querySelectorAll("[data-action='record-payment']").forEach((el) => {
    el.addEventListener("click", () => recordPayment(el.dataset.id, el.dataset.kind));
  });
  contentNode.querySelectorAll("[data-action='push-payment']").forEach((el) => {
    el.addEventListener("click", () => retryPush(el.dataset.id));
  });
}

/* --------------------------- Page: Payments Received ------------------------ */

function renderPaymentsReceived() {
  const flatPayments = [];
  state.invoices.forEach((inv) => {
    inv.payments.forEach((p) => {
      flatPayments.push({ payment: p, invoice: inv });
    });
  });

  const failedCount = state.invoices.filter((inv) => derivePushState(inv) === "failed").length;

  contentNode.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Payments Received</h1>
        <p class="muted">When a payment is recorded against an invoice already submitted to FIRS, this shows whether that update has reached the portal.</p>
      </div>
    </div>

    ${
      state.pushBanner
        ? `<div class="result-banner">
            <span>${
              state.pushBanner.done >= state.pushBanner.total
                ? `✓ ${state.pushBanner.total} payment(s) pushed to FIRS MBS Portal successfully.`
                : `Pushing ${state.pushBanner.done} of ${state.pushBanner.total} payment(s)…`
            }</span>
            <button class="btn btn-ghost btn-sm" data-action="dismiss-banner">Dismiss</button>
          </div>`
        : ""
    }

    ${
      failedCount
        ? `<div class="card">
            <div class="push-band tone-danger">
              <div class="pb-left">
                <span class="pb-icon">⚠</span>
                <div>
                  <div class="pb-title">${failedCount} payment(s) need to be pushed to FIRS MBS Portal</div>
                  <div class="pb-desc">These invoices were submitted to FIRS, but the recorded payment hasn't reached the portal yet.</div>
                </div>
              </div>
              <button class="btn btn-primary btn-sm" data-action="push-all-failed">Push Payment Info</button>
            </div>
          </div>`
        : ""
    }

    <div class="card" style="padding:0;">
      <table>
        <thead>
          <tr>
            <th>Payment Date</th>
            <th>Customer</th>
            <th>Invoice #</th>
            <th>Amount</th>
            <th>Mode</th>
            <th>FIRS Payment Push</th>
          </tr>
        </thead>
        <tbody>
          ${
            flatPayments.length
              ? flatPayments
                  .map(
                    (r) => `
              <tr>
                <td>${r.payment.date}</td>
                <td>${r.invoice.customer}</td>
                <td><a class="invoice-link" data-goto-invoice="${r.invoice.id}">${r.invoice.number}</a></td>
                <td>${formatCurrency(r.payment.amount, r.invoice.currency)}</td>
                <td>${r.payment.mode}</td>
                <td>
                  ${pushBadgeHtml(r.invoice)}
                  ${derivePushState(r.invoice) === "failed" ? `<button class="btn btn-ghost btn-sm" data-action="push-payment" data-id="${r.invoice.id}">Push</button>` : ""}
                </td>
              </tr>`
                  )
                  .join("")
              : `<tr><td colspan="6"><div class="empty-state">No payments recorded yet.</div></td></tr>`
          }
        </tbody>
      </table>
    </div>
  `;

  contentNode.querySelectorAll("[data-goto-invoice]").forEach((el) => {
    el.addEventListener("click", () => {
      state.page = "invoice-details";
      state.selectedInvoiceId = el.dataset.gotoInvoice;
      state.detailsTab = "overview";
      render();
    });
  });
  contentNode.querySelectorAll("[data-action='push-payment']").forEach((el) => {
    el.addEventListener("click", () => retryPush(el.dataset.id));
  });
  const pushAllBtn = contentNode.querySelector("[data-action='push-all-failed']");
  if (pushAllBtn) pushAllBtn.addEventListener("click", pushAllFailed);
  const dismissBtn = contentNode.querySelector("[data-action='dismiss-banner']");
  if (dismissBtn) dismissBtn.addEventListener("click", () => { state.pushBanner = null; render(); });
}

/* --------------------------------- Render ---------------------------------- */

function render() {
  renderNav();
  if (state.page === "dashboard") renderDashboard();
  else if (state.page === "invoices") renderInvoicesList();
  else if (state.page === "invoice-details") renderInvoiceDetails();
  else if (state.page === "payments") renderPaymentsReceived();
}

render();
