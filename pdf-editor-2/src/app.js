// PDF Editor 2.0 — visual invoice/PDF template editor prototype.
// Model: template.page (page settings) + template.header/footer (variant-aware sections)
// + template.sections[] (section -> columns[] -> elements[]). Selection drives the
// contextual Properties panel; everything mutates the same in-memory template object.

/* ===================== Utilities ===================== */
let __uid = 0;
const uid = (p = "id") => `${p}_${++__uid}`;
const deepClone = (o) => JSON.parse(JSON.stringify(o));
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function getNested(obj, path) {
  return pathTokens(path).reduce((c, p) => (c == null ? c : c[p]), obj);
}
function setNested(obj, path, value) {
  const parts = pathTokens(path);
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
  cur[parts[parts.length - 1]] = value;
}
function pathTokens(path) {
  return path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
}

/* ===================== Constants ===================== */
const FONTS = ["Times New Roman", "Arial", "Helvetica", "Georgia", "Roboto", "Inter", "Manrope"];
const PAPER_SIZES = { A4: { w: 210, h: 297 }, Letter: { w: 216, h: 279 }, Legal: { w: 216, h: 356 } };
const PX_PER_MM = 2.9;

// Predefined dynamic-table shapes tied to invoice modules. Dynamic tables can only pick one
// of these (plus presentation options) -- individual columns/fields are not freely editable.
const DYNAMIC_TABLE_PRESETS = [
  { id: "line-items", name: "Invoice Line Items Table",
    columns: [
      { label: "#", field: "%Serial_Number%", width: 6, align: "center" },
      { label: "Item & Description", field: "%Item_Name_And_Description%", width: 40, align: "left" },
      { label: "HSN/SAC", field: "%HSN_SAC%", width: 14, align: "center" },
      { label: "Qty", field: "%Quantity%", width: 10, align: "center" },
      { label: "Rate", field: "%Rate%", width: 15, align: "right" },
      { label: "Amount", field: "%Amount%", width: 15, align: "right" },
    ],
    sampleRows: [
      { "%Serial_Number%": "1", "%Item_Name_And_Description%": "Brochure Design<br><span class=\"muted-sm\">Brochure Design Single Sided Color</span>", "%HSN_SAC%": "52161559", "%Quantity%": "1.00<br><span class=\"muted-sm\">Nos</span>", "%Rate%": "300.00", "%Amount%": "300.00" },
      { "%Serial_Number%": "2", "%Item_Name_And_Description%": "Web Design Package (Template) - Basic<br><span class=\"muted-sm\">Custom themes for your business, incl. 10 hrs of marketing &amp; annual training</span>", "%HSN_SAC%": "52161559", "%Quantity%": "1.00<br><span class=\"muted-sm\">Nos</span>", "%Rate%": "250.00", "%Amount%": "250.00" },
      { "%Serial_Number%": "3", "%Item_Name_And_Description%": "Print Ad - Basic Color<br><span class=\"muted-sm\">Print Ad 1/8 size Color</span>", "%HSN_SAC%": "52161559", "%Quantity%": "1.00<br><span class=\"muted-sm\">Nos</span>", "%Rate%": "80.00", "%Amount%": "80.00" },
    ] },
  { id: "tax-breakdown", name: "Tax Breakdown Table",
    columns: [
      { label: "Tax", field: "%Category%", width: 40, align: "left" },
      { label: "Rate", field: "%Rate%", width: 25, align: "center" },
      { label: "Amount", field: "%Amount%", width: 35, align: "right" },
    ],
    sampleRows: [
      { "%Category%": "CGST", "%Rate%": "12.00%", "%Amount%": "37.80" },
      { "%Category%": "SGST", "%Rate%": "12.00%", "%Amount%": "37.80" },
      { "%Category%": "Cess", "%Rate%": "0.00%", "%Amount%": "0.00" },
    ] },
  { id: "payment-history", name: "Payment History Table",
    columns: [
      { label: "Date", field: "%Invoice_Date%", width: 25, align: "left" },
      { label: "Mode", field: "%Payment_Mode%", width: 25, align: "left" },
      { label: "Reference", field: "%Payment_Reference%", width: 25, align: "left" },
      { label: "Amount", field: "%Total_Amount%", width: 25, align: "right" },
    ],
    sampleRows: [
      { "%Invoice_Date%": "01/01/2018", "%Payment_Mode%": "Cash", "%Payment_Reference%": "SR-17", "%Total_Amount%": "705.60" },
      { "%Invoice_Date%": "05/01/2018", "%Payment_Mode%": "Bank Transfer", "%Payment_Reference%": "SR-18", "%Total_Amount%": "250.00" },
      { "%Invoice_Date%": "10/01/2018", "%Payment_Mode%": "Cash", "%Payment_Reference%": "SR-19", "%Total_Amount%": "80.00" },
    ] },
];
function dynamicPresetById(id) { return DYNAMIC_TABLE_PRESETS.find((p) => p.id === id) || DYNAMIC_TABLE_PRESETS[0]; }
function applyDynamicPreset(el, presetId) {
  const preset = dynamicPresetById(presetId);
  el.preset = preset.id;
  el.columns = preset.columns.map((c) => ({ id: uid("tc"), ...c }));
  el.sampleRows = deepClone(preset.sampleRows);
}

const TABLE_STYLES = [
  { id: "grid", name: "Grid", swatch: "#4b5563" },
  { id: "minimal", name: "Minimal", swatch: "#9ca3af" },
  { id: "lines", name: "Lines", swatch: "#111827" },
  { id: "green", name: "Green", swatch: "#16a34a" },
  { id: "amber", name: "Amber", swatch: "#d97706" },
  { id: "blue", name: "Blue", swatch: "#2563eb" },
  { id: "slate", name: "Slate", swatch: "#475569" },
  { id: "orange", name: "Orange", swatch: "#ea580c" },
  { id: "emerald", name: "Emerald", swatch: "#059669" },
];

const HEADER_STYLES = [
  { id: "plain", name: "Plain" },
  { id: "dark", name: "Dark Bar" },
  { id: "accent", name: "Accent Gradient" },
];

const SECTION_PRESETS = [
  { id: "1col", name: "1 Column", widths: [100] },
  { id: "2col-50", name: "2 Columns — 50/50", widths: [50, 50] },
  { id: "2col-70-30", name: "2 Columns — 70/30", widths: [70, 30] },
  { id: "3col", name: "3 Equal Columns", widths: [33.33, 33.34, 33.33] },
  { id: "4col", name: "4 Equal Columns", widths: [25, 25, 25, 25] },
];

const MODULE_SECTION_PRESETS = [
  { id: "line-item-table", name: "Line Item Table", desc: "Dynamic invoice line items" },
  { id: "payment-details-table", name: "Payment Details", desc: "Static payment details table" },
  { id: "bill-ship-to", name: "Bill To / Ship To", desc: "2-column customer block" },
];

const MODULE_FIELD_GROUPS = [
  { group: "Organization Details", fields: [
    { id: "org_logo", label: "Organization Logo", placeholder: "%Organization_Logo%", el: "logo" },
    { id: "org_name", label: "Organization Name", placeholder: "%Organization_Name%" },
    { id: "org_address", label: "Organization Address", placeholder: "%Organization_Address%" },
    { id: "gstin", label: "GSTIN", placeholder: "%GSTIN%" },
    { id: "org_pan", label: "PAN", placeholder: "%Organization_PAN%" },
    { id: "org_mobile", label: "Mobile", placeholder: "%Organization_Mobile%" },
  ]},
  { group: "Customer Details", fields: [
    { id: "cust_name", label: "Customer Name", placeholder: "%Customer_Displayname%" },
    { id: "cust_pan", label: "PAN", placeholder: "%Customer_PAN%" },
    { id: "cust_email", label: "Email", placeholder: "%Customer_Email%" },
    { id: "cust_mobile", label: "Mobile", placeholder: "%Customer_Mobile%" },
    { id: "cust_address", label: "Customer Address", placeholder: "%Customer_Address%" },
    { id: "cust_country", label: "Country", placeholder: "%Customer_Country%" },
    { id: "cust_state", label: "State", placeholder: "%Customer_State%" },
  ]},
  { group: "Transaction Details", fields: [
    { id: "txn_number", label: "Transaction Number", placeholder: "%Transaction_Number%" },
    { id: "txn_date", label: "Invoice Date", placeholder: "%Invoice_Date%" },
    { id: "due_date", label: "Due Date", placeholder: "%Due_Date%" },
    { id: "total_amount", label: "Total Amount", placeholder: "%Total_Amount%" },
    { id: "bill_to", label: "Bill To", placeholder: "%Customer_Displayname%" },
    { id: "ship_to", label: "Ship To", placeholder: "%Ship_To_Address%" },
    { id: "category", label: "Category", placeholder: "%Category%" },
    { id: "reference_number", label: "Reference Number", placeholder: "%Reference_Number%" },
  ]},
  { group: "Line Item Fields", fields: [
    { id: "li_item_desc", label: "Item & Description", placeholder: "%Item_Name_And_Description%" },
    { id: "li_desc", label: "Description", placeholder: "%Item_Description%" },
    { id: "li_hsn", label: "HSN/SAC", placeholder: "%HSN_SAC%" },
    { id: "li_qty", label: "Quantity", placeholder: "%Quantity%" },
    { id: "li_rate", label: "Rate", placeholder: "%Rate%" },
    { id: "li_amount", label: "Amount", placeholder: "%Amount%" },
    { id: "li_sno", label: "S.No", placeholder: "%Serial_Number%" },
  ]},
  { group: "Payment Details", fields: [
    { id: "pay_mode", label: "Payment Mode", placeholder: "%Payment_Mode%" },
    { id: "pay_deposit", label: "Deposit To", placeholder: "%Deposit_To%" },
    { id: "pay_ref", label: "Reference", placeholder: "%Payment_Reference%" },
    { id: "pay_terms", label: "Payment Terms", placeholder: "%Payment_Terms%" },
  ]},
  { group: "Other Fields", fields: [
    { id: "page_number", label: "Page Number", placeholder: "{{CurrentPageNumber}}", el: "pageNumber" },
    { id: "custom1", label: "Custom Field 1", placeholder: "%Custom_Field_1%" },
    { id: "custom2", label: "Custom Field 2", placeholder: "%Custom_Field_2%" },
    { id: "custom3", label: "Custom Field 3", placeholder: "%Custom_Field_3%" },
  ]},
];

const SAMPLE_VALUES = {
  "%Organization_Name%": "AS Aquarium",
  "%Organization_Address%": "Tamil Nadu, India",
  "%GSTIN%": "33GSPTN0372G1ZC",
  "%Organization_PAN%": "GSPTN0372G",
  "%Organization_Mobile%": "+91 98765 43210",
  "%Customer_Displayname%": "Rob & Joe Traders",
  "%Customer_PAN%": "ABCDE1234F",
  "%Customer_Email%": "rob@joetraders.com",
  "%Customer_Mobile%": "+91 90000 11122",
  "%Customer_Address%": "34, Riche Street, Chennai, 631603",
  "%Customer_Country%": "India",
  "%Customer_State%": "Tamil Nadu",
  "%Transaction_Number%": "INV-0001",
  "%Invoice_Date%": "01/01/2018",
  "%Due_Date%": "15/01/2018",
  "%Total_Amount%": "\u20B9705.60",
  "%Ship_To_Address%": "34, Riche Street, Chennai, 631603",
  "%Category%": "Donation",
  "%Reference_Number%": "SR-17",
  "%Payment_Mode%": "Cash",
  "%Deposit_To%": "Bank",
  "%Payment_Reference%": "SR-17",
  "%Payment_Terms%": "Due on Receipt",
  "%Custom_Field_1%": "In Kind",
  "%Custom_Field_2%": "\u2014",
  "%Custom_Field_3%": "\u2014",
  "%Total_In_Words%": "Indian Rupee Seven Hundred Five and Sixty Paise Only",
  "%Account_Number%": "1234567890",
  "%Bank_Name%": "ABC Bank 2",
  "%IFSC_Code%": "ABCD0001222",
};

function fieldByPlaceholder(ph) {
  for (const g of MODULE_FIELD_GROUPS) for (const f of g.fields) if (f.placeholder === ph) return f;
  return null;
}
function allModuleFields() { return MODULE_FIELD_GROUPS.flatMap((g) => g.fields); }

function resolvePlaceholders(str, sample) {
  if (!str) return str;
  return String(str).replace(/%[A-Za-z0-9_]+%|\{\{[A-Za-z0-9_.]+\}\}/g, (tok) => {
    if (!sample) return `<span class="placeholder-pill">${escapeHtml(tok)}</span>`;
    if (SAMPLE_VALUES[tok] != null) return escapeHtml(SAMPLE_VALUES[tok]);
    if (tok === "{{CurrentPageNumber}}") return "1";
    if (tok === "{{TotalPages}}") return "1";
    if (tok === "{{DocId}}") return "AS Aquarium \u2013 Invoice";
    return `<span class="placeholder-pill">${escapeHtml(tok)}</span>`;
  });
}

/* ===================== Element factories ===================== */
function makeElement(type, extra = {}) {
  const base = { id: uid("el"), type };
  const byType = {
    title: { text: "Title", font: "", size: 16, color: "", align: "left", bold: true },
    text: { html: "<p>Enter text here.</p>", font: "", size: "", color: "", align: "left" },
    image: { src: "", height: 70 },
    logo: { src: "", height: 44 },
    divider: { style: "solid", thickness: 1, color: "#d5dbe7" },
    spacer: { height: 20 },
    signature: { label: "Authorized Signature" },
    field: { label: "Label", placeholder: "%Custom_Field_1%", layout: "spaceBetween", gap: 8, labelAlign: "left", font: "", size: "", color: "", align: "left", bold: false, italic: false, underline: false, lineHeight: "", labelStyle: { font: "", size: "", color: "", bold: true, italic: false, underline: false } },
    pageNumber: { customFormat: "Page {{CurrentPageNumber}} of {{TotalPages}}", font: "", size: 10, color: "", align: "right" },
    dynamicTable: (() => { const el = { style: "grid", cornerRadius: 2, cellPadding: 6, typeConfirmed: false, contentConfirmed: false, headerStyle: { font: "", size: "", color: "", lineHeight: "", bold: true, italic: false, underline: false, strike: false }, valueStyle: { font: "", size: "", color: "", lineHeight: "", bold: false, italic: false, underline: false, strike: false } }; applyDynamicPreset(el, "line-items"); return el; })(),
    staticTable: {
      style: "lines", cornerRadius: 2, rows: 3, cols: 4, colWidths: [25, 25, 25, 25], typeConfirmed: false,
      columnDefaults: [
        { contentType: "static", placeholder: "", value: "" },
        { contentType: "static", placeholder: "", value: "" },
        { contentType: "placeholder", placeholder: "%Payment_Reference%", value: "" },
        { contentType: "placeholder", placeholder: "%Deposit_To%", value: "" },
      ],
      cells: {
        "0_0": { contentType: "static", value: "Payment Mode" }, "0_1": { contentType: "static", value: "Payment Terms" },
        "0_2": { contentType: "static", value: "Reference" }, "0_3": { contentType: "static", value: "Deposit To" },
        "1_0": { contentType: "placeholder", placeholder: "%Payment_Mode%" }, "1_1": { contentType: "placeholder", placeholder: "%Payment_Terms%" },
        "1_2": { contentType: "placeholder", placeholder: "%Payment_Reference%" }, "1_3": { contentType: "placeholder", placeholder: "%Deposit_To%" },
        "2_0": { contentType: "static", value: "Cheque" }, "2_1": { contentType: "static", value: "Net 15" },
        "2_2": { contentType: "static", value: "TXN-2045" }, "2_3": { contentType: "static", value: "Main Account" },
      },
    },
  };
  return { ...base, ...(byType[type] || {}), ...extra };
}

function makeColumn(width, elements = []) {
  return { id: uid("col"), width, valign: "top", margin: { t: 0, r: 0, b: 0, l: 0 }, padding: { t: 2, r: 2, b: 2, l: 2 },
    border: { enabled: false, width: 1, color: "#e5e9f1", radius: 2 }, hAlign: "left", rowGap: 6,
    bg: { color: "", image: "", extend: false }, elements };
}

function makeSectionShape(widths, elementsPerCol = []) {
  return {
    id: uid("sec"), columns: widths.map((w, i) => makeColumn(w, elementsPerCol[i] || [])),
    valign: "top", margin: { t: 8, r: 0, b: 8, l: 0 }, padding: { t: 0, r: 0, b: 0, l: 0 },
    border: { enabled: false, width: 1, color: "#e5e9f1", radius: 2 },
    bg: { color: "", image: "", opacity: 100, fit: "fill", position: "center", extend: false },
    cornerRadius: 2,
  };
}

function makeHeaderFooterVariant() { return makeSectionShape([100], []); }
function makeSpacerSection(height = 24) {
  const s = makeSectionShape([100], [[]]);
  s.isSpacer = true;
  s.spacerHeight = height;
  return s;
}

/* ===================== Default template ===================== */
function buildDefaultTemplate() {
  const header = {
    enabled: true, style: "plain", differentSubsequent: false, activeVariant: "first",
    variants: { first: makeHeaderFooterVariant(), subsequent: makeHeaderFooterVariant() },
  };
  header.variants.first.columns = [
    makeColumn(70, [
      makeElement("field", { label: "", placeholder: "%Organization_Name%", bold: true, size: 15 }),
      makeElement("text", { html: "%Organization_Address%<br>%GSTIN%" }),
    ]),
    makeColumn(30, []),
  ];
  header.variants.subsequent.columns = [
    makeColumn(70, [ makeElement("field", { label: "", placeholder: "%Organization_Name%", bold: true, size: 13 }) ]),
    makeColumn(30, [ makeElement("pageNumber", { align: "right" }) ]),
  ];

  const footer = {
    enabled: false, style: "plain", differentSubsequent: false, activeVariant: "first",
    variants: { first: makeHeaderFooterVariant(), subsequent: makeHeaderFooterVariant() },
  };
  footer.variants.first.columns = [ makeColumn(100, [ makeElement("pageNumber", { align: "center" }) ]) ];
  footer.variants.subsequent.columns = [ makeColumn(100, [ makeElement("pageNumber", { align: "center" }) ]) ];

  const sections = [];

  // Title section
  sections.push(Object.assign(makeSectionShape([100], [[
    makeElement("title", { text: "DONATION", size: 19 }),
    makeElement("text", { html: "Donation# %Reference_Number%" }),
  ]])));

  // Bill to / ship to + receipt details
  sections.push(Object.assign(makeSectionShape([50, 50], [
    [
      makeElement("field", { label: "Bill To", placeholder: "%Customer_Displayname%", layout: "stacked" }),
      makeElement("text", { html: "%Customer_Address%<br>%Customer_Country%<br>GSTIN %GSTIN%" }),
      makeElement("field", { label: "Ship To", placeholder: "%Ship_To_Address%", layout: "stacked" }),
    ],
    [
      makeElement("field", { label: "Receipt Date", placeholder: "%Invoice_Date%" }),
      makeElement("field", { label: "Reference", placeholder: "%Reference_Number%" }),
    ],
  ])));

  // Line item table
  sections.push(Object.assign(makeSectionShape([100], [[ makeElement("dynamicTable", { typeConfirmed: true, contentConfirmed: true }) ]])));

  // Payment details + totals
  const totals = makeElement("staticTable", {
    style: "minimal", rows: 5, cols: 2, colWidths: [60, 40], typeConfirmed: true,
    columnDefaults: [
      { contentType: "static", placeholder: "", value: "" },
      { contentType: "static", placeholder: "", value: "" },
    ],
    cells: {
      "0_0": { contentType: "static", value: "Sub Total" }, "0_1": { contentType: "static", value: "630.00" },
      "1_0": { contentType: "static", value: "Discount" }, "1_1": { contentType: "static", value: "0.00" },
      "2_0": { contentType: "static", value: "CGST (12.00%)" }, "2_1": { contentType: "static", value: "37.80" },
      "3_0": { contentType: "static", value: "SGST (12.00%)" }, "3_1": { contentType: "static", value: "37.80" },
      "4_0": { contentType: "static", value: "Total" }, "4_1": { contentType: "placeholder", placeholder: "%Total_Amount%" },
    },
  });
  sections.push(Object.assign(makeSectionShape([50, 50], [
    [
      makeElement("title", { text: "Payment Details", size: 12 }),
      makeElement("field", { label: "Payment Mode", placeholder: "%Payment_Mode%", layout: "inline" }),
      makeElement("field", { label: "Reference", placeholder: "%Payment_Reference%", layout: "inline" }),
    ],
    [ totals, makeElement("text", { html: "<b>Total in Words:</b> %Total_In_Words%", align: "right" }) ],
  ])));

  // Notes / terms / signature
  sections.push(Object.assign(makeSectionShape([100], [[
    makeElement("title", { text: "Notes", size: 12 }),
    makeElement("text", { html: "Thanks for your business." }),
  ]])));
  sections.push(Object.assign(makeSectionShape([100], [[
    makeElement("title", { text: "Terms & Conditions", size: 12 }),
    makeElement("text", { html: "Your company's Terms and Conditions will be displayed here. You can edit it in the Sales Receipt Preferences page under Settings." }),
  ]])));
  sections.push(Object.assign(makeSectionShape([100], [[ makeElement("signature") ]])));

  // Empty section at end to demonstrate drop zones
  sections.push(makeSectionShape([100], [[]]));

  return {
    name: "Invoice \u2014 Default 123",
    page: {
      includeHeader: true, includeFooter: false,
      paperSize: "A4", orientation: "portrait",
      margin: { t: 40, r: 32, b: 20, l: 20 }, contentInset: 5,
      background: { color: "#FFFFFF", image: "", opacity: 100, fit: "fill", position: "center" },
      pageBorder: { enabled: false, width: 1, color: "#000000", radius: 2 },
      sectionBorder: { enabled: false, width: 1, color: "#000000", radius: 2 },
      cornerRadius: 2,
      typography: { font: "Times New Roman", color: "#000000", size: 10, lineHeight: 1.5 },
    },
    header, footer, sections,
    annexure: { enabled: false, mode: "content", content: "<p>Enter annexure content here.</p>", document: { name: "", src: "" } },
  };
}

/* ===================== State ===================== */
const state = {
  template: buildDefaultTemplate(),
  mode: "pageSettings", // pageSettings | insert | properties
  insertTab: "components", // components | fields
  fieldSearch: "", showUnusedOnly: false,
  selection: { type: "page" },
  drill: { sectionId: null, columnId: null }, // progressive drill-down: section -> column -> element
  hoverHl: null, // margin | inset | pageBorder | sectionBorder | background | radius
  showSampleValues: true,
  moreMenuOpen: false,
  editingName: false,
  confirmDialog: null, // { title, body, onConfirm }
  pendingTableType: null, // { elementId, type } -- staged (unconfirmed) Table Type selection
  tableTypeOpen: null, // elementId -- Table Type picker expanded via "Change" (post-setup)
  pendingTableContent: null, // { elementId, presetId } -- staged (unconfirmed) Table Content selection
  tableContentOpen: null, // elementId -- Table Content picker expanded via "Change" (post-setup)
  dragPayload: null,
};

let history = [];
let historyIndex = -1;
let historyTimer = null;

function commitHistory() {
  history = history.slice(0, historyIndex + 1);
  history.push(deepClone(state.template));
  historyIndex = history.length - 1;
}
function scheduleHistory() {
  clearTimeout(historyTimer);
  historyTimer = setTimeout(commitHistory, 450);
}
function undo() {
  if (historyIndex <= 0) return;
  historyIndex--; state.template = deepClone(history[historyIndex]);
  renderAll();
}
function redo() {
  if (historyIndex >= history.length - 1) return;
  historyIndex++; state.template = deepClone(history[historyIndex]);
  renderAll();
}
function mutate(fn) {
  fn();
  scheduleHistory();
}

/* ===================== Persistence ===================== */
const LS_KEY = "pdf-editor-2/template";
function saveToStorage() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state.template)); } catch (e) { /* quota etc: ignore in demo */ }
}
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { state.template = JSON.parse(raw); return true; }
  } catch (e) { /* ignore corrupt storage */ }
  return false;
}

/* ===================== Selection resolution ===================== */
function findSection(sectionId) {
  if (sectionId === "header") return state.template.header.variants[state.template.header.activeVariant];
  if (sectionId === "footer") return state.template.footer.variants[state.template.footer.activeVariant];
  return state.template.sections.find((s) => s.id === sectionId);
}
function findColumn(sectionId, columnId) {
  const sec = findSection(sectionId);
  return sec && sec.columns.find((c) => c.id === columnId);
}
function findElement(sectionId, columnId, elementId) {
  const col = findColumn(sectionId, columnId);
  return col && col.elements.find((e) => e.id === elementId);
}
function findTableColumn(sectionId, columnId, elementId, tcolId) {
  const el = findElement(sectionId, columnId, elementId);
  return el && el.columns.find((c) => c.id === tcolId);
}
function findCell(sectionId, columnId, elementId, row, col) {
  const el = findElement(sectionId, columnId, elementId);
  if (!el) return null;
  const key = `${row}_${col}`;
  if (!el.cells[key]) el.cells[key] = { contentType: "static", value: "" };
  return el.cells[key];
}
// Returns an array where order[newIndex] = oldIndex, representing `length` items after moving
// the item at `from` to position `to`.
function computeReorder(length, from, to) {
  const order = Array.from({ length }, (_, i) => i);
  const [moved] = order.splice(from, 1);
  order.splice(to, 0, moved);
  return order;
}
function reorderStaticColumns(el, from, to) {
  const order = computeReorder(el.cols, from, to);
  const newColWidths = order.map((oc) => el.colWidths[oc]);
  const newColumnDefaults = order.map((oc) => (el.columnDefaults && el.columnDefaults[oc]) || { contentType: "static", placeholder: "", value: "" });
  const newCells = {};
  for (let r = 0; r < el.rows; r++) {
    for (let nc = 0; nc < el.cols; nc++) {
      const cell = el.cells[`${r}_${order[nc]}`];
      if (cell) newCells[`${r}_${nc}`] = cell;
    }
  }
  el.colWidths = newColWidths;
  el.columnDefaults = newColumnDefaults;
  el.cells = newCells;
}
function reorderStaticRows(el, from, to) {
  const order = computeReorder(el.rows, from, to);
  const newCells = {};
  for (let nr = 0; nr < el.rows; nr++) {
    for (let c = 0; c < el.cols; c++) {
      const cell = el.cells[`${order[nr]}_${c}`];
      if (cell) newCells[`${nr}_${c}`] = cell;
    }
  }
  el.cells = newCells;
}
function resolveTarget(sel) {
  if (!sel) return null;
  switch (sel.type) {
    case "page": return state.template.page;
    case "header": return state.template.header;
    case "footer": return state.template.footer;
    case "section": return findSection(sel.sectionId);
    case "column": return findColumn(sel.sectionId, sel.columnId);
    case "element": return findElement(sel.sectionId, sel.columnId, sel.elementId);
    case "tableColumn": return findTableColumn(sel.sectionId, sel.columnId, sel.elementId, sel.tcolId);
    case "staticCell": return findCell(sel.sectionId, sel.columnId, sel.elementId, sel.row, sel.col);
    default: return null;
  }
}
function sectionIndexLabel(sectionId) {
  if (sectionId === "header") return "Header";
  if (sectionId === "footer") return "Footer";
  const idx = state.template.sections.findIndex((s) => s.id === sectionId);
  return `Section ${idx + 1}`;
}
function columnIndexLabel(sectionId, columnId) {
  const sec = findSection(sectionId);
  const idx = sec.columns.findIndex((c) => c.id === columnId);
  return `Column ${idx + 1}`;
}
function elementLabel(el) {
  if (!el) return "Element";
  const map = { title: "Title", text: "Text", image: "Image", logo: "Logo", divider: "Divider", spacer: "Spacer", signature: "Signature Block", pageNumber: "Page Number", staticTable: "Custom Table" };
  if (el.type === "field") return el.label || "Field";
  if (el.type === "dynamicTable") return dynamicPresetById(el.preset).name;
  return map[el.type] || el.type;
}
function renderBreadcrumbHtml(sel) {
  if (!sel) return "";
  const segs = [{ label: "Page", sel: { type: "page" } }];
  if (sel.type === "header" || sel.type === "footer") {
    segs.push({ label: sel.type === "header" ? "Header" : "Footer", sel: { type: sel.type, sectionId: sel.sectionId } });
  } else if (sel.sectionId) {
    segs.push({ label: sectionIndexLabel(sel.sectionId), sel: { type: "section", sectionId: sel.sectionId } });
  }
  if (sel.columnId) segs.push({ label: columnIndexLabel(sel.sectionId, sel.columnId), sel: { type: "column", sectionId: sel.sectionId, columnId: sel.columnId } });
  if (sel.elementId) {
    const el = findElement(sel.sectionId, sel.columnId, sel.elementId);
    segs.push({ label: elementLabel(el), sel: { type: "element", sectionId: sel.sectionId, columnId: sel.columnId, elementId: sel.elementId } });
  }
  if (sel.type === "tableColumn") {
    const tc = resolveTarget(sel);
    segs.push({ label: tc ? tc.label : "Column", sel });
  }
  if (sel.type === "staticCell") segs.push({ label: `Cell R${sel.row + 1}C${sel.col + 1}`, sel });
  return segs.map((s, i) => {
    const isLast = i === segs.length - 1;
    return `<span class="crumb-seg ${isLast ? "is-current" : ""}" ${isLast ? "" : `data-action="select-breadcrumb" data-sel='${escapeHtml(JSON.stringify(s.sel))}'`}>${escapeHtml(s.label)}</span>`;
  }).join(`<span class="crumb-sep">&rsaquo;</span>`);
}

function isFieldUsed(placeholder) {
  let used = false;
  const scanCols = (cols) => cols.forEach((c) => c.elements.forEach((el) => {
    if (el.type === "field" && el.placeholder === placeholder) used = true;
    if ((el.html && el.html.includes(placeholder)) || (el.text && el.text.includes(placeholder))) used = true;
  }));
  scanCols(state.template.header.variants.first.columns);
  scanCols(state.template.header.variants.subsequent.columns);
  scanCols(state.template.footer.variants.first.columns);
  scanCols(state.template.footer.variants.subsequent.columns);
  state.template.sections.forEach((s) => scanCols(s.columns));
  return used;
}

/* ===================== Toast ===================== */
function toast(msg) {
  const root = document.getElementById("toast-root");
  const el = document.createElement("div");
  el.className = "toast-item";
  el.textContent = msg;
  el.style.cssText = "background:#12142a;color:#fff;padding:9px 16px;border-radius:8px;font-size:12.5px;margin-top:8px;box-shadow:0 8px 24px rgba(0,0,0,0.25);opacity:0;transition:opacity .2s ease;";
  root.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = "1"; });
  setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 250); }, 2200);
}

/* ===================== Small render helpers ===================== */
function toggleHtml(path, on, extra = "") {
  return `<button type="button" class="toggle ${on ? "on" : ""}" data-toggle-path="${path}" ${extra}></button>`;
}
function numInput(path, value, unit = "px", placeholder = "", extraAttrs = "") {
  return `<div class="num-input-wrap" data-hlbox="${path}"><input type="number" data-path="${path}" data-parse="number" value="${value}" ${placeholder !== "" && placeholder != null ? `placeholder="${placeholder}"` : ""} ${extraAttrs}/><span>${unit}</span></div>`;
}
// Width input for a list of sibling columns whose widths must never sum above 100%. Free typing
// is allowed while focused (no re-render on "input"); the value is clamped against the sum of the
// OTHER entries in the list once the field is committed ("change").
function colWidthInput(listPath, idx, value, key) {
  return `<input type="number" min="0" max="100" data-width-list="${listPath}" data-width-index="${idx}" ${key ? `data-width-key="${key}"` : ""} value="${value}"/>`;
}
function colorInput(path, value, inherited) {
  const resolved = value || inherited || "#000000";
  return `<div class="color-input-wrap"><input type="color" data-path="${path}" data-parse="string" value="${resolved}"/><input type="text" data-path="${path}" data-parse="string" value="${value || ""}" placeholder="${inherited || "inherit"}"/></div>`;
}
function selectInput(path, value, options) {
  return `<select class="select-input" data-path="${path}" data-parse="string">${options.map((o) => `<option value="${o.value ?? o}" ${String(value) === String(o.value ?? o) ? "selected" : ""}>${o.label ?? o}</option>`).join("")}</select>`;
}
function marginBoxGrid(basePath, obj) {
  return `<div class="box-grid4">
    <div class="box-row" data-hlrow="${basePath}"><span class="box-icon">\u2191</span>${numInput(`${basePath}.t`, obj.t)}</div>
    <div class="box-row" data-hlrow="${basePath}"><span class="box-icon">\u2192</span>${numInput(`${basePath}.r`, obj.r)}</div>
    <div class="box-row" data-hlrow="${basePath}"><span class="box-icon">\u2193</span>${numInput(`${basePath}.b`, obj.b)}</div>
    <div class="box-row" data-hlrow="${basePath}"><span class="box-icon">\u2190</span>${numInput(`${basePath}.l`, obj.l)}</div>
  </div>`;
}
function alignButtonsHtml(path, value, opts) {
  return `<div class="align-btns">${opts.map((o) => `<button type="button" data-set-path="${path}" data-set-value="${o.value}" class="${value === o.value ? "active" : ""}" title="${o.title}">${o.icon}</button>`).join("")}</div>`;
}
const TEXT_ALIGN_OPTS = [{ value: "left", icon: "\u2630", title: "Left" }, { value: "center", icon: "\u2261", title: "Center" }, { value: "right", icon: "\u2637", title: "Right" }];
function alignRowHtml(path, value) {
  return `<div class="prow"><span class="prow-label">Alignment</span>${alignButtonsHtml(path, value || "left", TEXT_ALIGN_OPTS)}</div>`;
}
function styleButtonsHtml(basePath, el) {
  const b = (key, icon, title) => `<button type="button" data-toggle-path="${basePath}.${key}" class="${el[key] ? "active" : ""}" title="${title}">${icon}</button>`;
  return `<div class="style-btns">${b("bold", "<b>B</b>", "Bold")}${b("italic", "<i>I</i>", "Italic")}${b("underline", "<u>U</u>", "Underline")}${b("strike", "<s>S</s>", "Strikethrough")}</div>`;
}
function buildTypographyStyle(styleObj) {
  const font = styleObj.font || state.template.page.typography.font;
  const size = styleObj.size || state.template.page.typography.size;
  const color = styleObj.color || state.template.page.typography.color;
  const lh = styleObj.lineHeight || state.template.page.typography.lineHeight;
  return `font-family:'${font}';${size ? `font-size:${size}px;` : ""}${color ? `color:${color};` : ""}${lh ? `line-height:${lh};` : ""}${styleObj.bold ? "font-weight:700;" : ""}${styleObj.italic ? "font-style:italic;" : ""}${styleObj.underline ? "text-decoration:underline;" : ""}${styleObj.strike ? "text-decoration:line-through;" : ""}`;
}

function borderControlsHtml(basePath, border, opts = {}) {
  const showRadius = opts.showRadius !== false;
  return `
  <div class="prow"><span class="prow-label">Border<span class="hint-dot" title="Independent border around this container.">\u24D8</span></span><div class="prow-control">${toggleHtml(`${basePath}.enabled`, border.enabled)}</div></div>
  ${border.enabled ? `
  <div class="prow"><span class="prow-label">Border Width</span>${numInput(`${basePath}.width`, border.width)}</div>
  <div class="prow"><span class="prow-label">Border Color</span>${colorInput(`${basePath}.color`, border.color)}</div>
  ${showRadius ? `<div class="prow"><span class="prow-label">Corner Radius</span>${numInput(`${basePath}.radius`, border.radius)}</div>` : ""}` : ""}`;
}

function backgroundControlsHtml(basePath, bg, allowExtend, allowImage = true) {
  return `
  <div class="prow"><span class="prow-label">Background Color</span>${colorInput(`${basePath}.color`, bg.color)}</div>
  ${allowImage ? `
  <div class="prow-stacked">
    <span class="prow-label">Background Image</span>
    <div style="display:flex;align-items:center;gap:8px;">
      ${bg.image ? `<img src="${bg.image}" style="width:60px;height:36px;object-fit:cover;border-radius:6px;border:1px solid var(--border-strong);"/><button type="button" class="btn btn-outline-dark" style="background:#fff;color:var(--text);border-color:var(--border-strong);" data-action="clear-bg-image" data-path="${basePath}.image">Remove</button>` : `<label class="btn btn-outline-dark" style="background:#fff;color:var(--text);border-color:var(--border-strong);cursor:pointer;">+ Add Image<input type="file" accept="image/*" style="display:none" data-upload-bg="${basePath}.image"/></label>`}
    </div>
  </div>
  ${bg.image ? `
  <div class="prow"><span class="prow-label">Image Opacity</span><input type="range" min="0" max="100" data-path="${basePath}.opacity" data-parse="number" value="${bg.opacity ?? 100}"/></div>
  <div class="prow"><span class="prow-label">Background Fit</span>${selectInput(`${basePath}.fit`, bg.fit || "fill", [{ value: "fill", label: "Fill" }, { value: "fit", label: "Fit" }, { value: "tile", label: "Tile" }])}</div>` : ""}` : `<p class="field-note">Background images are only available at the Page level.</p>`}
  ${allowExtend ? `<div class="prow"><span class="prow-label">Extend Background Outside Margin<span class="hint-dot" title="Extends the background and border to the page edge, into the margin area.">\u24D8</span></span>${toggleHtml(`${basePath}.extend`, bg.extend)}</div>` : ""}`;
}

function typographyControlsHtml(basePath, el, opts = {}) {
  const pageType = state.template.page.typography;
  const inheritedFont = pageType.font;
  const resetDefaults = opts.resetDefaults || { font: "", color: "", size: "", lineHeight: "", align: "left", bold: false, italic: false, underline: false, strike: false };
  return `
  <div class="prow"><span class="prow-label">Font</span>${selectInput(`${basePath}.font`, el.font || "", [{ value: "", label: `Inherit (${inheritedFont})` }, ...FONTS.map((f) => ({ value: f, label: f }))])}</div>
  <div class="prow"><span class="prow-label">Font Color</span>${colorInput(`${basePath}.color`, el.color, pageType.color)}</div>
  <div class="prow"><span class="prow-label">Font Size</span>${numInput(`${basePath}.size`, el.size || "", "px", pageType.size)}</div>
  ${opts.lineHeight !== false ? `<div class="prow"><span class="prow-label">Line Height</span>${numInput(`${basePath}.lineHeight`, el.lineHeight || "", "", pageType.lineHeight)}</div>` : ""}
  ${opts.align !== false ? `<div class="prow"><span class="prow-label">Alignment</span>${alignButtonsHtml(`${basePath}.align`, el.align || "left", [{ value: "left", icon: "\u2630", title: "Left" }, { value: "center", icon: "\u2261", title: "Center" }, { value: "right", icon: "\u2637", title: "Right" }])}</div>` : ""}
  ${opts.style !== false ? `<div class="prow"><span class="prow-label">Style</span>${styleButtonsHtml(basePath, el)}</div>` : ""}
  <div class="prow" style="justify-content:flex-end;"><button type="button" class="reset-fmt-link" data-action="reset-formatting" data-reset-path="${basePath}" data-reset-defaults='${escapeHtml(JSON.stringify(resetDefaults))}'>\u21BA Reset Formatting</button></div>`;
}

/* ===================== App shell render ===================== */
const root = document.getElementById("app-root");

function renderAll() {
  // Preserve scroll positions across the full re-render so selecting an item
  // doesn't visibly snap the properties panel / preview back to the top.
  const prevSidePanel = document.querySelector(".side-panel");
  const prevPreviewPane = document.querySelector(".preview-pane");
  const savedSideScroll = prevSidePanel ? prevSidePanel.scrollTop : 0;
  const savedPreviewScroll = prevPreviewPane ? { top: prevPreviewPane.scrollTop, left: prevPreviewPane.scrollLeft } : null;

  root.innerHTML = `
    <div class="demo-bar">
      <b>PDF Editor 2.0 (prototype)</b>
      <span>&mdash;</span>
      <span>Click any section / column / element in the preview to select &amp; edit it.</span>
      <span class="demo-link" data-action="demo-reset">Reset demo template</span>
    </div>
    <div class="editor-shell">
      ${renderTopbar()}
      <div class="editor-body">
        ${renderRail()}
        <div class="side-panel">${renderSidePanel()}</div>
        <div class="preview-pane">${renderPreview()}</div>
      </div>
    </div>
    ${state.confirmDialog ? renderConfirmDialog() : ""}
  `;

  const sidePanel = document.querySelector(".side-panel");
  if (sidePanel) sidePanel.scrollTop = savedSideScroll;
  const previewPane = document.querySelector(".preview-pane");
  if (previewPane && savedPreviewScroll) { previewPane.scrollTop = savedPreviewScroll.top; previewPane.scrollLeft = savedPreviewScroll.left; }
}

function renderTopbar() {
  const t = state.template;
  return `
  <div class="editor-topbar">
    <div class="topbar-left">
      <div class="topbar-title-row">
        ${state.editingName
          ? `<input class="doc-name-input" id="name-input" value="${escapeHtml(t.name)}" data-action="rename-input"/>`
          : `<span class="doc-name">${escapeHtml(t.name)}</span>`}
        <button class="icon-btn-ghost" data-action="toggle-rename" title="Rename">&#9998;</button>
      </div>
    </div>
    <div class="topbar-right">
      <button class="icon-btn-ghost" data-action="undo" title="Undo" ${historyIndex <= 0 ? "disabled style=opacity:.4" : ""}>&#8630;</button>
      <button class="icon-btn-ghost" data-action="redo" title="Redo" ${historyIndex >= history.length - 1 ? "disabled style=opacity:.4" : ""}>&#8631;</button>
      <div class="topbar-sep"></div>
      <button class="btn btn-primary" data-action="save-template">Save Template</button>
      <div class="more-menu-wrap">
        <button class="icon-btn-ghost" data-action="toggle-more" title="More">&#8942;</button>
        ${state.moreMenuOpen ? `<div class="more-menu">
          <button data-action="more-reset-default">Reset to Default</button>
          <button data-action="more-duplicate">Duplicate Template</button>
          <button data-action="more-export">Export as PDF</button>
        </div>` : ""}
      </div>
      <button class="btn-close-editor" data-action="close-editor" title="Close">&times;</button>
    </div>
  </div>
  <div style="background:#181b38;padding:5px 16px;display:flex;justify-content:flex-end;border-bottom:1px solid var(--topbar-border);">
    <button class="sample-toggle-link" data-action="toggle-sample">${state.showSampleValues ? "Show placeholders" : "Preview with sample values"}</button>
  </div>`;
}

function renderRail() {
  const items = [
    { id: "pageSettings", icon: "\u2317", label: "Page" },
    { id: "insert", icon: "\u2795", label: "Insert" },
    { id: "properties", icon: "\u2699", label: "Props" },
  ];
  return `<div class="icon-rail">${items.map((i) => `<button class="rail-btn ${state.mode === i.id ? "active" : ""}" data-action="switch-mode" data-mode="${i.id}"><span class="rail-icon">${i.icon}</span>${i.label}</button>`).join("")}</div>`;
}

function renderSidePanel() {
  if (state.mode === "pageSettings") return renderPageSettings();
  if (state.mode === "insert") return renderInsertPanel();
  return renderPropertiesPanel();
}

function renderConfirmDialog() {
  const d = state.confirmDialog;
  return `<div class="confirm-modal-backdrop" data-backdrop-dismiss="true">
    <div class="confirm-modal">
      <h3>${escapeHtml(d.title)}</h3>
      <p>${escapeHtml(d.body)}</p>
      <div class="modal-actions">
        <button class="btn btn-outline-dark" style="background:#fff;color:var(--text);border-color:var(--border-strong);" data-action="confirm-cancel">Cancel</button>
        <button class="btn btn-primary" data-action="confirm-ok">Confirm</button>
      </div>
    </div>
  </div>`;
}

const TABLE_TYPE_OPTIONS = [
  { type: "dynamicTable", name: "Predefined Tables", desc: "Auto-generates one row per record in the transaction data. Pick a table below \u2014 e.g. Invoice Line Items, Tax Breakdown, or Payment History." },
  { type: "staticTable", name: "Custom Table", desc: "Define your own fixed rows &amp; columns, with a static value or a module placeholder in each cell." },
];
// Inline "Table Type" picker used inside the properties panel, mirroring the Header Style
// picker: while unconfirmed (fresh table, or reopened via "Change") it shows selectable option
// cards with Confirm/Cancel; once confirmed it collapses to a compact summary + "Change" link.
function renderTableTypeSection(sel, el) {
  const forcedOpen = !el.typeConfirmed;
  const openedForChange = state.tableTypeOpen === sel.elementId;
  const pendingType = state.pendingTableType && state.pendingTableType.elementId === sel.elementId ? state.pendingTableType.type : null;
  const editing = forcedOpen || openedForChange || !!pendingType;
  const dataAttrs = `data-section="${sel.sectionId}" data-column="${sel.columnId}" data-element="${sel.elementId}"`;
  if (!editing) {
    const cur = TABLE_TYPE_OPTIONS.find((o) => o.type === el.type);
    return `
    <div class="pgroup">
      <div class="pgroup-title-row">
        <p class="pgroup-title">Table Type</p>
        <button type="button" class="tt-change-link" data-action="table-type-change" ${dataAttrs}>&#9998; Change</button>
      </div>
      <div class="tt-summary-row"><span>${cur.name}</span></div>
    </div>`;
  }
  const activeType = pendingType || el.type;
  return `
  <div class="pgroup">
    <div class="pgroup-title-row">
      <p class="pgroup-title">Table Type</p>
      <div class="tt-actions">
        <button type="button" class="tt-btn-confirm" data-action="table-type-confirm" ${dataAttrs} title="Confirm">&#10003; Confirm</button>
        ${!forcedOpen ? `<button type="button" class="tt-btn-cancel" data-action="table-type-cancel" title="Cancel">&#10005;</button>` : ""}
      </div>
    </div>
    ${pendingType ? `<div class="modal-warn-banner">Changing the table type will remove the configuration you\u2019ve made to the current table.</div>` : (forcedOpen ? `<p class="field-note">Choose how this table should be populated, then confirm.</p>` : "")}
    <div class="preset-list">
      ${TABLE_TYPE_OPTIONS.map((o) => `<div class="preset-row tt-option ${activeType === o.type ? "active" : ""}" data-action="table-type-select" data-type="${o.type}" ${dataAttrs}>
        <div style="flex:1;"><div class="preset-row-name">${o.name}</div><div class="field-note" style="margin:3px 0 0;">${o.desc}</div></div>
        ${activeType === o.type ? `<span class="preset-row-check">&#10003;</span>` : ""}
      </div>`).join("")}
    </div>
  </div>`;
}

// Inline "Table Content" picker (dynamicTable only) -- same collapse/expand + confirm/cancel
// pattern as renderTableTypeSection, staged in state.pendingTableContent.
function renderTableContentSection(sel, el) {
  const forcedOpen = !el.contentConfirmed;
  const openedForChange = state.tableContentOpen === sel.elementId;
  const pendingContent = state.pendingTableContent && state.pendingTableContent.elementId === sel.elementId ? state.pendingTableContent.presetId : null;
  const editing = forcedOpen || openedForChange || !!pendingContent;
  const dataAttrs = `data-section="${sel.sectionId}" data-column="${sel.columnId}" data-element="${sel.elementId}"`;
  if (!editing) {
    const cur = dynamicPresetById(el.preset);
    return `
    <div class="pgroup">
      <div class="pgroup-title-row">
        <p class="pgroup-title">Table Content</p>
        <button type="button" class="tt-change-link" data-action="table-content-change" ${dataAttrs}>&#9998; Change</button>
      </div>
      <div class="tt-summary-row"><span>${escapeHtml(cur.name)}</span><span class="muted" style="font-size:11px;">${cur.columns.length} columns</span></div>
    </div>`;
  }
  const activePreset = pendingContent || el.preset;
  return `
  <div class="pgroup">
    <div class="pgroup-title-row">
      <p class="pgroup-title">Table Content</p>
      <div class="tt-actions">
        <button type="button" class="tt-btn-confirm" data-action="table-content-confirm" ${dataAttrs} title="Confirm">&#10003; Confirm</button>
        ${!forcedOpen ? `<button type="button" class="tt-btn-cancel" data-action="table-content-cancel" title="Cancel">&#10005;</button>` : ""}
      </div>
    </div>
    ${pendingContent ? `<div class="modal-warn-banner">Changing the table content will replace the current columns &amp; sample data.</div>` : (forcedOpen ? `<p class="field-note">Pick the content this table should show, then confirm.</p>` : "")}
    <div class="preset-list">
      ${DYNAMIC_TABLE_PRESETS.map((preset) => `<div class="preset-row ${activePreset === preset.id ? "active" : ""}" data-action="table-content-select" data-preset="${preset.id}" ${dataAttrs}>
        <span class="preset-row-name">${escapeHtml(preset.name)}</span>
        <span class="preset-row-cols muted">${preset.columns.length} columns</span>
        ${activePreset === preset.id ? `<span class="preset-row-check">&#10003;</span>` : ""}
      </div>`).join("")}
    </div>
  </div>`;
}

/* ===================== Page Settings panel ===================== */
function renderPageSettings() {
  const p = state.template.page;
  return `
  <div class="panel-header">Page Settings</div>
  <div class="panel-body">
    <div class="pgroup">
      <p class="pgroup-title">Page Components</p>
      <div class="prow"><span class="prow-label">Include Page Header</span>${toggleHtml("page.includeHeader", p.includeHeader)}</div>
      <div class="prow"><span class="prow-label">Include Page Footer</span>${toggleHtml("page.includeFooter", p.includeFooter)}</div>
    </div>
    <div class="pgroup">
      <p class="pgroup-title">Layout &amp; Spacing</p>
      <div class="prow"><span class="prow-label">Paper Size</span>${selectInput("page.paperSize", p.paperSize, Object.keys(PAPER_SIZES))}</div>
      <div class="prow"><span class="prow-label">Page Orientation</span>${alignButtonsHtml("page.orientation", p.orientation, [{ value: "portrait", icon: "\u25AE", title: "Portrait" }, { value: "landscape", icon: "\u25AC", title: "Landscape" }])}</div>
      <div class="prow-stacked" data-hover-hl="margin"><span class="prow-label">Margin<span class="hint-dot" title="Outer boundary of the page content.">\u24D8</span></span>${marginBoxGrid("page.margin", p.margin)}</div>
      <div class="prow" data-hover-hl="inset"><span class="prow-label">Content Inset<span class="hint-dot" title="Spacing between the content boundary and the document content.">\u24D8</span></span>${numInput("page.contentInset", p.contentInset)}</div>
      <p class="field-note">Page &rarr; Margin &rarr; Content Area &rarr; Content Inset &rarr; Document Content</p>
    </div>
    <div class="pgroup">
      <p class="pgroup-title">Appearance</p>
      <div data-hover-hl="background">${backgroundControlsHtml("page.background", p.background, false, true)}</div>
      <div class="prow" data-hover-hl="pageBorder"><span class="prow-label">Page Border</span>${toggleHtml("page.pageBorder.enabled", p.pageBorder.enabled)}</div>
      ${p.pageBorder.enabled ? `
      <div class="prow"><span class="prow-label">Border Width</span>${numInput("page.pageBorder.width", p.pageBorder.width)}</div>
      <div class="prow"><span class="prow-label">Border Color</span>${colorInput("page.pageBorder.color", p.pageBorder.color)}</div>` : ""}
      <div class="prow" data-hover-hl="sectionBorder"><span class="prow-label">Content Section Border</span>${toggleHtml("page.sectionBorder.enabled", p.sectionBorder.enabled)}</div>
      ${p.sectionBorder.enabled ? `
      <div class="prow"><span class="prow-label">Border Width</span>${numInput("page.sectionBorder.width", p.sectionBorder.width)}</div>
      <div class="prow"><span class="prow-label">Border Color</span>${colorInput("page.sectionBorder.color", p.sectionBorder.color)}</div>` : ""}
      <div class="prow" data-hover-hl="radius"><span class="prow-label">Corner Radius<span class="hint-dot" title="Rounds the corners of the content area, including its background and border when enabled.">\u24D8</span></span>${numInput("page.cornerRadius", p.cornerRadius)}</div>
    </div>
    <div class="pgroup">
      <p class="pgroup-title">Default Typography</p>
      <div class="prow"><span class="prow-label">Default Font</span>${selectInput("page.typography.font", p.typography.font, FONTS)}</div>
      <div class="prow"><span class="prow-label">Default Font Color</span>${colorInput("page.typography.color", p.typography.color)}</div>
      <div class="prow"><span class="prow-label">Default Font Size</span>${numInput("page.typography.size", p.typography.size)}</div>
      <div class="prow"><span class="prow-label">Default Line Height</span>${numInput("page.typography.lineHeight", p.typography.lineHeight, "")}</div>
    </div>
    ${renderAnnexureSettingsHtml()}
  </div>`;
}

function renderAnnexureSettingsHtml() {
  const a = state.template.annexure;
  return `
  <div class="pgroup">
    <p class="pgroup-title">Annexure</p>
    <div class="prow"><span class="prow-label">Include Annexure<span class="hint-dot" title="Adds an extra page at the end of the document for additional content or an attached document.">\u24D8</span></span>${toggleHtml("annexure.enabled", a.enabled)}</div>
    ${a.enabled ? `
    <div class="seg">
      <button class="${a.mode === "content" ? "active" : ""}" data-set-path="annexure.mode" data-set-value="content">Custom Content</button>
      <button class="${a.mode === "document" ? "active" : ""}" data-set-path="annexure.mode" data-set-value="document">Upload Document</button>
    </div>
    ${a.mode === "document" ? `
    <div class="prow-stacked" style="margin-top:8px;">
      <span class="prow-label">Document</span>
      <div style="display:flex;align-items:center;gap:8px;">
        ${a.document && a.document.src
          ? `<span class="annexure-doc-chip">\u{1F4C4} ${escapeHtml(a.document.name || "document")}</span><button type="button" class="btn btn-outline-dark" style="background:#fff;color:var(--text);border-color:var(--border-strong);" data-action="clear-annexure-doc">Remove</button>`
          : `<label class="btn btn-outline-dark" style="background:#fff;color:var(--text);border-color:var(--border-strong);cursor:pointer;">+ Upload File<input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" style="display:none" data-upload-doc="annexure.document"/></label>`}
      </div>
      <p class="field-note">The uploaded file is attached as-is and appended as the final page(s) of the generated document.</p>
    </div>` : `
    <div class="prow-stacked" style="margin-top:8px;"><span class="prow-label">Content</span><textarea class="text-input" rows="5" data-path="annexure.content" data-parse="string">${escapeHtml(a.content)}</textarea></div>
    <p class="field-note">Supports the same placeholders as Text elements.</p>`}` : ""}
  </div>`;
}

/* ===================== Insert panel ===================== */
function renderInsertPanel() {
  return `
  <div class="panel-header">Insert</div>
  <div class="insert-tabs">
    <button class="${state.insertTab === "components" ? "active" : ""}" data-action="switch-insert-tab" data-tab="components">Components</button>
    <button class="${state.insertTab === "fields" ? "active" : ""}" data-action="switch-insert-tab" data-tab="fields">Module Fields</button>
  </div>
  <div class="panel-body">${state.insertTab === "components" ? renderInsertComponents() : renderInsertFields()}</div>`;
}

const COMPONENT_DEFS = [
  { type: "title", label: "Title", icon: "T" },
  { type: "text", label: "Text", icon: "\u00B6" },
  { type: "image", label: "Image", icon: "\u25A3" },
  { type: "logo", label: "Logo", icon: "\u25C6" },
  { type: "divider", label: "Divider", icon: "\u2015" },
  { type: "spacer", label: "Spacer", icon: "\u2195" },
  { type: "signature", label: "Signature", icon: "\u270D" },
  { type: "dynamicTable", label: "Table", icon: "\u25A6" },
];

function renderInsertComponents() {
  return `
  <p class="pgroup-title" style="padding:12px 16px 0;">Elements</p>
  <div class="elements-grid">
    ${COMPONENT_DEFS.map((c) => `<div class="el-card" draggable="true" data-drag-component="${c.type}"><span class="el-ic">${c.icon}</span>${c.label}</div>`).join("")}
  </div>
  <p class="pgroup-title" style="padding:4px 16px 0;">Sections &amp; Columns</p>
  <div class="section-presets">
    ${SECTION_PRESETS.map((p) => `<div class="preset-row" draggable="true" data-drag-section-preset="${p.id}"><div class="preset-mini">${p.widths.map((w) => `<i style="flex:${w}"></i>`).join("")}</div>${p.name}</div>`).join("")}
  </div>
  <p class="pgroup-title" style="padding:4px 16px 0;">Module Sections</p>
  <div class="module-sections">
    ${MODULE_SECTION_PRESETS.map((p) => `<div class="preset-row" draggable="true" data-drag-module-section="${p.id}"><div class="preset-mini"><i></i></div><div><div>${p.name}</div><div class="field-note" style="margin:0;">${p.desc}</div></div></div>`).join("")}
  </div>`;
}

function renderInsertFields() {
  const q = state.fieldSearch.toLowerCase();
  const groups = MODULE_FIELD_GROUPS.map((g) => ({
    group: g.group,
    fields: g.fields.filter((f) => {
      if (q && !f.label.toLowerCase().includes(q)) return false;
      if (state.showUnusedOnly && isFieldUsed(f.placeholder)) return false;
      return true;
    }),
  })).filter((g) => g.fields.length);
  return `
  <div class="search-wrap"><input type="text" placeholder="Search fields" value="${escapeHtml(state.fieldSearch)}" data-action="field-search"/></div>
  <label class="unused-filter"><input type="checkbox" data-action="toggle-unused-only" ${state.showUnusedOnly ? "checked" : ""}/> Show only unused fields</label>
  ${groups.length === 0 ? `<div class="field-note" style="padding:8px 16px;">No matching fields.</div>` : groups.map((g) => `
    <p class="field-group-title">${g.group}</p>
    ${g.fields.map((f) => {
      const used = isFieldUsed(f.placeholder);
      return `<div class="field-row ${used ? "used" : ""}" draggable="true" data-drag-field="${f.id}">
        <span class="field-name">${f.label}</span>
        ${used ? `<span class="used-pill">Used</span>` : `<span class="muted" style="font-size:10px;">Drag &rarr;</span>`}
      </div>`;
    }).join("")}
  `).join("")}`;
}

/* ===================== Properties panel ===================== */
// Badge label + delete action shown at the top of the Properties panel header (instead of a
// full-width "Delete ..." button buried at the bottom of the panel body).
function propsTypeBadge(sel) {
  if (sel.type === "header") return "Header";
  if (sel.type === "footer") return "Footer";
  if (sel.type === "section") return resolveTarget(sel).isSpacer ? "Spacer" : "Section";
  if (sel.type === "column") return "Column";
  if (sel.type === "element") return elementLabel(resolveTarget(sel));
  if (sel.type === "staticCell") return "Cell";
  return "";
}
function propsDeleteAction(sel) {
  if (sel.type === "section") return { action: "delete-section", attrs: `data-section="${sel.sectionId}"` };
  if (sel.type === "column") return { action: "delete-column", attrs: `data-section="${sel.sectionId}" data-column="${sel.columnId}"` };
  if (sel.type === "element") return { action: "delete-element", attrs: `data-section="${sel.sectionId}" data-column="${sel.columnId}" data-element="${sel.elementId}"` };
  return null;
}
function renderPropertiesPanel() {
  const sel = state.selection;
  if (!sel || sel.type === "page" || !resolveTarget(sel)) {
    return `<div class="panel-header">Properties</div>
      <div class="empty-props"><span class="big-icon">&#9733;</span>Select any section, column, or element in the template preview to view and customize its properties.</div>`;
  }
  const crumb = `<div class="breadcrumb">${renderBreadcrumbHtml(sel)}</div>`;
  let body = "";
  if (sel.type === "header" || sel.type === "footer") body = renderHeaderFooterProps(sel.type);
  else if (sel.type === "section") body = renderSectionProps(sel);
  else if (sel.type === "column") body = renderColumnProps(sel);
  else if (sel.type === "element") body = renderElementProps(sel);
  else if (sel.type === "staticCell") body = renderStaticCellProps(sel);
  const badge = propsTypeBadge(sel);
  const del = propsDeleteAction(sel);
  const header = `<div class="panel-header">
    <div class="panel-header-title">Properties${badge ? ` <span class="type-pill">${escapeHtml(badge)}</span>` : ""}</div>
    <div class="panel-header-actions">
      ${del ? `<button type="button" class="panel-icon-btn danger" title="Delete" data-action="${del.action}" ${del.attrs}>&#128465;</button>` : ""}
      <button type="button" class="panel-icon-btn" title="Close" data-action="deselect">&times;</button>
    </div>
  </div>`;
  return `${header}${crumb}<div class="panel-body">${body}</div>`;
}

function renderHeaderFooterProps(kind) {
  const hf = state.template[kind];
  const variant = hf.variants[hf.activeVariant];
  const prefix = `${kind}.variants.${hf.activeVariant}`;
  return `
  <div class="pgroup">
    <p class="pgroup-title">${kind === "header" ? "Header" : "Footer"} Preferences</p>
    <div class="prow-stacked">
      <span class="prow-label">${kind === "header" ? "Header" : "Footer"} Style</span>
      <div class="swatch-grid">
        ${HEADER_STYLES.map((s) => `<div class="swatch ${hf.style === s.id ? "active" : ""}" data-action="request-style-change" data-kind="${kind}" data-style="${s.id}">
          <div class="swatch-bar" style="background:${s.id === "plain" ? "#d5dbe7" : s.id === "dark" ? "#12142a" : "linear-gradient(90deg,#2f6feb,#7c3aed)"}"></div>
          <span class="swatch-label">${s.name}</span>
        </div>`).join("")}
      </div>
    </div>
    <div class="prow"><span class="prow-label">Use Different ${kind === "header" ? "Header" : "Footer"} for Subsequent Pages</span>${toggleHtml(`${kind}.differentSubsequent`, hf.differentSubsequent)}</div>
    ${hf.differentSubsequent ? `
    <div class="prow-stacked">
      <span class="prow-label">${kind === "header" ? "Header" : "Footer"} View</span>
      <div class="seg">
        <button data-action="set-hf-variant" data-kind="${kind}" data-variant="first" class="${hf.activeVariant === "first" ? "active" : ""}">First Page</button>
        <button data-action="set-hf-variant" data-kind="${kind}" data-variant="subsequent" class="${hf.activeVariant === "subsequent" ? "active" : ""}">Subsequent Page</button>
      </div>
    </div>
    <p class="field-note">The template preview now shows the ${hf.activeVariant === "first" ? "first page" : "subsequent page"} ${kind}. Switch back to First Page to continue editing the main document.</p>` : ""}
  </div>
  <div class="pgroup">
    <p class="pgroup-title">${kind === "header" ? "Header" : "Footer"} Columns</p>
    ${sectionColumnsControls(prefix, variant, kind)}
  </div>
  <div class="pgroup">
    <p class="pgroup-title">Layout &amp; Spacing</p>
    <div class="prow"><span class="prow-label">Vertical Alignment</span>${alignButtonsHtml(`${prefix}.valign`, variant.valign, [{ value: "top", icon: "\u2912", title: "Top" }, { value: "middle", icon: "\u2194", title: "Middle" }, { value: "bottom", icon: "\u2913", title: "Bottom" }])}</div>
    <div class="prow-stacked"><span class="prow-label">Margin</span>${marginBoxGrid(`${prefix}.margin`, variant.margin)}</div>
    <div class="prow-stacked"><span class="prow-label">Padding</span>${marginBoxGrid(`${prefix}.padding`, variant.padding)}</div>
    ${borderControlsHtml(`${prefix}.border`, variant.border, { showRadius: false })}
    <div class="prow"><span class="prow-label">Corner Radius</span>${numInput(`${prefix}.cornerRadius`, variant.cornerRadius)}</div>
  </div>
  <div class="pgroup">
    <p class="pgroup-title">Background</p>
    ${backgroundControlsHtml(`${prefix}.bg`, variant.bg, true, false)}
    <p class="field-note">When enabled, the background &amp; border will be extended to the edges (left &amp; right) of the page. Margin will be auto-applied for this ${kind}.</p>
  </div>`;
}

function sectionColumnsControls(prefix, sec, sectionId) {
  const total = sec.columns.reduce((s, c) => s + Number(c.width || 0), 0);
  return `
  <div class="layout-grid">
    ${[1, 2, 3, 4].map((n) => `<div class="layout-opt ${sec.columns.length === n ? "active" : ""}" data-action="set-column-count" data-prefix="${prefix}" data-section="${sectionId}" data-count="${n}">
      <div class="mini-cols">${Array.from({ length: n }).map(() => `<i></i>`).join("")}</div>${n} Column${n > 1 ? "s" : ""}
    </div>`).join("")}
  </div>
  <div class="col-list-head"><span>Columns</span><span>Width</span></div>
  <div class="col-list">
    ${sec.columns.map((c, i) => `<div class="col-list-row" draggable="true" data-reorder-group="section-cols" data-reorder-index="${i}" data-reorder-section="${sectionId}">
      <span class="drag-handle">&#8942;&#8942;</span>
      <span class="col-list-name">Column ${i + 1}</span>
      ${colWidthInput(`${prefix}.columns`, i, c.width, "width")}
      <span class="muted" style="font-size:11px;">%</span>
    </div>`).join("")}
  </div>
  <p class="field-note ${Math.round(total) !== 100 ? "error" : ""}">${Math.round(total) !== 100 ? "Column widths must total 100%." : "Drag the handle to reorder columns."}</p>`;
}

function renderSectionProps(sel) {
  const sec = resolveTarget(sel);
  if (sec.isSpacer) {
    return `
    <div class="pgroup">
      <p class="pgroup-title">Spacer</p>
      <div class="prow"><span class="prow-label">Height</span>${numInput(`sections[${sectionIdx(sel.sectionId)}].spacerHeight`, sec.spacerHeight)}</div>
      <p class="field-note">A spacer adds empty vertical space between sections. It has no content of its own.</p>
    </div>`;
  }
  return `
  <div class="pgroup">
    <p class="pgroup-title">Section Columns</p>
    ${sectionColumnsControls(`sections[${sectionIdx(sel.sectionId)}]`, sec, sel.sectionId)}
  </div>
  <div class="pgroup">
    <p class="pgroup-title">Layout &amp; Spacing</p>
    <div class="prow"><span class="prow-label">Vertical Alignment</span>${alignButtonsHtml(`sections[${sectionIdx(sel.sectionId)}].valign`, sec.valign, [{ value: "top", icon: "\u2912", title: "Top" }, { value: "middle", icon: "\u2194", title: "Middle" }, { value: "bottom", icon: "\u2913", title: "Bottom" }])}</div>
    <div class="prow-stacked"><span class="prow-label">Margin</span>${marginBoxGrid(`sections[${sectionIdx(sel.sectionId)}].margin`, sec.margin)}</div>
    <div class="prow-stacked"><span class="prow-label">Padding</span>${marginBoxGrid(`sections[${sectionIdx(sel.sectionId)}].padding`, sec.padding)}</div>
    ${borderControlsHtml(`sections[${sectionIdx(sel.sectionId)}].border`, sec.border, { showRadius: false })}
    <div class="prow"><span class="prow-label">Corner Radius</span>${numInput(`sections[${sectionIdx(sel.sectionId)}].cornerRadius`, sec.cornerRadius)}</div>
  </div>
  <div class="pgroup">
    <p class="pgroup-title">Background</p>
    ${backgroundControlsHtml(`sections[${sectionIdx(sel.sectionId)}].bg`, sec.bg, true, false)}
  </div>`;
}
function sectionIdx(sectionId) { return state.template.sections.findIndex((s) => s.id === sectionId); }

function renderColumnProps(sel) {
  const col = resolveTarget(sel);
  const base = columnPath(sel);
  const secPrefix = base.slice(0, base.lastIndexOf(".columns["));
  const colIdx = Number(base.slice(base.lastIndexOf("[") + 1, base.lastIndexOf("]")));
  return `
  <div class="pgroup">
    <p class="pgroup-title">Layout &amp; Spacing</p>
    <div class="prow"><span class="prow-label">Column Width</span>${colWidthInput(`${secPrefix}.columns`, colIdx, col.width, "width")}<span class="muted" style="font-size:11px;margin-left:6px;">%</span></div>
    <div class="prow"><span class="prow-label">Vertical Alignment</span>${alignButtonsHtml(`${base}.valign`, col.valign, [{ value: "top", icon: "\u2912", title: "Top" }, { value: "middle", icon: "\u2194", title: "Middle" }, { value: "bottom", icon: "\u2913", title: "Bottom" }])}</div>
    <div class="prow"><span class="prow-label">Row Gap</span>${numInput(`${base}.rowGap`, col.rowGap ?? 0)}</div>
    <div class="prow-stacked"><span class="prow-label">Margin</span>${marginBoxGrid(`${base}.margin`, col.margin)}</div>
    <div class="prow-stacked"><span class="prow-label">Padding</span>${marginBoxGrid(`${base}.padding`, col.padding)}</div>
    ${borderControlsHtml(`${base}.border`, col.border)}
  </div>
  <div class="pgroup">
    <p class="pgroup-title">Background</p>
    ${backgroundControlsHtml(`${base}.bg`, col.bg, false, false)}
  </div>`;
}

function columnPath(sel) {
  const secPrefix = sel.sectionId === "header" || sel.sectionId === "footer"
    ? `${sel.sectionId}.variants.${state.template[sel.sectionId].activeVariant}`
    : `sections[${sectionIdx(sel.sectionId)}]`;
  const sec = findSection(sel.sectionId);
  const ci = sec.columns.findIndex((c) => c.id === sel.columnId);
  return `${secPrefix}.columns[${ci}]`;
}
function elementPath(sel) { return `${columnPath(sel)}.elements[${findColumn(sel.sectionId, sel.columnId).elements.findIndex((e) => e.id === sel.elementId)}]`; }

function renderElementProps(sel) {
  const el = resolveTarget(sel);
  const base = elementPath(sel);
  if (el.type === "title") return `<div class="pgroup"><p class="pgroup-title">Layout &amp; Spacing</p>${alignRowHtml(`${base}.align`, el.align)}</div>
    <div class="pgroup"><p class="pgroup-title">Content</p>
    <div class="prow-stacked"><span class="prow-label">Text</span><input class="text-input" data-path="${base}.text" data-parse="string" value="${escapeHtml(el.text)}"/></div></div>
    <div class="pgroup"><p class="pgroup-title">Formatting</p>${typographyControlsHtml(base, el, { align: false, resetDefaults: { font: "", color: "", size: 16, lineHeight: "", bold: true, italic: false, underline: false, strike: false } })}</div>${deleteElBtn(sel)}`;
  if (el.type === "text") return `<div class="pgroup"><p class="pgroup-title">Layout &amp; Spacing</p>${alignRowHtml(`${base}.align`, el.align)}</div>
    <div class="pgroup"><p class="pgroup-title">Content</p>
    <p class="field-note">Rich text. Placeholders like %Customer_Displayname% or {{Field}} are supported inline.</p>
    <textarea class="text-input" rows="4" data-path="${base}.html" data-parse="string">${escapeHtml(el.html)}</textarea>
    <div style="margin-top:6px;"><button type="button" class="btn btn-outline-dark" style="background:#fff;color:var(--text);border-color:var(--border-strong);" data-action="open-field-picker" data-target="${base}.html">Insert Placeholder</button></div>
    </div>
    <div class="pgroup"><p class="pgroup-title">Formatting</p>${typographyControlsHtml(base, el, { align: false, resetDefaults: { font: "", color: "", size: "", lineHeight: "", bold: false, italic: false, underline: false, strike: false } })}</div>${deleteElBtn(sel)}`;
  if (el.type === "field") { const isSpaceBetween = (el.layout || "spaceBetween") === "spaceBetween"; return `<div class="pgroup"><p class="pgroup-title">Layout &amp; Spacing</p>
    <div class="prow"><span class="prow-label">Label &amp; Value Layout</span>${selectInput(`${base}.layout`, el.layout || "spaceBetween", [{ value: "spaceBetween", label: "Space Between" }, { value: "inline", label: "Inline" }, { value: "stacked", label: "Stacked" }])}</div>
    ${(el.layout || "spaceBetween") === "inline" ? `<div class="prow"><span class="prow-label">Gap</span>${numInput(`${base}.gap`, el.gap ?? 8)}</div>` : ""}
    ${alignRowHtml(isSpaceBetween ? `${base}.labelAlign` : `${base}.align`, isSpaceBetween ? el.labelAlign : el.align)}
    </div>
    <div class="pgroup"><p class="pgroup-title">Content</p>
    <div class="prow-stacked"><span class="prow-label">Label</span><input class="text-input" data-path="${base}.label" data-parse="string" value="${escapeHtml(el.label)}"/></div>
    <div class="prow-stacked"><span class="prow-label">Value / Placeholder</span>
      <select class="select-input" data-path="${base}.placeholder" data-parse="string">${allModuleFields().map((f) => `<option value="${f.placeholder}" ${el.placeholder === f.placeholder ? "selected" : ""}>${f.placeholder}</option>`).join("")}</select>
    </div>
    </div>
    <div class="pgroup"><p class="pgroup-title">Label Formatting</p>${typographyControlsHtml(`${base}.labelStyle`, el.labelStyle || {}, { align: false, lineHeight: false, resetDefaults: { font: "", color: "", size: "", bold: true, italic: false, underline: false, strike: false } })}</div>
    <div class="pgroup"><p class="pgroup-title">Value Formatting</p>${typographyControlsHtml(base, el, { align: false, resetDefaults: { font: "", color: "", size: "", lineHeight: "", bold: false, italic: false, underline: false, strike: false } })}</div>${deleteElBtn(sel)}`; }
  if (el.type === "pageNumber") return `<div class="pgroup"><p class="pgroup-title">Layout &amp; Spacing</p>${alignRowHtml(`${base}.align`, el.align || "right")}</div>
    <div class="pgroup"><p class="pgroup-title">Page Number</p>
    <div class="prow-stacked"><span class="prow-label">Custom Format</span><input class="text-input" data-path="${base}.customFormat" data-parse="string" value="${escapeHtml(el.customFormat)}"/></div>
    <p class="field-note">Placeholders: {{CurrentPageNumber}}, {{TotalPages}}, {{DocId}}</p>
    </div>
    <div class="pgroup"><p class="pgroup-title">Formatting</p>${typographyControlsHtml(base, el, { style: false, align: false, resetDefaults: { font: "", color: "", size: 10, lineHeight: "" } })}</div>${deleteElBtn(sel)}`;
  if (el.type === "image" || el.type === "logo") return `<div class="pgroup"><p class="pgroup-title">Content</p>
    <div style="display:flex;align-items:center;gap:8px;">
      ${el.src ? `<img src="${el.src}" style="width:60px;height:36px;object-fit:contain;border-radius:6px;border:1px solid var(--border-strong);"/>` : ""}
      <label class="btn btn-outline-dark" style="background:#fff;color:var(--text);border-color:var(--border-strong);cursor:pointer;">${el.src ? "Replace" : "Upload"} Image<input type="file" accept="image/*" style="display:none" data-upload-bg="${base}.src"/></label>
    </div>
    <div class="prow" style="margin-top:6px;"><span class="prow-label">Height</span>${numInput(`${base}.height`, el.height)}</div>
    </div>${deleteElBtn(sel)}`;
  if (el.type === "divider") return `<div class="pgroup"><p class="pgroup-title">Appearance</p>
    <div class="prow"><span class="prow-label">Line Style</span>${selectInput(`${base}.style`, el.style || "solid", [{ value: "solid", label: "Solid" }, { value: "dashed", label: "Dashed" }, { value: "dotted", label: "Dotted" }])}</div>
    <div class="prow"><span class="prow-label">Line Weight</span>${numInput(`${base}.thickness`, el.thickness)}</div>
    <div class="prow"><span class="prow-label">Line Color</span>${colorInput(`${base}.color`, el.color)}</div>
    </div>${deleteElBtn(sel)}`;
  if (el.type === "spacer") return `<div class="pgroup"><p class="pgroup-title">Appearance</p>
    <div class="prow"><span class="prow-label">Height</span>${numInput(`${base}.height`, el.height)}</div>
    </div>${deleteElBtn(sel)}`;
  if (el.type === "signature") return `<div class="pgroup"><p class="pgroup-title">Content</p>
    <div class="prow-stacked"><span class="prow-label">Label</span><input class="text-input" data-path="${base}.label" data-parse="string" value="${escapeHtml(el.label)}"/></div>
    </div>${deleteElBtn(sel)}`;
  if (el.type === "dynamicTable") return renderDynamicTableProps(sel, el, base);
  if (el.type === "staticTable") return renderStaticTableProps(sel, el, base);
  return "";
}
// Delete for the selected element now lives at the top of the Properties panel (see propsDeleteAction).
function deleteElBtn(sel) {
  return "";
}

function renderDynamicTableProps(sel, el, base) {
  const total = el.columns.reduce((s, c) => s + Number(c.width || 0), 0);
  const setupDone = el.typeConfirmed && el.contentConfirmed;
  const rest = `
  <div class="pgroup">
    <p class="pgroup-title">Table Style</p>
    <div class="swatch-grid">${TABLE_STYLES.map((s) => `<div class="swatch ${el.style === s.id ? "active" : ""}" data-set-path="${base}.style" data-set-value="${s.id}"><div class="swatch-bar" style="background:${s.swatch}"></div><span class="swatch-label">${s.name}</span></div>`).join("")}</div>
  </div>
  <div class="pgroup">
    <p class="pgroup-title">Header Formatting</p>
    <p class="field-note">Applies to the header row across all columns.</p>
    ${typographyControlsHtml(`${base}.headerStyle`, el.headerStyle || {}, { align: false, resetDefaults: { font: "", color: "", size: "", lineHeight: "", bold: true, italic: false, underline: false, strike: false } })}
  </div>
  <div class="pgroup">
    <p class="pgroup-title">Value Formatting</p>
    <p class="field-note">Applies to all data rows across all columns.</p>
    ${typographyControlsHtml(`${base}.valueStyle`, el.valueStyle || {}, { align: false, resetDefaults: { font: "", color: "", size: "", lineHeight: "", bold: false, italic: false, underline: false, strike: false } })}
  </div>
  <div class="pgroup">
    <p class="pgroup-title">Layout</p>
    <div class="prow"><span class="prow-label">Corner Radius</span>${numInput(`${base}.cornerRadius`, el.cornerRadius)}</div>
    <div class="prow"><span class="prow-label">Cell Padding</span>${numInput(`${base}.cellPadding`, el.cellPadding)}</div>
  </div>
  <div class="pgroup">
    <p class="pgroup-title">Column Widths</p>
    <p class="field-note">Hover a column name to rename it.</p>
    <div class="col-list-head"><span>Columns</span><span>Width</span></div>
    <div class="col-list">
      ${el.columns.map((c, i) => `<div class="col-list-row">
        <input class="col-list-name-input" data-path="${base}.columns[${i}].label" data-parse="string" value="${escapeHtml(c.label)}"/>
        ${colWidthInput(`${base}.columns`, i, c.width, "width")}
        <span class="muted" style="font-size:11px;">%</span>
      </div>`).join("")}
    </div>
    <p class="field-note ${Math.round(total) !== 100 ? "error" : ""}">${Math.round(total) !== 100 ? "Column widths must total 100%." : "Column widths total 100%."}</p>
  </div>`;
  return `
  ${renderTableTypeSection(sel, el)}
  ${el.typeConfirmed ? renderTableContentSection(sel, el) : ""}
  ${setupDone ? rest : `<div class="pgroup-disabled">${rest}</div>`}
  ${deleteElBtn(sel)}`;
}

function renderStaticTableProps(sel, el, base) {
  const total = el.colWidths.reduce((s, w) => s + Number(w || 0), 0);
  const setupDone = el.typeConfirmed;
  const rest = `
  <div class="pgroup">
    <p class="pgroup-title">Table Style</p>
    <div class="info-note">You can override the background for each cell.</div>
    <div class="swatch-grid">${TABLE_STYLES.map((s) => `<div class="swatch ${el.style === s.id ? "active" : ""}" data-set-path="${base}.style" data-set-value="${s.id}"><div class="swatch-bar" style="background:${s.swatch}"></div><span class="swatch-label">${s.name}</span></div>`).join("")}</div>
  </div>
  <div class="pgroup">
    <p class="pgroup-title">Rows &amp; Columns</p>
    <div class="prow"><span class="prow-label">Rows</span><div class="prow-control">
      <button class="btn btn-outline-dark" style="background:#fff;border-color:var(--border-strong);padding:4px 9px;" data-action="static-add-row" data-section="${sel.sectionId}" data-column="${sel.columnId}" data-element="${sel.elementId}">+</button>
      <b>${el.rows}</b>
      <button class="btn btn-outline-dark" style="background:#fff;border-color:var(--border-strong);padding:4px 9px;" data-action="static-remove-row" data-section="${sel.sectionId}" data-column="${sel.columnId}" data-element="${sel.elementId}">&minus;</button>
    </div></div>
    <div class="prow"><span class="prow-label">Columns</span><div class="prow-control">
      <button class="btn btn-outline-dark" style="background:#fff;border-color:var(--border-strong);padding:4px 9px;" data-action="static-add-col" data-section="${sel.sectionId}" data-column="${sel.columnId}" data-element="${sel.elementId}">+</button>
      <b>${el.cols}</b>
      <button class="btn btn-outline-dark" style="background:#fff;border-color:var(--border-strong);padding:4px 9px;" data-action="static-remove-col" data-section="${sel.sectionId}" data-column="${sel.columnId}" data-element="${sel.elementId}">&minus;</button>
    </div></div>
    <div class="col-list-head"><span>Columns</span><span>Width</span></div>
    <div class="col-list">${el.colWidths.map((w, i) => `<div class="col-list-row" draggable="true" data-reorder-group="static-cols" data-reorder-index="${i}" data-reorder-section="${sel.sectionId}" data-reorder-column="${sel.columnId}" data-reorder-element="${sel.elementId}"><span class="drag-handle">&#8942;&#8942;</span><span class="col-list-name">Column ${i + 1}</span>${colWidthInput(`${base}.colWidths`, i, w)}<span class="muted" style="font-size:11px;">%</span></div>`).join("")}</div>
    <p class="field-note ${Math.round(total) !== 100 ? "error" : ""}">${Math.round(total) !== 100 ? "Column widths must total 100%." : "Drag the handle to reorder columns. Click a cell in the preview to edit its content."}</p>
    <div class="col-list-head"><span>Rows</span><span></span></div>
    <div class="col-list">${Array.from({ length: el.rows }).map((_, r) => {
      const preview = el.cells[`${r}_0`] && (el.cells[`${r}_0`].value || el.cells[`${r}_0`].placeholder);
      return `<div class="col-list-row" draggable="true" data-reorder-group="static-rows" data-reorder-index="${r}" data-reorder-section="${sel.sectionId}" data-reorder-column="${sel.columnId}" data-reorder-element="${sel.elementId}"><span class="drag-handle">&#8942;&#8942;</span><span class="col-list-name">Row ${r + 1}${preview ? ` &mdash; ${escapeHtml(String(preview))}` : ""}</span></div>`;
    }).join("")}</div>
    <p class="field-note">Drag the handle to reorder rows.</p>
  </div>
  <div class="pgroup">
    <p class="pgroup-title">Row 1 Labels</p>
    <p class="field-note">Quick-edit each column's row 1 value.</p>
    ${Array.from({ length: el.cols }).map((_, i) => {
      const cell = el.cells[`0_${i}`] || { contentType: "static", value: "" };
      return `<div class="prow-stacked"><span class="prow-label">Column ${i + 1}</span><input class="text-input" data-path="${base}.cells.0_${i}.value" data-parse="string" value="${escapeHtml(cell.value || "")}"/></div>`;
    }).join("")}
  </div>
  <div class="pgroup">
    <p class="pgroup-title">Value Column Placeholder</p>
    <p class="field-note">Pre-fills new rows added to a column with a static value or module placeholder.</p>
    ${Array.from({ length: el.cols }).map((_, i) => {
      const def = (el.columnDefaults && el.columnDefaults[i]) || { contentType: "static", placeholder: "", value: "" };
      return `<div class="prow-stacked">
        <span class="prow-label">Column ${i + 1} Default</span>
        <div class="seg">
          <button class="${def.contentType === "static" ? "active" : ""}" data-action="set-col-default-type" data-section="${sel.sectionId}" data-column="${sel.columnId}" data-element="${sel.elementId}" data-index="${i}" data-type="static">Static Value</button>
          <button class="${def.contentType === "placeholder" ? "active" : ""}" data-action="set-col-default-type" data-section="${sel.sectionId}" data-column="${sel.columnId}" data-element="${sel.elementId}" data-index="${i}" data-type="placeholder">Placeholder</button>
        </div>
        ${def.contentType === "static"
          ? `<input class="text-input" data-path="${base}.columnDefaults[${i}].value" data-parse="string" value="${escapeHtml(def.value || "")}" placeholder="Default value for new rows"/>`
          : `<select class="select-input" data-path="${base}.columnDefaults[${i}].placeholder" data-parse="string">${allModuleFields().map((f) => `<option value="${f.placeholder}" ${def.placeholder === f.placeholder ? "selected" : ""}>${f.placeholder}</option>`).join("")}</select>`}
      </div>`;
    }).join("")}
  </div>
  <div class="pgroup"><p class="pgroup-title">Layout</p><div class="prow"><span class="prow-label">Corner Radius</span>${numInput(`${base}.cornerRadius`, el.cornerRadius)}</div></div>`;
  return `
  ${renderTableTypeSection(sel, el)}
  ${setupDone ? rest : `<div class="pgroup-disabled">${rest}</div>`}
  ${deleteElBtn(sel)}`;
}

function renderStaticCellProps(sel) {
  const cell = resolveTarget(sel);
  const base = `${elementPath(sel)}.cells.${sel.row}_${sel.col}`;
  return `
  <div class="pgroup">
    <p class="pgroup-title">Cell Content</p>
    <div class="prow"><span class="prow-label">Content Type</span>
      <div class="seg">
        <button class="${cell.contentType === "static" ? "active" : ""}" data-set-path="${base}.contentType" data-set-value="static">Static Value</button>
        <button class="${cell.contentType === "placeholder" ? "active" : ""}" data-set-path="${base}.contentType" data-set-value="placeholder">Placeholder</button>
      </div>
    </div>
    ${cell.contentType === "static"
      ? `<div class="prow-stacked"><span class="prow-label">Value</span><input class="text-input" data-path="${base}.value" data-parse="string" value="${escapeHtml(cell.value || "")}"/></div>`
      : `<div class="prow-stacked"><span class="prow-label">Placeholder</span><select class="select-input" data-path="${base}.placeholder" data-parse="string">${allModuleFields().map((f) => `<option value="${f.placeholder}" ${cell.placeholder === f.placeholder ? "selected" : ""}>${f.placeholder}</option>`).join("")}</select></div>`}
  </div>
  <div class="pgroup">
    <p class="pgroup-title">Formatting</p>
    <div class="prow"><span class="prow-label">Alignment</span>${alignButtonsHtml(`${base}.align`, cell.align || "left", [{ value: "left", icon: "\u2630", title: "Left" }, { value: "center", icon: "\u2261", title: "Center" }, { value: "right", icon: "\u2637", title: "Right" }])}</div>
    <div class="prow"><span class="prow-label">Background Color</span>${colorInput(`${base}.bgColor`, cell.bgColor, "transparent")}</div>
    ${typographyControlsHtml(base, cell, { align: false, resetDefaults: { font: "", color: "", size: "", lineHeight: "", align: "left", bold: false, italic: false, underline: false, strike: false, bgColor: "" } })}
  </div>`;
}

/* ===================== Template preview render ===================== */
function pageDims() {
  const p = state.template.page;
  const mm = PAPER_SIZES[p.paperSize];
  let w = mm.w, h = mm.h;
  if (p.orientation === "landscape") [w, h] = [h, w];
  return { w: Math.round(w * PX_PER_MM), h: Math.round(h * PX_PER_MM) };
}

const SEL_KEY_MAP = { section: "sectionId", column: "columnId", element: "elementId", tcol: "tcolId", r: "row", c: "col" };
const SEL_ATTR_MAP = { section: "section", column: "column", element: "element", tcol: "tcol", r: "row", c: "col" };
function selTagAttrs(type, ids) {
  return `data-action="select" data-sel-type="${type}" ${Object.entries(ids).map(([k, v]) => `data-${SEL_ATTR_MAP[k]}="${v}"`).join(" ")}`;
}
function isSelected(type, ids) {
  const s = state.selection;
  if (!s || s.type !== type) return false;
  return Object.entries(ids).every(([k, v]) => String(s[SEL_KEY_MAP[k]]) === String(v));
}

/* ===================== Progressive drill-down selection (preview pane) ===================== */
// Hovering/clicking the preview only ever acts on the current "entered" depth:
// sections are always selectable; a section's columns become selectable once that
// section is entered; a column's elements become selectable once that column is entered.
function findAncestorByType(node, types) {
  let cur = node;
  while (cur && cur !== document.body) {
    if (cur.classList && cur.classList.contains("selectable") && types.includes(cur.dataset.selType)) return cur;
    cur = cur.parentElement;
  }
  return null;
}
function effectiveSelectableFromEvent(e) {
  const sectionEl = findAncestorByType(e.target, ["section", "header", "footer"]);
  if (!sectionEl) return null;
  const sectionId = sectionEl.dataset.section;
  if (state.drill.sectionId !== sectionId) return sectionEl;
  const columnEl = findAncestorByType(e.target, ["column"]);
  if (!columnEl) return sectionEl;
  if (state.drill.columnId !== columnEl.dataset.column) return columnEl;
  const deepEl = findAncestorByType(e.target, ["element", "tableColumn", "staticCell"]);
  return deepEl || columnEl;
}
function selFromDataset(d) {
  const sel = { type: d.selType };
  if (d.section) sel.sectionId = d.section;
  if (d.column) sel.columnId = d.column;
  if (d.element) sel.elementId = d.element;
  if (d.tcol) sel.tcolId = d.tcol;
  if (d.row != null) sel.row = Number(d.row);
  if (d.col != null) sel.col = Number(d.col);
  return sel;
}
function applySelection(sel) {
  state.selection = sel;
  state.pendingTableType = null;
  state.tableTypeOpen = null;
  state.pendingTableContent = null;
  state.tableContentOpen = null;
  if (sel.type === "page") state.drill = { sectionId: null, columnId: null };
  else if (sel.type === "section" || sel.type === "header" || sel.type === "footer") state.drill = { sectionId: sel.sectionId, columnId: null };
  else if (sel.type === "column") state.drill = { sectionId: sel.sectionId, columnId: sel.columnId };
  else if (sel.sectionId) state.drill = { sectionId: sel.sectionId, columnId: sel.columnId || state.drill.columnId };
  state.mode = "properties";
  renderAll();
}

function selectionActionBar(kind, ids, canMoveUp, canMoveDown) {
  const attrs = Object.entries(ids).map(([k, v]) => `data-${k}="${v}"`).join(" ");
  return `<div class="sel-action-bar">
    <button type="button" class="sab-btn" title="Move Up" data-action="move-${kind}" data-dir="-1" ${attrs} ${canMoveUp ? "" : "disabled"}>&#9650;</button>
    <button type="button" class="sab-btn" title="Move Down" data-action="move-${kind}" data-dir="1" ${attrs} ${canMoveDown ? "" : "disabled"}>&#9660;</button>
    <span class="sab-divider"></span>
    <button type="button" class="sab-btn" title="Duplicate" data-action="duplicate-${kind}" ${attrs}>&#10064;</button>
    <button type="button" class="sab-btn sab-danger" title="Delete" data-action="delete-${kind}" ${attrs}>&#128465;</button>
  </div>`;
}
function moveArrayItem(arr, index, dir) {
  const target = index + dir;
  if (index < 0 || target < 0 || target >= arr.length) return;
  [arr[index], arr[target]] = [arr[target], arr[index]];
}
function cloneElementWithNewIds(el) {
  const copy = deepClone(el);
  copy.id = uid("el");
  if (copy.columns) copy.columns.forEach((c) => (c.id = uid("tc")));
  return copy;
}
function cloneColumnWithNewIds(col) {
  const copy = deepClone(col);
  copy.id = uid("col");
  copy.elements = copy.elements.map((el) => cloneElementWithNewIds(el));
  return copy;
}
function cloneSectionWithNewIds(sec) {
  const copy = deepClone(sec);
  copy.id = uid("sec");
  copy.columns = copy.columns.map((col) => cloneColumnWithNewIds(col));
  return copy;
}

function renderElementHtml(el, sel, sectionId, columnId, index, total) {
  const selected = isSelected("element", { section: sectionId, column: columnId, element: el.id });
  const attrs = selTagAttrs("element", { section: sectionId, column: columnId, element: el.id });
  const actionBar = selected ? selectionActionBar("element", { section: sectionId, column: columnId, element: el.id }, index > 0, index < total - 1) : "";
  const wrap = (inner, tag = "div") => `<${tag} class="selectable col-el ${selected ? "is-selected" : ""}" ${attrs}><span class="sel-tag">${elementLabel(el)}</span>${actionBar}${inner}</${tag}>`;
  const font = el.font || state.template.page.typography.font;
  const size = el.size || state.template.page.typography.size;
  const color = el.color || state.template.page.typography.color;
  const lh = el.lineHeight || state.template.page.typography.lineHeight;
  const style = (extra = "") => `font-family:'${font}';${size ? `font-size:${size}px;` : ""}${color ? `color:${color};` : ""}${lh ? `line-height:${lh};` : ""}text-align:${el.align || "left"};${el.bold ? "font-weight:700;" : ""}${el.italic ? "font-style:italic;" : ""}${el.underline ? "text-decoration:underline;" : ""}${el.strike ? "text-decoration:line-through;" : ""}${extra}`;

  if (el.type === "title") return wrap(`<h3 class="el-title" style="${style()}">${resolvePlaceholders(escapeHtml(el.text), state.showSampleValues)}</h3>`);
  if (el.type === "text") return wrap(`<div class="el-text" style="${style()}">${resolvePlaceholders(el.html, state.showSampleValues)}</div>`);
  if (el.type === "field") {
    const valueStyle = buildTypographyStyle(el);
    const labelStyle = buildTypographyStyle(el.labelStyle || {});
    const layout = el.layout || "spaceBetween";
    const layoutClass = layout === "inline" ? "layout-inline" : layout === "stacked" ? "layout-stacked" : "layout-space-between";
    const align = el.align || "left";
    const justify = align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";
    const layoutStyle = layout === "inline" ? `gap:${el.gap ?? 8}px;justify-content:${justify};` : layout === "stacked" ? `text-align:${align};` : "";
    const labelAlignStyle = layout === "spaceBetween" ? `text-align:${el.labelAlign || "left"};` : "";
    return wrap(`<div class="el-field ${layoutClass}" style="${layoutStyle}">${el.label ? `<span class="fld-label" style="${labelStyle}${labelAlignStyle}">${escapeHtml(el.label)}</span>` : ""}<span class="fld-value" style="${valueStyle}">${resolvePlaceholders(el.placeholder, state.showSampleValues)}</span></div>`);
  }
  if (el.type === "pageNumber") return wrap(`<div style="${style()}">${resolvePlaceholders(el.customFormat, state.showSampleValues)}</div>`);
  if (el.type === "divider") return wrap(`<hr class="el-divider" style="border-top-width:${el.thickness}px;border-top-style:${el.style || "solid"};border-top-color:${el.color};"/>`);
  if (el.type === "spacer") return wrap(`<div class="el-spacer" style="height:${el.height}px;"></div>`);
  if (el.type === "signature") return wrap(`<div class="el-signature"><div class="sig-line"></div><div class="muted-sm">${escapeHtml(el.label)}</div></div>`);
  if (el.type === "image" || el.type === "logo") return wrap(`<div class="${el.type === "logo" ? "el-logo" : "el-image"}" style="height:${el.height}px;">${el.src ? `<img src="${el.src}"/>` : (el.type === "logo" ? "Logo" : "Image")}</div>`);
  if (el.type === "dynamicTable") return wrap(renderDynamicTableHtml(el, sectionId, columnId), "div");
  if (el.type === "staticTable") return wrap(renderStaticTableHtml(el, sectionId, columnId), "div");
  return wrap("");
}

function renderDynamicTableHtml(el, sectionId, columnId) {
  const rows = el.sampleRows;
  const layoutStyle = (c) => `width:${c.width}%;text-align:${c.align || "left"};padding:${el.cellPadding}px;`;
  const headRow = `<tr>${el.columns.map((c) => `<th style="${layoutStyle(c)}${buildTypographyStyle(el.headerStyle || {})}">${escapeHtml(c.label)}</th>`).join("")}</tr>`;
  const bodyRows = rows.map((r) => `<tr>${el.columns.map((c) => `<td style="${layoutStyle(c)}${buildTypographyStyle(el.valueStyle || {})}">${resolvePlaceholders(r[c.field] ?? `<span class="placeholder-pill">${c.field}</span>`, state.showSampleValues)}</td>`).join("")}</tr>`).join("");
  return `<table class="doc-table tbl-${el.style}" style="border-radius:${el.cornerRadius}px;overflow:hidden;">${headRow}${bodyRows}</table>`;
}

function renderStaticTableHtml(el, sectionId, columnId) {
  let rowsHtml = "";
  for (let r = 0; r < el.rows; r++) {
    rowsHtml += "<tr>";
    for (let c = 0; c < el.cols; c++) {
      const cell = el.cells[`${r}_${c}`] || { contentType: "static", value: "" };
      const selected = isSelected("staticCell", { section: sectionId, column: columnId, element: el.id, r, c });
      const val = cell.contentType === "placeholder" ? resolvePlaceholders(cell.placeholder, state.showSampleValues) : (escapeHtml(cell.value || "").includes("%") || (cell.value || "").includes("{{") ? resolvePlaceholders(cell.value, state.showSampleValues) : escapeHtml(cell.value || ""));
      const cellStyle = `width:${el.colWidths[c]}%;text-align:${cell.align || "left"};${cell.bgColor ? `background:${cell.bgColor};` : ""}${buildTypographyStyle(cell)}`;
      rowsHtml += `<td class="selectable cell-select ${selected ? "is-selected" : ""}" ${selTagAttrs("staticCell", { section: sectionId, column: columnId, element: el.id, r, c })} style="${cellStyle}">
        <span class="sel-tag">R${r + 1}C${c + 1}</span>${val}</td>`;
    }
    rowsHtml += "</tr>";
  }
  return `<table class="doc-table tbl-${el.style}" style="border-radius:${el.cornerRadius}px;overflow:hidden;">${rowsHtml}</table>`;
}

function renderColumnHtml(col, sectionId, index, total) {
  const selected = isSelected("column", { section: sectionId, column: col.id });
  const attrs = selTagAttrs("column", { section: sectionId, column: col.id });
  const bg = col.bg && col.bg.color ? `background:${col.bg.color};` : "";
  const border = col.border && col.border.enabled ? `border:${col.border.width}px solid ${col.border.color};border-radius:${col.border.radius}px;` : "";
  const style = `flex:${col.width} 0 0%;text-align:${col.hAlign || "left"};justify-content:${col.valign === "middle" ? "center" : col.valign === "bottom" ? "flex-end" : "flex-start"};padding:${col.padding.t}px ${col.padding.r}px ${col.padding.b}px ${col.padding.l}px;margin:${col.margin.t}px ${col.margin.r}px ${col.margin.b}px ${col.margin.l}px;${bg}${border}`;
  const inner = col.elements.length
    ? col.elements.map((el, i) => renderElementHtml(el, state.selection, sectionId, col.id, i, col.elements.length)).join("")
    : `<div class="dropzone-empty" data-dropzone="column" data-section="${sectionId}" data-column="${col.id}">Drag &amp; Drop Components Here</div>`;
  const actionBar = selected ? selectionActionBar("column", { section: sectionId, column: col.id }, index > 0, index < total - 1) : "";
  return `<div class="selectable sec-col ${selected ? "is-selected" : ""}" ${attrs} style="${style}" data-dropzone-col="${sectionId}:${col.id}">
    <span class="sel-tag">Column</span>
    ${actionBar}
    <div class="col-inner" style="gap:${col.rowGap ?? 0}px;">${inner}</div>
  </div>`;
}

function extendBleedStyle(insetLeft, insetRight) {
  // Cancels the content-box padding AND the page margin on left/right so the section's
  // background/border bleeds all the way to the page edge, re-applying padding to keep content aligned.
  return `margin-left:-${insetLeft}px;margin-right:-${insetRight}px;width:calc(100% + ${insetLeft + insetRight}px);padding-left:${insetLeft}px;padding-right:${insetRight}px;box-sizing:border-box;`;
}
function renderSectionHtml(sec, sectionId, kind, index, total) {
  if (sec.isSpacer) return renderSpacerSectionHtml(sec, sectionId, index, total);
  const selType = kind || "section";
  const selected = isSelected(selType, { section: sectionId });
  const attrs = selTagAttrs(selType, { section: sectionId });
  const bg = sec.bg && sec.bg.color ? `background:${sec.bg.color};` : "";
  const border = sec.border && sec.border.enabled ? `border:${sec.border.width}px solid ${sec.border.color};` : "";
  let style = `border-radius:${sec.cornerRadius || 0}px;margin:${sec.margin.t}px ${sec.margin.r}px ${sec.margin.b}px ${sec.margin.l}px;padding:${sec.padding.t}px ${sec.padding.r}px ${sec.padding.b}px ${sec.padding.l}px;${bg}${border}`;
  if (sec.bg && sec.bg.extend) {
    const pg = state.template.page;
    style += extendBleedStyle(pg.contentInset + pg.margin.l, pg.contentInset + pg.margin.r);
  }
  const label = kind === "header" ? "Header" : kind === "footer" ? "Footer" : sectionIndexLabel(sectionId);
  const valign = `align-items:${sec.valign === "middle" ? "center" : sec.valign === "bottom" ? "flex-end" : "flex-start"};`;
  const actionBar = !kind && selected ? selectionActionBar("section", { section: sectionId }, index > 0, index < total - 1) : "";
  return `<div class="selectable ${kind ? "doc-" + kind : "doc-section"} ${selected ? "is-selected" : ""}" ${attrs} style="${style}">
    <span class="sel-tag">${label}</span>
    ${actionBar}
    <div class="sec-columns" style="${valign}">${sec.columns.map((c, i) => renderColumnHtml(c, sectionId, i, sec.columns.length)).join("")}</div>
  </div>`;
}
function renderSpacerSectionHtml(sec, sectionId, index, total) {
  const selected = isSelected("section", { section: sectionId });
  const attrs = selTagAttrs("section", { section: sectionId });
  const actionBar = selected ? selectionActionBar("section", { section: sectionId }, index > 0, index < total - 1) : "";
  return `<div class="selectable doc-spacer ${selected ? "is-selected" : ""}" ${attrs} style="height:${sec.spacerHeight || 24}px;">
    <span class="sel-tag">Spacer</span>
    ${actionBar}
  </div>`;
}

function renderPreview() {
  const t = state.template;
  const p = t.page;
  const dims = pageDims();
  const outerStyle = `width:${dims.w}px;min-height:${dims.h}px;padding:${p.margin.t}px ${p.margin.r}px ${p.margin.b}px ${p.margin.l}px;background:${p.background.color || "#fff"};${p.pageBorder.enabled ? `border:${p.pageBorder.width}px solid ${p.pageBorder.color};border-radius:${p.cornerRadius}px;` : ""}`;
  const contentStyle = `padding:${p.contentInset}px;border-radius:${p.cornerRadius}px;background:#fff;${p.sectionBorder.enabled ? `border:${p.sectionBorder.width}px solid ${p.sectionBorder.color};` : ""}`;
  const bgImageLayerStyle = p.background.image
    ? `background-image:url('${p.background.image}');background-size:${p.background.fit === "tile" ? "auto" : p.background.fit === "fit" ? "contain" : "cover"};background-repeat:${p.background.fit === "tile" ? "repeat" : "no-repeat"};background-position:center;opacity:${(p.background.opacity ?? 100) / 100};border-radius:${p.cornerRadius}px;`
    : "display:none;";

  const headerHtml = p.includeHeader ? (() => {
    const variant = t.header.activeVariant;
    const sec = t.header.variants[variant];
    const styleClass = `hdr-style-${t.header.style}`;
    return `<div class="${styleClass}">${renderSectionHtml(sec, "header", "header")}</div>`;
  })() : "";
  const footerHtml = p.includeFooter ? (() => {
    const variant = t.footer.activeVariant;
    const sec = t.footer.variants[variant];
    const styleClass = `hdr-style-${t.footer.style}`;
    return `<div class="${styleClass}">${renderSectionHtml(sec, "footer", "footer")}</div>`;
  })() : "";

  const sectionsHtml = t.sections.map((s, i) => `
    ${sectionDropzoneHtml(i)}
    ${renderSectionHtml(s, s.id, undefined, i, t.sections.length)}
  `).join("") + sectionDropzoneHtml(t.sections.length);

  return `
  <div class="page-outer-wrap">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;color:var(--muted);font-size:11.5px;">
      <span>Template Preview &middot; ${p.paperSize} &middot; ${p.orientation}</span>
    </div>
    <div class="page-outer" id="page-outer" style="${outerStyle}">
      <div class="margin-hl-overlay" id="hl-margin" style="border-width:${p.margin.t}px ${p.margin.r}px ${p.margin.b}px ${p.margin.l}px;"></div>
      <div class="content-box" id="content-box" style="${contentStyle}">
        <div class="bg-image-layer" style="${bgImageLayerStyle}"></div>
        <div class="inset-hl-overlay" id="hl-inset" style="border-width:${p.contentInset}px;"></div>
        ${headerHtml}
        <div class="doc-sections">${sectionsHtml}</div>
        ${footerHtml}
      </div>
    </div>
  </div>
  ${renderAnnexurePreview(outerStyle, contentStyle)}`;
}
function renderAnnexurePreview(outerStyle, contentStyle) {
  const a = state.template.annexure;
  if (!a || !a.enabled) return "";
  const body = a.mode === "document"
    ? (a.document && a.document.src
        ? `<div class="annexure-doc-preview"><span class="annexure-doc-icon">\u{1F4C4}</span><span class="annexure-doc-name">${escapeHtml(a.document.name || "Uploaded document")}</span></div>`
        : `<div class="annexure-doc-empty muted">No document uploaded yet. Go to Page &rarr; Annexure to upload a file.</div>`)
    : `<div class="el-text">${resolvePlaceholders(a.content, state.showSampleValues)}</div>`;
  return `
  <div class="page-outer-wrap annexure-page-wrap">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;color:var(--muted);font-size:11.5px;">
      <span>Annexure</span>
    </div>
    <div class="page-outer" style="${outerStyle}">
      <div class="content-box" style="${contentStyle}">${body}</div>
    </div>
  </div>`;
}
function sectionDropzoneHtml(idx) {
  return `<div class="section-dropzone" data-dropzone="section" data-index="${idx}">
    <div class="sd-controls">
      <button type="button" class="sd-pill" title="Add Section" data-action="add-empty-section" data-index="${idx}"><span class="sd-pill-ic">+</span>Add Section</button>
      <button type="button" class="sd-pill" title="Add Spacer" data-action="add-spacer" data-index="${idx}"><span class="sd-pill-ic">&#8597;</span>Add Spacer</button>
      <button type="button" class="sd-pill" title="Add Separator" data-action="add-separator" data-index="${idx}"><span class="sd-pill-ic">&#8213;</span>Add Separator</button>
    </div>
  </div>`;
}

function renderPreviewInPlace() {
  const pane = document.querySelector(".preview-pane");
  if (pane) pane.innerHTML = renderPreview();
}

/* ===================== Module section presets ===================== */
function buildModuleSection(id) {
  if (id === "line-item-table") return makeSectionShape([100], [[makeElement("dynamicTable")]]);
  if (id === "payment-details-table") return makeSectionShape([100], [[makeElement("staticTable")]]);
  if (id === "bill-ship-to") return makeSectionShape([50, 50], [
    [makeElement("field", { label: "Bill To", placeholder: "%Customer_Displayname%" })],
    [makeElement("field", { label: "Ship To", placeholder: "%Ship_To_Address%" })],
  ]);
  return makeSectionShape([100], [[]]);
}

/* ===================== Structural mutation helpers ===================== */
function insertElementIntoColumn(sectionId, columnId, element) {
  mutate(() => { findColumn(sectionId, columnId).elements.push(element); });
  applySelection({ type: "element", sectionId, columnId, elementId: element.id });
}
function insertSectionAt(index, section) {
  mutate(() => { state.template.sections.splice(index, 0, section); });
  applySelection({ type: "section", sectionId: section.id });
}
function setColumnCount(prefix, sectionId, count) {
  mutate(() => {
    const sec = getNested(state.template, prefix);
    const preset = SECTION_PRESETS.find((p) => p.widths.length === count) || { widths: Array(count).fill(Math.round(100 / count)) };
    sec.columns = preset.widths.map((w, i) => (sec.columns[i] ? { ...sec.columns[i], width: w } : makeColumn(w)));
  });
  const type = sectionId === "header" ? "header" : sectionId === "footer" ? "footer" : "section";
  applySelection({ type, sectionId });
}

/* ===================== Event wiring ===================== */
function fieldFromId(id) { return allModuleFields().find((f) => f.id === id); }

function handleGenericValueChange(inputEl, fullRender) {
  const path = inputEl.dataset.path;
  if (!path) return false;
  let value = inputEl.value;
  if (inputEl.dataset.parse === "number") value = value === "" ? "" : Number(value);
  mutate(() => setNested(state.template, path, value));
  if (fullRender) renderAll(); else renderPreviewInPlace();
  return true;
}

document.addEventListener("input", (e) => {
  if (e.target.id === "name-input") { state.template.name = e.target.value; return; }
  const el = e.target.closest("[data-path]");
  if (el) { handleGenericValueChange(el, false); return; }
  if (e.target.matches("[data-action='field-search']")) { state.fieldSearch = e.target.value; /* re-render list only */ document.querySelector(".side-panel").innerHTML = renderSidePanel(); const inp = document.querySelector("[data-action='field-search']"); if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); } }
});

document.addEventListener("change", (e) => {
  const el = e.target.closest("[data-path]");
  if (el) { handleGenericValueChange(el, true); return; }
  const wInput = e.target.closest("[data-width-list]");
  if (wInput) {
    const listPath = wInput.dataset.widthList;
    const idx = Number(wInput.dataset.widthIndex);
    const key = wInput.dataset.widthKey;
    mutate(() => {
      const list = getNested(state.template, listPath);
      if (!Array.isArray(list)) return;
      const othersTotal = list.reduce((s, item, i) => (i === idx ? s : s + Number(key ? item[key] : item) || s), 0);
      let v = Number(wInput.value);
      if (isNaN(v)) v = 0;
      v = Math.max(0, Math.min(100 - othersTotal, v));
      if (key) list[idx][key] = v; else list[idx] = v;
    });
    renderAll();
    return;
  }
  if (e.target.matches("[data-upload-bg]")) {
    const path = e.target.dataset.uploadBg;
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { mutate(() => setNested(state.template, path, reader.result)); renderAll(); };
    reader.readAsDataURL(file);
    return;
  }
  if (e.target.matches("[data-upload-doc]")) {
    const path = e.target.dataset.uploadDoc;
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { mutate(() => { setNested(state.template, `${path}.name`, file.name); setNested(state.template, `${path}.src`, reader.result); }); renderAll(); };
    reader.readAsDataURL(file);
    return;
  }
});

document.addEventListener("click", (e) => {
  const closest = (sel) => e.target.closest(sel);

  if (e.target.dataset.backdropDismiss === "true") { state.confirmDialog = null; renderAll(); return; }
  if (e.target.dataset.backdropDismiss === "field-picker") { closeFieldPickerModal(); return; }

  if (closest("[data-toggle-path]")) {
    const path = closest("[data-toggle-path]").dataset.togglePath;
    mutate(() => setNested(state.template, path, !getNested(state.template, path)));
    renderAll();
    return;
  }
  if (closest("[data-action='clear-annexure-doc']")) {
    mutate(() => { state.template.annexure.document = { name: "", src: "" }; });
    renderAll();
    return;
  }
  if (closest("[data-set-path]")) {
    const t = closest("[data-set-path]");
    mutate(() => setNested(state.template, t.dataset.setPath, t.dataset.setValue));
    renderAll();
    return;
  }
  if (closest("[data-action='clear-bg-image']")) {
    const path = closest("[data-action='clear-bg-image']").dataset.path;
    mutate(() => setNested(state.template, path, ""));
    renderAll();
    return;
  }

  if (closest("[data-action='switch-mode']")) {
    state.mode = closest("[data-action='switch-mode']").dataset.mode;
    renderAll();
    return;
  }
  if (closest("[data-action='switch-insert-tab']")) {
    state.insertTab = closest("[data-action='switch-insert-tab']").dataset.tab;
    renderAll();
    return;
  }
  if (closest("[data-action='toggle-unused-only']")) {
    state.showUnusedOnly = closest("[data-action='toggle-unused-only']").checked;
    renderAll();
    return;
  }

  if (closest("[data-action='toggle-rename']")) {
    state.editingName = !state.editingName;
    renderAll();
    if (state.editingName) { const inp = document.getElementById("name-input"); if (inp) { inp.focus(); inp.select(); } }
    return;
  }
  if (closest("[data-action='undo']")) { undo(); return; }
  if (closest("[data-action='redo']")) { redo(); return; }
  if (closest("[data-action='save-template']")) { saveToStorage(); toast("Template saved."); return; }
  if (closest("[data-action='toggle-more']")) { state.moreMenuOpen = !state.moreMenuOpen; renderAll(); return; }
  if (closest("[data-action='more-reset-default']")) {
    state.moreMenuOpen = false;
    try { localStorage.removeItem(LS_KEY); } catch (err) { /* ignore */ }
    state.template = buildDefaultTemplate();
    state.selection = { type: "page" };
    history = []; historyIndex = -1; commitHistory();
    renderAll();
    toast("Template reset to default.");
    return;
  }
  if (closest("[data-action='more-duplicate']")) { state.moreMenuOpen = false; toast("Template duplicated (demo)."); renderAll(); return; }
  if (closest("[data-action='more-export']")) { state.moreMenuOpen = false; toast("Export as PDF is not available in this prototype."); renderAll(); return; }
  if (closest("[data-action='close-editor']")) { toast("This would return you to the templates list."); return; }
  if (closest("[data-action='demo-reset']")) {
    try { localStorage.removeItem(LS_KEY); } catch (err) { /* ignore */ }
    state.template = buildDefaultTemplate();
    state.selection = { type: "page" };
    history = []; historyIndex = -1; commitHistory();
    renderAll();
    toast("Demo template reset.");
    return;
  }
  if (closest("[data-action='toggle-sample']")) { state.showSampleValues = !state.showSampleValues; renderAll(); return; }

  if (closest("[data-action='reset-formatting']")) {
    const btn = closest("[data-action='reset-formatting']");
    const path = btn.dataset.resetPath;
    let defaults = {};
    try { defaults = JSON.parse(btn.dataset.resetDefaults || "{}"); } catch (e) { defaults = {}; }
    mutate(() => {
      const obj = getNested(state.template, path);
      if (obj) Object.assign(obj, defaults);
    });
    renderAll();
    return;
  }

  // Header/footer style change (with confirmation if style differs)
  if (closest("[data-action='request-style-change']")) {
    const d = closest("[data-action='request-style-change']").dataset;
    const hf = state.template[d.kind];
    if (hf.style === d.style) return;
    state.confirmDialog = {
      title: "Change header style?",
      body: "Changing the style will remove the customizations you've made to the current style.",
      onConfirm: () => { mutate(() => { hf.style = d.style; }); renderAll(); },
    };
    renderAll();
    return;
  }
  if (closest("[data-action='confirm-ok']")) {
    const fn = state.confirmDialog && state.confirmDialog.onConfirm;
    state.confirmDialog = null;
    if (fn) fn(); else renderAll();
    return;
  }
  if (closest("[data-action='confirm-cancel']")) { state.confirmDialog = null; renderAll(); return; }

  if (closest("[data-action='set-hf-variant']")) {
    const d = closest("[data-action='set-hf-variant']").dataset;
    mutate(() => { state.template[d.kind].activeVariant = d.variant; });
    renderAll();
    return;
  }
  if (closest("[data-action='set-column-count']")) {
    const d = closest("[data-action='set-column-count']").dataset;
    setColumnCount(d.prefix, d.section, Number(d.count));
    return;
  }

  if (closest("[data-action='add-empty-section']")) {
    const idx = Number(closest("[data-action='add-empty-section']").dataset.index);
    insertSectionAt(idx, makeSectionShape([100], [[]]));
    return;
  }
  if (closest("[data-action='add-spacer']")) {
    const idx = Number(closest("[data-action='add-spacer']").dataset.index);
    insertSectionAt(idx, makeSpacerSection());
    return;
  }
  if (closest("[data-action='add-separator']")) {
    const idx = Number(closest("[data-action='add-separator']").dataset.index);
    insertSectionAt(idx, makeSectionShape([100], [[makeElement("divider")]]));
    return;
  }
  if (closest("[data-action='deselect']")) { applySelection({ type: "page" }); return; }
  if (closest("[data-action='delete-section']")) {
    const d = closest("[data-action='delete-section']").dataset;
    mutate(() => { state.template.sections = state.template.sections.filter((s) => s.id !== d.section); });
    state.selection = { type: "page" };
    renderAll();
    return;
  }
  if (closest("[data-action='delete-column']")) {
    const d = closest("[data-action='delete-column']").dataset;
    mutate(() => { const sec = findSection(d.section); if (sec.columns.length > 1) sec.columns = sec.columns.filter((c) => c.id !== d.column); else toast("A section needs at least one column."); });
    state.selection = { type: "section", sectionId: d.section };
    renderAll();
    return;
  }
  if (closest("[data-action='delete-element']")) {
    const d = closest("[data-action='delete-element']").dataset;
    mutate(() => { const col = findColumn(d.section, d.column); col.elements = col.elements.filter((el) => el.id !== d.element); });
    state.selection = { type: "column", sectionId: d.section, columnId: d.column };
    renderAll();
    return;
  }
  if (closest("[data-action='duplicate-element']")) {
    const d = closest("[data-action='duplicate-element']").dataset;
    mutate(() => {
      const col = findColumn(d.section, d.column);
      const idx = col.elements.findIndex((el) => el.id === d.element);
      const copy = deepClone(col.elements[idx]);
      copy.id = uid("el");
      if (copy.columns) copy.columns.forEach((c) => (c.id = uid("tc")));
      col.elements.splice(idx + 1, 0, copy);
    });
    renderAll();
    return;
  }
  if (closest("[data-action='duplicate-column']")) {
    const d = closest("[data-action='duplicate-column']").dataset;
    mutate(() => {
      const sec = findSection(d.section);
      const idx = sec.columns.findIndex((c) => c.id === d.column);
      sec.columns.splice(idx + 1, 0, cloneColumnWithNewIds(sec.columns[idx]));
    });
    renderAll();
    return;
  }
  if (closest("[data-action='duplicate-section']")) {
    const d = closest("[data-action='duplicate-section']").dataset;
    mutate(() => {
      const arr = state.template.sections;
      const idx = arr.findIndex((s) => s.id === d.section);
      arr.splice(idx + 1, 0, cloneSectionWithNewIds(arr[idx]));
    });
    renderAll();
    return;
  }
  if (closest("[data-action='move-element']")) {
    const d = closest("[data-action='move-element']").dataset;
    mutate(() => {
      const col = findColumn(d.section, d.column);
      moveArrayItem(col.elements, col.elements.findIndex((el) => el.id === d.element), Number(d.dir));
    });
    renderAll();
    return;
  }
  if (closest("[data-action='move-column']")) {
    const d = closest("[data-action='move-column']").dataset;
    mutate(() => {
      const sec = findSection(d.section);
      moveArrayItem(sec.columns, sec.columns.findIndex((c) => c.id === d.column), Number(d.dir));
    });
    renderAll();
    return;
  }
  if (closest("[data-action='move-section']")) {
    const d = closest("[data-action='move-section']").dataset;
    mutate(() => {
      const arr = state.template.sections;
      moveArrayItem(arr, arr.findIndex((s) => s.id === d.section), Number(d.dir));
    });
    renderAll();
    return;
  }

  if (closest("[data-action='table-type-change']")) {
    const d = closest("[data-action='table-type-change']").dataset;
    state.tableTypeOpen = d.element;
    renderAll();
    return;
  }
  if (closest("[data-action='table-type-select']")) {
    const d = closest("[data-action='table-type-select']").dataset;
    const el = findElement(d.section, d.column, d.element);
    state.pendingTableType = d.type === el.type ? null : { elementId: d.element, type: d.type };
    renderAll();
    return;
  }
  if (closest("[data-action='table-type-cancel']")) { state.pendingTableType = null; state.tableTypeOpen = null; renderAll(); return; }
  if (closest("[data-action='table-type-confirm']")) {
    const d = closest("[data-action='table-type-confirm']").dataset;
    const pending = state.pendingTableType;
    mutate(() => {
      const col = findColumn(d.section, d.column);
      const idx = col.elements.findIndex((el) => el.id === d.element);
      const el = col.elements[idx];
      if (pending && pending.type !== el.type) {
        const replacement = makeElement(pending.type, { id: d.element, typeConfirmed: true });
        if (pending.type === "dynamicTable") replacement.contentConfirmed = false;
        col.elements[idx] = replacement;
      } else {
        el.typeConfirmed = true;
      }
    });
    state.pendingTableType = null;
    state.tableTypeOpen = null;
    renderAll();
    return;
  }
  if (closest("[data-action='table-content-change']")) {
    const d = closest("[data-action='table-content-change']").dataset;
    state.tableContentOpen = d.element;
    renderAll();
    return;
  }
  if (closest("[data-action='table-content-select']")) {
    const d = closest("[data-action='table-content-select']").dataset;
    const el = findElement(d.section, d.column, d.element);
    state.pendingTableContent = d.preset === el.preset ? null : { elementId: d.element, presetId: d.preset };
    renderAll();
    return;
  }
  if (closest("[data-action='table-content-cancel']")) { state.pendingTableContent = null; state.tableContentOpen = null; renderAll(); return; }
  if (closest("[data-action='table-content-confirm']")) {
    const d = closest("[data-action='table-content-confirm']").dataset;
    const pending = state.pendingTableContent;
    mutate(() => {
      const el = findElement(d.section, d.column, d.element);
      if (pending && pending.presetId !== el.preset) applyDynamicPreset(el, pending.presetId);
      el.contentConfirmed = true;
    });
    state.pendingTableContent = null;
    state.tableContentOpen = null;
    renderAll();
    return;
  }
  if (closest("[data-action='add-table-column']")) {
    const d = closest("[data-action='add-table-column']").dataset;
    mutate(() => {
      const el = findElement(d.section, d.column, d.element);
      el.columns.push({ id: uid("tc"), label: "New Column", field: allModuleFields()[0].placeholder, width: 10, align: "left" });
    });
    renderAll();
    return;
  }
  if (closest("[data-action='delete-table-column']")) {
    const d = closest("[data-action='delete-table-column']").dataset;
    mutate(() => { const el = findElement(d.section, d.column, d.element); if (el.columns.length > 1) el.columns = el.columns.filter((c) => c.id !== d.tcol); });
    state.selection = { type: "element", sectionId: d.section, columnId: d.column, elementId: d.element };
    renderAll();
    return;
  }
  if (closest("[data-action='static-add-row']") || closest("[data-action='static-remove-row']") || closest("[data-action='static-add-col']") || closest("[data-action='static-remove-col']")) {
    const btn = closest("[data-action='static-add-row']") || closest("[data-action='static-remove-row']") || closest("[data-action='static-add-col']") || closest("[data-action='static-remove-col']");
    const d = btn.dataset; const action = btn.dataset.action;
    mutate(() => {
      const el = findElement(d.section, d.column, d.element);
      if (!el.columnDefaults) el.columnDefaults = [];
      if (action === "static-add-row") {
        const newRowIdx = el.rows;
        el.rows = Math.min(20, el.rows + 1);
        for (let c = 0; c < el.cols; c++) {
          const def = el.columnDefaults[c] || { contentType: "static", placeholder: "", value: "" };
          el.cells[`${newRowIdx}_${c}`] = def.contentType === "placeholder"
            ? { contentType: "placeholder", placeholder: def.placeholder || "" }
            : { contentType: "static", value: def.value || "" };
        }
      }
      if (action === "static-remove-row") el.rows = Math.max(1, el.rows - 1);
      if (action === "static-add-col") {
        const newColIdx = el.cols;
        el.cols = Math.min(10, el.cols + 1);
        el.colWidths = Array(el.cols).fill(Math.round(100 / el.cols));
        while (el.columnDefaults.length < el.cols) el.columnDefaults.push({ contentType: "static", placeholder: "", value: "" });
        for (let r = 0; r < el.rows; r++) {
          if (!el.cells[`${r}_${newColIdx}`]) el.cells[`${r}_${newColIdx}`] = { contentType: "static", value: "" };
        }
      }
      if (action === "static-remove-col") {
        el.cols = Math.max(1, el.cols - 1);
        el.colWidths = el.colWidths.slice(0, el.cols);
        el.columnDefaults = el.columnDefaults.slice(0, el.cols);
      }
    });
    renderAll();
    return;
  }
  if (closest("[data-action='set-col-default-type']")) {
    const d = closest("[data-action='set-col-default-type']").dataset;
    mutate(() => {
      const el = findElement(d.section, d.column, d.element);
      if (!el.columnDefaults) el.columnDefaults = [];
      const i = Number(d.index);
      const cur = el.columnDefaults[i] || { contentType: "static", placeholder: "", value: "" };
      el.columnDefaults[i] = { ...cur, contentType: d.type };
    });
    renderAll();
    return;
  }

  if (closest("[data-action='open-field-picker']")) {
    state.fieldPickerTarget = closest("[data-action='open-field-picker']").dataset.target;
    renderFieldPickerModal();
    return;
  }
  if (closest("[data-action='field-picker-close']")) { closeFieldPickerModal(); return; }
  if (closest("[data-action='field-picker-insert']")) {
    const ph = closest("[data-action='field-picker-insert']").dataset.placeholder;
    mutate(() => { const cur = getNested(state.template, state.fieldPickerTarget) || ""; setNested(state.template, state.fieldPickerTarget, `${cur} ${ph}`.trim()); });
    closeFieldPickerModal();
    renderAll();
    return;
  }

  if (closest("[data-action='select-breadcrumb']")) {
    try { applySelection(JSON.parse(closest("[data-action='select-breadcrumb']").dataset.sel)); } catch (err) { /* ignore */ }
    return;
  }

  // Selection fallback (checked last, so more specific actions above -- delete/duplicate/etc --
  // always win even though they live inside a selectable ancestor). Inside the preview, clicks
  // are gated by the current drill-down depth: sections are always selectable; columns/elements
  // only become selectable once their parent is entered.
  const selBtn = closest("[data-action='select']");
  if (selBtn) {
    let node = selBtn;
    if (closest(".preview-pane")) {
      const eff = effectiveSelectableFromEvent(e);
      if (eff) node = eff;
    }
    applySelection(selFromDataset(node.dataset));
    return;
  }

  // Clicking on empty preview canvas (not on any selectable section/column/element) clears selection.
  if (closest(".preview-pane") && state.selection.type !== "page") { applySelection({ type: "page" }); return; }
});

/* ===================== Simple field-picker modal (Insert Placeholder) ===================== */
function renderFieldPickerModal() {
  let host = document.getElementById("field-picker-modal");
  if (!host) { host = document.createElement("div"); host.id = "field-picker-modal"; document.body.appendChild(host); }
  host.innerHTML = `<div class="confirm-modal-backdrop" data-backdrop-dismiss="field-picker">
    <div class="confirm-modal" style="width:320px;max-height:70vh;overflow:auto;">
      <h3>Insert Placeholder</h3>
      ${MODULE_FIELD_GROUPS.map((g) => `<p class="field-group-title" style="padding-left:0;">${g.group}</p>${g.fields.map((f) => `<div class="field-row" style="padding:6px 0;cursor:pointer;" data-action="field-picker-insert" data-placeholder="${f.placeholder}"><span class="field-name">${f.label}</span><span class="muted" style="font-size:10.5px;">${f.placeholder}</span></div>`).join("")}`).join("")}
      <div class="modal-actions" style="margin-top:10px;"><button class="btn btn-outline-dark" style="background:#fff;color:var(--text);border-color:var(--border-strong);" data-action="field-picker-close">Close</button></div>
    </div>
  </div>`;
}
function closeFieldPickerModal() { const host = document.getElementById("field-picker-modal"); if (host) host.innerHTML = ""; }

/* ===================== Drag & drop ===================== */
// dataTransfer.getData() is unreliable to read during dragover in most browsers, so the active
// drag "kind" is tracked in a plain variable (set on dragstart, cleared on dragend) to gate which
// dropzones may highlight/accept the drag (module fields/components -> columns only; section
// presets/module sections -> section gaps only).
let dragKind = null;
// Tracked alongside dragKind (dataTransfer isn't reliably readable during dragover) so the
// Divider component can additionally target the section-gap dropzones (see below).
let dragComponentType = null;
document.addEventListener("dragstart", (e) => {
  const comp = e.target.closest("[data-drag-component]");
  const fld = e.target.closest("[data-drag-field]");
  const secPreset = e.target.closest("[data-drag-section-preset]");
  const modSection = e.target.closest("[data-drag-module-section]");
  if (comp) { dragKind = "component"; dragComponentType = comp.dataset.dragComponent; e.dataTransfer.setData("text/plain", JSON.stringify({ kind: "component", value: comp.dataset.dragComponent })); }
  else if (fld) { dragKind = "field"; e.dataTransfer.setData("text/plain", JSON.stringify({ kind: "field", value: fld.dataset.dragField })); }
  else if (secPreset) { dragKind = "sectionPreset"; e.dataTransfer.setData("text/plain", JSON.stringify({ kind: "sectionPreset", value: secPreset.dataset.dragSectionPreset })); }
  else if (modSection) { dragKind = "moduleSection"; e.dataTransfer.setData("text/plain", JSON.stringify({ kind: "moduleSection", value: modSection.dataset.dragModuleSection })); }
});
document.addEventListener("dragend", () => { dragKind = null; dragComponentType = null; });

// Row/column reorder lists (e.g. static table's Rows & Columns) use their own drag session,
// tracked separately from `dragKind` above so it doesn't interfere with the insert-panel drags.
let reorderDrag = null;
document.addEventListener("dragstart", (e) => {
  const row = e.target.closest("[data-reorder-group]");
  if (!row) return;
  reorderDrag = { group: row.dataset.reorderGroup, fromIndex: Number(row.dataset.reorderIndex), section: row.dataset.reorderSection, column: row.dataset.reorderColumn, element: row.dataset.reorderElement };
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", "reorder");
});
document.addEventListener("dragover", (e) => {
  if (!reorderDrag) return;
  const row = e.target.closest(`.col-list-row[data-reorder-group="${reorderDrag.group}"]`);
  if (row) { e.preventDefault(); row.classList.add("reorder-over"); }
});
document.addEventListener("dragleave", (e) => {
  const row = e.target.closest(".col-list-row[data-reorder-group]");
  if (row) row.classList.remove("reorder-over");
});
document.addEventListener("drop", (e) => {
  if (!reorderDrag) return;
  const row = e.target.closest(`.col-list-row[data-reorder-group="${reorderDrag.group}"]`);
  if (!row) return;
  e.preventDefault();
  const { group, fromIndex, section, column, element } = reorderDrag;
  const toIndex = Number(row.dataset.reorderIndex);
  if (toIndex !== fromIndex) {
    mutate(() => {
      if (group === "section-cols") {
        const sec = findSection(section);
        const order = computeReorder(sec.columns.length, fromIndex, toIndex);
        sec.columns = order.map((oi) => sec.columns[oi]);
        return;
      }
      const el = findElement(section, column, element);
      if (group === "static-cols") reorderStaticColumns(el, fromIndex, toIndex);
      else if (group === "static-rows") reorderStaticRows(el, fromIndex, toIndex);
    });
    renderAll();
  }
});
document.addEventListener("dragend", () => {
  reorderDrag = null;
  document.querySelectorAll(".reorder-over").forEach((n) => n.classList.remove("reorder-over"));
});

document.addEventListener("dragover", (e) => {
  // Divider can target either a column (dropped into an existing/new column) or a
  // section gap (dropped as its own new section), so both zone types are checked.
  const isDividerDrag = dragKind === "component" && dragComponentType === "divider";
  const isColumnDrag = dragKind === "component" || dragKind === "field";
  const isSectionDrag = dragKind === "sectionPreset" || dragKind === "moduleSection" || isDividerDrag;
  let zone = isColumnDrag ? e.target.closest(".dropzone-empty, [data-dropzone-col]") : null;
  if (!zone && isSectionDrag) zone = e.target.closest("[data-dropzone='section']");
  if (zone) { e.preventDefault(); zone.classList.add("drag-over"); }
});
document.addEventListener("dragleave", (e) => {
  const zone = e.target.closest(".dropzone-empty, [data-dropzone-col], [data-dropzone='section']");
  if (zone) zone.classList.remove("drag-over");
});
document.addEventListener("drop", (e) => {
  const raw = e.dataTransfer.getData("text/plain");
  if (!raw) return;
  let payload;
  try { payload = JSON.parse(raw); } catch (err) { return; }

  const emptyZone = e.target.closest(".dropzone-empty");
  const colZone = e.target.closest("[data-dropzone-col]");
  const sectionZone = e.target.closest("[data-dropzone='section']");

  if ((emptyZone || colZone) && (payload.kind === "component" || payload.kind === "field")) {
    e.preventDefault();
    let sectionId, columnId;
    if (emptyZone) { sectionId = emptyZone.dataset.section; columnId = emptyZone.dataset.column; }
    else { [sectionId, columnId] = colZone.dataset.dropzoneCol.split(":"); }
    let newEl;
    if (payload.kind === "component") newEl = makeElement(payload.value);
    else {
      const f = fieldFromId(payload.value);
      if (!f) return;
      newEl = f.el === "pageNumber" ? makeElement("pageNumber") : f.el === "logo" ? makeElement("logo") : makeElement("field", { label: f.label, placeholder: f.placeholder });
    }
    insertElementIntoColumn(sectionId, columnId, newEl);
    return;
  }
  if (sectionZone && (payload.kind === "sectionPreset" || payload.kind === "moduleSection")) {
    e.preventDefault();
    const idx = Number(sectionZone.dataset.index);
    const newSec = payload.kind === "sectionPreset" ? makeSectionShape(SECTION_PRESETS.find((p) => p.id === payload.value).widths) : buildModuleSection(payload.value);
    insertSectionAt(idx, newSec);
    return;
  }
  if (sectionZone && payload.kind === "component" && payload.value === "divider") {
    e.preventDefault();
    const idx = Number(sectionZone.dataset.index);
    insertSectionAt(idx, makeSectionShape([100], [[makeElement("divider")]]));
    return;
  }
});

/* ===================== Hover-to-highlight (Page Settings) ===================== */
document.addEventListener("mouseover", (e) => {
  const zone = e.target.closest("[data-hover-hl]");
  if (!zone) return;
  const kind = zone.dataset.hoverHl;
  if (kind === "margin") document.getElementById("hl-margin")?.classList.add("show");
  if (kind === "inset") document.getElementById("hl-inset")?.classList.add("show");
  if (kind === "pageBorder" || kind === "sectionBorder" || kind === "background" || kind === "radius") document.getElementById("content-box")?.classList.add("bg-hl-flash");
});
document.addEventListener("mouseout", (e) => {
  const zone = e.target.closest("[data-hover-hl]");
  if (!zone) return;
  document.getElementById("hl-margin")?.classList.remove("show");
  document.getElementById("hl-inset")?.classList.remove("show");
  document.getElementById("content-box")?.classList.remove("bg-hl-flash");
});

/* ===================== Progressive hover highlighting (preview pane) ===================== */
// Mirrors the drill-down click behavior: only the "effective" selectable node at the current
// drill depth gets the hover outline (section, then its columns once entered, then elements).
let hoverEffectiveEl = null;
function clearHoverEffective() {
  if (hoverEffectiveEl) { hoverEffectiveEl.classList.remove("hover-effective"); hoverEffectiveEl = null; }
}
document.addEventListener("mouseover", (e) => {
  if (!e.target.closest(".preview-pane")) return;
  const eff = effectiveSelectableFromEvent(e);
  if (eff === hoverEffectiveEl) return;
  clearHoverEffective();
  hoverEffectiveEl = eff;
  if (hoverEffectiveEl) hoverEffectiveEl.classList.add("hover-effective");
});
document.addEventListener("mouseout", (e) => {
  if (!e.target.closest(".preview-pane")) return;
  const related = e.relatedTarget;
  if (related && related.closest && related.closest(".preview-pane")) return;
  clearHoverEffective();
});

document.addEventListener("keydown", (e) => {
  if (e.target.id === "name-input" && (e.key === "Enter" || e.key === "Escape")) {
    state.editingName = false;
    scheduleHistory();
    renderAll();
  }
});
document.addEventListener("blur", (e) => {
  if (e.target.id === "name-input" && state.editingName) { state.editingName = false; scheduleHistory(); renderAll(); }
}, true);

/* ===================== Init ===================== */
function init() {
  const restored = loadFromStorage();
  if (!restored) state.template = buildDefaultTemplate();
  history = []; historyIndex = -1; commitHistory();
  renderAll();
}
init();


