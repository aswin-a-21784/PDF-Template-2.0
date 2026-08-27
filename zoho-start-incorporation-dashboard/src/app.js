// Zoho Start — Incorporation Dashboard prototype
// Flow: name_reservation -> payment -> dashboard. Once on the dashboard,
// `currentStage` drives the incorporation lifecycle: name_review ->
// name_approved -> details_incomplete -> ready_for_filing -> submitted ->
// incorporated.

const STAGE_ORDER = [
  "name_review",
  "name_approved",
  "details_incomplete",
  "ready_for_filing",
  "signing",
  "submitted",
  "under_review",
  "changes_requested",
  "incorporated",
];

const COMPANY = {
  registrationState: "Tamil Nadu",
  namePref1: "A S Aquarium",
  namePref2: "A S Seaworld",
  businessDesc: "We develop mobile apps for small businesses.",
  mobile: "",
  email: "",
  reservationFee: "\u20B91,000",
  serviceFee: "\u20B90",
  filingFee: "\u20B96,499",
};

const REG_STATES = ["Tamil Nadu", "Karnataka", "Maharashtra", "Delhi"];

/* ===================== Incorporation ("Complete Details") data model ===================== */

const NATIONALITIES = ["Indian", "American", "British", "Canadian", "Australian", "Singaporean", "Other"];
const OCCUPATION_TYPES = ["Business", "Service", "Professional", "Homemaker", "Student", "Others"];
const EDU_QUALIFICATIONS = ["Under Graduate", "Graduate", "Post Graduate", "Doctorate", "Other"];
const OCCUPATION_AREAS = ["IT / Software", "Trading", "Manufacturing", "Consulting", "Healthcare", "Other"];
const DESIGNATIONS = ["Managing Director", "Whole-time Director", "Director", "Additional Director"];

function makeMember() {
  return {
    type: "individual",
    hasDin: null,
    din: "",
    name: "",
    designation: "",
    email: "",
    phone: "",
    otherCompany: null,
    otherCompanies: [{ cin: "", legalName: "" }],
    dsc: null,
    firstName: "",
    lastName: "",
    fatherFirstName: "",
    fatherLastName: "",
    dob: "",
    pob: "",
    nationality: "Indian",
    occupationType: "",
    occupationTypeOther: "",
    educationalQualification: "",
    areaOfOccupation: "",
    addrLine1: "",
    addrLine2: "",
    addrCity: "",
    addrState: "",
    addrCountry: "India",
    addrPin: "",
    presentSameAsPermanent: "yes",
    presentLine1: "",
    presentLine2: "",
    presentDurationYears: "",
    presentDurationMonths: "",
    ownershipPercent: 0,
    activeCompanyTab: "details",
    company: { cin: "", legalName: "", line1: "", line2: "", city: "", state: "", country: "India", pin: "", phone: "", email: "", dsc: null },
    representative: { din: "", name: "", dsc: null },
  };
}

// Seed data so the Members screen mirrors the reference design on first view.
// Step order: 1 Business Details, 2 Members, 3 Share Capital, 4 Documents, 5 Payment, 6 Summary.
let incorporation = {
  step: 1,
  activeGroup: "both",
  groupCounts: { both: 3, owners: 1, directors: 0 },
  members: {
    both: [makeMember(), makeMember(), makeMember()],
    owners: [makeMember()],
    directors: [],
  },
  companyType: "private", // private | opc | section8
  office: { sameAsCommAddress: "yes", ownership: "rented", line1: "", line2: "", city: "", state: COMPANY.registrationState, country: "India", pin: "" },
  business: { desc: COMPANY.businessDesc },
  shareCapital: { authorizedCapital: 100000, shareValue: 10, subscribedCapital: 50000 },
  documents: {},
  payment: { addOns: { gst: false }, method: "upi" },
  declarationAccepted: false,
  summaryCollapsed: {},
};
incorporation.members.both[0].hasDin = "yes";
incorporation.members.both[0].otherCompany = "yes";
incorporation.members.both[0].dsc = "yes";
incorporation.members.both[1].hasDin = "no";
incorporation.members.both[1].otherCompany = "no";
incorporation.members.both[1].dsc = "yes";
incorporation.members.both[2].hasDin = "no";
incorporation.members.both[2].otherCompany = "no";
incorporation.members.both[2].dsc = "yes";
incorporation.members.owners[0].type = "company";

function companyDisplayName() {
  return `${COMPANY.namePref1} Pvt. Ltd.`;
}

// Base activity history, oldest first. Later stages append more entries.
const BASE_ACTIVITY = [
  { text: "Name reservation payment received \u2014 \u20B91,000 paid", date: "10 Aug 2026" },
  { text: "Name reservation submitted to MCA", date: "10 Aug 2026" },
  { text: "Application status updated \u2014 Under MCA review", date: "10 Aug 2026" },
];

const STAGE_ACTIVITY = {
  name_approved: { text: "Company name approved by MCA", date: "10 Aug 2026" },
  details_incomplete: { text: "Incorporation details started", date: "10 Aug 2026" },
  ready_for_filing: { text: "Incorporation information, documents and payment completed", date: "11 Aug 2026" },
  signing: { text: "Incorporation documents prepared \u2014 awaiting signatures", date: "11 Aug 2026" },
  submitted: { text: "Incorporation application submitted to MCA", date: "12 Aug 2026" },
  under_review: { text: "Application picked up for MCA review", date: "12 Aug 2026" },
  changes_requested: { text: "MCA requested changes \u2014 resubmission needed", date: "13 Aug 2026" },
  incorporated: { text: "Company incorporated \u2014 CIN issued", date: "14 Aug 2026" },
};

const STAGE_CONFIG = {
  name_review: {
    badge: { text: "Name reservation under review", tone: "info" },
    status: {
      tone: "info",
      title: "No action needed right now",
      message:
        "Your proposed company name is being reviewed by MCA. We'll notify you when there's an update.",
    },
  },
  name_approved: {
    badge: { text: "Name approved", tone: "success" },
    status: {
      tone: "success",
      title: "Your company name is approved \uD83C\uDF89",
      message: "Complete your incorporation details to continue.",
      cta: { label: "Continue incorporation \u2192", action: "start-incorporation-wizard" },
    },
  },
  details_incomplete: {
    badge: { text: "Incorporation in progress", tone: "info" },
    status: {
      tone: "warning",
      title: "Complete your incorporation details",
      message: "You have saved progress. Pick up right where you left off.",
      cta: { label: "Resume incorporation details", next: "ready_for_filing" },
    },
  },
  ready_for_filing: {
    badge: { text: "Ready for final review", tone: "info" },
    status: {
      tone: "info",
      title: "Review & pay",
      message: "Your incorporation details are ready. Review everything and pay the final MCA filing amount to submit.",
      extra: `Final filing amount: ${COMPANY.filingFee}`,
      cta: { label: `Review & Pay ${COMPANY.filingFee}`, next: "signing" },
    },
  },
  signing: {
    badge: { text: "Action required", tone: "warning" },
    status: {
      tone: "warning",
      title: "Sign & upload documents",
      message: "Your incorporation documents are ready. The required signatories need to digitally sign them before we can submit your application to MCA.",
      cta: { label: "Sign & Upload Documents \u2192", action: "goto-view", view: "signing" },
    },
  },
  submitted: {
    badge: { text: "Submitted to MCA", tone: "info" },
    status: {
      tone: "info",
      title: "Application submitted",
      message: "Your incorporation application has been filed with MCA. This typically takes a few business days.",
      cta: { label: "Simulate: MCA picks up review (demo)", next: "under_review" },
    },
  },
  under_review: {
    badge: { text: "MCA review", tone: "info" },
    status: {
      tone: "info",
      title: "Your application is under MCA review",
      message: "MCA is reviewing your incorporation application. We'll notify you as soon as there's an update.",
      cta: { label: "Simulate: Approved (demo)", next: "incorporated" },
    },
  },
  changes_requested: {
    badge: { text: "Changes required", tone: "warning" },
    status: {
      tone: "warning",
      title: "Action required",
      message: "MCA has requested changes to your incorporation application. We've highlighted what needs to be updated.",
      cta: { label: "Review MCA remarks \u2192", action: "goto-view", view: "resubmission" },
    },
  },
  incorporated: {
    badge: { text: "Incorporated", tone: "success" },
    status: {
      tone: "success",
      title: "Company incorporated \uD83C\uDF89",
      message: `Congratulations! ${companyDisplayName()} is officially incorporated.`,
      cta: { label: "Download certificate", next: null },
    },
  },
};

const VIEW_HASHES = {
  name_reservation: "#reservation",
  payment: "#payment",
  dashboard: "#dashboard",
  incorporation: "#incorporation",
  ready: "#ready",
  signing: "#signing",
  resubmission: "#resubmission",
};

function viewFromHash() {
  const hash = window.location.hash;
  return Object.keys(VIEW_HASHES).find((view) => VIEW_HASHES[view] === hash) || "name_reservation";
}

let currentView = viewFromHash(); // "name_reservation" | "payment" | "dashboard"
let currentStage = "name_review";

function stageIndex(stage) {
  return STAGE_ORDER.indexOf(stage);
}

/* ===================== Wizard shell (Name reservation / Payment) ===================== */

function renderWizardTopbar(activeStep) {
  const step1Done = activeStep > 1;
  return `
    <header class="wizard-topbar">
      <div class="wizard-topbar-brand">
        <span aria-hidden="true">&#9650;</span>
        <span>Start</span>
      </div>
      <div class="wizard-stepper" aria-label="Incorporation steps">
        <div class="step-item ${step1Done ? "is-done" : activeStep === 1 ? "is-active" : "is-upcoming"}">
          <span class="step-circle ${step1Done ? "is-done" : "is-active"}">${step1Done ? "\u2713" : "1"}</span>
          <span class="step-label">Name reservation</span>
        </div>
        <span class="step-connector"></span>
        <div class="step-item ${activeStep === 2 ? "is-active" : "is-upcoming"}">
          <span class="step-circle ${activeStep === 2 ? "is-active" : "is-upcoming"}">2</span>
          <span class="step-label">Payment</span>
        </div>
      </div>
      <div class="wizard-topbar-right">
        <button class="wizard-skip-link" data-action="skip-to-dashboard" title="Demo shortcut: skip straight to the dashboard">Skip to dashboard (demo) \u2192</button>
        <span class="avatar" aria-label="Aswin A S">AA</span>
      </div>
    </header>`;
}

function renderNameReservationView() {
  return `
    <div class="wizard-shell">
      ${renderWizardTopbar(1)}
      <div class="wizard-page">
        <div class="wizard-container">
          <button class="wizard-close" data-action="close-wizard" aria-label="Close" style="position:absolute; top:0; right:0;">&times;</button>

          <p class="wizard-eyebrow"><span aria-hidden="true">&#128274;</span> Private Limited</p>
          <h1 class="wizard-title">Reserve your company name</h1>
          <p class="wizard-subtitle">Choose a name for your company and tell us a little about what you'll do. We'll take care of the name reservation process with MCA.</p>

          <p class="section-label">Company name</p>
          <div class="form-row">
            <div>
              <label class="field-label" for="name-pref-1">Company name preference 1 <span class="req">*</span></label>
              <div class="field-input-wrap">
                <input class="field-input" id="name-pref-1" type="text" value="${COMPANY.namePref1}" />
                <span class="field-suffix">Pvt.Ltd</span>
              </div>
              <div class="field-error" id="name-pref-1-error"></div>
            </div>
            <div>
              <label class="field-label" for="name-pref-2">Company name preference 2 <span class="opt">(Optional)</span></label>
              <div class="field-input-wrap">
                <input class="field-input" id="name-pref-2" type="text" value="${COMPANY.namePref2}" />
                <span class="field-suffix">Pvt.Ltd</span>
              </div>
            </div>
          </div>
          <div class="field-loading"><span class="spinner" aria-hidden="true"></span> Checking Name Availability</div>

          <hr class="form-divider" />

          <p class="section-label">Company details</p>
          <div class="form-card">
            <label class="field-label" for="business-desc">What will your company do? <span class="req">*</span></label>
            <textarea class="field-textarea" id="business-desc" placeholder="e.g. We develop mobile apps for small businesses.">${COMPANY.businessDesc}</textarea>
            <div class="field-error" id="business-desc-error"></div>

            <div class="field-block">
              <label class="field-label" for="nic-code">Business activity / NIC code <span aria-hidden="true">\u24D8</span></label>
              <div class="nic-row">
                <select class="field-select" id="nic-code" disabled>
                  <option>Select NIC Code</option>
                </select>
                <label class="checkbox-row">
                  <input type="checkbox" id="nic-unsure" checked />
                  I'm not sure which NIC code to choose
                </label>
              </div>
              <div class="info-box" id="nic-info-box">
                <span aria-hidden="true">\u24D8</span>
                You can skip this for now. Our team will identify the appropriate NIC code based on your business activity.
              </div>
            </div>

            <div class="field-block">
              <label class="field-label" for="reg-state">State of Registration <span class="req">*</span></label>
              <select class="field-select" id="reg-state">
                ${REG_STATES.map((s) => `<option ${s === COMPANY.registrationState ? "selected" : ""}>${s}</option>`).join("")}
              </select>
            </div>
          </div>

          <hr class="form-divider" />

          <p class="section-label">Contact details</p>
          <p class="contact-intro">We'll use these details to contact you about your name reservation and incorporation.</p>
          <div class="form-row">
            <div>
              <label class="field-label" for="mobile-number">Mobile Number <span class="req">*</span></label>
              <div class="phone-input-wrap">
                <select class="phone-code" aria-label="Country code">
                  <option>+91</option>
                </select>
                <input class="field-input" id="mobile-number" type="tel" placeholder="Mobile Number" value="${COMPANY.mobile}" style="padding-right:12px;" />
              </div>
              <div class="field-error" id="mobile-number-error"></div>
            </div>
            <div>
              <label class="field-label" for="email-id">Email ID <span class="req">*</span></label>
              <input class="field-input" id="email-id" type="email" placeholder="Enter Email ID" value="${COMPANY.email}" style="padding-right:12px;" />
              <div class="field-error" id="email-id-error"></div>
            </div>
          </div>

          <div class="wizard-actions">
            <button class="btn btn-primary btn-arrow" data-action="proceed-reservation">Proceed</button>
          </div>
        </div>
      </div>
    </div>`;
}

function renderPaymentView() {
  return `
    <div class="wizard-shell">
      ${renderWizardTopbar(2)}
      <div class="wizard-page">
        <div class="wizard-container wizard-container-wide">
          <button class="wizard-close" data-action="close-wizard" aria-label="Close" style="position:absolute; top:0; right:0;">&times;</button>

          <h1 class="wizard-title">Make Your Payment</h1>
          <p class="wizard-subtitle">Pay the MCA name reservation fee to submit your proposed company name for approval.</p>

          <div class="payment-grid">
            <div class="pay-card">
              <p class="section-label">What you're paying for</p>
              <ul class="paying-for-list">
                <li><span class="paying-for-check">\u2713</span> Name availability review</li>
                <li><span class="paying-for-check">\u2713</span> Proposed company name reservation</li>
              </ul>
              <hr class="form-divider" style="margin: 16px 0;" />
              <p class="section-label">Your name reservation</p>
              <dl>
                <div class="name-pref-row"><dt>Name preference 1:</dt><dd>${COMPANY.namePref1}</dd></div>
                <div class="name-pref-row"><dt>Name preference 2:</dt><dd>${COMPANY.namePref2}</dd></div>
              </dl>
            </div>

            <div class="summary-card-dark">
              <h4>Summary</h4>
              <p class="summary-loc">\uD83D\uDCCD Registration State: <strong>${COMPANY.registrationState}</strong></p>
              <div class="summary-row"><span>MCA name reservation fee</span><span>${COMPANY.reservationFee}</span></div>
              <div class="summary-row"><span>Service fee for reservation</span><span>${COMPANY.serviceFee}</span></div>
              <hr class="summary-divider" />
              <div class="summary-total"><span>Total Payable</span><span class="summary-total-value">${COMPANY.reservationFee}</span></div>
            </div>
          </div>

          <div class="after-pay-card">
            <p class="section-label">What happens after you pay?</p>
            <ul class="after-pay-list">
              <li><span class="after-pay-num">1</span> We submit your proposed name to MCA for approval.</li>
              <li><span class="after-pay-num">2</span> Once your name is approved, complete the remaining incorporation details through the Zoho Start portal.</li>
              <li><span class="after-pay-num">3</span> Pay the applicable final filing and government charges before submission.</li>
              <li><span class="after-pay-num">4</span> We prepare and submit your incorporation application and keep you updated.</li>
            </ul>
          </div>

          <div class="wizard-actions is-split">
            <button class="btn btn-secondary btn-arrow-left" data-action="back-to-reservation">Back</button>
            <button class="btn btn-primary btn-arrow" data-action="pay-now">Pay ${COMPANY.reservationFee}</button>
          </div>
        </div>
      </div>
    </div>`;
}

/* ===================== Incorporation wizard (Members / Company details / Documents / Review) ===================== */

function infoIcon(text) {
  return `<span class="info-icon" tabindex="0" aria-label="Help">\u24D8<span class="info-tooltip">${text}</span></span>`;
}

function radioYesNo(field, value, name, conditional, attr) {
  const a = attr || "mfield";
  const cond = conditional ? ' data-conditional="true"' : "";
  return `
    <div class="radio-pair">
      <label><input type="radio" name="${name}" data-${a}="${field}"${cond} value="yes" ${value === "yes" ? "checked" : ""} /> Yes</label>
      <label><input type="radio" name="${name}" data-${a}="${field}"${cond} value="no" ${value === "no" ? "checked" : ""} /> No</label>
    </div>`;
}

function mname(field, group, index) {
  return `${field}-${group}-${index}`;
}

function renderIncorpTopbar(activeStep) {
  const steps = [
    { n: 1, label: "Business Details" },
    { n: 2, label: "Members" },
    { n: 3, label: "Share Capital" },
    { n: 4, label: "Documents" },
    { n: 5, label: "Payment" },
    { n: 6, label: "Summary" },
  ];
  return `
    <header class="wizard-topbar wizard-topbar-grid">
      <div class="wizard-topbar-brand">
        <span aria-hidden="true">&#9650;</span>
        <span>Start</span>
      </div>
      <div class="wizard-stepper wizard-stepper-multi" aria-label="Incorporation steps">
        ${steps
          .map((s, i) => {
            const state = s.n < activeStep ? "is-done" : s.n === activeStep ? "is-active" : "is-upcoming";
            const circle = s.n < activeStep ? "\u2713" : s.n;
            const connector = i < steps.length - 1 ? `<span class="step-connector"></span>` : "";
            return `
            <div class="step-item ${state}">
              <span class="step-circle ${state}">${circle}</span>
              <span class="step-label">${s.label}</span>
            </div>${connector}`;
          })
          .join("")}
      </div>
      <div class="wizard-topbar-right">
        <span class="avatar" aria-label="Aswin A S">AA</span>
      </div>
    </header>`;
}

/* ---------- Step 2: Members ---------- */

function renderMemberGroupTabs() {
  const groups = [
    { key: "both", label: "Both Owner & Director" },
    { key: "owners", label: "Only Owners" },
    { key: "directors", label: "Only Director" },
  ];
  return `
    <div class="member-tabs" role="tablist">
      ${groups
        .map(
          (g) => `
        <button type="button" class="member-tab ${incorporation.activeGroup === g.key ? "is-active" : ""}" data-action="switch-member-group" data-group="${g.key}" role="tab">
          ${g.label} <span class="member-tab-count">${String(incorporation.groupCounts[g.key]).padStart(2, "0")}</span>
        </button>`
        )
        .join("")}
    </div>`;
}

function renderMemberCountSelector() {
  const group = incorporation.activeGroup;
  const label = group === "owners" ? "Number of Owners" : group === "directors" ? "Number of Directors" : "Number of Owner Cum Directors";
  const count = incorporation.groupCounts[group];
  const options = Array.from({ length: 11 }, (_, n) => n)
    .map((n) => `<option value="${n}" ${n === count ? "selected" : ""}>${n}</option>`)
    .join("");
  return `
    <div class="member-count-row">
      <span class="member-count-icon" aria-hidden="true">\uD83D\uDC64</span>
      <span class="member-count-label">${label}</span>
      <select class="field-select member-count-select" id="member-count-select" data-group="${group}">${options}</select>
    </div>`;
}

function renderOtherCompanyFieldset(member, group, index) {
  const blocks = member.otherCompanies
    .map(
      (oc, i) => `
    <div class="other-company-block">
      <p class="other-company-title">Company ${i + 1}</p>
      <div class="form-row">
        <div>
          <label class="field-label">CIN / LLPIN / Other Registration Number <span class="req">*</span> ${infoIcon("Enter the company's CIN, LLPIN or other MCA registration number.")}</label>
          <div class="prefill-row">
            <input class="field-input" type="text" placeholder="Enter CIN Name" data-mfield="otherCompanies.${i}.cin" value="${oc.cin}" />
            <button type="button" class="prefill-link" data-action="prefill" data-message="Company details prefilled from MCA records (demo).">Prefill Details</button>
          </div>
        </div>
        <div>
          <label class="field-label">Company Legal Name <span class="req">*</span></label>
          <input class="field-input" type="text" data-mfield="otherCompanies.${i}.legalName" value="${oc.legalName}" />
        </div>
      </div>
    </div>`
    )
    .join("");
  return `${blocks}<button type="button" class="link-btn" data-action="add-other-company" data-group="${group}" data-index="${index}">+ Add Another Company</button>`;
}

function renderIndividualFields(member, group, index) {
  const nm = (f) => mname(f, group, index);
  const showDesignation = group !== "owners";
  return `
    <div class="radio-question">
      <p class="field-label">Is this member already having a DIN? <span class="req">*</span></p>
      ${radioYesNo("hasDin", member.hasDin, nm("hasDin"), true)}
    </div>

    ${
      member.hasDin === "yes"
        ? `
      <div class="form-row">
        <div>
          <label class="field-label">Director Identification Number (DIN)</label>
          <div class="prefill-row">
            <input class="field-input" type="text" placeholder="Enter DIN Name" data-mfield="din" value="${member.din}" />
            <button type="button" class="prefill-link" data-action="prefill" data-message="Member details prefilled from DIN records (demo).">Prefill Details</button>
          </div>
        </div>
        <div>
          <label class="field-label">Member Name <span class="req">*</span></label>
          <input class="field-input" type="text" data-mfield="name" value="${member.name}" />
        </div>
      </div>`
        : ""
    }

    ${
      member.hasDin === "no"
        ? `
      <p class="section-label section-label-tight">Personal Details</p>
      <div class="form-row">
        <div><label class="field-label">First Name <span class="req">*</span></label><input class="field-input" data-mfield="firstName" value="${member.firstName}" /></div>
        <div><label class="field-label">Last Name <span class="req">*</span></label><input class="field-input" data-mfield="lastName" value="${member.lastName}" /></div>
      </div>
      <div class="form-row">
        <div><label class="field-label">Father's First Name <span class="req">*</span></label><input class="field-input" data-mfield="fatherFirstName" value="${member.fatherFirstName}" /></div>
        <div><label class="field-label">Fathers Last Name <span class="req">*</span></label><input class="field-input" data-mfield="fatherLastName" value="${member.fatherLastName}" /></div>
      </div>
      <div class="form-row">
        <div><label class="field-label">Date of Birth <span class="req">*</span></label><input class="field-input" type="date" data-mfield="dob" value="${member.dob}" /></div>
        <div><label class="field-label">Place of Birth <span class="req">*</span></label><input class="field-input" data-mfield="pob" value="${member.pob}" /></div>
      </div>
      <div class="form-row form-row-single">
        <div>
          <label class="field-label">Nationality <span class="req">*</span></label>
          <select class="field-select" data-mfield="nationality">
            ${NATIONALITIES.map((n) => `<option ${n === member.nationality ? "selected" : ""}>${n}</option>`).join("")}
          </select>
        </div>
      </div>

      <p class="section-label section-label-tight">Education &amp; Occupation Details</p>
      <div class="form-row">
        <div>
          <label class="field-label">Occupation Type <span class="req">*</span></label>
          <select class="field-select" data-conditional="true" data-mfield="occupationType">
            <option value="">Select The Occupation Type</option>
            ${OCCUPATION_TYPES.map((o) => `<option ${o === member.occupationType ? "selected" : ""}>${o}</option>`).join("")}
          </select>
        </div>
        ${
          member.occupationType === "Others"
            ? `
        <div>
          <label class="field-label">Specify the Occupation Type <span class="req">*</span></label>
          <input class="field-input" data-mfield="occupationTypeOther" value="${member.occupationTypeOther}" />
        </div>`
            : ""
        }
      </div>
      <div class="form-row">
        <div>
          <label class="field-label">Educational Qualification <span class="req">*</span></label>
          <select class="field-select" data-mfield="educationalQualification">
            <option value="">Select The Educational Qualification</option>
            ${EDU_QUALIFICATIONS.map((o) => `<option ${o === member.educationalQualification ? "selected" : ""}>${o}</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="field-label">Area of Occupation <span class="req">*</span></label>
          <select class="field-select" data-mfield="areaOfOccupation">
            <option value="">Select Occupation Type</option>
            ${OCCUPATION_AREAS.map((o) => `<option ${o === member.areaOfOccupation ? "selected" : ""}>${o}</option>`).join("")}
          </select>
        </div>
      </div>

      <p class="section-label section-label-tight">Permanent Address</p>
      <div class="form-row">
        <div><label class="field-label">Line 1 <span class="req">*</span></label><input class="field-input" data-mfield="addrLine1" placeholder="Street Address 1" value="${member.addrLine1}" /></div>
        <div><label class="field-label">Line 2</label><input class="field-input" data-mfield="addrLine2" placeholder="Street Address 2" value="${member.addrLine2}" /></div>
      </div>
      <div class="form-row form-row-4">
        <div><label class="field-label">City <span class="req">*</span></label><input class="field-input" data-mfield="addrCity" placeholder="Enter City" value="${member.addrCity}" /></div>
        <div>
          <label class="field-label">State <span class="req">*</span></label>
          <select class="field-select" data-mfield="addrState">
            <option value="">State</option>
            ${REG_STATES.map((s) => `<option ${s === member.addrState ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </div>
        <div><label class="field-label">Country <span class="req">*</span></label><input class="field-input" value="${member.addrCountry}" disabled /></div>
        <div><label class="field-label">Pin Code <span class="req">*</span></label><input class="field-input" data-mfield="addrPin" placeholder="Zip Code" value="${member.addrPin}" /></div>
      </div>

      <p class="section-label section-label-tight">Present Address</p>
      <div class="radio-question">
        <p class="field-label">Is this present address is same as permanent address? <span class="req">*</span></p>
        ${radioYesNo("presentSameAsPermanent", member.presentSameAsPermanent, nm("presentSame"), true)}
      </div>
      ${
        member.presentSameAsPermanent === "no"
          ? `
      <div class="form-row">
        <div><label class="field-label">Line 1 <span class="req">*</span></label><input class="field-input" data-mfield="presentLine1" value="${member.presentLine1}" /></div>
        <div><label class="field-label">Line 2</label><input class="field-input" data-mfield="presentLine2" value="${member.presentLine2}" /></div>
      </div>`
          : ""
      }
      <div class="form-row">
        <div>
          <label class="field-label">Duration of stay at present address <span class="req">*</span></label>
          <div class="duration-row">
            <input class="field-input duration-input" type="number" min="0" placeholder="Enter Years" data-mfield="presentDurationYears" value="${member.presentDurationYears}" /><span class="duration-unit">Years</span>
            <input class="field-input duration-input" type="number" min="0" placeholder="Enter Months" data-mfield="presentDurationMonths" value="${member.presentDurationMonths}" /><span class="duration-unit">Months</span>
          </div>
        </div>
      </div>`
        : ""
    }

    ${
      showDesignation
        ? `
    <div class="field-block">
      <label class="field-label">Designation</label>
      <select class="field-select" data-mfield="designation">
        <option value="">Select Designation</option>
        ${DESIGNATIONS.map((d) => `<option ${d === member.designation ? "selected" : ""}>${d}</option>`).join("")}
      </select>
    </div>`
        : ""
    }

    <p class="section-label section-label-tight">Contact Details</p>
    <div class="form-row">
      <div>
        <label class="field-label">Member Email ID <span class="req">*</span></label>
        <input class="field-input" type="email" placeholder="Enter Email ID" data-mfield="email" value="${member.email}" />
      </div>
      ${
        member.hasDin === "no"
          ? `
      <div>
        <label class="field-label">Member Phone Number <span class="req">*</span></label>
        <div class="phone-input-wrap">
          <select class="phone-code"><option>+91</option></select>
          <input class="field-input" type="tel" data-mfield="phone" value="${member.phone}" style="padding-right:12px;" />
        </div>
      </div>`
          : ""
      }
    </div>

    <div class="radio-question">
      <p class="field-label">Is this person already a director or owner in any other company or business? <span class="req">*</span></p>
      ${radioYesNo("otherCompany", member.otherCompany, nm("otherCompany"), true)}
    </div>
    ${member.otherCompany === "yes" ? renderOtherCompanyFieldset(member, group, index) : ""}

    <div class="radio-question">
      <p class="field-label">Does this person have a Digital Signature Certificate? <span class="req">*</span> ${infoIcon("Not sure? We'll help you obtain one during incorporation.")}</p>
      ${radioYesNo("dsc", member.dsc, nm("dsc"))}
    </div>`;
}

function renderCompanyMemberFields(member, group, index) {
  const activeTab = member.activeCompanyTab || "details";
  return `
    <div class="inner-tabs" role="tablist">
      <button type="button" class="inner-tab ${activeTab === "details" ? "is-active" : ""}" data-action="switch-company-tab" data-group="${group}" data-index="${index}" data-tab="details">Company Details <span class="req">*</span></button>
      <button type="button" class="inner-tab ${activeTab === "representative" ? "is-active" : ""}" data-action="switch-company-tab" data-group="${group}" data-index="${index}" data-tab="representative">Representative Details <span class="req">*</span></button>
    </div>
    ${
      activeTab === "details"
        ? `
      <div class="form-row">
        <div>
          <label class="field-label">CIN / LLPIN / Other Registration Number <span class="req">*</span> ${infoIcon("The company's MCA registration number.")}</label>
          <div class="prefill-row">
            <input class="field-input" placeholder="Enter CIN Name" data-mfield="company.cin" value="${member.company.cin}" />
            <button type="button" class="prefill-link" data-action="prefill" data-message="Company details prefilled from MCA records (demo).">Prefill Details</button>
          </div>
        </div>
        <div><label class="field-label">Company Legal Name <span class="req">*</span></label><input class="field-input" data-mfield="company.legalName" value="${member.company.legalName}" /></div>
      </div>
      <p class="section-label section-label-tight">Address</p>
      <div class="form-row">
        <div><label class="field-label">Line 1 <span class="req">*</span></label><input class="field-input" placeholder="Street Address 1" data-mfield="company.line1" value="${member.company.line1}" /></div>
        <div><label class="field-label">Line 2</label><input class="field-input" placeholder="Street Address 2" data-mfield="company.line2" value="${member.company.line2}" /></div>
      </div>
      <div class="form-row form-row-4">
        <div><label class="field-label">City <span class="req">*</span></label><input class="field-input" placeholder="Enter City" data-mfield="company.city" value="${member.company.city}" /></div>
        <div>
          <label class="field-label">State <span class="req">*</span></label>
          <select class="field-select" data-mfield="company.state">
            <option value="">State</option>
            ${REG_STATES.map((s) => `<option ${s === member.company.state ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </div>
        <div><label class="field-label">Country <span class="req">*</span></label><input class="field-input" value="${member.company.country}" disabled /></div>
        <div><label class="field-label">Pin Code <span class="req">*</span></label><input class="field-input" placeholder="Zip Code" data-mfield="company.pin" value="${member.company.pin}" /></div>
      </div>
      <p class="section-label section-label-tight">Contact Details</p>
      <div class="form-row">
        <div>
          <label class="field-label">Company Phone Number <span class="req">*</span></label>
          <div class="phone-input-wrap">
            <select class="phone-code"><option>+91</option></select>
            <input class="field-input" type="tel" data-mfield="company.phone" value="${member.company.phone}" style="padding-right:12px;" />
          </div>
        </div>
        <div><label class="field-label">Company Email ID <span class="req">*</span></label><input class="field-input" type="email" placeholder="Enter Email ID" data-mfield="company.email" value="${member.company.email}" /></div>
      </div>
      <div class="radio-question">
        <p class="field-label">Does this person have a Digital Signature Certificate? <span class="req">*</span> ${infoIcon("Not sure? We'll help you obtain one during incorporation.")}</p>
        ${radioYesNo("company.dsc", member.company.dsc, mname("companyDsc", group, index))}
      </div>`
        : `
      <div class="info-box">Details of the person who is authorized by the company.</div>
      <div class="form-row">
        <div>
          <label class="field-label">Director Identification Number (DIN)</label>
          <div class="prefill-row">
            <input class="field-input" placeholder="Enter DIN Name" data-mfield="representative.din" value="${member.representative.din}" />
            <button type="button" class="prefill-link" data-action="prefill" data-message="Representative details prefilled from DIN records (demo).">Prefill Details</button>
          </div>
        </div>
        <div><label class="field-label">Representative Name <span class="req">*</span></label><input class="field-input" data-mfield="representative.name" value="${member.representative.name}" /></div>
      </div>
      <div class="radio-question">
        <p class="field-label">Does this person have a Digital Signature Certificate? <span class="req">*</span> ${infoIcon("Not sure? We'll help you obtain one during incorporation.")}</p>
        ${radioYesNo("representative.dsc", member.representative.dsc, mname("repDsc", group, index))}
      </div>`
    }`;
}

function renderMemberCard(member, group, index) {
  return `
    <div class="member-card" data-member-index="${index}">
      <div class="member-card-head">
        <p class="member-card-title">Member ${index + 1}</p>
        <div class="type-toggle">
          <button type="button" class="type-toggle-btn ${member.type === "individual" ? "is-active" : ""}" data-action="set-member-type" data-group="${group}" data-index="${index}" data-type="individual">Individual</button>
          <button type="button" class="type-toggle-btn ${member.type === "company" ? "is-active" : ""}" data-action="set-member-type" data-group="${group}" data-index="${index}" data-type="company">Company</button>
        </div>
      </div>
      ${member.type === "individual" ? renderIndividualFields(member, group, index) : renderCompanyMemberFields(member, group, index)}
    </div>`;
}

function renderMembersStep() {
  const group = incorporation.activeGroup;
  const members = incorporation.members[group];
  return `
    <h1 class="wizard-title">Who's building this company with you?</h1>
    <p class="wizard-subtitle">Owners hold shares. Directors run the day-to-day. Many founders are both.</p>
    ${renderMemberGroupTabs()}
    ${renderMemberCountSelector()}
    <div id="members-step">
      ${members.map((m, i) => renderMemberCard(m, group, i)).join("")}
    </div>
    <div class="wizard-actions is-split">
      <button class="btn btn-secondary btn-arrow-left" data-action="incorp-previous">Previous</button>
      <button class="btn btn-primary btn-arrow" data-action="incorp-continue">Continue</button>
    </div>`;
}

/* ---------- Step 3: Company details ---------- */

function getAllShareholders() {
  const list = [];
  ["both", "owners"].forEach((group) => {
    const label = group === "both" ? "Owner & Director" : "Owner";
    incorporation.members[group].forEach((m, i) => {
      const name = m.type === "company" ? m.company.legalName || "" : m.name || `${m.firstName} ${m.lastName}`.trim();
      list.push({ member: m, index: i, groupLabel: label, name });
    });
  });
  return list;
}

const COMPANY_TYPES = [
  { value: "private", label: "Private Limited Company" },
  { value: "opc", label: "One Person Company (OPC)" },
  { value: "section8", label: "Section 8 Company (Non-profit)" },
];

function renderBusinessDetailsStep() {
  const office = incorporation.office;
  const business = incorporation.business;

  return `
    <h1 class="wizard-title">Business details</h1>
    <p class="wizard-subtitle">Tell us about your company type and registered office. This decides exactly which documents we'll ask for later.</p>

    <div id="business-details-step">
      <div class="form-card">
        <p class="section-label">Company type</p>
        <div class="type-toggle type-toggle-3">
          ${COMPANY_TYPES.map(
            (t) => `<button type="button" class="type-toggle-btn ${incorporation.companyType === t.value ? "is-active" : ""}" data-action="set-company-type" data-value="${t.value}">${t.label}</button>`
          ).join("")}
        </div>
      </div>

      <div class="form-card">
        <p class="section-label">Business &amp; activity details</p>
        <div class="prefill-tag">Prefilled from your name reservation</div>
        <label class="field-label" for="business-desc-2">What will your company do? <span class="req">*</span></label>
        <textarea class="field-textarea" id="business-desc-2" data-bfield="desc">${business.desc}</textarea>
      </div>

      <div class="form-card">
        <p class="section-label">Registered office</p>
        <div class="radio-question">
          <p class="field-label">Is your registered office the same as your business/communication address? <span class="req">*</span></p>
          ${radioYesNo("sameAsCommAddress", office.sameAsCommAddress, "office-same", true, "ofield")}
        </div>
        ${
          office.sameAsCommAddress === "no"
            ? `
        <div class="form-row">
          <div><label class="field-label">Line 1 <span class="req">*</span></label><input class="field-input" data-ofield="line1" value="${office.line1}" /></div>
          <div><label class="field-label">Line 2</label><input class="field-input" data-ofield="line2" value="${office.line2}" /></div>
        </div>
        <div class="form-row form-row-4">
          <div><label class="field-label">City <span class="req">*</span></label><input class="field-input" data-ofield="city" value="${office.city}" /></div>
          <div>
            <label class="field-label">State <span class="req">*</span></label>
            <div class="prefill-tag">Prefilled from your name reservation</div>
            <select class="field-select" data-ofield="state">
              ${REG_STATES.map((s) => `<option ${s === office.state ? "selected" : ""}>${s}</option>`).join("")}
            </select>
          </div>
          <div><label class="field-label">Country <span class="req">*</span></label><input class="field-input" value="${office.country}" disabled /></div>
          <div><label class="field-label">PIN Code <span class="req">*</span></label><input class="field-input" data-ofield="pin" value="${office.pin}" /></div>
        </div>`
            : `<p class="contact-intro">We'll use your business/communication address as the registered office.</p>`
        }
        <div class="radio-question">
          <p class="field-label">Is this address owned by the company/promoters, or rented? <span class="req">*</span> ${infoIcon("This decides whether we ask you for a rent agreement and NOC, or an ownership document.")}</p>
          <div class="radio-pair">
            <label><input type="radio" name="office-ownership" data-ofield="ownership" value="owned" ${office.ownership === "owned" ? "checked" : ""} /> Owned</label>
            <label><input type="radio" name="office-ownership" data-ofield="ownership" value="rented" ${office.ownership === "rented" ? "checked" : ""} /> Rented</label>
          </div>
        </div>
      </div>
    </div>

    <div class="wizard-actions is-split">
      <button class="btn btn-secondary btn-arrow-left" data-action="incorp-previous">Previous</button>
      <button class="btn btn-primary btn-arrow" data-action="incorp-continue">Continue</button>
    </div>`;
}

/* ---------- Step 3: Share capital ---------- */

function renderShareCapitalStep() {
  const sc = incorporation.shareCapital;
  const shares = sc.shareValue > 0 ? Math.floor(sc.subscribedCapital / sc.shareValue) : 0;
  const holders = getAllShareholders();

  return `
    <h1 class="wizard-title">Share capital</h1>
    <p class="wizard-subtitle">Set your authorised and subscribed capital, and how ownership is split between members.</p>

    <div id="share-capital-step">
      <div class="form-card">
        <p class="section-label">Equity share capital</p>
        <div class="form-row form-row-3">
          <div><label class="field-label">Authorised Capital (\u20B9) <span class="req">*</span></label><input class="field-input" type="number" data-ofield="authorizedCapital" value="${sc.authorizedCapital}" /></div>
          <div><label class="field-label">Share Value <span class="req">*</span></label><input class="field-input" type="number" data-ofield="shareValue" value="${sc.shareValue}" /></div>
          <div><label class="field-label">Subscribed Capital (\u20B9) <span class="req">*</span> ${infoIcon("The portion of authorised capital your shareholders commit to pay for now.")}</label><input class="field-input" type="number" data-ofield="subscribedCapital" value="${sc.subscribedCapital}" /></div>
        </div>
        <p class="shares-count">Number of shares: <strong>${shares.toLocaleString("en-IN")}</strong></p>

        <p class="section-label section-label-tight">Shareholders split</p>
        <table class="split-table">
          <thead><tr><th>Member</th><th>Ownership %</th><th>No. of Shares</th><th>Total Value</th></tr></thead>
          <tbody>
            ${holders
              .map((h, i) => {
                const pct = h.member.ownershipPercent || 0;
                const holderShares = Math.round((pct / 100) * shares);
                const value = holderShares * sc.shareValue;
                return `
              <tr>
                <td>
                  <div class="split-name">${h.name || `Member ${h.index + 1}`}</div>
                  <div class="split-sub">${h.member.type === "company" ? "Company" : "Individual"} \u2014 ${h.groupLabel}</div>
                </td>
                <td><input class="split-pct-input" type="number" min="0" max="100" data-split-index="${i}" value="${pct}" /></td>
                <td>${holderShares.toLocaleString("en-IN")}</td>
                <td>\u20B9${value.toLocaleString("en-IN")}</td>
              </tr>`;
              })
              .join("")}
          </tbody>
        </table>
        <div class="info-box">
          <span aria-hidden="true">\u24D8</span>
          Only equity shares are created by default as this is standard for most companies. If you need <strong>preference shares</strong>, our team will guide you after incorporation. <a href="#">Contact Support</a>.
        </div>
      </div>
    </div>

    <div class="wizard-actions is-split">
      <button class="btn btn-secondary btn-arrow-left" data-action="incorp-previous">Previous</button>
      <button class="btn btn-primary btn-arrow" data-action="incorp-continue">Continue</button>
    </div>`;
}

/* ---------- Step 4: Documents ---------- */

function getDocState(id) {
  if (!incorporation.documents[id]) incorporation.documents[id] = { status: "required", fileName: null, size: null, errorType: null };
  return incorporation.documents[id];
}

// Builds the conditional document sections based on registered-office ownership, member DIN status,
// entity type, company type (OPC/Section 8) and nationality \u2014 mirroring the MCA/SPICe+ conditionality.
function buildDocumentModel() {
  const office = incorporation.office;
  const model = { registeredOffice: null, promoters: [], members: [], opc: null, section8: null };

  if (office.ownership === "owned") {
    model.registeredOffice = {
      intro: "Documents for your company's registered office.",
      docs: [
        { id: "office-address-proof", label: "Proof of registered office address", formats: "PDF, JPG or PNG \u00B7 Max 2 MB" },
        { id: "office-utility-bill", label: "Utility bill", formats: "PDF, JPG or PNG \u00B7 Max 2 MB" },
      ],
    };
  } else {
    model.registeredOffice = {
      intro: "You told us this address is rented. Please upload the documents that confirm you can use this address as the company's registered office.",
      docs: [
        { id: "office-rent-agreement", label: "Rent / Lease Agreement", formats: "PDF \u00B7 Max 2 MB" },
        { id: "office-utility-bill", label: "Utility Bill", formats: "PDF, JPG or PNG \u00B7 Max 2 MB" },
        {
          id: "office-noc",
          label: "No Objection Certificate (NOC)",
          formats: "PDF \u00B7 Max 2 MB",
          helper: "The NOC should be from the property owner permitting the use of the premises as the company's registered office.",
        },
      ],
    };
  }

  ["both", "owners", "directors"].forEach((group) => {
    incorporation.members[group].forEach((member, index) => {
      const key = `${group}-${index}`;
      const roleLabel = group === "owners" ? "Subscriber" : group === "directors" ? "Director" : "Subscriber cum Director";

      if (member.type === "company") {
        model.promoters.push({
          key,
          name: member.company.legalName || "Promoter company",
          docs: [
            { id: `promoter-resolution-${key}`, label: "Company resolution", formats: "PDF \u00B7 Max 5 MB" },
            { id: `promoter-coi-${key}`, label: "Certificate of incorporation", required: false, formats: "PDF \u00B7 Max 5 MB" },
            { id: `promoter-rep-id-${key}`, label: "Authorised person's identity proof", formats: "PDF, JPG \u00B7 Max 2 MB" },
            { id: `promoter-rep-address-${key}`, label: "Authorised person's residential proof", formats: "PDF, JPG \u00B7 Max 2 MB" },
          ],
        });
        return;
      }

      const name = member.name || `${member.firstName} ${member.lastName}`.trim() || `Member ${index + 1}`;
      const isForeign = member.hasDin === "no" && member.nationality && member.nationality !== "Indian";
      const entry = { key, name, role: roleLabel, hasDin: member.hasDin, isForeign, docs: [], interestDocs: [] };

      if (member.hasDin === "no" && !isForeign) {
        entry.docs.push({ id: `member-id-${key}`, label: "Proof of Identity", helper: "Required because this member does not have a DIN.", formats: "PDF, JPG \u00B7 Max 2 MB" });
        entry.docs.push({ id: `member-address-${key}`, label: "Proof of Residential Address", helper: "Required because this member does not have a DIN.", formats: "PDF, JPG \u00B7 Max 2 MB" });
      }

      if (member.otherCompany === "yes") {
        entry.interestDocs.push({
          id: `member-interest-${key}`,
          label: "Interest in other entities",
          helper: "This helps us disclose the first directors' interests as required for incorporation.",
          formats: "PDF \u00B7 Max 2 MB",
        });
      }

      model.members.push(entry);
    });
  });

  if (incorporation.companyType === "opc") {
    model.opc = {
      docs: [
        { id: "opc-nominee-consent", label: "Nominee consent", formats: "PDF \u00B7 Max 2 MB" },
        { id: "opc-nominee-id", label: "Nominee identity proof", formats: "PDF, JPG \u00B7 Max 2 MB" },
        { id: "opc-nominee-address", label: "Nominee residential proof", formats: "PDF, JPG \u00B7 Max 2 MB" },
      ],
    };
  }

  if (incorporation.companyType === "section8") {
    model.section8 = {
      docs: [
        { id: "sec8-inc14", label: "Declaration \u2013 INC-14", formats: "PDF \u00B7 Max 2 MB" },
        { id: "sec8-inc15", label: "Declaration \u2013 INC-15", formats: "PDF \u00B7 Max 2 MB" },
        { id: "sec8-projection", label: "Estimated income & expenditure for the next 3 years", formats: "PDF, XLS \u00B7 Max 2 MB" },
      ],
    };
  }

  return model;
}

function allDocsFromModel(model) {
  const all = [...model.registeredOffice.docs];
  model.promoters.forEach((p) => all.push(...p.docs));
  model.members.forEach((m) => {
    if (!m.isForeign) {
      all.push(...m.docs);
      all.push(...m.interestDocs);
    }
  });
  if (model.opc) all.push(...model.opc.docs);
  if (model.section8) all.push(...model.section8.docs);
  return all;
}

function computeDocProgress(model) {
  const all = allDocsFromModel(model);
  const required = all.filter((d) => d.required !== false);
  const uploaded = required.filter((d) => getDocState(d.id).status === "uploaded");
  return { total: required.length, uploaded: uploaded.length, missing: required.filter((d) => getDocState(d.id).status !== "uploaded") };
}

function renderUploadBox(id, formats) {
  const state = getDocState(id);
  if (state.status === "error") {
    const messages = {
      too_large: ["This file is too large.", "Upload a file smaller than 2 MB."],
      unsupported: ["This file type isn't supported.", "Upload a PDF, JPG or PNG."],
      failed: ["We couldn't upload this file.", "Please try again."],
      unreadable: ["We couldn't read this document.", "Upload a clear, complete copy."],
    };
    const [title, sub] = messages[state.errorType] || messages.failed;
    return `
      <div class="upload-box upload-box-error">
        <p class="upload-error-title">${title}</p>
        <p class="upload-error-sub">${sub}</p>
        <button type="button" class="btn btn-primary btn-sm" data-action="doc-upload" data-doc="${id}">Try again</button>
      </div>`;
  }
  if (state.status === "uploaded") {
    return `
      <div class="upload-box upload-box-filled">
        <span class="upload-file-icon" aria-hidden="true">PDF</span>
        <div class="upload-file-meta">
          <p class="upload-file-name">${state.fileName}</p>
          <p class="upload-file-size">${state.size}</p>
        </div>
        <div class="upload-box-actions">
          <button type="button" class="link-btn" data-action="doc-view" data-doc="${id}">View</button>
          <button type="button" class="link-btn" data-action="doc-replace" data-doc="${id}">Replace</button>
          <button type="button" class="link-btn link-btn-danger" data-action="doc-remove" data-doc="${id}">Remove</button>
        </div>
      </div>`;
  }
  return `
    <div class="upload-box">
      <button type="button" class="upload-box-btn" data-action="doc-upload" data-doc="${id}">
        <span class="upload-arrow" aria-hidden="true">\u2191</span> Upload document
      </button>
      <p class="upload-box-hint">${formats || "PDF, JPG or PNG \u00B7 Max 2 MB"}</p>
      <button type="button" class="upload-demo-error-link" data-action="doc-simulate-error" data-doc="${id}">Simulate an upload issue (demo)</button>
    </div>`;
}

function renderDocField(doc) {
  return `
    <div class="doc-field">
      <p class="doc-field-label">${doc.label}${doc.required === false ? ' <span class="opt">(Optional)</span>' : ' <span class="req">*</span>'}${doc.helper ? infoIcon(doc.helper) : ""}</p>
      ${renderUploadBox(doc.id, doc.formats)}
    </div>`;
}

function renderMemberDocCard(m) {
  if (m.isForeign) {
    return `
      <div class="member-doc-card">
        <p class="member-doc-name">${m.name}</p>
        <p class="member-doc-role">${m.role}</p>
        <div class="foreign-support-card">
          <p class="foreign-support-title">Foreign participant detected</p>
          <p class="foreign-support-text">We currently support incorporation with Indian participants through this flow. Our incorporation team can help you with the additional documents and verification required for foreign participants.</p>
          <button type="button" class="btn btn-secondary btn-sm" data-action="contact-support">Contact Support</button>
        </div>
      </div>`;
  }
  const noDocsNeeded = m.hasDin === "yes";
  return `
    <div class="member-doc-card">
      <p class="member-doc-name">${m.name}</p>
      <p class="member-doc-role">${m.role}${m.hasDin === "yes" ? " \u00B7 DIN available" : ""}</p>
      ${
        noDocsNeeded
          ? `<p class="doc-not-needed">\u2713 No additional identity documents required</p>`
          : `<div class="doc-field-grid">${m.docs.map(renderDocField).join("")}</div>`
      }
      ${m.interestDocs.length ? `<div class="doc-field-grid doc-field-grid-interest">${m.interestDocs.map(renderDocField).join("")}</div>` : ""}
    </div>`;
}

function renderDocumentsStep() {
  const model = buildDocumentModel();
  const progress = computeDocProgress(model);
  const pct = progress.total ? Math.round((progress.uploaded / progress.total) * 100) : 100;

  return `
    <h1 class="wizard-title">Upload your documents</h1>
    <p class="wizard-subtitle">Upload the documents we need to prepare and file your incorporation application.</p>

    <div class="doc-progress-row">
      <span class="doc-progress-label">Documents</span>
      <span class="doc-progress-count">${progress.uploaded} / ${progress.total} complete</span>
    </div>
    <div class="doc-progress-bar"><div class="doc-progress-fill" style="width:${pct}%"></div></div>

    <div id="documents-step">
      <section class="doc-section">
        <p class="doc-section-eyebrow">Registered office</p>
        <p class="doc-section-subtitle">${model.registeredOffice.intro}</p>
        <div class="doc-field-grid">${model.registeredOffice.docs.map(renderDocField).join("")}</div>
      </section>

      ${model.promoters
        .map(
          (p) => `
      <section class="doc-section">
        <p class="doc-section-eyebrow">Promoter company</p>
        <p class="doc-section-subtitle">Documents for the company subscribing to your new company.</p>
        <p class="doc-subsection-name">${p.name}</p>
        <div class="doc-field-grid">${p.docs.map(renderDocField).join("")}</div>
      </section>`
        )
        .join("")}

      <section class="doc-section">
        <p class="doc-section-eyebrow">Member documents</p>
        <p class="doc-section-subtitle">We only ask for documents required for each member.</p>
        ${model.members.map((m) => renderMemberDocCard(m)).join("")}
      </section>

      ${
        model.opc
          ? `
      <section class="doc-section">
        <p class="doc-section-eyebrow">Nominee documents</p>
        <p class="doc-section-subtitle">Required for a One Person Company (OPC).</p>
        <div class="doc-field-grid">${model.opc.docs.map(renderDocField).join("")}</div>
      </section>`
          : ""
      }

      ${
        model.section8
          ? `
      <section class="doc-section">
        <p class="doc-section-eyebrow">Section 8 documents</p>
        <p class="doc-section-subtitle">Additional declarations required for a Section 8 (non-profit) company.</p>
        <div class="doc-field-grid">${model.section8.docs.map(renderDocField).join("")}</div>
      </section>`
          : ""
      }

      <section class="doc-section doc-section-prepared">
        <p class="doc-section-eyebrow">Documents we'll prepare</p>
        <p class="doc-section-subtitle">We'll prepare the incorporation forms and documents based on the information you've provided.</p>
        <ul class="prepared-doc-list">
          <li>Memorandum of Association</li>
          <li>Articles of Association</li>
          <li>Incorporation forms</li>
          <li>Applicable declarations</li>
        </ul>
        <p class="doc-section-footnote">You'll be asked to digitally sign the applicable documents before we submit them.</p>
      </section>
    </div>

    <div id="docs-missing-note"></div>
    <div class="wizard-actions is-split">
      <button class="btn btn-secondary btn-arrow-left" data-action="incorp-previous">Previous</button>
      <div class="wizard-actions-right">
        <button class="btn btn-secondary" data-action="save-exit">Save &amp; Exit</button>
        <button class="btn btn-primary btn-arrow" data-action="incorp-continue">Continue</button>
      </div>
    </div>`;
}

/* ---------- Step 5: Review & payment ---------- */

function computeIncorpPaymentTotals() {
  const govFee = 6499;
  const serviceFee = 1499;
  const stampDuty = 1500;
  const addOnsTotal = incorporation.payment.addOns.gst ? 1499 : 0;
  const gst = Math.round((serviceFee + addOnsTotal) * 0.18);
  const total = govFee + serviceFee + stampDuty + addOnsTotal + gst;
  return { govFee, serviceFee, stampDuty, addOnsTotal, gst, total };
}

/* ---------- Step 5: Payment ---------- */

function renderIncorpPaymentStep() {
  const { govFee, serviceFee, stampDuty, addOnsTotal, gst, total } = computeIncorpPaymentTotals();
  const companyTypeLabel = COMPANY_TYPES.find((t) => t.value === incorporation.companyType).label;

  return `
    <h1 class="wizard-title">Payment</h1>
    <p class="wizard-subtitle">Review the incorporation fees and make your payment.</p>

    <div id="payment-step">
      <div class="payment-grid">
        <div class="pay-card">
          <p class="section-label">What you're paying for</p>
          <ul class="paying-for-list">
            <li><span class="paying-for-check">\u2713</span> Company incorporation service</li>
            <li><span class="paying-for-check">\u2713</span> Government filing fees</li>
            <li><span class="paying-for-check">\u2713</span> Applicable state stamp duty</li>
            ${incorporation.payment.addOns.gst ? `<li><span class="paying-for-check">\u2713</span> Selected additional services</li>` : ""}
          </ul>
          <hr class="form-divider" style="margin: 16px 0;" />
          <p class="section-label">Your incorporation</p>
          <dl>
            <div class="name-pref-row"><dt>Company name</dt><dd>${companyDisplayName()}</dd></div>
            <div class="name-pref-row"><dt>Company type</dt><dd>${companyTypeLabel}</dd></div>
            <div class="name-pref-row"><dt>State</dt><dd>${COMPANY.registrationState}</dd></div>
          </dl>
          <hr class="form-divider" style="margin: 16px 0;" />
          <p class="section-label">Additional services</p>
          <label class="checkbox-row addon-row">
            <input type="checkbox" id="addon-gst" ${incorporation.payment.addOns.gst ? "checked" : ""} />
            GST Registration
            <span class="addon-price">\u20B91,499</span>
          </label>
        </div>

        <div class="summary-card-dark">
          <h4>Summary</h4>
          <p class="summary-loc">\uD83D\uDCCD ${COMPANY.registrationState}</p>
          <div class="summary-row"><span>Zoho Start service fee</span><span>\u20B9${serviceFee.toLocaleString("en-IN")}</span></div>
          <div class="summary-row"><span>Government filing fee</span><span>\u20B9${govFee.toLocaleString("en-IN")}</span></div>
          <div class="summary-row"><span>Stamp duty</span><span>\u20B9${stampDuty.toLocaleString("en-IN")}</span></div>
          ${addOnsTotal ? `<div class="summary-row"><span>GST Registration</span><span>\u20B9${addOnsTotal.toLocaleString("en-IN")}</span></div>` : ""}
          <div class="summary-row"><span>GST (18%)</span><span>\u20B9${gst.toLocaleString("en-IN")}</span></div>
          <hr class="summary-divider" />
          <div class="summary-total"><span>Total payable</span><span class="summary-total-value">\u20B9${total.toLocaleString("en-IN")}</span></div>
        </div>
      </div>

      <div class="form-card">
        <p class="section-label">Payment method</p>
        <div class="payment-method-list">
          ${["upi", "card", "netbanking"]
            .map((m) => {
              const labels = { upi: "UPI", card: "Credit / Debit Card", netbanking: "Net Banking" };
              return `<label class="payment-method-option ${incorporation.payment.method === m ? "is-selected" : ""}"><input type="radio" name="pay-method" value="${m}" ${incorporation.payment.method === m ? "checked" : ""} /> ${labels[m]}</label>`;
            })
            .join("")}
        </div>
      </div>
    </div>

    <div id="payment-status-note"></div>
    <div class="wizard-actions is-split">
      <button class="btn btn-secondary btn-arrow-left" data-action="incorp-previous">Previous</button>
      <button class="btn btn-primary" data-action="incorp-pay" id="incorp-pay-btn">Pay \u20B9${total.toLocaleString("en-IN")}</button>
    </div>`;
}

/* ---------- Step 6: Summary ---------- */

function renderCollapsibleCard(key, title, bodyHtml, editHtml) {
  const isOpen = !incorporation.summaryCollapsed[key];
  return `
    <div class="summary-collapse-card">
      <div class="summary-collapse-head">
        <button type="button" class="summary-collapse-toggle" data-action="toggle-summary-card" data-card="${key}">
          <span class="summary-collapse-chevron ${isOpen ? "is-open" : ""}" aria-hidden="true">\u25BE</span>
          <span class="summary-collapse-title">${title}</span>
        </button>
        ${editHtml || ""}
      </div>
      ${isOpen ? `<div class="summary-collapse-body">${bodyHtml}</div>` : ""}
    </div>`;
}

function renderSummaryStep() {
  const allMembers = [...incorporation.members.both, ...incorporation.members.owners, ...incorporation.members.directors];
  const model = buildDocumentModel();
  const progress = computeDocProgress(model);
  const { total } = computeIncorpPaymentTotals();
  const allDocsDone = progress.uploaded >= progress.total;

  const companyBody = `
    <div class="review-row"><span>Company name</span><strong>${companyDisplayName()}</strong></div>
    <div class="review-row"><span>Company type</span><strong>${COMPANY_TYPES.find((t) => t.value === incorporation.companyType).label}</strong></div>
    <div class="review-row"><span>Registration state</span><strong>${COMPANY.registrationState}</strong></div>
    <div class="review-row"><span>Registered office</span><strong>${
      incorporation.office.sameAsCommAddress === "no" ? `${incorporation.office.line1}, ${incorporation.office.city}, ${incorporation.office.state}` : "Same as business/communication address"
    }</strong></div>`;

  const membersBody = allMembers
    .map((m, i) => {
      const name = m.type === "company" ? m.company.legalName || "Company member" : m.name || `${m.firstName} ${m.lastName}`.trim() || `Member ${i + 1}`;
      const pct = m.ownershipPercent || 0;
      return `<div class="review-row"><span>${name}</span><strong>${pct}% ownership</strong></div>`;
    })
    .join("");

  const sc = incorporation.shareCapital;
  const shareCapitalBody = `
    <div class="review-row"><span>Authorised capital</span><strong>\u20B9${sc.authorizedCapital.toLocaleString("en-IN")}</strong></div>
    <div class="review-row"><span>Subscribed capital</span><strong>\u20B9${sc.subscribedCapital.toLocaleString("en-IN")}</strong></div>
    <div class="review-row"><span>Face value per share</span><strong>\u20B9${sc.shareValue}</strong></div>`;

  const documentsBody = `
    <div class="review-row"><span>${allDocsDone ? "All required documents uploaded" : "Documents uploaded"}</span><strong>${progress.uploaded} / ${progress.total} complete</strong></div>`;

  const paymentBody = `<div class="review-row"><span>Total paid</span><strong>\u20B9${total.toLocaleString("en-IN")}</strong></div>`;

  const editLink = (step) => `<button type="button" class="edit-link" data-action="incorp-edit" data-step="${step}">Edit</button>`;
  const viewLink = (step) => `<button type="button" class="edit-link" data-action="incorp-edit" data-step="${step}">View</button>`;

  return `
    <h1 class="wizard-title">Review your incorporation details</h1>
    <p class="wizard-subtitle">Check your details before we prepare your incorporation application.</p>

    <div id="summary-step">
      ${renderCollapsibleCard("company", "Company details", companyBody, editLink(1))}
      ${renderCollapsibleCard("members", `Members (${allMembers.length})`, membersBody, editLink(2))}
      ${renderCollapsibleCard("capital", "Share capital", shareCapitalBody, editLink(3))}
      ${renderCollapsibleCard("documents", "Documents", documentsBody, viewLink(4))}
      ${renderCollapsibleCard("payment", "Payment", paymentBody, viewLink(5))}

      <div class="readiness-banner">
        <p class="readiness-title">\u2713 You're ready to proceed</p>
        <p class="readiness-text">Your company details and required documents are complete. We'll prepare your incorporation application using these details.</p>
      </div>

      <div class="declaration-card">
        <label class="declaration-check">
          <input type="checkbox" id="declaration-checkbox" ${incorporation.declarationAccepted ? "checked" : ""} />
          <span>I confirm that the information provided is accurate and complete, and I authorize Zoho Business Services to prepare and submit the incorporation application on my behalf.</span>
        </label>
        <button type="button" class="link-btn" data-action="toggle-declaration-text">View full declaration</button>
        <div class="declaration-full" id="declaration-full" hidden>
          I, the undersigned, hereby declare that all particulars furnished in this incorporation application, including the information relating to members, directors, registered office and share capital, are true and correct to the best of my knowledge, and I authorise Zoho Business Services and its representatives to prepare, digitally file and follow up on this incorporation application with the Ministry of Corporate Affairs (MCA) on my behalf.
        </div>
      </div>
    </div>

    <div class="wizard-actions is-split">
      <button class="btn btn-secondary btn-arrow-left" data-action="incorp-previous">Previous</button>
      <button class="btn btn-primary btn-arrow" data-action="submit-for-incorporation" ${incorporation.declarationAccepted ? "" : "disabled"}>Submit for Incorporation</button>
    </div>`;
}

/* ---------- Wizard shell ---------- */

function renderIncorporationView() {
  const stepRenderers = {
    1: renderBusinessDetailsStep,
    2: renderMembersStep,
    3: renderShareCapitalStep,
    4: renderDocumentsStep,
    5: renderIncorpPaymentStep,
    6: renderSummaryStep,
  };
  const content = stepRenderers[incorporation.step]();
  return `
    <div class="wizard-shell">
      ${renderIncorpTopbar(incorporation.step)}
      <div class="wizard-page">
        <div class="wizard-container wizard-container-wide">
          ${content}
        </div>
      </div>
    </div>`;
}

/* ===================== Post-summary: "Your application is ready" ===================== */

function renderReadyView() {
  return `
    <div class="wizard-shell">
      <div class="wizard-page">
        <div class="wizard-container">
          <h1 class="wizard-title">Your application is ready</h1>
          <p class="wizard-subtitle">We've received your information and payment. Next, we'll prepare your incorporation documents. Some documents will need to be digitally signed before we can submit your application to MCA.</p>

          <div class="form-card">
            <p class="section-label">What happens next</p>
            <ul class="sub-status-list">
              <li class="sub-status-item is-done"><span class="sub-status-icon">\u2713</span><span class="sub-status-text">Your information is validated</span></li>
              <li class="sub-status-item is-current"><span class="sub-status-icon">\u25CF</span><span class="sub-status-text">Sign and upload required documents</span></li>
              <li class="sub-status-item is-upcoming"><span class="sub-status-icon">\u25CB</span><span class="sub-status-text">Application submitted to MCA</span></li>
              <li class="sub-status-item is-upcoming"><span class="sub-status-icon">\u25CB</span><span class="sub-status-text">MCA review</span></li>
              <li class="sub-status-item is-upcoming"><span class="sub-status-icon">\u25CB</span><span class="sub-status-text">Company incorporated</span></li>
            </ul>
          </div>

          <div class="wizard-actions ready-actions">
            <button class="btn btn-primary btn-arrow" data-action="goto-view" data-view="signing">Continue to document signing</button>
            <button class="btn btn-secondary" data-action="goto-view" data-view="dashboard">Go to Dashboard</button>
          </div>
        </div>
      </div>
    </div>`;
}

/* ===================== Sign & Upload Documents ===================== */

// Lazily builds one signer per individual member with two documents to sign (MoA / AoA).
function ensureSigningModel() {
  if (incorporation.signing) return incorporation.signing;
  const people = [];
  ["both", "owners", "directors"].forEach((group) => {
    incorporation.members[group].forEach((member, index) => {
      if (member.type === "company") return;
      const name = member.name || `${member.firstName} ${member.lastName}`.trim() || `Member ${index + 1}`;
      const role = group === "owners" ? "Subscriber" : group === "directors" ? "Director" : "Subscriber cum Director";
      people.push({
        key: `${group}-${index}`,
        name,
        role,
        docs: [
          { id: `sig-moa-${group}-${index}`, name: "Memorandum of Association", formNo: "INC-33", status: "not_signed", errorType: null },
          { id: `sig-aoa-${group}-${index}`, name: "Articles of Association", formNo: "INC-34", status: "not_signed", errorType: null },
        ],
      });
    });
  });
  incorporation.signing = { people, expanded: {} };
  return incorporation.signing;
}

function signingProgress(signing) {
  const allDocs = signing.people.flatMap((p) => p.docs);
  const total = allDocs.length;
  const done = allDocs.filter((d) => d.status === "verified").length;
  return { total, done };
}

const SIGN_ERROR_COPY = {
  mismatch: (name) => ["Signature doesn't match", `This document was signed using a DSC that doesn't match ${name}. Please sign using ${name}'s DSC and upload again.`],
  expired: () => ["Your DSC has expired", "The digital signature used for this document is no longer valid. Please use a valid DSC and upload the signed document again."],
  modified: () => ["This document was changed after it was signed.", "Download the latest version, sign it again, and upload the new signed copy."],
  wrong: () => ["This isn't the document we requested.", "Please download the latest document from this page, sign it, and upload the signed copy."],
  old: () => ["This document is out of date.", "We've generated a newer version after your details were updated."],
};

function renderSignDocRow(person, doc) {
  const badge = {
    not_signed: { text: "Not signed", tone: "muted" },
    ready_to_sign: { text: "Ready to sign", tone: "info" },
    checking: { text: "Checking signature\u2026", tone: "info" },
    verified: { text: "\u2713 Signature verified", tone: "success" },
    error: { text: "! Signature needs attention", tone: "danger" },
  }[doc.status];

  let extra = "";
  if (doc.status === "verified") {
    extra = `<p class="sign-doc-detail">Signed by ${person.name} \u00B7 DSC matched successfully</p>`;
  } else if (doc.status === "error") {
    const [title, sub] = (SIGN_ERROR_COPY[doc.errorType] || SIGN_ERROR_COPY.mismatch)(person.name);
    extra = `<p class="sign-doc-error-title">${title}</p><p class="sign-doc-error-sub">${sub}</p>`;
  }

  const canUpload = doc.status === "ready_to_sign" || doc.status === "error";
  const isBusy = doc.status === "checking";

  return `
    <div class="sign-doc-row">
      <div class="sign-doc-info">
        <p class="sign-doc-name">${doc.name}</p>
        <p class="sign-doc-form">${doc.formNo}</p>
        <span class="badge badge-${badge.tone}">${badge.text}</span>
        ${extra}
      </div>
      <div class="sign-doc-actions">
        <button type="button" class="btn btn-secondary btn-sm" data-action="sign-download" data-person="${person.key}" data-doc="${doc.id}" ${isBusy ? "disabled" : ""}>Download</button>
        <button type="button" class="btn btn-primary btn-sm" data-action="sign-upload" data-person="${person.key}" data-doc="${doc.id}" ${canUpload && !isBusy ? "" : "disabled"}>Upload signed</button>
      </div>
      ${
        canUpload
          ? `<div class="sign-demo-picker">
              <label class="sign-demo-label">Simulate result (demo)</label>
              <select class="field-select sign-demo-select" data-person="${person.key}" data-doc="${doc.id}">
                <option value="verified">Signature verified</option>
                <option value="mismatch">DSC doesn't match signer</option>
                <option value="expired">DSC expired</option>
                <option value="modified">Document modified after signing</option>
                <option value="wrong">Wrong document uploaded</option>
                <option value="old">Old version uploaded</option>
              </select>
            </div>`
          : ""
      }
    </div>`;
}

function renderSignerCard(p) {
  const doneCount = p.docs.filter((d) => d.status === "verified").length;
  const isExpanded = incorporation.signing.expanded[p.key] !== false;
  return `
    <div class="signer-card">
      <button type="button" class="signer-card-head" data-action="toggle-signer" data-key="${p.key}">
        <div>
          <p class="signer-name">${p.name}</p>
          <p class="signer-role">${p.role}</p>
        </div>
        <span class="signer-status ${doneCount === p.docs.length ? "is-done" : "is-pending"}">${doneCount === p.docs.length ? "\u2713" : "\u25CF"} ${doneCount} of ${p.docs.length} documents signed</span>
      </button>
      ${isExpanded ? `<div class="signer-card-body">${p.docs.map((d) => renderSignDocRow(p, d)).join("")}</div>` : ""}
    </div>`;
}

function renderAppShellNav(activeLabel) {
  return `
    <aside class="sidebar">
      <div class="brand-row"><span class="brand-mark" aria-hidden="true">&#9650;</span><span class="brand-name">Start</span></div>
      <nav class="sidebar-nav" aria-label="Primary">
        <button class="nav-link ${activeLabel === "Dashboard" ? "active" : ""}" data-action="goto-view" data-view="dashboard">Dashboard</button>
        <button class="nav-link ${activeLabel !== "Dashboard" ? "active" : ""}" ${activeLabel === "Dashboard" ? 'data-action="goto-view" data-view="signing"' : ""}>${activeLabel === "Dashboard" ? "Sign & Upload" : activeLabel}</button>
      </nav>
    </aside>
    <div class="main-col">
      <header class="topbar">
        <div class="topbar-left"><span class="topbar-crumb-icon" aria-hidden="true">&#9650;</span><span class="topbar-crumb">Start</span></div>
        <div class="topbar-right"><span class="avatar" aria-label="Aswin A S">AA</span></div>
      </header>`;
}

function renderSigningView() {
  const signing = ensureSigningModel();
  const { total, done } = signingProgress(signing);
  const allDone = total > 0 && done === total;

  return `
    <div class="app-shell">
      ${renderAppShellNav("Sign & Upload")}
        <main class="page-root" aria-live="polite">
          <button class="back-link" data-action="goto-view" data-view="dashboard">\u2190 Back to dashboard</button>
          <header class="welcome-header">
            <h1>Sign your incorporation documents</h1>
            <p>Download the documents, digitally sign them using your DSC, and upload the signed copies here.</p>
          </header>

          <div class="signing-steps-explainer">
            <div class="signing-step-explain"><span class="signing-step-num">1</span><div><p class="signing-step-title">Download</p><p class="signing-step-text">Download the document that needs your signature.</p></div></div>
            <div class="signing-step-explain"><span class="signing-step-num">2</span><div><p class="signing-step-title">Sign</p><p class="signing-step-text">Open it and affix your DSC.</p></div></div>
            <div class="signing-step-explain"><span class="signing-step-num">3</span><div><p class="signing-step-title">Upload</p><p class="signing-step-text">Upload the digitally signed PDF here.</p></div></div>
          </div>

          ${
            allDone
              ? `<div class="readiness-banner">
                  <p class="readiness-title">\u2713 All signatures completed</p>
                  <p class="readiness-text">All required documents have been digitally signed and verified. We'll submit your incorporation application to MCA.</p>
                </div>`
              : `<div class="signing-progress-card">
                  <p class="signing-progress-label">Signatures</p>
                  <p class="signing-progress-count">${done} of ${total} signatures completed</p>
                  <div class="doc-progress-bar"><div class="doc-progress-fill" style="width:${total ? Math.round((done / total) * 100) : 0}%"></div></div>
                </div>`
          }

          <section class="signers-section">
            <p class="section-label">People who need to sign</p>
            ${signing.people.map((p) => renderSignerCard(p)).join("")}
          </section>

          <div class="wizard-actions is-split signing-final-actions">
            ${allDone ? "<span></span>" : `<button class="btn btn-secondary" data-action="send-signing-reminder">Send reminder</button>`}
            <button class="btn btn-primary" data-action="submit-to-mca" ${allDone ? "" : "disabled"}>Submit to MCA</button>
          </div>
        </main>
      </div>
    </div>`;
}

/* ===================== Resubmission (MCA changes requested) ===================== */

function renderResubmissionView() {
  return `
    <div class="app-shell">
      ${renderAppShellNav("Review MCA remarks")}
        <main class="page-root" aria-live="polite">
          <button class="back-link" data-action="goto-view" data-view="dashboard">\u2190 Back to dashboard</button>
          <header class="welcome-header">
            <h1>Changes requested by MCA</h1>
            <p>Update the highlighted information so we can resubmit your incorporation application.</p>
          </header>

          <div class="mca-remark-card">
            <p class="mca-remark-label">MCA remark</p>
            <p class="mca-remark-text">Registered office address proof does not clearly show the complete address.</p>
          </div>

          <section class="doc-section">
            <p class="doc-section-eyebrow">Registered office</p>
            <div class="affected-doc-row" id="affected-doc-row">
              <span class="affected-doc-warn">\u26A0 Address proof</span>
              <button type="button" class="btn btn-secondary btn-sm" data-action="resubmission-replace">Replace document</button>
            </div>
          </section>

          <p class="resubmission-deadline">Complete resubmission by <strong>18 Aug 2026</strong></p>

          <div id="resubmission-status"></div>

          <div class="wizard-actions is-split">
            <span></span>
            <button class="btn btn-primary" data-action="resubmission-submit" id="resubmission-submit-btn" disabled>Submit updated application</button>
          </div>
        </main>
      </div>
    </div>`;
}

/* ===================== Dashboard ===================== */

// step2 (Name reservation) sub-statuses are fully done once name is approved.
function getStep2SubStatuses() {
  const nameApproved = stageIndex(currentStage) >= stageIndex("name_approved");
  return [
    { label: "Submitted to MCA", state: "done" },
    { label: "Under MCA review", state: nameApproved ? "done" : "current" },
    { label: "Name approved", state: nameApproved ? "done" : "upcoming" },
  ];
}

// step3 (Company incorporation) sub-statuses progress one at a time.
function getStep3SubStatuses() {
  const order = ["details_incomplete", "ready_for_filing", "signing", "submitted", "under_review", "incorporated"];
  const labels = [
    "Provide incorporation details",
    "Documents & payment",
    "Sign & upload documents",
    "Submitted to MCA",
    "MCA review",
    "Company incorporated",
  ];
  // changes_requested is a branch off "under_review": show it as needing attention at that step.
  const effectiveStage = currentStage === "changes_requested" ? "under_review" : currentStage;
  const idx = order.indexOf(effectiveStage);
  return labels.map((label, i) => {
    let state;
    if (idx === -1) {
      state = "upcoming"; // name_review or name_approved: not started yet
    } else if (i < idx) {
      state = "done";
    } else if (i === idx) {
      state = currentStage === "incorporated" ? "done" : currentStage === "changes_requested" ? "attention" : "current";
    } else {
      state = "upcoming";
    }
    return { label, state };
  });
}

function getMainStepStatus(step) {
  const idx = stageIndex(currentStage);
  if (step === 1) return "done"; // payment always complete
  if (step === 2) return idx >= stageIndex("name_approved") ? "done" : "current";
  if (step === 3) {
    if (currentStage === "name_review") return "upcoming";
    if (currentStage === "name_approved") return "next";
    if (currentStage === "incorporated") return "done";
    return "current";
  }
  return "upcoming";
}

function subStatusIcon(state) {
  if (state === "done") return "\u2713";
  if (state === "current") return "\u25CF";
  if (state === "attention") return "!";
  return "\u25CB";
}

function renderSubStatusList(items) {
  return `
    <ul class="sub-status-list">
      ${items
        .map(
          (item) => `
        <li class="sub-status-item is-${item.state}">
          <span class="sub-status-icon">${subStatusIcon(item.state)}</span>
          <span class="sub-status-text">${item.label}</span>
        </li>`
        )
        .join("")}
    </ul>`;
}

function renderJourneyCard() {
  const step2Sub = getStep2SubStatuses();
  const step3Sub = getStep3SubStatuses();
  const step2Status = getMainStepStatus(2);
  const step3StatusRaw = getMainStepStatus(3);
  // "next" renders visually as upcoming-but-highlighted; treat as upcoming for the marker.
  const step3Status = step3StatusRaw === "next" ? "upcoming" : step3StatusRaw;

  const steps = [
    {
      marker: "\u2713",
      cssState: "done",
      title: "Payment received",
      sub: `${COMPANY.reservationFee} name reservation fee paid`,
    },
    {
      marker: step2Status === "done" ? "\u2713" : "2",
      cssState: step2Status,
      title: "Name reservation",
      subList: renderSubStatusList(step2Sub),
    },
    {
      marker: step3Status === "done" ? "\u2713" : "3",
      cssState: step3Status,
      title: "Company incorporation",
      subList: renderSubStatusList(step3Sub),
    },
  ];

  return `
    <section class="journey-card" aria-labelledby="journey-heading">
      <h2 class="card-title" id="journey-heading">Incorporation journey</h2>
      <div class="journey-steps">
        ${steps
          .map(
            (step) => `
          <div class="journey-step is-${step.cssState}">
            <div class="journey-step-line" aria-hidden="true"></div>
            <span class="journey-marker">${step.marker}</span>
            <div class="journey-step-body">
              <p class="journey-step-title">${step.title}</p>
              ${step.sub ? `<p class="journey-step-sub">${step.sub}</p>` : ""}
              ${step.subList || ""}
            </div>
          </div>`
          )
          .join("")}
      </div>
    </section>`;
}

function renderStatusCard() {
  const { status } = STAGE_CONFIG[currentStage];
  const ctaHtml = status.cta
    ? `<div class="status-card-actions">
         <button class="btn btn-primary" data-action="${status.cta.action || "advance"}" data-next="${status.cta.next || ""}" data-view="${status.cta.view || ""}">${status.cta.label}</button>
       </div>`
    : "";
  const extraHtml = status.extra ? `<div class="status-card-extra">${status.extra}</div>` : "";

  return `
    <section class="status-card tone-${status.tone}" role="status">
      <h3 class="status-card-title">${status.title}</h3>
      <p class="status-card-message">${status.message}</p>
      ${extraHtml}
      ${ctaHtml}
    </section>`;
}

function renderNameReservationCard() {
  return `
    <section class="name-reservation-card" aria-labelledby="name-res-heading">
      <h3 class="card-title-sm" id="name-res-heading">Name reservation</h3>
      <div class="reservation-grid">
        <div>
          <div class="reservation-field-label">Name preference 1</div>
          <div class="reservation-field-value">${COMPANY.namePref1}</div>
        </div>
        <div>
          <div class="reservation-field-label">Name preference 2</div>
          <div class="reservation-field-value">${COMPANY.namePref2}</div>
        </div>
        <div>
          <div class="reservation-field-label">MCA name reservation fee</div>
          <div class="reservation-field-value">${COMPANY.reservationFee}</div>
        </div>
        <div>
          <div class="reservation-field-label">Payment status</div>
          <div class="reservation-field-value paid">Paid</div>
        </div>
      </div>
    </section>`;
}

function buildActivityLog() {
  const idx = stageIndex(currentStage);
  const entries = [...BASE_ACTIVITY];
  for (let i = 1; i <= idx; i++) {
    const stage = STAGE_ORDER[i];
    if (STAGE_ACTIVITY[stage]) entries.push(STAGE_ACTIVITY[stage]);
  }
  return entries.slice().reverse(); // most recent first
}

function renderActivityCard() {
  const entries = buildActivityLog();
  return `
    <section class="activity-card" aria-labelledby="activity-heading">
      <h3 class="card-title-sm" id="activity-heading">Activity</h3>
      <ul class="activity-list">
        ${entries
          .map(
            (e) => `
          <li class="activity-item">
            <span class="activity-dot" aria-hidden="true"></span>
            <div>
              <div class="activity-text">${e.text}</div>
              <div class="activity-date">${e.date}</div>
            </div>
          </li>`
          )
          .join("")}
      </ul>
    </section>`;
}

function renderSummaryTiles() {
  const incorporated = currentStage === "incorporated";
  const tiles = [
    { label: "Registration State", value: COMPANY.registrationState, empty: false },
    { label: "Registered Date", value: incorporated ? "10 Aug 2026" : "\u2014", empty: !incorporated },
    { label: "CIN", value: incorporated ? "U27200TN2026PTC123456" : "\u2014", empty: !incorporated },
    { label: "File Number", value: incorporated ? "123456" : "\u2014", empty: !incorporated },
  ];
  return `
    <div class="summary-tiles">
      ${tiles
        .map(
          (t) => `
        <div class="summary-tile">
          <div class="summary-tile-label">${t.label}</div>
          <div class="summary-tile-value ${t.empty ? "is-empty" : ""}">${t.value}</div>
        </div>`
        )
        .join("")}
    </div>`;
}

function renderApplicationCard() {
  const { badge } = STAGE_CONFIG[currentStage];
  return `
    <section class="application-card" aria-labelledby="application-heading">
      <div class="application-card-top">
        <div class="application-title-row">
          <h2 id="application-heading">${companyDisplayName()}</h2>
          <span class="badge badge-${badge.tone}">${badge.text}</span>
        </div>
        <button class="view-details-link" data-action="view-details">View details</button>
      </div>
      ${renderSummaryTiles()}
    </section>`;
}

function renderSecondaryPromo() {
  return `
    <section class="secondary-promo" aria-label="Explore more Zoho Start products">
      <p class="secondary-promo-label">Also from Zoho Start</p>
      <div class="secondary-promo-grid">
        <div class="promo-mini-card">
          <p class="promo-mini-title">Zoho Business Catalog</p>
          <p class="promo-mini-text">Explore how Zoho can help run your business.</p>
          <a class="promo-mini-link" href="#">Preview catalog \u2192</a>
        </div>
        <div class="promo-mini-card">
          <p class="promo-mini-title">Watch Business Videos</p>
          <p class="promo-mini-text">Short videos on getting your business started.</p>
          <a class="promo-mini-link" href="#">Show more \u2192</a>
        </div>
        <div class="promo-mini-card">
          <p class="promo-mini-title">Recommendations</p>
          <p class="promo-mini-text">Zoho Books, Bigin CRM and Zoho Mail for your new company.</p>
          <a class="promo-mini-link" href="#">Learn more \u2192</a>
        </div>
      </div>
    </section>`;
}

function renderDashboardView() {
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand-row">
          <span class="brand-mark" aria-hidden="true">&#9650;</span>
          <span class="brand-name">Start</span>
        </div>
        <nav class="sidebar-nav" aria-label="Primary">
          <button class="nav-link active">Dashboard</button>
          <button class="nav-link">Inbox</button>
          <div class="nav-section-label">Services</div>
          <button class="nav-link nav-link-muted">Domains</button>
          <button class="nav-link nav-link-muted">Voice</button>
        </nav>
      </aside>

      <div class="main-col">
        <header class="topbar">
          <div class="topbar-left">
            <span class="topbar-crumb-icon" aria-hidden="true">&#9650;</span>
            <span class="topbar-crumb">Start</span>
          </div>
          <div class="topbar-right">
            <span class="avatar" aria-label="Aswin A S">AA</span>
          </div>
        </header>

        <!-- Demo-only lifecycle switcher, not part of the Zoho Start dashboard itself -->
        <div class="demo-switcher" id="demo-switcher">
          <span class="demo-switcher-label">Demo &middot; Application stage</span>
          <div class="demo-switcher-options" id="demo-switcher-options">
            <button class="demo-opt ${currentStage === "name_review" ? "active" : ""}" data-stage="name_review">Name under review</button>
            <button class="demo-opt ${currentStage === "name_approved" ? "active" : ""}" data-stage="name_approved">Name approved</button>
            <button class="demo-opt ${currentStage === "details_incomplete" ? "active" : ""}" data-stage="details_incomplete">Details in progress</button>
            <button class="demo-opt ${currentStage === "ready_for_filing" ? "active" : ""}" data-stage="ready_for_filing">Ready for filing</button>
            <button class="demo-opt ${currentStage === "signing" ? "active" : ""}" data-stage="signing">Documents to sign</button>
            <button class="demo-opt ${currentStage === "submitted" ? "active" : ""}" data-stage="submitted">Submitted to MCA</button>
            <button class="demo-opt ${currentStage === "under_review" ? "active" : ""}" data-stage="under_review">MCA review</button>
            <button class="demo-opt ${currentStage === "changes_requested" ? "active" : ""}" data-stage="changes_requested">Changes requested</button>
            <button class="demo-opt ${currentStage === "incorporated" ? "active" : ""}" data-stage="incorporated">Incorporated</button>
          </div>
        </div>

        <main id="page-root" class="page-root" aria-live="polite">
          <header class="welcome-header">
            <h1>Welcome, Aswin A S! \uD83D\uDC4B</h1>
            <p>Track your company name reservation and incorporation from here.</p>
          </header>

          ${renderApplicationCard()}

          <div class="content-grid">
            ${renderJourneyCard()}
            <div>
              ${renderStatusCard()}
              ${renderNameReservationCard()}
            </div>
          </div>

          ${renderActivityCard()}
          ${renderSecondaryPromo()}
        </main>
      </div>
    </div>`;
}

/* ===================== Top-level render / actions ===================== */

function render() {
  const root = document.getElementById("app-root");
  if (currentView === "name_reservation") {
    root.innerHTML = renderNameReservationView();
  } else if (currentView === "payment") {
    root.innerHTML = renderPaymentView();
  } else if (currentView === "incorporation") {
    root.innerHTML = renderIncorporationView();
  } else if (currentView === "ready") {
    root.innerHTML = renderReadyView();
  } else if (currentView === "signing") {
    root.innerHTML = renderSigningView();
  } else if (currentView === "resubmission") {
    root.innerHTML = renderResubmissionView();
  } else {
    root.innerHTML = renderDashboardView();
  }
  // Keep the URL in sync so each view is directly linkable/bookmarkable.
  if (window.location.hash !== VIEW_HASHES[currentView]) {
    window.location.hash = VIEW_HASHES[currentView];
  }
}

function showToast(message) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function openDetailsModal() {
  const overlayRoot = document.getElementById("overlay-root");
  const { badge } = STAGE_CONFIG[currentStage];
  overlayRoot.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-heading">
        <div class="modal-panel-head">
          <h3 id="modal-heading">${companyDisplayName()}</h3>
          <button class="modal-close" data-action="close-modal" aria-label="Close">&times;</button>
        </div>
        <dl class="modal-detail-list">
          <div class="modal-detail-row"><dt>Status</dt><dd>${badge.text}</dd></div>
          <div class="modal-detail-row"><dt>Registration State</dt><dd>${COMPANY.registrationState}</dd></div>
          <div class="modal-detail-row"><dt>Name preference 1</dt><dd>${COMPANY.namePref1}</dd></div>
          <div class="modal-detail-row"><dt>Name preference 2</dt><dd>${COMPANY.namePref2}</dd></div>
          <div class="modal-detail-row"><dt>Reservation fee paid</dt><dd>${COMPANY.reservationFee}</dd></div>
        </dl>
        <button class="btn btn-secondary" data-action="close-modal">Close</button>
      </div>
    </div>`;
}

function closeModal() {
  document.getElementById("overlay-root").innerHTML = "";
}

// Pull the name/state/contact fields entered on the reservation form into shared state.
function captureReservationForm() {
  const pref1 = document.getElementById("name-pref-1").value.trim();
  const pref2 = document.getElementById("name-pref-2").value.trim();
  const desc = document.getElementById("business-desc").value.trim();
  const state = document.getElementById("reg-state").value;
  const mobile = document.getElementById("mobile-number").value.trim();
  const email = document.getElementById("email-id").value.trim();
  if (pref1) COMPANY.namePref1 = pref1;
  if (pref2) COMPANY.namePref2 = pref2;
  if (desc) COMPANY.businessDesc = desc;
  if (state) COMPANY.registrationState = state;
  COMPANY.mobile = mobile;
  COMPANY.email = email;
}

function setFieldError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  const errorEl = document.getElementById(errorId);
  if (input) input.classList.toggle("has-error", Boolean(message));
  if (errorEl) errorEl.textContent = message || "";
}

// Validates the required fields on the reservation form and surfaces inline errors.
function validateReservationForm() {
  let valid = true;

  const pref1 = document.getElementById("name-pref-1").value.trim();
  if (!pref1) {
    setFieldError("name-pref-1", "name-pref-1-error", "Company name preference 1 is required.");
    valid = false;
  } else {
    setFieldError("name-pref-1", "name-pref-1-error", "");
  }

  const desc = document.getElementById("business-desc").value.trim();
  if (!desc) {
    setFieldError("business-desc", "business-desc-error", "Please describe what your company will do.");
    valid = false;
  } else {
    setFieldError("business-desc", "business-desc-error", "");
  }

  const mobile = document.getElementById("mobile-number").value.trim();
  if (!mobile) {
    setFieldError("mobile-number", "mobile-number-error", "Mobile number is required.");
    valid = false;
  } else if (!/^\d{10}$/.test(mobile)) {
    setFieldError("mobile-number", "mobile-number-error", "Enter a valid 10-digit mobile number.");
    valid = false;
  } else {
    setFieldError("mobile-number", "mobile-number-error", "");
  }

  const email = document.getElementById("email-id").value.trim();
  if (!email) {
    setFieldError("email-id", "email-id-error", "Email ID is required.");
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setFieldError("email-id", "email-id-error", "Enter a valid email address.");
    valid = false;
  } else {
    setFieldError("email-id", "email-id-error", "");
  }

  return valid;
}

// Sets a (possibly dotted/array-indexed) path on an object, e.g. "company.cin" or "otherCompanies.0.cin".
function setDeep(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (cur[key] === undefined) cur[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    cur = cur[key];
  }
  cur[parts[parts.length - 1]] = value;
}

// Reads every [data-mfield] input currently in the DOM for the active member group into state.
function captureMembersStep() {
  const container = document.getElementById("members-step");
  if (!container) return;
  const members = incorporation.members[incorporation.activeGroup];
  container.querySelectorAll("[data-member-index]").forEach((card) => {
    const idx = Number(card.dataset.memberIndex);
    const member = members[idx];
    if (!member) return;
    card.querySelectorAll("[data-mfield]").forEach((input) => {
      const path = input.dataset.mfield;
      if (input.type === "radio") {
        if (input.checked) setDeep(member, path, input.value);
      } else if (input.type === "checkbox") {
        setDeep(member, path, input.checked);
      } else {
        setDeep(member, path, input.value);
      }
    });
  });
}

// Reads every [data-ofield]/[data-bfield] input for the Business Details step (office/business) into state.
function captureBusinessDetailsStep() {
  const container = document.getElementById("business-details-step");
  if (!container) return;
  container.querySelectorAll("[data-bfield]").forEach((input) => {
    incorporation.business[input.dataset.bfield] = input.value;
  });
  container.querySelectorAll("[data-ofield]").forEach((input) => {
    const field = input.dataset.ofield;
    const value = input.type === "radio" ? (input.checked ? input.value : null) : input.value;
    if (value === null) return;
    incorporation.office[field] = value;
  });
}

// Reads every [data-ofield] input for the Share Capital step into state.
function captureShareCapitalStep() {
  const container = document.getElementById("share-capital-step");
  if (!container) return;
  container.querySelectorAll("[data-ofield]").forEach((input) => {
    incorporation.shareCapital[input.dataset.ofield] = Number(input.value) || 0;
  });
  const holders = getAllShareholders();
  container.querySelectorAll("[data-split-index]").forEach((input) => {
    const idx = Number(input.dataset.splitIndex);
    if (holders[idx]) holders[idx].member.ownershipPercent = Number(input.value) || 0;
  });
}

// Reads the additional-service checkbox and payment method radio on the Payment step into state.
function captureIncorpPaymentStep() {
  const container = document.getElementById("payment-step");
  if (!container) return;
  const gstEl = container.querySelector("#addon-gst");
  if (gstEl) incorporation.payment.addOns.gst = gstEl.checked;
  const methodEl = container.querySelector("input[name='pay-method']:checked");
  if (methodEl) incorporation.payment.method = methodEl.value;
}

// Persists whichever step's fields are currently visible, since conditional toggles and
// step navigation both need the latest DOM values captured into `incorporation` first.
function captureCurrentIncorpStepFields() {
  if (incorporation.step === 1) captureBusinessDetailsStep();
  else if (incorporation.step === 2) captureMembersStep();
  else if (incorporation.step === 3) captureShareCapitalStep();
  else if (incorporation.step === 5) captureIncorpPaymentStep();
}

// Finds a signer + document pair in the Sign & Upload data model.
function findSignDoc(personKey, docId) {
  const person = incorporation.signing && incorporation.signing.people.find((p) => p.key === personKey);
  const doc = person && person.docs.find((d) => d.id === docId);
  return { person, doc };
}

// Grows/shrinks a member group's array to match the selected count, preserving existing entries.
function resizeMemberGroup(group, count) {
  const arr = incorporation.members[group];
  while (arr.length < count) arr.push(makeMember());
  arr.length = count;
  incorporation.groupCounts[group] = count;
}

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-action='proceed-reservation']")) {
    if (!validateReservationForm()) return;
    captureReservationForm();
    currentView = "payment";
    render();
    return;
  }

  if (e.target.closest("[data-action='back-to-reservation']")) {
    currentView = "name_reservation";
    render();
    return;
  }

  if (e.target.closest("[data-action='pay-now']")) {
    currentView = "dashboard";
    currentStage = "name_review";
    render();
    showToast("Payment received. Tracking your incorporation journey.");
    return;
  }

  if (e.target.closest("[data-action='close-wizard']")) {
    showToast("This would return you to the Zoho Start home.");
    return;
  }

  if (e.target.closest("[data-action='skip-to-dashboard']")) {
    currentView = "dashboard";
    currentStage = "name_review";
    render();
    return;
  }

  if (e.target.closest("[data-action='start-incorporation-wizard']")) {
    currentView = "incorporation";
    incorporation.step = 1;
    render();
    return;
  }

  const advanceBtn = e.target.closest("[data-action='advance']");
  if (advanceBtn) {
    const next = advanceBtn.dataset.next;
    if (next) {
      currentStage = next;
      render();
      showToast(`Moved to: ${STAGE_CONFIG[next].badge.text}`);
    } else {
      showToast("Certificate download would start here.");
    }
    return;
  }

  if (e.target.closest("[data-action='view-details']")) {
    openDetailsModal();
    return;
  }

  if (e.target.closest("[data-action='close-modal']") || e.target.id === "modal-backdrop") {
    closeModal();
    return;
  }

  const demoOpt = e.target.closest(".demo-opt");
  if (demoOpt) {
    currentStage = demoOpt.dataset.stage;
    render();
    return;
  }

  const gotoBtn = e.target.closest("[data-action='goto-view']");
  if (gotoBtn) {
    currentView = gotoBtn.dataset.view;
    render();
    return;
  }

  /* ---------- Incorporation wizard navigation ---------- */

  if (e.target.closest("[data-action='incorp-continue']")) {
    captureCurrentIncorpStepFields();
    if (incorporation.step === 4) {
      const model = buildDocumentModel();
      const progress = computeDocProgress(model);
      if (progress.uploaded < progress.total) {
        const note = document.getElementById("docs-missing-note");
        if (note) {
          note.innerHTML = `
            <div class="missing-docs-note">
              <p class="missing-docs-title">${progress.missing.length} document${progress.missing.length === 1 ? "" : "s"} ${progress.missing.length === 1 ? "is" : "are"} still required</p>
              <ul>${progress.missing.map((d) => `<li>${d.label}</li>`).join("")}</ul>
              <p>Upload these documents to continue.</p>
            </div>`;
          note.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }
    }
    incorporation.step = Math.min(6, incorporation.step + 1);
    render();
    window.scrollTo(0, 0);
    return;
  }

  if (e.target.closest("[data-action='incorp-previous']")) {
    captureCurrentIncorpStepFields();
    incorporation.step = Math.max(1, incorporation.step - 1);
    render();
    window.scrollTo(0, 0);
    return;
  }

  const editBtn = e.target.closest("[data-action='incorp-edit']");
  if (editBtn) {
    captureCurrentIncorpStepFields();
    incorporation.step = Number(editBtn.dataset.step);
    render();
    window.scrollTo(0, 0);
    return;
  }

  if (e.target.closest("[data-action='save-exit']")) {
    captureCurrentIncorpStepFields();
    currentView = "dashboard";
    render();
    showToast("Progress saved. Pick up where you left off anytime.");
    return;
  }

  /* ---------- Business details step ---------- */

  const companyTypeBtn = e.target.closest("[data-action='set-company-type']");
  if (companyTypeBtn) {
    captureBusinessDetailsStep();
    incorporation.companyType = companyTypeBtn.dataset.value;
    render();
    return;
  }

  /* ---------- Members step ---------- */

  const groupTab = e.target.closest("[data-action='switch-member-group']");
  if (groupTab) {
    captureMembersStep();
    incorporation.activeGroup = groupTab.dataset.group;
    render();
    return;
  }

  const typeBtn = e.target.closest("[data-action='set-member-type']");
  if (typeBtn) {
    captureMembersStep();
    incorporation.members[typeBtn.dataset.group][Number(typeBtn.dataset.index)].type = typeBtn.dataset.type;
    render();
    return;
  }

  const companyTabBtn = e.target.closest("[data-action='switch-company-tab']");
  if (companyTabBtn) {
    captureMembersStep();
    incorporation.members[companyTabBtn.dataset.group][Number(companyTabBtn.dataset.index)].activeCompanyTab = companyTabBtn.dataset.tab;
    render();
    return;
  }

  const addCompanyBtn = e.target.closest("[data-action='add-other-company']");
  if (addCompanyBtn) {
    captureMembersStep();
    incorporation.members[addCompanyBtn.dataset.group][Number(addCompanyBtn.dataset.index)].otherCompanies.push({ cin: "", legalName: "" });
    render();
    return;
  }

  const prefillBtn = e.target.closest("[data-action='prefill']");
  if (prefillBtn) {
    showToast(prefillBtn.dataset.message || "Prefilled (demo).");
    return;
  }

  /* ---------- Documents step ---------- */

  const uploadBtn = e.target.closest("[data-action='doc-upload']");
  if (uploadBtn) {
    const state = getDocState(uploadBtn.dataset.doc);
    state.status = "uploaded";
    state.fileName = "document.pdf";
    state.size = "1.2 MB";
    state.errorType = null;
    render();
    return;
  }

  const replaceBtn = e.target.closest("[data-action='doc-replace']");
  if (replaceBtn) {
    const state = getDocState(replaceBtn.dataset.doc);
    state.status = "uploaded";
    state.fileName = "document-v2.pdf";
    state.size = "1.1 MB";
    state.errorType = null;
    render();
    showToast("Document replaced.");
    return;
  }

  const removeBtn = e.target.closest("[data-action='doc-remove']");
  if (removeBtn) {
    incorporation.documents[removeBtn.dataset.doc] = { status: "required", fileName: null, size: null, errorType: null };
    render();
    return;
  }

  if (e.target.closest("[data-action='doc-view']")) {
    showToast("This would open the uploaded document.");
    return;
  }

  const simulateErrBtn = e.target.closest("[data-action='doc-simulate-error']");
  if (simulateErrBtn) {
    const state = getDocState(simulateErrBtn.dataset.doc);
    const cycle = ["too_large", "unsupported", "failed", "unreadable"];
    const nextIdx = state.errorType ? (cycle.indexOf(state.errorType) + 1) % cycle.length : 0;
    state.status = "error";
    state.errorType = cycle[nextIdx];
    render();
    return;
  }

  if (e.target.closest("[data-action='contact-support']")) {
    showToast("Our incorporation team would reach out to help with this participant.");
    return;
  }

  /* ---------- Payment step ---------- */

  if (e.target.closest("[data-action='incorp-pay']")) {
    captureIncorpPaymentStep();
    const btn = document.getElementById("incorp-pay-btn");
    const note = document.getElementById("payment-status-note");
    if (btn) btn.setAttribute("disabled", "true");
    if (note) {
      note.innerHTML = `<div class="payment-status-box is-processing"><span class="spinner" aria-hidden="true"></span> Processing your payment\u2026 <span class="payment-status-sub">Please don't close this window.</span></div>`;
    }
    setTimeout(() => {
      incorporation.step = 6;
      render();
      showToast("Payment successful.");
    }, 900);
    return;
  }

  /* ---------- Summary step ---------- */

  const toggleCard = e.target.closest("[data-action='toggle-summary-card']");
  if (toggleCard) {
    const key = toggleCard.dataset.card;
    incorporation.summaryCollapsed[key] = !incorporation.summaryCollapsed[key];
    render();
    return;
  }

  if (e.target.closest("[data-action='toggle-declaration-text']")) {
    const el = document.getElementById("declaration-full");
    if (el) el.hidden = !el.hidden;
    return;
  }

  if (e.target.closest("[data-action='submit-for-incorporation']")) {
    if (!incorporation.declarationAccepted) return;
    currentStage = "signing";
    currentView = "ready";
    render();
    return;
  }

  /* ---------- Sign & Upload Documents ---------- */

  const toggleSigner = e.target.closest("[data-action='toggle-signer']");
  if (toggleSigner) {
    const key = toggleSigner.dataset.key;
    incorporation.signing.expanded[key] = incorporation.signing.expanded[key] === false ? true : false;
    render();
    return;
  }

  const signDownloadBtn = e.target.closest("[data-action='sign-download']");
  if (signDownloadBtn) {
    const { doc } = findSignDoc(signDownloadBtn.dataset.person, signDownloadBtn.dataset.doc);
    if (doc && doc.status !== "checking") {
      doc.status = "ready_to_sign";
      doc.errorType = null;
    }
    render();
    showToast("Document downloaded (demo).");
    return;
  }

  const signUploadBtn = e.target.closest("[data-action='sign-upload']");
  if (signUploadBtn) {
    const personKey = signUploadBtn.dataset.person;
    const docId = signUploadBtn.dataset.doc;
    const { doc } = findSignDoc(personKey, docId);
    if (!doc) return;
    const select = document.querySelector(`.sign-demo-select[data-person="${personKey}"][data-doc="${docId}"]`);
    const outcome = select ? select.value : "verified";
    doc.status = "checking";
    render();
    setTimeout(() => {
      if (outcome === "verified") {
        doc.status = "verified";
        doc.errorType = null;
      } else {
        doc.status = "error";
        doc.errorType = outcome;
      }
      render();
    }, 800);
    return;
  }

  if (e.target.closest("[data-action='send-signing-reminder']")) {
    showToast("Reminder sent to pending signatories.");
    return;
  }

  if (e.target.closest("[data-action='submit-to-mca']")) {
    currentStage = "submitted";
    currentView = "dashboard";
    render();
    showToast("Application submitted to MCA.");
    return;
  }

  /* ---------- Resubmission ---------- */

  if (e.target.closest("[data-action='resubmission-replace']")) {
    const row = document.getElementById("affected-doc-row");
    if (row) row.innerHTML = `<span class="affected-doc-fixed">\u2713 Address proof replaced</span>`;
    const status = document.getElementById("resubmission-status");
    if (status) {
      status.innerHTML = `
        <div class="readiness-banner">
          <p class="readiness-title">\u2713 Changes completed</p>
          <p class="readiness-text">Your updated information is ready. Some documents may need to be digitally signed again.</p>
        </div>`;
    }
    const submitBtn = document.getElementById("resubmission-submit-btn");
    if (submitBtn) submitBtn.removeAttribute("disabled");
    showToast("Document replaced.");
    return;
  }

  if (e.target.closest("[data-action='resubmission-submit']")) {
    currentStage = "under_review";
    currentView = "dashboard";
    render();
    showToast("Updated application submitted to MCA.");
    return;
  }
});

document.addEventListener("change", (e) => {
  if (e.target.id === "nic-unsure") {
    const nicSelect = document.getElementById("nic-code");
    const infoBox = document.getElementById("nic-info-box");
    const unsure = e.target.checked;
    if (nicSelect) nicSelect.disabled = unsure;
    if (infoBox) infoBox.style.display = unsure ? "" : "none";
    return;
  }

  if (e.target.id === "member-count-select") {
    captureMembersStep();
    resizeMemberGroup(e.target.dataset.group, Number(e.target.value));
    render();
    return;
  }

  if (e.target.id === "addon-gst" || e.target.name === "pay-method") {
    captureIncorpPaymentStep();
    render();
    return;
  }

  if (e.target.id === "declaration-checkbox") {
    incorporation.declarationAccepted = e.target.checked;
    render();
    return;
  }

  // Conditional fields (e.g. "Has DIN?", "Same as permanent address?", office ownership) change
  // which fields are visible \u2014 persist the current step first, then re-render to reveal/hide them.
  if (e.target.dataset && e.target.dataset.conditional === "true") {
    captureCurrentIncorpStepFields();
    render();
  }
});

// Support direct links / back-forward navigation between #reservation, #payment, #dashboard.
window.addEventListener("hashchange", () => {
  const nextView = viewFromHash();
  if (nextView !== currentView) {
    currentView = nextView;
    render();
  }
});

render();
