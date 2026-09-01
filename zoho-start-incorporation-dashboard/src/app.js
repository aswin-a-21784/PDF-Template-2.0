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
  "submitted",
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
let incorporation = {
  step: 2, // 2 Members, 3 Company Details, 4 Documents, 5 Review & Payment
  activeGroup: "both",
  groupCounts: { both: 3, owners: 1, directors: 0 },
  members: {
    both: [makeMember(), makeMember(), makeMember()],
    owners: [makeMember()],
    directors: [],
  },
  office: { sameAsCommAddress: "yes", line1: "", line2: "", city: "", state: COMPANY.registrationState, country: "India", pin: "" },
  business: { desc: COMPANY.businessDesc },
  shareCapital: { authorizedCapital: 100000, shareValue: 10, subscribedCapital: 50000 },
  documents: {},
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
  ready_for_filing: { text: "Incorporation details completed \u2014 ready for final review", date: "10 Aug 2026" },
  submitted: { text: "Incorporation application submitted to MCA", date: "10 Aug 2026" },
  incorporated: { text: "Company incorporated \u2014 CIN issued", date: "10 Aug 2026" },
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
      cta: { label: `Review & Pay ${COMPANY.filingFee}`, next: "submitted" },
    },
  },
  submitted: {
    badge: { text: "Submitted to MCA", tone: "info" },
    status: {
      tone: "info",
      title: "Application submitted",
      message: "Your incorporation application has been filed with MCA. This typically takes a few business days.",
      cta: { label: "Track application", next: "incorporated" },
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

const VIEW_HASHES = { name_reservation: "#reservation", payment: "#payment", dashboard: "#dashboard", incorporation: "#incorporation" };

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
    { n: 1, label: "Name Reservation" },
    { n: 2, label: "Members" },
    { n: 3, label: "Company Details" },
    { n: 4, label: "Documents" },
    { n: 5, label: "Review & Payment" },
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

function renderCompanyDetailsStep() {
  const office = incorporation.office;
  const business = incorporation.business;
  const sc = incorporation.shareCapital;
  const shares = sc.shareValue > 0 ? Math.floor(sc.subscribedCapital / sc.shareValue) : 0;
  const holders = getAllShareholders();

  return `
    <h1 class="wizard-title">Company details</h1>
    <p class="wizard-subtitle">A few more details to prepare your incorporation (SPICe+) application.</p>

    <div id="company-details-step">
      <div class="form-card">
        <p class="section-label">Registered Office Address</p>
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
      </div>

      <div class="form-card">
        <p class="section-label">Business &amp; Activity Details</p>
        <div class="prefill-tag">Prefilled from your name reservation</div>
        <label class="field-label" for="business-desc-2">What will your company do? <span class="req">*</span></label>
        <textarea class="field-textarea" id="business-desc-2" data-ofield="desc">${business.desc}</textarea>
      </div>

      <div class="form-card">
        <p class="section-label">Share Capital</p>
        <p class="contact-intro">Equity share capital details</p>
        <div class="form-row form-row-3">
          <div><label class="field-label">Authorised Capital (\u20B9) <span class="req">*</span></label><input class="field-input" type="number" data-ofield="authorizedCapital" value="${sc.authorizedCapital}" /></div>
          <div><label class="field-label">Share Value <span class="req">*</span></label><input class="field-input" type="number" data-ofield="shareValue" value="${sc.shareValue}" /></div>
          <div><label class="field-label">Subscribed Capital (\u20B9) <span class="req">*</span> ${infoIcon("The portion of authorised capital your shareholders commit to pay for now.")}</label><input class="field-input" type="number" data-ofield="subscribedCapital" value="${sc.subscribedCapital}" /></div>
        </div>
        <p class="shares-count">Number of shares: <strong>${shares.toLocaleString("en-IN")}</strong></p>

        <p class="section-label section-label-tight">Shareholders Split</p>
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

function computeDocumentList() {
  const docs = [];
  ["both", "owners", "directors"].forEach((group) => {
    incorporation.members[group].forEach((member, index) => {
      const label =
        member.type === "company"
          ? member.company.legalName || `Member ${index + 1} (Company)`
          : member.name || `${member.firstName} ${member.lastName}`.trim() || `Member ${index + 1}`;

      if (member.type === "individual") {
        docs.push({ id: `pan-${group}-${index}`, name: "PAN Card", why: "Required to verify identity for MCA filing.", who: label, formats: "PDF, JPG \u2014 up to 5 MB" });
        docs.push({ id: `idproof-${group}-${index}`, name: "Identity & Address Proof (Aadhaar / Passport / Voter ID)", why: "Used to verify identity and current address.", who: label, formats: "PDF, JPG \u2014 up to 5 MB" });
        docs.push({ id: `photo-${group}-${index}`, name: "Passport-size Photograph", why: "Required for the incorporation application.", who: label, formats: "JPG, PNG \u2014 up to 2 MB" });
        if (member.hasDin === "no") {
          docs.push({ id: `din-decl-${group}-${index}`, name: "Declaration for DIN Application", why: "Needed to apply for a new Director Identification Number.", who: label, formats: "PDF \u2014 up to 5 MB" });
        }
      } else {
        docs.push({ id: `coi-${group}-${index}`, name: "Certificate of Incorporation (Member Company)", why: "Confirms the member company's registration with MCA.", who: label, formats: "PDF \u2014 up to 5 MB" });
        docs.push({ id: `boardres-${group}-${index}`, name: "Board Resolution Authorising Representative", why: "Authorises the named representative to act on the company's behalf.", who: label, formats: "PDF \u2014 up to 5 MB" });
      }
    });
  });

  docs.push({ id: "office-address-proof", name: "Registered Office Address Proof", why: "Utility bill or rent agreement confirming your registered office.", who: "Company", formats: "PDF, JPG \u2014 up to 5 MB" });
  docs.push({ id: "noc", name: "No Objection Certificate (NOC) from Owner", why: "Required only if the registered office is rented or not owned by the company.", who: "Company", formats: "PDF \u2014 up to 5 MB" });
  docs.push({ id: "inc9", name: "INC-9 Declaration", why: "Declaration by first subscribers and directors, prepared for you to sign.", who: "All members", formats: "PDF \u2014 up to 5 MB" });
  docs.push({ id: "moa", name: "Memorandum of Association (MOA)", why: "Auto-generated by Zoho Start based on your company details.", who: "Zoho Start", formats: "Auto-prepared", notRequired: true });
  docs.push({ id: "aoa", name: "Articles of Association (AOA)", why: "Auto-generated by Zoho Start based on your company details.", who: "Zoho Start", formats: "Auto-prepared", notRequired: true });

  return docs;
}

function getDocState(doc) {
  if (!incorporation.documents[doc.id]) {
    incorporation.documents[doc.id] = { status: doc.notRequired ? "not_required" : "required", fileName: null };
  }
  return incorporation.documents[doc.id];
}

function renderDocCard(doc) {
  const state = getDocState(doc);
  const statusLabel = { required: "Required", uploaded: "Uploaded", under_review: "Under review", not_required: "Not required" }[state.status];
  const statusTone = { required: "warning", uploaded: "success", under_review: "info", not_required: "info" }[state.status];
  const actions =
    doc.notRequired
      ? ""
      : state.status === "uploaded" || state.status === "under_review"
      ? `
        <button type="button" class="btn btn-secondary btn-sm" data-action="doc-preview" data-doc="${doc.id}">Preview</button>
        <button type="button" class="btn btn-secondary btn-sm" data-action="doc-replace" data-doc="${doc.id}">Replace</button>
        <button type="button" class="btn btn-secondary btn-sm" data-action="doc-remove" data-doc="${doc.id}">Remove</button>`
      : `<button type="button" class="btn btn-primary btn-sm" data-action="doc-upload" data-doc="${doc.id}">Upload</button>`;

  return `
    <div class="doc-card">
      <div class="doc-card-top">
        <p class="doc-card-title">${doc.name}</p>
        <span class="badge badge-${statusTone}">${statusLabel}</span>
      </div>
      <p class="doc-card-why">${doc.why}</p>
      <p class="doc-card-meta">Provided by: <strong>${doc.who}</strong> &middot; ${doc.formats}</p>
      ${state.fileName ? `<p class="doc-card-file">\uD83D\uDCCE ${state.fileName}</p>` : ""}
      <div class="doc-card-actions">${actions}</div>
    </div>`;
}

function allRequiredDocsUploaded(docs) {
  return docs.every((doc) => getDocState(doc).status !== "required");
}

function renderDocumentsStep() {
  const docs = computeDocumentList();
  return `
    <h1 class="wizard-title">Let's collect your documents</h1>
    <p class="wizard-subtitle">Upload the documents required to prepare and submit your incorporation application.</p>
    <div class="info-box doc-info-banner">
      <span aria-hidden="true">\u24D8</span>
      We'll tell you if any additional documents are needed.
    </div>
    <div class="doc-grid">
      ${docs.map((doc) => renderDocCard(doc)).join("")}
    </div>
    <div class="wizard-actions is-split">
      <button class="btn btn-secondary btn-arrow-left" data-action="incorp-previous">Previous</button>
      <button class="btn btn-primary btn-arrow" data-action="incorp-continue" ${allRequiredDocsUploaded(docs) ? "" : "disabled"}>Continue</button>
    </div>`;
}

/* ---------- Step 5: Review & payment ---------- */

function computeIncorpPaymentTotals() {
  const govFee = 6499;
  const serviceFee = 1499;
  const gst = Math.round(serviceFee * 0.18);
  const total = govFee + serviceFee + gst;
  return { govFee, serviceFee, gst, total };
}

function renderReviewPaymentStep() {
  const { govFee, serviceFee, gst, total } = computeIncorpPaymentTotals();
  const allMembers = [...incorporation.members.both, ...incorporation.members.owners, ...incorporation.members.directors];
  const docs = computeDocumentList();
  const uploadedCount = docs.filter((d) => getDocState(d).status === "uploaded").length;
  const requiredCount = docs.filter((d) => !d.notRequired).length;

  return `
    <h1 class="wizard-title">Review &amp; payment</h1>
    <p class="wizard-subtitle">Check everything below before we submit your incorporation application to MCA.</p>

    <div class="review-card">
      <div class="review-card-head"><p class="section-label">Company</p></div>
      <div class="review-row"><span>Company name</span><strong>${companyDisplayName()}</strong></div>
      <div class="review-row"><span>Registration state</span><strong>${COMPANY.registrationState}</strong></div>
      <div class="review-row"><span>Company type</span><strong>Private Limited</strong></div>
      <p class="review-locked-note">Approved by MCA \u2014 name and state can't be changed at this stage.</p>
    </div>

    <div class="review-card">
      <div class="review-card-head"><p class="section-label">Members (${allMembers.length})</p><button type="button" class="edit-link" data-action="incorp-edit" data-step="2">Edit</button></div>
      ${allMembers
        .map((m, i) => {
          const name = m.type === "company" ? m.company.legalName || "Company member" : m.name || `${m.firstName} ${m.lastName}`.trim() || `Member ${i + 1}`;
          return `<div class="review-row"><span>${name}</span><strong>${m.type === "company" ? "Company" : "Individual"}</strong></div>`;
        })
        .join("")}
    </div>

    <div class="review-card">
      <div class="review-card-head"><p class="section-label">Registered Office</p><button type="button" class="edit-link" data-action="incorp-edit" data-step="3">Edit</button></div>
      <div class="review-row"><span>Address</span><strong>${
        incorporation.office.sameAsCommAddress === "no"
          ? `${incorporation.office.line1}, ${incorporation.office.city}, ${incorporation.office.state}`
          : "Same as business/communication address"
      }</strong></div>
    </div>

    <div class="review-card">
      <div class="review-card-head"><p class="section-label">Share Capital</p><button type="button" class="edit-link" data-action="incorp-edit" data-step="3">Edit</button></div>
      <div class="review-row"><span>Authorised capital</span><strong>\u20B9${incorporation.shareCapital.authorizedCapital.toLocaleString("en-IN")}</strong></div>
      <div class="review-row"><span>Subscribed capital</span><strong>\u20B9${incorporation.shareCapital.subscribedCapital.toLocaleString("en-IN")}</strong></div>
    </div>

    <div class="review-card">
      <div class="review-card-head"><p class="section-label">Documents</p><button type="button" class="edit-link" data-action="incorp-edit" data-step="4">Edit</button></div>
      <div class="review-row"><span>Uploaded</span><strong>${uploadedCount} of ${requiredCount}</strong></div>
    </div>

    <div class="payment-grid payment-grid-single">
      <div class="summary-card-dark">
        <h4>Payment Summary</h4>
        <div class="summary-row"><span>MCA / Government filing fee</span><span>\u20B9${govFee.toLocaleString("en-IN")}</span></div>
        <div class="summary-row"><span>Zoho Start service fee</span><span>\u20B9${serviceFee.toLocaleString("en-IN")}</span></div>
        <div class="summary-row"><span>GST (18% on service fee)</span><span>\u20B9${gst.toLocaleString("en-IN")}</span></div>
        <hr class="summary-divider" />
        <div class="summary-total"><span>Total Payable</span><span class="summary-total-value">\u20B9${total.toLocaleString("en-IN")}</span></div>
      </div>
    </div>
    <p class="contact-intro">This is the final incorporation payment. We'll submit your incorporation application to MCA only after this payment is received.</p>

    <div class="after-pay-card">
      <p class="section-label">What happens next?</p>
      <ul class="after-pay-list">
        <li><span class="after-pay-num">1</span> We'll review your details and documents.</li>
        <li><span class="after-pay-num">2</span> We'll prepare the incorporation forms.</li>
        <li><span class="after-pay-num">3</span> You'll pay the applicable filing and government charges.</li>
        <li><span class="after-pay-num">4</span> We'll submit your application to MCA and keep you updated on its status.</li>
      </ul>
    </div>

    <div class="wizard-actions is-split">
      <button class="btn btn-secondary btn-arrow-left" data-action="incorp-previous">Previous</button>
      <button class="btn btn-primary btn-arrow" data-action="incorp-pay">Pay \u20B9${total.toLocaleString("en-IN")}</button>
    </div>`;
}

/* ---------- Wizard shell ---------- */

function renderIncorporationView() {
  const stepRenderers = { 2: renderMembersStep, 3: renderCompanyDetailsStep, 4: renderDocumentsStep, 5: renderReviewPaymentStep };
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
  const order = ["details_incomplete", "ready_for_filing", "submitted", "incorporated"];
  const idx = order.indexOf(currentStage);
  const labels = [
    "Provide incorporation details",
    "Final review & payment",
    "Submitted to MCA",
    "Company incorporated",
  ];
  return labels.map((label, i) => {
    let state;
    if (idx === -1) {
      state = "upcoming"; // name_review or name_approved: not started yet
    } else if (i < idx) {
      state = "done";
    } else if (i === idx) {
      state = currentStage === "incorporated" ? "done" : "current";
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
         <button class="btn btn-primary" data-action="${status.cta.action || "advance"}" data-next="${status.cta.next || ""}">${status.cta.label}</button>
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
            <button class="demo-opt ${currentStage === "submitted" ? "active" : ""}" data-stage="submitted">Submitted to MCA</button>
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

// Reads every [data-ofield] input for the Company Details step (office/business/share capital) into state.
function captureCompanyDetailsStep() {
  const container = document.getElementById("company-details-step");
  if (!container) return;
  container.querySelectorAll("[data-ofield]").forEach((input) => {
    const field = input.dataset.ofield;
    const value = input.type === "radio" ? (input.checked ? input.value : null) : input.value;
    if (value === null) return;
    if (field === "desc") incorporation.business.desc = value;
    else if (field === "authorizedCapital" || field === "shareValue" || field === "subscribedCapital") {
      incorporation.shareCapital[field] = Number(value) || 0;
    } else if (field === "sameAsCommAddress") {
      incorporation.office.sameAsCommAddress = value;
    } else {
      incorporation.office[field] = value;
    }
  });
  const holders = getAllShareholders();
  container.querySelectorAll("[data-split-index]").forEach((input) => {
    const idx = Number(input.dataset.splitIndex);
    if (holders[idx]) holders[idx].member.ownershipPercent = Number(input.value) || 0;
  });
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
  }
});

// Toggle the NIC code dropdown based on the "not sure" checkbox.
document.addEventListener("change", (e) => {
  if (e.target.id === "nic-unsure") {
    const nicSelect = document.getElementById("nic-code");
    const infoBox = document.getElementById("nic-info-box");
    const unsure = e.target.checked;
    if (nicSelect) nicSelect.disabled = unsure;
    if (infoBox) infoBox.style.display = unsure ? "" : "none";
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
