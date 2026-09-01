const navItems = [
  { id: "list", label: "Blanket PO List" },
  { id: "create", label: "Create / Edit BPO" },
  { id: "details", label: "BPO Details" },
  { id: "schedule", label: "Schedule Planning" },
  { id: "releases", label: "Release Purchase Orders" },
  { id: "activity", label: "Activity & Audit" },
  { id: "consumption", label: "Consumption Tracking" }
];

const state = {
  page: "list",
  detailsTab: "details",
  scheduleView: "timeline",
  selectedBpoId: "BPO-0001",
  selectedScheduleId: null,
  bpos: [
    {
      id: "BPO-0001",
      vendor: "Vendor 001",
      period: "01/07/2026 - 30/08/2027",
      committed: 798600,
      consumedPct: 42,
      remaining: 463200,
      status: "active",
      location: "Bangalore",
      currency: "INR",
      items: [
        { id: "I-1", name: "MT Steel bar Fe500D", type: "goods", unit: "KG", committedQty: 200, scheduledQty: 180, releasedQty: 20, receivedQty: 20, rate: 650, committedAmount: 130000 },
        { id: "I-2", name: "MS Angle 50x50x5", type: "goods", unit: "PCS", committedQty: 120, scheduledQty: 90, releasedQty: 0, receivedQty: 0, rate: 1250, committedAmount: 150000 },
        { id: "I-3", name: "Site fabrication service", type: "service", unit: "AMOUNT", committedQty: 0, scheduledQty: 250000, releasedQty: 85000, receivedQty: 48000, rate: 1, committedAmount: 518600 }
      ],
      schedules: [
        { id: "R-1", releaseNo: "Release #1", date: "01/07/2026", delivery: "03/07/2026", status: "released", items: [{ itemId: "I-1", value: 20 }, { itemId: "I-2", value: 12 }, { itemId: "I-3", value: 12000 }], releaseValue: 106500, poStatus: "Generated", consumption: 100 },
        { id: "R-2", releaseNo: "Release #2", date: "01/08/2026", delivery: "03/08/2026", status: "scheduled", items: [{ itemId: "I-1", value: 20 }, { itemId: "I-2", value: 12 }, { itemId: "I-3", value: 12000 }], releaseValue: 106500, poStatus: "Not Generated", consumption: 0 },
        { id: "R-3", releaseNo: "Release #3", date: "01/09/2026", delivery: "03/09/2026", status: "scheduled", items: [{ itemId: "I-1", value: 15 }, { itemId: "I-2", value: 12 }, { itemId: "I-3", value: 12000 }], releaseValue: 103250, poStatus: "Not Generated", consumption: 0 },
        { id: "R-4", releaseNo: "Release #4", date: "01/10/2026", delivery: "03/10/2026", status: "scheduled", items: [{ itemId: "I-1", value: 14 }, { itemId: "I-2", value: 12 }, { itemId: "I-3", value: 12000 }], releaseValue: 102600, poStatus: "Not Generated", consumption: 0 }
      ],
      activity: [
        { title: "Blanket PO Approved", note: "Approved by Procurement Manager", when: "24 Jul 2026 10:12" },
        { title: "Schedule Generated", note: "12 monthly schedules created", when: "24 Jul 2026 11:00" },
        { title: "Release PO Created", note: "Release #1 generated as draft", when: "24 Jul 2026 12:18" },
        { title: "Consumption Updated", note: "GRN posted for Release #1", when: "24 Jul 2026 15:35" }
      ]
    },
    {
      id: "BPO-0002",
      vendor: "Vendor 006",
      period: "01/04/2026 - 31/03/2027",
      committed: 250000,
      consumedPct: 0,
      remaining: 250000,
      status: "approved",
      location: "Chennai",
      currency: "INR",
      items: [],
      schedules: [],
      activity: []
    }
  ]
};

const navNode = document.getElementById("main-nav");
const contentNode = document.getElementById("page-content");
const titleNode = document.getElementById("page-title");
const subtitleNode = document.getElementById("page-subtitle");
const primaryActionNode = document.getElementById("primary-action");
const modalRoot = document.getElementById("modal-root");

function currency(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function getSelectedBpo() {
  return state.bpos.find((bpo) => bpo.id === state.selectedBpoId) || state.bpos[0];
}

function statusChip(status) {
  const label = status.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return `<span class="status status-${status}">${label}</span>`;
}

function renderNav() {
  navNode.innerHTML = navItems
    .map((item) => `<button class="nav-item ${state.page === item.id ? "active" : ""}" data-nav="${item.id}">${item.label}</button>`)
    .join("");

  navNode.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.page = btn.dataset.nav;
      render();
    });
  });
}

function planningHealth(bpo) {
  const items = bpo.items;
  const committed = items.reduce((sum, item) => sum + (item.type === "goods" ? item.committedQty : item.committedAmount), 0);
  const scheduled = items.reduce((sum, item) => sum + item.scheduledQty, 0);
  const released = items.reduce((sum, item) => sum + item.releasedQty, 0);
  const consumed = items.reduce((sum, item) => sum + item.receivedQty, 0);
  const remaining = committed - scheduled - released - consumed;

  const warnings = [];
  if (remaining > 0) warnings.push(`${remaining} units or amount unallocated`);
  if (remaining < 0) warnings.push(`Over allocated by ${Math.abs(remaining)}`);
  if (bpo.status === "expired") warnings.push("Blanket PO is expired");
  if (bpo.schedules.some((s) => s.status === "released") && bpo.schedules.some((s) => s.status === "scheduled")) warnings.push("Partially released schedule plan");

  return { committed, scheduled, released, consumed, remaining, warnings };
}

function renderListPage() {
  const selected = getSelectedBpo();
  const listRows = state.bpos
    .map((bpo) => {
      return `
      <div class="list-item ${bpo.id === selected.id ? "active" : ""}" data-bpo="${bpo.id}">
        <div class="row"><strong>${bpo.vendor}</strong>${statusChip(bpo.status)}</div>
        <div class="row muted" style="margin-top:4px"><span>${bpo.id}</span><span>${bpo.period}</span></div>
        <div class="row" style="margin-top:8px"><span>${currency(bpo.committed)}</span><span>Remaining ${currency(bpo.remaining)}</span></div>
        <div class="progress" style="margin-top:8px"><span style="width:${bpo.consumedPct}%"></span></div>
        <div class="row muted" style="margin-top:4px"><span>Consumption</span><span>${bpo.consumedPct}%</span></div>
      </div>`;
    })
    .join("");

  contentNode.innerHTML = `
    <div class="toolbar">
      <button class="btn btn-primary" data-go="create">Create Blanket PO</button>
      <span class="chip">Status: All</span>
      <span class="chip">Vendor: Any</span>
      <span class="chip">Purchase Period</span>
      <span class="chip">Expiry</span>
      <span class="chip">Consumption %</span>
      <span class="chip">Location</span>
      <span class="chip">Sort: Recently Modified</span>
    </div>
    <div class="split-view">
      <section class="panel">
        <div class="section"><strong>All Blanket Purchase Orders</strong></div>
        <div class="list">${listRows}</div>
      </section>
      <section class="panel">
        <div class="section row">
          <div>
            <h3 style="margin:0">${selected.id}</h3>
            <p class="muted" style="margin:4px 0 0">${selected.vendor}</p>
          </div>
          ${statusChip(selected.status)}
        </div>
        <div class="section metric-grid">
          <div class="metric"><h4>Committed Amount</h4><strong>${currency(selected.committed)}</strong></div>
          <div class="metric"><h4>Remaining</h4><strong>${currency(selected.remaining)}</strong></div>
          <div class="metric"><h4>Consumption</h4><strong>${selected.consumedPct}%</strong></div>
          <div class="metric"><h4>Purchase Period</h4><strong style="font-size:13px">${selected.period}</strong></div>
        </div>
        <div class="section">
          <h4 style="margin:0 0 8px">What is next</h4>
          <div class="row">
            <button class="btn btn-primary" data-go="schedule">Generate Schedule</button>
            <button class="btn" data-go="details">Open Details</button>
          </div>
        </div>
      </section>
    </div>
  `;

  contentNode.querySelectorAll("[data-bpo]").forEach((row) => {
    row.addEventListener("click", () => {
      state.selectedBpoId = row.dataset.bpo;
      renderListPage();
    });
  });

  wireGotoButtons();
}

function renderCreatePage() {
  const bpo = getSelectedBpo();
  const rowHtml = bpo.items
    .map((item) => {
      return `
        <tr>
          <td>${item.name}</td>
          <td>${item.type}</td>
          <td>${item.type === "goods" ? item.committedQty : "-"}</td>
          <td>${currency(item.rate)}</td>
          <td>GST</td>
          <td>${currency(item.committedAmount)}</td>
          <td><button class="btn btn-ghost" data-duplicate="${item.id}">Duplicate</button></td>
        </tr>
      `;
    })
    .join("");

  contentNode.innerHTML = `
    <section class="card">
      <div class="section"><strong>Create / Edit Blanket Purchase Order</strong></div>
      <div class="section detail-grid">
        ${textField("Vendor", "Vendor 001 *")}
        ${textField("Blanket PO Number", bpo.id)}
        ${textField("Billing Address", "Industrial Park, Bangalore")}
        ${textField("Shipping Address", "Plant 1, Bangalore")}
        ${textField("Currency", bpo.currency)}
        ${textField("Reference Number", "RFQ-001")}
        ${textField("Blanket PO Date", "22/07/2026")}
        ${textField("Purchase Validity Period", bpo.period + " *")}
        ${textField("Payment Terms", "Net 30")}
        ${textField("Warehouse", "Main WH")}
        ${textField("Location", bpo.location)}
        ${textField("Selection Type", "Item Level")}
        ${textField("Discount Type", "Amount")}
        ${textField("Exchange Rate", "1.000")}
      </div>

      <div class="section">
        <div class="row" style="margin-bottom:8px">
          <strong>Items</strong>
          <div class="row" style="gap:8px">
            <button class="btn">Bulk Add</button>
            <button class="btn">Bulk Actions</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th>Tax</th>
                <th>Committed Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>${rowHtml}</tbody>
          </table>
        </div>
      </div>

      <div class="section detail-grid">
        ${textAreaField("Notes", "Enter details relevant to this long-term procurement agreement")}
        ${textAreaField("Terms & Conditions", "Commercial and service terms")}
      </div>

      <div class="footer-actions">
        <div class="row" style="gap:8px">
          <button class="btn">Save Draft</button>
          <button class="btn">Save & Submit</button>
          <button class="btn btn-primary" id="save-schedule">Save & Schedule</button>
        </div>
        <button class="btn btn-ghost" data-go="list">Cancel</button>
      </div>
    </section>
  `;

  const saveSchedule = document.getElementById("save-schedule");
  saveSchedule.addEventListener("click", () => {
    state.page = "schedule";
    render();
  });

  wireGotoButtons();
}

function renderDetailsPage() {
  const bpo = getSelectedBpo();
  const whatsNext = {
    draft: "Submit for Approval",
    "awaiting-approval": "Await Approval",
    approved: "Generate Schedule",
    active: "Create Schedule",
    expired: "Renew",
    closed: "Duplicate"
  };

  const tabs = ["details", "items consumption", "schedules", "activity logs"];
  const tabButtons = tabs
    .map((tab) => {
      const key = tab.replace(/\s/g, "-");
      return `<button class="tab ${state.detailsTab === key ? "active" : ""}" data-tab="${key}">${tab}</button>`;
    })
    .join("");

  contentNode.innerHTML = `
    <section class="card">
      <div class="section row">
        <div>
          <h3 style="margin:0">${bpo.id}</h3>
          <p class="muted" style="margin:4px 0 0">${bpo.vendor}</p>
        </div>
        ${statusChip(bpo.status)}
      </div>

      <div class="section metric-grid">
        <div class="metric"><h4>Committed Amount</h4><strong>${currency(bpo.committed)}</strong></div>
        <div class="metric"><h4>Consumption %</h4><strong>${bpo.consumedPct}%</strong></div>
        <div class="metric"><h4>Released POs</h4><strong>${bpo.schedules.filter((s) => s.status === "released").length}</strong></div>
        <div class="metric"><h4>Remaining Amount</h4><strong>${currency(bpo.remaining)}</strong></div>
      </div>

      <div class="section row">
        <div>
          <h4 style="margin:0">What's Next</h4>
          <p class="muted" style="margin:4px 0 0">Contextual action based on status</p>
        </div>
        <div class="row" style="gap:8px">
          <button class="btn btn-primary" data-go="schedule">${whatsNext[bpo.status] || "Open"}</button>
          <button class="btn">Hold</button>
        </div>
      </div>

      <div class="tabs">${tabButtons}</div>
      <div class="section" id="details-tab-content"></div>
    </section>
  `;

  contentNode.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.detailsTab = btn.dataset.tab;
      renderDetailsPage();
    });
  });

  renderDetailsTabContent();
  wireGotoButtons();
}

function renderDetailsTabContent() {
  const bpo = getSelectedBpo();
  const tabContent = document.getElementById("details-tab-content");

  if (state.detailsTab === "details") {
    tabContent.innerHTML = `
      <div class="detail-grid">
        ${staticMetric("Vendor Details", `${bpo.vendor}, Bangalore, India`)}
        ${staticMetric("Purchase Information", `${bpo.period}, Net 30`)}
      </div>
      <div class="table-wrap" style="margin-top:12px">
        <table>
          <thead><tr><th>Item</th><th>Committed</th><th>Rate</th><th>Amount</th></tr></thead>
          <tbody>
            ${bpo.items
              .map((item) => `<tr><td>${item.name}</td><td>${item.type === "goods" ? `${item.committedQty} ${item.unit}` : "Service"}</td><td>${currency(item.rate)}</td><td>${currency(item.committedAmount)}</td></tr>`)
              .join("")}
          </tbody>
        </table>
      </div>
    `;
    return;
  }

  if (state.detailsTab === "items-consumption") {
    tabContent.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Item</th><th>Committed</th><th>Scheduled</th><th>Released</th><th>Received</th><th>Remaining</th><th>Progress</th></tr></thead>
          <tbody>
            ${bpo.items
              .map((item) => {
                const committed = item.type === "goods" ? item.committedQty : item.committedAmount;
                const remaining = committed - item.scheduledQty - item.releasedQty - item.receivedQty;
                const pct = Math.max(0, Math.min(100, Math.round(((item.releasedQty + item.receivedQty) / committed) * 100))) || 0;
                return `<tr>
                  <td>${item.name}</td>
                  <td>${committed}</td>
                  <td>${item.scheduledQty}</td>
                  <td>${item.releasedQty}</td>
                  <td>${item.receivedQty}</td>
                  <td>${remaining}</td>
                  <td><div class="kpi-ring" style="--val:${pct}"><span>${pct}%</span></div></td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;
    return;
  }

  if (state.detailsTab === "schedules") {
    tabContent.innerHTML = `
      <div class="timeline">
        ${bpo.schedules
          .map(
            (schedule) => `<article class="timeline-card">
            <div class="row"><strong>${schedule.releaseNo}</strong>${statusChip(schedule.status === "released" ? "active" : "approved")}</div>
            <p class="muted">${schedule.date} to ${schedule.delivery}</p>
            <div class="row"><span>Release Value</span><strong>${currency(schedule.releaseValue)}</strong></div>
            <button class="btn" style="margin-top:8px" data-open-schedule="${schedule.id}">Open</button>
          </article>`
          )
          .join("")}
      </div>
    `;

    tabContent.querySelectorAll("[data-open-schedule]").forEach((btn) => {
      btn.addEventListener("click", () => openScheduleDrawer(btn.dataset.openSchedule));
    });
    return;
  }

  tabContent.innerHTML = bpo.activity
    .map((event) => `<div class="activity-item"><h4>${event.title}</h4><p>${event.note}</p><p>${event.when}</p></div>`)
    .join("");
}

function scheduleEntryValue(schedule, itemId) {
  return schedule.items.find((entry) => entry.itemId === itemId)?.value || 0;
}

function formatScheduleCell(item, value) {
  if (item.type === "service") {
    return currency(value);
  }
  return `${value} <span class="matrix-unit">${item.unit}</span>`;
}

function renderScheduleMatrix(bpo, schedules) {
  const releaseHead = schedules
    .map((schedule) => `<th><div class="row"><span>${schedule.releaseNo}</span><button class="btn btn-ghost" data-open-schedule="${schedule.id}">Open</button></div></th>`)
    .join("");

  const releaseDateRow = schedules.map((schedule) => `<td>${schedule.date}</td>`).join("");
  const deliveryDateRow = schedules.map((schedule) => `<td>${schedule.delivery}</td>`).join("");

  const itemRows = bpo.items
    .map((item) => {
      const committed = item.type === "goods" ? item.committedQty : item.committedAmount;
      const allocated = schedules.reduce((sum, schedule) => sum + scheduleEntryValue(schedule, item.id), 0);
      const pct = committed > 0 ? Math.max(0, Math.min(100, Math.round((allocated / committed) * 100))) : 0;
      const consumptionLabel =
        item.type === "goods"
          ? `${allocated}/${committed}`
          : `${currency(allocated)} / ${currency(committed)}`;

      const scheduleCells = schedules
        .map((schedule) => {
          const value = scheduleEntryValue(schedule, item.id);
          if (schedule.status === "released") {
            return `<td><div class="matrix-static">${formatScheduleCell(item, value)}</div></td>`;
          }
          return `<td><div class="matrix-input-wrap"><input class="matrix-input" value="${value}" />${item.type === "goods" ? `<span class="matrix-unit">${item.unit}</span>` : ""}</div></td>`;
        })
        .join("");

      return `
        <tr>
          <td>
            <div class="matrix-item-title">${item.name}</div>
            <div class="muted" style="font-size:11px">${item.type === "goods" ? "Goods" : "Service"}</div>
          </td>
          ${scheduleCells}
          <td>
            <div class="matrix-consumption">
              <div class="mini-ring" style="--val:${pct}"></div>
              <span>${consumptionLabel}</span>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  const summaryRow = schedules.map((schedule) => `<td>${currency(schedule.releaseValue)}</td>`).join("");

  return `
    <section class="card">
      <div class="section">
        <h3 style="margin:0">Schedules</h3>
      </div>
      <div class="section">
        <div class="table-wrap schedule-matrix-wrap">
          <table class="schedule-matrix">
            <thead>
              <tr>
                <th>Release Information</th>
                ${releaseHead}
                <th>Consumptions</th>
              </tr>
            </thead>
            <tbody>
              <tr class="matrix-group"><td>Order Details</td>${schedules.map(() => "<td></td>").join("")}<td></td></tr>
              <tr>
                <td>Release Date</td>
                ${releaseDateRow}
                <td class="muted">-</td>
              </tr>
              <tr>
                <td>Delivery Date</td>
                ${deliveryDateRow}
                <td class="muted">-</td>
              </tr>
              <tr class="matrix-group"><td>Items</td>${schedules.map(() => "<td></td>").join("")}<td></td></tr>
              ${itemRows}
              <tr class="matrix-group"><td>Order Summary</td>${schedules.map(() => "<td></td>").join("")}<td></td></tr>
              <tr>
                <td>Total Amount</td>
                ${summaryRow}
                <td class="muted">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="footer-actions" style="position:static">
        <div class="row" style="gap:8px">
          <button class="btn btn-primary">Save</button>
          <button class="btn">Cancel</button>
        </div>
      </div>
    </section>
  `;
}

function renderSchedulePage() {
  const bpo = getSelectedBpo();
  const health = planningHealth(bpo);
  const schedules = bpo.schedules;

  const scheduleBody =
    schedules.length === 0
      ? `<section class="card section" style="text-align:center; padding:56px 20px">
          <h3 style="margin-top:0">No Release Schedules Yet</h3>
          <p class="muted">Plan future Purchase Orders by generating schedules automatically or creating them manually.</p>
          <div class="row" style="justify-content:center; gap:8px">
            <button class="btn btn-primary" id="generate-empty">Generate Schedule</button>
            <button class="btn" id="manual-empty">Create Manually</button>
          </div>
        </section>`
      : state.scheduleView === "timeline"
      ? `<div class="timeline">
          ${schedules
            .map(
              (schedule) => `
            <article class="timeline-card">
              <div class="row"><strong>${schedule.releaseNo}</strong>${statusChip(schedule.status === "released" ? "active" : "approved")}</div>
              <p class="muted">Transaction: ${schedule.date}</p>
              <p class="muted">Delivery: ${schedule.delivery}</p>
              <div class="row"><span>Items</span><strong>${schedule.items.length}</strong></div>
              <div class="row"><span>Release Value</span><strong>${currency(schedule.releaseValue)}</strong></div>
              <div class="row"><span>PO</span><strong>${schedule.poStatus}</strong></div>
              <button class="btn" data-open-schedule="${schedule.id}">Open Side Panel</button>
            </article>
          `
            )
            .join("")}
        </div>`
      : renderScheduleMatrix(bpo, schedules);

  contentNode.innerHTML = `
    <div class="workspace-bar">
      <div class="row" style="align-items:flex-start; gap:16px">
        <div style="flex:1">
          <strong>Planning Health</strong>
          <div class="metric-grid" style="margin-top:8px">
            <div class="metric"><h4>Committed</h4><strong>${health.committed}</strong></div>
            <div class="metric"><h4>Scheduled</h4><strong>${health.scheduled}</strong></div>
            <div class="metric"><h4>Released</h4><strong>${health.released}</strong></div>
            <div class="metric"><h4>Remaining</h4><strong>${health.remaining}</strong></div>
          </div>
          ${health.warnings.length ? `<ul class="warning-list">${health.warnings.map((warning) => `<li>${warning}</li>`).join("")}</ul>` : ""}
        </div>
        <div class="row" style="gap:8px; align-self:center">
          <button class="btn btn-primary" id="generate-schedule">Generate Schedule</button>
          <button class="btn" id="create-schedule">Create Schedule</button>
          <button class="btn ${state.scheduleView === "timeline" ? "btn-primary" : ""}" id="view-timeline">Timeline</button>
          <button class="btn ${state.scheduleView === "spreadsheet" ? "btn-primary" : ""}" id="view-sheet">Spreadsheet</button>
        </div>
      </div>
    </div>

    ${scheduleBody}
  `;

  const generate = document.getElementById("generate-schedule") || document.getElementById("generate-empty");
  const createSchedule = document.getElementById("create-schedule") || document.getElementById("manual-empty");

  if (generate) generate.addEventListener("click", openGenerateModal);
  if (createSchedule) createSchedule.addEventListener("click", openManualScheduleDrawer);

  const viewTimeline = document.getElementById("view-timeline");
  const viewSheet = document.getElementById("view-sheet");

  if (viewTimeline) {
    viewTimeline.addEventListener("click", () => {
      state.scheduleView = "timeline";
      renderSchedulePage();
    });
  }

  if (viewSheet) {
    viewSheet.addEventListener("click", () => {
      state.scheduleView = "spreadsheet";
      renderSchedulePage();
    });
  }

  contentNode.querySelectorAll("[data-open-schedule]").forEach((btn) => {
    btn.addEventListener("click", () => openScheduleDrawer(btn.dataset.openSchedule));
  });
}

function renderReleasesPage() {
  const bpo = getSelectedBpo();
  const hasSchedules = bpo.schedules.length > 0;
  const releases = bpo.schedules.filter((s) => s.status === "released");

  contentNode.innerHTML = `
    <section class="card">
      <div class="section row">
        <div>
          <h3 style="margin:0">Release Purchase Orders</h3>
          <p class="muted" style="margin:4px 0 0">Releases are schedule-driven for this Blanket PO</p>
        </div>
        <button class="btn ${hasSchedules ? "btn-ghost" : "btn-primary"}">${hasSchedules ? "Scheduled mode enabled" : "Create Manual Release"}</button>
      </div>
      <div class="section notice">
        ${hasSchedules ? "Manual ad hoc release creation is locked because schedules exist. Users can release future schedules early from the planning workspace." : "No schedules available. Manual release flow is available."}
      </div>
      <div class="section table-wrap">
        <table>
          <thead>
            <tr><th>Release #</th><th>Date</th><th>PO Status</th><th>Value</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${releases
              .map((release) => `<tr><td>${release.releaseNo}</td><td>${release.date}</td><td>${release.poStatus}</td><td>${currency(release.releaseValue)}</td><td><button class="btn">Open PO</button></td></tr>`)
              .join("")}
          </tbody>
        </table>
      </div>
      <div class="section detail-grid">
        ${toggleCard("Create Release PO As", "Draft / Issued")}
        ${toggleCard("Send Email Automatically", "Enabled")}
        ${toggleCard("Notify", "Admins, BPO Owner")}
        ${toggleCard("Attach Schedule PDF", "Enabled")}
      </div>
    </section>
  `;
}

function renderActivityPage() {
  const bpo = getSelectedBpo();
  contentNode.innerHTML = `
    <section class="card section">
      <h3 style="margin-top:0">Activity & Audit Trail</h3>
      <p class="muted">Every action across approvals, schedules, release generation, consumption, and cancellations.</p>
      ${bpo.activity
        .map((event) => `<div class="activity-item"><h4>${event.title}</h4><p>${event.note}</p><p>${event.when}</p></div>`)
        .join("")}
    </section>
  `;
}

function renderConsumptionPage() {
  const bpo = getSelectedBpo();

  contentNode.innerHTML = `
    <section class="card">
      <div class="section row">
        <div>
          <h3 style="margin:0">Consumption Tracking</h3>
          <p class="muted" style="margin:4px 0 0">Committed, Scheduled, Released, Received, Remaining</p>
        </div>
      </div>
      <div class="section table-wrap">
        <table>
          <thead><tr><th>Item</th><th>Committed</th><th>Scheduled</th><th>Released</th><th>Received</th><th>Remaining</th><th>Consumption %</th></tr></thead>
          <tbody>
            ${bpo.items
              .map((item) => {
                const committed = item.type === "goods" ? item.committedQty : item.committedAmount;
                const remaining = committed - item.scheduledQty - item.releasedQty - item.receivedQty;
                const pct = Math.max(0, Math.min(100, Math.round((item.receivedQty / committed) * 100))) || 0;
                return `<tr>
                  <td>${item.name}</td>
                  <td>${committed}</td>
                  <td>${item.scheduledQty}</td>
                  <td>${item.releasedQty}</td>
                  <td>${item.receivedQty}</td>
                  <td>${remaining}</td>
                  <td><div class="progress"><span style="width:${pct}%"></span></div><div class="muted">${pct}%</div></td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function textField(label, value) {
  return `<div class="field"><label>${label}</label><input value="${value}" /></div>`;
}

function textAreaField(label, value) {
  return `<div class="field"><label>${label}</label><textarea>${value}</textarea></div>`;
}

function staticMetric(label, value) {
  return `<div class="metric"><h4>${label}</h4><strong style="font-size:13px">${value}</strong></div>`;
}

function toggleCard(label, value) {
  return `<div class="metric"><h4>${label}</h4><strong style="font-size:13px">${value}</strong></div>`;
}

function openGenerateModal() {
  modalRoot.innerHTML = `
    <div class="overlay" id="overlay"></div>
    <div class="modal">
      <div class="section row">
        <h3 style="margin:0">Auto Generate Schedules</h3>
        <button class="btn btn-ghost" id="close-modal">Close</button>
      </div>
      <div class="section detail-grid">
        ${textField("Generate From", "01/07/2026")}
        ${textField("Generate Until", "30/08/2027")}
        <div class="field">
          <label>Frequency</label>
          <select>
            <option>Weekly</option>
            <option>Bi Weekly</option>
            <option selected>Monthly</option>
            <option>Quarterly</option>
            <option>Half Yearly</option>
            <option>Yearly</option>
            <option>Custom</option>
          </select>
        </div>
        ${textField("First Schedule Date", "01/07/2026")}
      </div>
      <div class="section notice">
        Committed quantities and service amounts are distributed evenly across generated schedules. Each schedule represents one future Release Purchase Order.
      </div>
      <div class="section row">
        <span class="muted">Preview: Total Releases 12, Last Release Date 01/08/2027</span>
        <button class="btn btn-primary" id="confirm-generate">Generate</button>
      </div>
    </div>
  `;

  document.getElementById("close-modal").addEventListener("click", closeModal);
  document.getElementById("overlay").addEventListener("click", closeModal);
  document.getElementById("confirm-generate").addEventListener("click", () => {
    closeModal();
    const bpo = getSelectedBpo();
    if (!bpo.schedules.length) {
      bpo.schedules.push(
        { id: "R-1", releaseNo: "Release #1", date: "01/07/2026", delivery: "03/07/2026", status: "scheduled", items: [{ itemId: "I-1", value: 20 }, { itemId: "I-2", value: 10 }, { itemId: "I-3", value: 10000 }], releaseValue: 100000, poStatus: "Not Generated", consumption: 0 },
        { id: "R-2", releaseNo: "Release #2", date: "01/08/2026", delivery: "03/08/2026", status: "scheduled", items: [{ itemId: "I-1", value: 20 }, { itemId: "I-2", value: 10 }, { itemId: "I-3", value: 10000 }], releaseValue: 100000, poStatus: "Not Generated", consumption: 0 }
      );
    }
    renderSchedulePage();
  });
}

function openManualScheduleDrawer() {
  const bpo = getSelectedBpo();
  modalRoot.innerHTML = `
    <div class="overlay" id="overlay"></div>
    <aside class="drawer">
      <div class="section row">
        <h3 style="margin:0">Create Schedule</h3>
        <button class="btn btn-ghost" id="close-drawer">Close</button>
      </div>
      <div class="section detail-grid">
        ${textField("Transaction Date", "08/10/2026")}
        ${textField("Expected Delivery", "10/10/2026")}
      </div>
      <div class="section">
        <h4 style="margin-top:0">Allocate Items</h4>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Item</th><th>Committed</th><th>Scheduled</th><th>Remaining</th><th>Allocate</th></tr></thead>
            <tbody>
              ${bpo.items
                .map((item) => {
                  const committed = item.type === "goods" ? item.committedQty : item.committedAmount;
                  const remaining = committed - item.scheduledQty;
                  return `<tr><td>${item.name}</td><td>${committed}</td><td>${item.scheduledQty}</td><td>${remaining}</td><td><input value="0" /></td></tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
      <div class="section notice">Live validation prevents over allocation and keeps planning health valid.</div>
      <div class="footer-actions">
        <button class="btn btn-primary" id="save-manual">Save Schedule</button>
        <button class="btn" id="cancel-manual">Cancel</button>
      </div>
    </aside>
  `;

  document.getElementById("close-drawer").addEventListener("click", closeModal);
  document.getElementById("cancel-manual").addEventListener("click", closeModal);
  document.getElementById("overlay").addEventListener("click", closeModal);
  document.getElementById("save-manual").addEventListener("click", () => {
    closeModal();
    renderSchedulePage();
  });
}

function openScheduleDrawer(scheduleId) {
  const bpo = getSelectedBpo();
  const schedule = bpo.schedules.find((s) => s.id === scheduleId);
  if (!schedule) return;

  state.selectedScheduleId = scheduleId;

  modalRoot.innerHTML = `
    <div class="overlay" id="overlay"></div>
    <aside class="drawer">
      <div class="section row">
        <h3 style="margin:0">${schedule.releaseNo}</h3>
        <button class="btn btn-ghost" id="close-drawer">Close</button>
      </div>
      <div class="section detail-grid">
        ${textField("Transaction Date", schedule.date)}
        ${textField("Expected Delivery", schedule.delivery)}
      </div>
      <div class="section table-wrap">
        <table>
          <thead><tr><th>Item</th><th>Allocation</th></tr></thead>
          <tbody>
            ${schedule.items
              .map((entry) => {
                const item = bpo.items.find((i) => i.id === entry.itemId);
                return `<tr><td>${item?.name || entry.itemId}</td><td><input value="${entry.value}" /></td></tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
      <div class="section row">
        <span><strong>PO:</strong> ${schedule.poStatus}</span>
        ${schedule.status === "released" ? `<span class="chip">Read-only released schedule</span>` : ""}
      </div>
      <div class="footer-actions">
        <div class="row" style="gap:8px">
          <button class="btn">Edit</button>
          <button class="btn btn-danger" id="delete-schedule">Delete</button>
          <button class="btn">Duplicate</button>
          <button class="btn btn-primary" id="release-now">Release Now</button>
        </div>
      </div>
    </aside>
  `;

  document.getElementById("close-drawer").addEventListener("click", closeModal);
  document.getElementById("overlay").addEventListener("click", closeModal);
  document.getElementById("release-now").addEventListener("click", () => {
    schedule.status = "released";
    schedule.poStatus = "Generated";
    closeModal();
    renderSchedulePage();
  });

  document.getElementById("delete-schedule").addEventListener("click", () => {
    if (schedule.status === "released") return;
    bpo.schedules = bpo.schedules.filter((s) => s.id !== scheduleId);
    closeModal();
    renderSchedulePage();
  });
}

function closeModal() {
  modalRoot.innerHTML = "";
}

function wireGotoButtons() {
  contentNode.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.page = btn.dataset.go;
      render();
    });
  });
}

function renderHeader() {
  const labels = {
    list: ["Blanket Purchase Order List", "Plan, monitor, and act on long-term procurement commitments"],
    create: ["Create / Edit Blanket Purchase Order", "Capture commitment details and prepare scheduling"],
    details: ["Blanket Purchase Order Details", "Status, consumption, schedules, and audit in one place"],
    schedule: ["Schedule Planning Workspace", "Timeline first planning with spreadsheet mode for bulk edits"],
    releases: ["Release Purchase Orders", "Schedule-driven releases with governance controls"],
    activity: ["Activity & Audit", "Complete enterprise audit trail for compliance"],
    consumption: ["Consumption Tracking", "Real-time commitment usage across all items"]
  };

  const [title, subtitle] = labels[state.page];
  titleNode.textContent = title;
  subtitleNode.textContent = subtitle;

  primaryActionNode.textContent = state.page === "schedule" ? "Generate Schedule" : "Create Blanket PO";
  primaryActionNode.onclick = () => {
    if (state.page === "schedule") {
      openGenerateModal();
      return;
    }
    state.page = "create";
    render();
  };
}

function render() {
  renderNav();
  renderHeader();

  if (state.page === "list") renderListPage();
  if (state.page === "create") renderCreatePage();
  if (state.page === "details") renderDetailsPage();
  if (state.page === "schedule") renderSchedulePage();
  if (state.page === "releases") renderReleasesPage();
  if (state.page === "activity") renderActivityPage();
  if (state.page === "consumption") renderConsumptionPage();
}

render();
