// Zoho Books — Support Assistant prototype
// All data below is mocked for demonstration purposes only.

/* ============================== Mock content ============================== */

const FAQS = [
  {
    id: "faq-create-invoice",
    type: "faq",
    category: "Invoices",
    title: "How do I create a new invoice?",
    summary: "Create and send a professional invoice to your customer in under a minute.",
    body: [
      { kind: "p", text: "Invoices in Zoho Books let you bill customers for goods or services and track payments against them." },
      { kind: "h4", text: "Steps" },
      { kind: "steps", items: [
        "Go to Sales > Invoices.",
        "Click + New Invoice in the top right.",
        "Select a customer and add line items with quantity and price.",
        "Review taxes and terms, then click Save and Send."
      ]},
      { kind: "screenshot", caption: "Invoice creation screen with line items" },
      { kind: "note", text: "You can save frequently used line items as an Item to speed up future invoices." },
      { kind: "warning", text: "Invoices marked as Draft are not counted in your receivables until they are sent or marked Approved." }
    ],
    related: [{ type: "video", id: "vid-first-invoice" }, { type: "doc", id: "doc-recurring" }]
  },
  {
    id: "faq-configure-gst",
    type: "faq",
    category: "Taxes",
    title: "How do I configure GST for my organization?",
    summary: "Enable GST and set up tax rates so they apply automatically on new transactions.",
    body: [
      { kind: "p", text: "GST settings determine how tax is calculated and displayed on your invoices and reports." },
      { kind: "h4", text: "Steps" },
      { kind: "steps", items: [
        "Go to Settings > Taxes > GST Settings.",
        "Enter your GSTIN and place of supply.",
        "Choose applicable tax rates (e.g. GST5, GST12, GST18).",
        "Set a default tax preference for new items and customers."
      ]},
      { kind: "note", text: "GST rates set here apply automatically to new items — existing items must be updated manually." }
    ],
    related: [{ type: "faq", id: "faq-gst-reports" }, { type: "doc", id: "doc-gst-setup" }]
  },
  {
    id: "faq-record-payment",
    type: "faq",
    category: "Payments",
    title: "How do I record a payment received against an invoice?",
    summary: "Match an incoming payment to one or more open invoices to keep receivables accurate.",
    body: [
      { kind: "p", text: "Recording payments keeps your customer balances and bank accounts in sync." },
      { kind: "h4", text: "Steps" },
      { kind: "steps", items: [
        "Open the invoice, or go to Sales > Payments Received.",
        "Click Record Payment.",
        "Choose the payment mode and deposit account.",
        "Enter the amount received and save."
      ]},
      { kind: "warning", text: "Partial payments leave the invoice status as Partially Paid until the full amount is settled." }
    ],
    related: [{ type: "faq", id: "faq-create-invoice" }]
  },
  {
    id: "faq-gst-reports",
    type: "faq",
    category: "Taxes",
    title: "Where can I find GST filing reports?",
    summary: "Locate GSTR-1 and GSTR-3B summaries generated from your transactions.",
    body: [
      { kind: "p", text: "Zoho Books compiles your sales and purchase data into ready-to-file GST reports." },
      { kind: "h4", text: "Steps" },
      { kind: "steps", items: [
        "Go to Reports > Taxes.",
        "Select GSTR-1 or GSTR-3B for the filing period.",
        "Review the summary and export as JSON or Excel."
      ]}
    ],
    related: [{ type: "faq", id: "faq-configure-gst" }]
  },
  {
    id: "faq-recurring-invoice",
    type: "faq",
    category: "Invoices",
    title: "Can I automate invoices for recurring customers?",
    summary: "Set up a recurring profile once and let Zoho Books generate and send invoices on schedule.",
    body: [
      { kind: "p", text: "Recurring Invoices automatically generate a new invoice at a frequency you define." },
      { kind: "h4", text: "Steps" },
      { kind: "steps", items: [
        "Go to Sales > Recurring Invoices > + New.",
        "Add the customer, items and repeat frequency.",
        "Enable Auto-send if you want it emailed automatically."
      ]}
    ],
    related: [{ type: "video", id: "vid-recurring" }]
  }
];

const DOCS = [
  {
    id: "doc-getting-started",
    type: "doc",
    category: "Getting Started",
    title: "Getting started with Zoho Books",
    summary: "A quick orientation to organizations, chart of accounts, and your first transactions.",
    body: [
      { kind: "p", text: "This guide walks new users through the essential setup steps before recording daily transactions." },
      { kind: "h4", text: "In this guide" },
      { kind: "steps", items: [
        "Setting up your organization profile",
        "Adding your chart of accounts",
        "Inviting your team with the right roles"
      ]}
    ],
    related: [{ type: "doc", id: "doc-gst-setup" }]
  },
  {
    id: "doc-gst-setup",
    type: "doc",
    category: "Taxes",
    title: "Setting up GST for Indian businesses",
    summary: "Everything you need to configure GST correctly from day one.",
    body: [
      { kind: "p", text: "Covers GSTIN setup, place of supply rules, and reverse charge handling." },
      { kind: "note", text: "Applicable only for organizations registered in India." }
    ],
    related: [{ type: "faq", id: "faq-configure-gst" }]
  },
  {
    id: "doc-payment-gateways",
    type: "doc",
    category: "Payments",
    title: "Configuring online payment gateways",
    summary: "Connect Razorpay, PayPal or Stripe so customers can pay invoices online.",
    body: [
      { kind: "p", text: "Once connected, a Pay Now link is added automatically to invoice emails and PDFs." }
    ],
    related: []
  },
  {
    id: "doc-recurring",
    type: "doc",
    category: "Invoices",
    title: "Managing recurring invoices",
    summary: "Best practices for recurring profiles, proration, and cancellations.",
    body: [{ kind: "p", text: "Learn how to pause, edit, or stop a recurring profile without affecting past invoices." }],
    related: []
  },
  {
    id: "doc-bank-reco",
    type: "doc",
    category: "Banking",
    title: "Bank reconciliation guide",
    summary: "Match bank feed transactions with entries in Zoho Books.",
    body: [{ kind: "p", text: "Reconciling regularly keeps your books audit-ready." }],
    related: []
  }
];

const VIDEOS = [
  { id: "vid-first-invoice", type: "video", category: "Invoices", title: "Creating your first invoice", duration: "3:24", summary: "A walkthrough of the invoice creation flow, from customer selection to sending." },
  { id: "vid-gst-reports", type: "video", category: "Taxes", title: "Understanding GST reports", duration: "5:10", summary: "How GSTR-1 and GSTR-3B are generated from your transactions." },
  { id: "vid-recurring", type: "video", category: "Invoices", title: "Automating recurring invoices", duration: "4:02", summary: "Set up a recurring profile and enable auto-send." },
  { id: "vid-bank-feeds", type: "video", category: "Banking", title: "Setting up bank feeds", duration: "3:48", summary: "Connect your bank account for automatic transaction imports." }
];

const WHATS_NEW = [
  { id: "wn-bulk-reminders", type: "doc", category: "What's New", title: "New: Bulk invoice reminders", summary: "Send payment reminders for multiple overdue invoices in one action.", body: [{ kind: "p", text: "Available under Sales > Invoices > Bulk Actions > Send Reminders." }], related: [] },
  { id: "wn-bank-matching", type: "doc", category: "What's New", title: "Improved: Bank feed matching", summary: "Smarter suggestions when matching imported bank transactions.", body: [{ kind: "p", text: "Matching accuracy has been improved using your historical categorization." }], related: [] }
];

function findItem(type, id) {
  const pools = { faq: FAQS, doc: [...DOCS, ...WHATS_NEW], video: VIDEOS };
  return (pools[type] || []).find((i) => i.id === id);
}

const AI_RESPONSES = [
  {
    keywords: ["invoice", "bill customer"],
    summary: "Here's how to create and send a new invoice to a customer.",
    steps: ["Go to Sales > Invoices.", "Click + New Invoice.", "Add the customer and line items.", "Click Save and Send."],
    tips: "Save commonly billed items as Items so you don't re-enter pricing each time.",
    actions: ["Open Invoice Settings", "Create New Invoice"],
    related: [{ type: "faq", id: "faq-create-invoice" }, { type: "video", id: "vid-first-invoice" }]
  },
  {
    keywords: ["gst", "tax"],
    summary: "You can enable and configure GST from your tax settings.",
    steps: ["Go to Settings > Taxes > GST Settings.", "Enter your GSTIN and place of supply.", "Select the tax rates you need."],
    tips: "Rates apply only to new items — update existing items manually if rates change.",
    actions: ["Configure GST"],
    related: [{ type: "faq", id: "faq-configure-gst" }, { type: "doc", id: "doc-gst-setup" }]
  },
  {
    keywords: ["payment", "record payment", "receive"],
    summary: "Recording a payment links it to the invoice and updates your receivables.",
    steps: ["Open the invoice, or go to Payments Received.", "Click Record Payment.", "Enter the amount and deposit account."],
    tips: "Partial payments keep the invoice marked Partially Paid until fully settled.",
    actions: ["Open Invoice Settings"],
    related: [{ type: "faq", id: "faq-record-payment" }]
  },
  {
    keywords: ["recurring"],
    summary: "Recurring Invoices can generate and send invoices on a schedule automatically.",
    steps: ["Go to Sales > Recurring Invoices > + New.", "Set the customer, items and frequency.", "Turn on Auto-send if needed."],
    tips: "Pausing a recurring profile doesn't affect invoices already generated.",
    actions: ["Create New Invoice"],
    related: [{ type: "video", id: "vid-recurring" }, { type: "doc", id: "doc-recurring" }]
  }
];

const DEFAULT_AI_RESPONSE = {
  summary: "I can help with that. Here are a few places to start — you can also browse Resources for detailed guides.",
  steps: ["Try describing the exact screen or feature you're on.", "Check Resources for a related FAQ or guide.", "Or switch to a Support Specialist if you'd like a person to take over."],
  tips: "The more specific your question, the more precise the guidance I can give.",
  actions: [],
  related: [{ type: "faq", id: "faq-create-invoice" }, { type: "doc", id: "doc-getting-started" }]
};

const STARTER_PROMPTS = [
  "How do I create an invoice?",
  "How do I configure GST?",
  "How do I record a payment?"
];

const SUPPORT_INFO = {
  phone: { hours: "Mon – Fri • 9:00 AM – 7:00 PM", region: "India • 1800 572 6671" }
};

/* ============================== State ============================== */

const state = {
  scenario: "ai-human", // 'ai-only' | 'ai-human' | 'human-only'
  open: false,
  activeTab: null, // 'chat' | 'resources' | 'support'
  view: "welcome",
  meta: {},
  stack: [],
  navDirection: "forward",
  chat: { messages: [], liveAgent: false, conversationId: null, typing: null },
  conversations: [
    {
      id: "conv-1",
      title: "Configuring GST for a new business",
      date: "Aug 3",
      preview: "You: How do I enable GST for my organization...",
      liveAgent: false,
      messages: [
        { role: "user", text: "How do I enable GST for my organization?", time: "Aug 3, 10:12 AM" },
        { role: "ai", time: "Aug 3, 10:12 AM", data: AI_RESPONSES[1] }
      ]
    },
    {
      id: "conv-2",
      title: "Invoice not reaching customer's inbox",
      date: "Jul 28",
      preview: "Agent: I checked your email settings and...",
      liveAgent: true,
      messages: [
        { role: "user", text: "My customer says they never received the invoice email.", time: "Jul 28, 3:40 PM" },
        { role: "system", text: "You're now connected with a Support Specialist", time: "Jul 28, 3:41 PM" },
        { role: "agent", text: "I checked your email settings and noticed the sender domain wasn't verified yet. I've fixed that — please ask them to check spam once more.", time: "Jul 28, 3:44 PM" }
      ]
    }
  ]
};

function scenarioAllowsHuman() { return state.scenario === "ai-human" || state.scenario === "human-only"; }
function scenarioIsHumanOnly() { return state.scenario === "human-only"; }
function scenarioIsAiOnly() { return state.scenario === "ai-only"; }

/* ============================== DOM refs ============================== */

const fabEl = document.getElementById("support-fab");
const panelEl = document.getElementById("support-panel");
const headerEl = document.getElementById("panel-header");
const bodyEl = document.getElementById("panel-body");
const footerEl = document.getElementById("panel-footer");

let toastTimer = null;

/* ============================== Navigation helpers ============================== */

function pushView(view, meta = {}) {
  state.stack.push({ view: state.view, meta: state.meta });
  state.view = view;
  state.meta = meta;
  state.navDirection = "forward";
  render();
}

function replaceView(view, meta = {}) {
  state.view = view;
  state.meta = meta;
  state.navDirection = "forward";
  render();
}

function backView() {
  const prev = state.stack.pop();
  if (prev) {
    state.view = prev.view;
    state.meta = prev.meta;
  } else if (state.activeTab) {
    state.view = state.activeTab;
    state.meta = {};
  } else {
    state.view = "welcome";
    state.meta = {};
  }
  state.navDirection = "back";
  render();
}

function switchTab(tab) {
  state.activeTab = tab;
  state.view = tab;
  state.meta = {};
  state.stack = [];
  state.navDirection = "forward";
  render();
}

function openDetail(type, id) {
  const isDetailView = ["faq-detail", "doc-detail", "video-detail"].includes(state.view);
  if (isDetailView) {
    replaceView(`${type}-detail`, { id });
  } else {
    pushView(`${type}-detail`, { id });
  }
}

/* ============================== Panel open/close/restart ============================== */

function openPanel() {
  state.open = true;
  panelEl.hidden = false;
  fabEl.classList.add("is-open");
  fabEl.setAttribute("aria-expanded", "true");
  render();
}

function closePanel() {
  state.open = false;
  panelEl.hidden = true;
  fabEl.classList.remove("is-open");
  fabEl.setAttribute("aria-expanded", "false");
}

function restartAssistant() {
  state.activeTab = null;
  state.view = "welcome";
  state.meta = {};
  state.stack = [];
  state.chat = { messages: [], liveAgent: scenarioIsHumanOnly(), conversationId: null, typing: null };
  render();
}

/* ============================== Toast ============================== */

function showToast(message) {
  clearTimeout(toastTimer);
  let el = bodyEl.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    bodyEl.appendChild(el);
  }
  el.textContent = message;
  requestAnimationFrame(() => el.classList.add("show"));
  toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
}

/* ============================== Chat logic ============================== */

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function matchAiResponse(text) {
  const lower = text.toLowerCase();
  const found = AI_RESPONSES.find((r) => r.keywords.some((k) => lower.includes(k)));
  return found || DEFAULT_AI_RESPONSE;
}

function sendChatMessage(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  if (!state.chat.conversationId) {
    state.chat.conversationId = "conv-" + Date.now();
  }
  state.chat.messages.push({ role: "user", text: trimmed, time: timeNow() });

  const respondAsAgent = state.chat.liveAgent || scenarioIsHumanOnly();
  state.chat.typing = respondAsAgent ? "agent" : "ai";
  render();

  const delay = 900 + Math.random() * 700;
  setTimeout(() => {
    state.chat.typing = null;
    if (respondAsAgent) {
      state.chat.messages.push({
        role: "agent",
        text: "Thanks for the details — I can help with that directly. Give me a moment while I check your account.",
        time: timeNow()
      });
    } else {
      state.chat.messages.push({ role: "ai", data: matchAiResponse(trimmed), time: timeNow() });
    }
    upsertConversation();
    render();
    scrollChatToBottom();
  }, delay);

  scrollChatToBottom();
}

function switchToLiveAgent() {
  state.chat.messages.push({ role: "system", text: "Connecting you to a Support Specialist…", time: timeNow() });
  render();
  scrollChatToBottom();
  setTimeout(() => {
    state.chat.liveAgent = true;
    state.chat.messages.push({ role: "system", text: "You're now connected with a Support Specialist", time: timeNow() });
    state.chat.messages.push({
      role: "agent",
      text: "Hi, I'm Priya from Zoho Books Support. I can see everything we've discussed so far — let's pick up right where you left off.",
      time: timeNow()
    });
    upsertConversation();
    render();
    scrollChatToBottom();
  }, 1100);
}

function upsertConversation() {
  if (!state.chat.conversationId || state.chat.messages.length === 0) return;
  const firstUserMsg = state.chat.messages.find((m) => m.role === "user");
  const title = firstUserMsg ? firstUserMsg.text.slice(0, 48) : "New conversation";
  const last = state.chat.messages[state.chat.messages.length - 1];
  const preview =
    (last.role === "user" ? "You: " : last.role === "agent" ? "Agent: " : last.role === "system" ? "" : "Assistant: ") +
    (last.text || last.data?.summary || "").slice(0, 60);
  const existing = state.conversations.find((c) => c.id === state.chat.conversationId);
  const entry = {
    id: state.chat.conversationId,
    title,
    preview,
    date: "Today",
    liveAgent: state.chat.liveAgent,
    messages: state.chat.messages.slice()
  };
  if (existing) {
    Object.assign(existing, entry);
  } else {
    state.conversations.unshift(entry);
  }
}

function openConversation(id) {
  const conv = state.conversations.find((c) => c.id === id);
  if (!conv) return;
  state.chat = { messages: conv.messages.slice(), liveAgent: conv.liveAgent, conversationId: conv.id, typing: null };
  backView();
  setTimeout(scrollChatToBottom, 30);
}

function scrollChatToBottom() {
  requestAnimationFrame(() => {
    const thread = bodyEl.querySelector(".chat-scroll");
    if (thread) thread.scrollTop = thread.scrollHeight;
  });
}

/* ============================== Render: header ============================== */

const TAB_TITLES = { chat: "Support Assistant", resources: "Support Assistant", support: "Support Assistant" };
const SUBVIEW_TITLES = {
  "chat-history": "Previous Conversations",
  "resources-explorer": "Explore Resources",
  "faq-detail": "FAQ",
  "doc-detail": "Guide",
  "video-detail": "Video",
  "support-email": "Send Email",
  "support-record": "Record & Share"
};

function renderHeader() {
  const isSub = Object.prototype.hasOwnProperty.call(SUBVIEW_TITLES, state.view);
  if (isSub) {
    headerEl.innerHTML = `
      <div class="header-left">
        <button class="back-btn" data-action="back" aria-label="Back">←</button>
        <span class="header-title">${SUBVIEW_TITLES[state.view]}</span>
      </div>
      <div class="header-actions">
        <button class="icon-btn" data-action="close-panel" aria-label="Close">✕</button>
      </div>
    `;
    return;
  }
  headerEl.innerHTML = `
    <div class="header-left">
      <span class="header-brand-icon">B</span>
      <div>
        <div class="header-title">Support Assistant</div>
        <div class="header-subtitle">Zoho Books</div>
      </div>
    </div>
    <div class="header-actions">
      <button class="icon-btn" data-action="restart" aria-label="Restart" title="Start over">⟲</button>
      <button class="icon-btn" data-action="close-panel" aria-label="Close">✕</button>
    </div>
  `;
}

/* ============================== Render: footer ============================== */

function renderFooter() {
  const tabs = [
    { id: "chat", label: "Chat", icon: "💬" },
    { id: "resources", label: "Resources", icon: "📚" },
    { id: "support", label: "Support", icon: "🎧" }
  ];
  footerEl.innerHTML = tabs
    .map(
      (t) => `
      <button class="tab-btn ${state.activeTab === t.id ? "active" : ""}" data-action="switch-tab" data-tab="${t.id}">
        <span class="tab-icon">${t.icon}</span>
        <span>${t.label}</span>
      </button>`
    )
    .join("");
}

/* ============================== Render: views ============================== */

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderWelcome() {
  return `
    <div class="view welcome-view">
      <div class="welcome-brand">B</div>
      <h2 class="welcome-title">How can we help you today?</h2>
      <p class="welcome-subtitle">Chat with us, explore self-help resources, or reach the support team directly.</p>
      <button class="btn-primary-pill btn-block welcome-cta" data-action="start-conversation">Start Conversation</button>
      <div class="welcome-links">
        <button class="welcome-link-btn" data-action="switch-tab" data-tab="resources"><span>Browse Resources</span><span>›</span></button>
        <button class="welcome-link-btn" data-action="switch-tab" data-tab="support"><span>Contact Support</span><span>›</span></button>
      </div>
    </div>
  `;
}

function renderMessage(msg) {
  const time = `<div class="msg-time">${msg.time || ""}</div>`;
  if (msg.role === "user") {
    return `<div class="msg-row from-user"><div class="bubble-user">${escapeHtml(msg.text)}</div>${time}</div>`;
  }
  if (msg.role === "system") {
    return `<div class="msg-row from-system"><div class="system-pill">${escapeHtml(msg.text)}</div></div>`;
  }
  if (msg.role === "agent") {
    return `
      <div class="msg-row from-agent">
        <div class="msg-sender"><span class="sender-badge agent">SP</span>Support Specialist</div>
        <div class="bubble-plain">${escapeHtml(msg.text)}</div>
        ${time}
      </div>`;
  }
  // ai structured
  const d = msg.data;
  const stepsHtml = d.steps?.length
    ? `<div class="ai-card-section"><div class="ai-card-section-title">Steps</div><ol class="ai-steps">${d.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol></div>`
    : "";
  const tipsHtml = d.tips
    ? `<div class="ai-card-section"><div class="ai-card-section-title">Tip</div><div class="ai-tips">💡 ${escapeHtml(d.tips)}</div></div>`
    : "";
  const actionsHtml = d.actions?.length
    ? `<div class="ai-card-section"><div class="ai-card-section-title">Quick Actions</div><div class="ai-actions">${d.actions
        .map((a) => `<button class="ai-action-link" data-action="simulated-action" data-label="${escapeHtml(a)}">${escapeHtml(a)}</button>`)
        .join("")}</div></div>`
    : "";
  const relatedHtml = d.related?.length
    ? `<div class="ai-card-section"><div class="ai-card-section-title">Related</div><div class="ai-related">${d.related
        .map((r) => {
          const item = findItem(r.type, r.id);
          if (!item) return "";
          const icon = r.type === "video" ? "▶" : r.type === "faq" ? "❓" : "📄";
          return `<button class="ai-related-link" data-action="open-related" data-type="${r.type}" data-id="${r.id}">${icon} ${escapeHtml(item.title)}</button>`;
        })
        .join("")}</div></div>`
    : "";
  return `
    <div class="msg-row from-ai">
      <div class="msg-sender"><span class="sender-badge ai">B</span>Books Assistant</div>
      <div class="ai-card">
        <p class="ai-card-summary">${escapeHtml(d.summary)}</p>
        ${stepsHtml}${tipsHtml}${actionsHtml}${relatedHtml}
      </div>
      ${time}
    </div>`;
}

function renderChat() {
  const hasMessages = state.chat.messages.length > 0;
  const canOfferLiveAgent = scenarioAllowsHuman() && !scenarioIsHumanOnly();
  const liveAgentControl = !canOfferLiveAgent
    ? ""
    : state.chat.liveAgent
    ? `<span class="live-agent-status"><span class="live-dot"></span>Support Specialist</span>`
    : `<button class="live-agent-pill" data-action="switch-live-agent" title="Connect with a Support Specialist">🎧 Live Agent</button>`;
  const historyBar = `
    <div class="chat-topbar">
      <button class="history-link" data-action="open-chat-history">🕓 Previous Conversations</button>
      ${liveAgentControl}
    </div>`;

  if (!hasMessages) {
    const humanOnly = scenarioIsHumanOnly();
    const greetTitle = humanOnly ? "Hi, I'm here to help" : "Hi! I'm your Books Assistant";
    const greetSub = humanOnly
      ? "Ask a question and a Support Specialist will get back to you right away."
      : "Ask a question about Zoho Books and I'll walk you through it step by step.";
    return `
      <div class="view no-pad">
        ${historyBar}
        <div class="chat-empty">
          <div class="chat-avatar-lg">${humanOnly ? "🎧" : "B"}</div>
          <h3 class="chat-greeting-title">${greetTitle}</h3>
          <p class="chat-greeting-sub">${greetSub}</p>
          <div class="prompt-chips">
            ${STARTER_PROMPTS.map((p) => `<button class="prompt-chip" data-action="use-prompt" data-prompt="${escapeHtml(p)}">${escapeHtml(p)}</button>`).join("")}
          </div>
        </div>
        ${renderChatInputBar()}
      </div>
    `;
  }

  const typingHtml = state.chat.typing
    ? `<div class="msg-row from-ai">
        <div class="msg-sender"><span class="sender-badge ${state.chat.typing === "agent" ? "agent" : "ai"}">${state.chat.typing === "agent" ? "SP" : "B"}</span>${state.chat.typing === "agent" ? "Support Specialist" : "Books Assistant"}</div>
        <div class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>
      </div>`
    : "";

  return `
    <div class="view no-pad" style="display:flex; flex-direction:column; height:100%;">
      ${historyBar}
      <div class="chat-scroll" style="flex:1; overflow-y:auto;">
        <div class="chat-thread">
          ${state.chat.messages.map(renderMessage).join("")}
          ${typingHtml}
        </div>
      </div>
      ${renderChatInputBar()}
    </div>
  `;
}

function renderChatInputBar() {
  return `
    <form class="chat-input-bar" id="chat-form">
      <textarea class="chat-input" id="chat-input" rows="1" placeholder="Ask a question about Zoho Books..."></textarea>
      <button type="submit" class="chat-send-btn" id="chat-send-btn" disabled aria-label="Send">➤</button>
    </form>
  `;
}

function renderChatHistory() {
  const items = state.conversations;
  return `
    <div class="view">
      ${
        items.length === 0
          ? `<p class="empty-note">No previous conversations yet.</p>`
          : `<div class="history-list">${items
              .map(
                (c) => `
              <button class="history-item" data-action="select-conversation" data-id="${c.id}">
                <span class="history-item-title">${escapeHtml(c.title)}</span>
                <span class="history-item-preview">${escapeHtml(c.preview)}</span>
                <span class="history-item-date">${escapeHtml(c.date)}</span>
              </button>`
              )
              .join("")}</div>`
      }
    </div>
  `;
}

function resourceRow(item, iconClass = "") {
  const icon = item.type === "video" ? "▶" : item.type === "faq" ? "❓" : "📄";
  const meta = item.type === "video" ? `${item.category} · ${item.duration}` : item.category;
  return `
    <button class="res-row ${iconClass}" data-action="open-related" data-type="${item.type}" data-id="${item.id}">
      <span class="res-row-icon">${icon}</span>
      <span class="res-row-body">
        <div class="res-row-title">${escapeHtml(item.title)}</div>
        <div class="res-row-meta">${escapeHtml(meta)}</div>
      </span>
      <span class="res-row-chevron">›</span>
    </button>
  `;
}

function renderResourcesHome() {
  const faqs = FAQS.slice(0, 3);
  const docs = DOCS.slice(0, 3);
  const videos = VIDEOS.slice(0, 3);
  return `
    <div class="view">
      <div class="res-section">
        <div class="res-section-head">
          <span class="res-section-title">Frequently Asked Questions</span>
          <button class="view-more-link" data-action="view-more" data-filter="faq">View More</button>
        </div>
        ${faqs.map((f) => resourceRow(f)).join("")}
      </div>
      <div class="res-section">
        <div class="res-section-head">
          <span class="res-section-title">Help Documentation</span>
          <button class="view-more-link" data-action="view-more" data-filter="doc">View More</button>
        </div>
        ${docs.map((d) => resourceRow(d)).join("")}
      </div>
      <div class="res-section">
        <div class="res-section-head">
          <span class="res-section-title">Video Tutorials</span>
          <button class="view-more-link" data-action="view-more" data-filter="video">View More</button>
        </div>
        ${videos.map((v) => resourceRow(v, "res-video-row")).join("")}
      </div>
      <div class="res-section">
        <div class="res-section-head">
          <span class="res-section-title">What's New</span>
        </div>
        ${WHATS_NEW.map((w) => resourceRow(w)).join("")}
      </div>
    </div>
  `;
}

function renderResourcesExplorer() {
  const filter = state.meta.filter || "all";
  const query = (state.meta.query || "").toLowerCase();
  const all = [
    ...FAQS.map((i) => ({ ...i })),
    ...DOCS.map((i) => ({ ...i })),
    ...VIDEOS.map((i) => ({ ...i }))
  ];
  const filtered = all.filter((i) => {
    const matchesType = filter === "all" || i.type === filter;
    const matchesQuery = !query || i.title.toLowerCase().includes(query) || i.category.toLowerCase().includes(query);
    return matchesType && matchesQuery;
  });
  const chips = [
    { id: "all", label: "All" },
    { id: "faq", label: "FAQs" },
    { id: "doc", label: "Docs" },
    { id: "video", label: "Videos" }
  ];
  return `
    <div class="view">
      <div class="res-search">
        <span>🔎</span>
        <input type="text" id="explorer-search" placeholder="Search FAQs, guides, videos..." value="${escapeHtml(state.meta.query || "")}" />
      </div>
      <div class="res-filters">
        ${chips
          .map((c) => `<button class="filter-chip ${filter === c.id ? "active" : ""}" data-action="explorer-filter" data-filter="${c.id}">${c.label}</button>`)
          .join("")}
      </div>
      ${
        filtered.length === 0
          ? `<p class="empty-note">No results found. Try a different search term.</p>`
          : filtered.map((i) => resourceRow(i, i.type === "video" ? "res-video-row" : "")).join("")
      }
    </div>
  `;
}

function renderDetail(type) {
  const item = findItem(type, state.meta.id);
  if (!item) return `<div class="view"><p class="empty-note">This item is unavailable.</p></div>`;

  if (type === "video") {
    return `
      <div class="view">
        <div class="video-frame">
          <span class="video-play-btn">▶</span>
          <span class="video-duration">${escapeHtml(item.duration)}</span>
        </div>
        <div class="detail-category">${escapeHtml(item.category)}</div>
        <h3 class="detail-title">${escapeHtml(item.title)}</h3>
        <div class="detail-body"><p>${escapeHtml(item.summary)}</p></div>
        ${renderRelated(item)}
      </div>
    `;
  }

  const bodyHtml = (item.body || [])
    .map((b) => {
      if (b.kind === "p") return `<p>${escapeHtml(b.text)}</p>`;
      if (b.kind === "h4") return `<h4>${escapeHtml(b.text)}</h4>`;
      if (b.kind === "steps") return `<ol class="detail-steps">${b.items.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>`;
      if (b.kind === "screenshot") return `<div class="screenshot-frame"><div class="ss-icon">🖼️</div><div class="ss-caption">${escapeHtml(b.caption)}</div></div>`;
      if (b.kind === "note") return `<div class="callout note"><span class="callout-icon">ℹ️</span><span>${escapeHtml(b.text)}</span></div>`;
      if (b.kind === "warning") return `<div class="callout warning"><span class="callout-icon">⚠️</span><span>${escapeHtml(b.text)}</span></div>`;
      return "";
    })
    .join("");

  return `
    <div class="view">
      <div class="detail-hero">
        <div class="detail-category">${escapeHtml(item.category)}</div>
        <h3 class="detail-title">${escapeHtml(item.title)}</h3>
      </div>
      <div class="detail-body">${bodyHtml}</div>
      ${renderRelated(item)}
    </div>
  `;
}

function renderRelated(item) {
  if (!item.related || item.related.length === 0) return "";
  return `
    <div class="related-block">
      <div class="ai-card-section-title">Related Resources</div>
      <div class="ai-related">
        ${item.related
          .map((r) => {
            const rel = findItem(r.type, r.id);
            if (!rel) return "";
            const icon = r.type === "video" ? "▶" : r.type === "faq" ? "❓" : "📄";
            return `<button class="ai-related-link" data-action="open-related" data-type="${r.type}" data-id="${r.id}">${icon} ${escapeHtml(rel.title)}</button>`;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderSupportHome() {
  const showPhone = !scenarioIsAiOnly();
  return `
    <div class="view">
      ${
        showPhone
          ? `
      <div class="support-card" data-action="call-now">
        <div class="support-card-head"><span class="support-card-icon">📞</span><span class="support-card-title">Talk to Us</span></div>
        <div class="support-card-line">${SUPPORT_INFO.phone.hours}</div>
        <div class="support-card-line">${SUPPORT_INFO.phone.region}</div>
        <div class="support-card-cta">Call Now</div>
      </div>`
          : ""
      }
      <div class="support-card" data-action="open-email">
        <div class="support-card-head"><span class="support-card-icon">✉️</span><span class="support-card-title">Send Email</span></div>
        <div class="support-card-line">Report an issue or ask a question.</div>
        <div class="support-card-line">We usually respond within business hours.</div>
        <div class="support-card-cta">→ Send Email</div>
      </div>
      <div class="support-card" data-action="open-record">
        <div class="support-card-head"><span class="support-card-icon">🎥</span><span class="support-card-title">Record &amp; Share</span></div>
        <div class="support-card-line">Capture your screen to help us understand the issue faster.</div>
        <div class="support-card-cta">→ Start Recording</div>
      </div>
    </div>
  `;
}

function renderSupportEmail() {
  if (state.meta.submitted) {
    return `
      <div class="view success-view">
        <div class="success-icon">✓</div>
        <h3 class="success-title">Email sent</h3>
        <p class="success-sub">Our team will get back to you within business hours.</p>
        <button class="btn-primary-pill" data-action="back-to-support">Back to Support</button>
      </div>
    `;
  }
  const attachments = state.meta.attachments || [];
  return `
    <div class="view">
      <div class="form-group">
        <label class="form-label">Subject</label>
        <input type="text" class="form-control" id="email-subject" placeholder="Briefly describe the issue" value="${escapeHtml(state.meta.subject || "")}" />
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-control" id="email-description" placeholder="Share as much detail as you can">${escapeHtml(state.meta.description || "")}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Attachments</label>
        <button type="button" class="attach-btn" data-action="add-attachment">＋ Add screenshots or files</button>
        ${
          attachments.length
            ? `<div class="attach-list">${attachments
                .map((a, i) => `<div class="attach-chip"><span>📎 ${escapeHtml(a)}</span><button class="attach-remove" data-action="remove-attachment" data-index="${i}">✕</button></div>`)
                .join("")}</div>`
            : ""
        }
      </div>
      <div class="form-group">
        <label class="form-label">Mobile Number</label>
        <input type="tel" class="form-control" id="email-mobile" placeholder="Optional" value="${escapeHtml(state.meta.mobile || "")}" />
      </div>
      <div class="form-group">
        <label class="form-label">Priority</label>
        <select class="form-control" id="email-priority">
          ${["Low", "Medium", "High", "Urgent"].map((p) => `<option value="${p}" ${state.meta.priority === p ? "selected" : ""}>${p}</option>`).join("")}
        </select>
      </div>
      <button class="submit-btn" id="email-send-btn" data-action="send-email" ${!(state.meta.subject && state.meta.description) ? "disabled" : ""}>Send</button>
    </div>
  `;
}

function renderSupportRecord() {
  if (state.meta.submitted) {
    return `
      <div class="view success-view">
        <div class="success-icon">✓</div>
        <h3 class="success-title">Recording submitted</h3>
        <p class="success-sub">Thanks — our team will review your recording and follow up shortly.</p>
        <button class="btn-primary-pill" data-action="back-to-support">Back to Support</button>
      </div>
    `;
  }
  const recording = !!state.meta.recording;
  const recorded = !!state.meta.recordedSeconds;
  const seconds = state.meta.elapsed || 0;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `
    <div class="view">
      <div class="form-group">
        <label class="form-label">Issue Summary</label>
        <input type="text" class="form-control" id="record-summary" placeholder="e.g. Invoice PDF shows wrong tax amount" value="${escapeHtml(state.meta.summary || "")}" />
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-control" id="record-description" placeholder="Add any extra context">${escapeHtml(state.meta.description || "")}</textarea>
      </div>
      <div class="recording-tips">
        <div class="recording-tips-title">Recording Tips</div>
        <ul>
          <li>Reproduce the issue slowly, step by step.</li>
          <li>Mention what you expected to happen out loud.</li>
          <li>Keep the recording under 3 minutes.</li>
        </ul>
      </div>
      <div class="record-btn-row">
        <button class="record-btn ${recording ? "is-recording" : ""}" data-action="toggle-recording">
          ${recording ? '<span class="rec-dot"></span> Stop Recording' : "🔴 Start Recording"}
        </button>
        ${recording || recorded ? `<span class="record-timer">${mm}:${ss}</span>` : ""}
      </div>
      ${recorded && !recording ? `<p class="empty-note" style="padding:0 0 10px;">Recording ready (${mm}:${ss})</p>` : ""}
      <button class="submit-btn" id="record-submit-btn" data-action="submit-recording" ${!state.meta.summary ? "disabled" : ""}>Submit</button>
    </div>
  `;
}

/* ============================== Master render ============================== */

let recordTimerHandle = null;

function renderBody() {
  let html = "";
  switch (state.view) {
    case "welcome": html = renderWelcome(); break;
    case "chat": html = renderChat(); break;
    case "chat-history": html = renderChatHistory(); break;
    case "resources": html = renderResourcesHome(); break;
    case "resources-explorer": html = renderResourcesExplorer(); break;
    case "faq-detail": html = renderDetail("faq"); break;
    case "doc-detail": html = renderDetail("doc"); break;
    case "video-detail": html = renderDetail("video"); break;
    case "support": html = renderSupportHome(); break;
    case "support-email": html = renderSupportEmail(); break;
    case "support-record": html = renderSupportRecord(); break;
    default: html = renderWelcome();
  }
  bodyEl.innerHTML = html;
  const viewNode = bodyEl.querySelector(".view");
  if (viewNode && state.navDirection === "back") viewNode.classList.add("slide-back");
}

function render() {
  renderHeader();
  renderFooter();
  renderBody();
  afterRender();
}

function afterRender() {
  if (state.view === "chat") {
    const input = document.getElementById("chat-input");
    const sendBtn = document.getElementById("chat-send-btn");
    if (input) {
      input.addEventListener("input", () => {
        sendBtn.disabled = input.value.trim().length === 0;
        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 90) + "px";
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          document.getElementById("chat-form").requestSubmit();
        }
      });
    }
    scrollChatToBottom();
  }

  if (state.view === "resources-explorer") {
    const search = document.getElementById("explorer-search");
    if (search) {
      search.focus();
      search.setSelectionRange(search.value.length, search.value.length);
      search.addEventListener("input", () => {
        state.meta.query = search.value;
        render();
      });
    }
  }

  if (state.view === "support-record") {
    clearInterval(recordTimerHandle);
    if (state.meta.recording) {
      recordTimerHandle = setInterval(() => {
        state.meta.elapsed = (state.meta.elapsed || 0) + 1;
        const timerEl = bodyEl.querySelector(".record-timer");
        if (timerEl) {
          const s = state.meta.elapsed;
          timerEl.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
        } else {
          clearInterval(recordTimerHandle);
        }
      }, 1000);
    }
  }
}

/* ============================== Event delegation ============================== */

fabEl.addEventListener("click", openPanel);

panelEl.addEventListener("click", (e) => {
  const target = e.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  switch (action) {
    case "close-panel":
      closePanel();
      break;
    case "restart":
      restartAssistant();
      break;
    case "back":
      backView();
      break;
    case "start-conversation":
      switchTab("chat");
      break;
    case "switch-tab":
      switchTab(target.dataset.tab);
      break;
    case "open-chat-history":
      pushView("chat-history");
      break;
    case "select-conversation":
      openConversation(target.dataset.id);
      break;
    case "use-prompt":
      sendChatMessage(target.dataset.prompt);
      break;
    case "switch-live-agent":
      switchToLiveAgent();
      break;
    case "simulated-action":
      showToast(`Opening “${target.dataset.label}”…`);
      break;
    case "open-related":
      openDetail(target.dataset.type, target.dataset.id);
      break;
    case "view-more":
      pushView("resources-explorer", { filter: target.dataset.filter || "all", query: "" });
      break;
    case "explorer-filter":
      state.meta.filter = target.dataset.filter;
      render();
      break;
    case "call-now":
      showToast("Calling 1800 572 6671…");
      break;
    case "open-email":
      pushView("support-email", {});
      break;
    case "open-record":
      pushView("support-record", {});
      break;
    case "add-attachment":
      state.meta.attachments = state.meta.attachments || [];
      state.meta.attachments.push(`screenshot-${state.meta.attachments.length + 1}.png`);
      render();
      break;
    case "remove-attachment":
      state.meta.attachments.splice(Number(target.dataset.index), 1);
      render();
      break;
    case "send-email":
      state.meta.submitted = true;
      render();
      break;
    case "toggle-recording":
      if (state.meta.recording) {
        state.meta.recording = false;
        state.meta.recordedSeconds = state.meta.elapsed || 1;
      } else {
        state.meta.recording = true;
        state.meta.elapsed = 0;
      }
      render();
      break;
    case "submit-recording":
      state.meta.submitted = true;
      render();
      break;
    case "back-to-support":
      state.stack = [];
      replaceView("support", {});
      break;
    default:
      break;
  }
});

panelEl.addEventListener("submit", (e) => {
  if (e.target && e.target.id === "chat-form") {
    e.preventDefault();
    const input = document.getElementById("chat-input");
    const text = input.value;
    input.value = "";
    sendChatMessage(text);
  }
});

panelEl.addEventListener("input", (e) => {
  const map = {
    "email-subject": "subject",
    "email-description": "description",
    "email-mobile": "mobile",
    "record-summary": "summary",
    "record-description": "description"
  };
  if (map[e.target.id]) {
    state.meta[map[e.target.id]] = e.target.value;
    const sendBtn = document.getElementById("email-send-btn");
    if (sendBtn) sendBtn.disabled = !(state.meta.subject && state.meta.description);
    const submitBtn = document.getElementById("record-submit-btn");
    if (submitBtn) submitBtn.disabled = !state.meta.summary;
  }
});

panelEl.addEventListener("change", (e) => {
  if (e.target.id === "email-priority") state.meta.priority = e.target.value;
});

/* ============================== Demo scenario switcher ============================== */

document.getElementById("demo-switcher-options").addEventListener("click", (e) => {
  const btn = e.target.closest(".demo-opt");
  if (!btn) return;
  document.querySelectorAll(".demo-opt").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  state.scenario = btn.dataset.scenario;
  state.chat.liveAgent = scenarioIsHumanOnly();
  if (state.open) render();
});

/* ============================== Init ============================== */

render();
