const STORAGE_KEY = "BOUNTYX_PROGRAMS";

const listEl = document.getElementById("program-list");
const emptyEl = document.getElementById("empty-state");
const countEl = document.getElementById("count-badge");
const copyBtn = document.getElementById("copy-btn");
const copyLabel = document.getElementById("copy-label");
const chatgptBtn = document.getElementById("chatgpt-btn");
const chatgptLabel = document.getElementById("chatgpt-label");
const clearBtn = document.getElementById("clear-btn");
const searchInput = document.getElementById("search-input");
const searchClear = document.getElementById("search-clear");

let allPrograms = [];
let searchQuery = "";

function matchesQuery(p, q) {
  if (!q) return true;
  return (
    (p.title || "").toLowerCase().includes(q) ||
    (p.url || "").toLowerCase().includes(q)
  );
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function render() {
  listEl.innerHTML = "";
  const q = searchQuery.trim().toLowerCase();
  const filtered = allPrograms.filter((p) => matchesQuery(p, q));

  if (filtered.length === 0) {
    emptyEl.classList.remove("hidden");
    countEl.classList.add("hidden");
    if (q) {
      emptyEl.innerHTML = `<div class="empty-icon">🔍</div><p><strong>No results for "<em>${escapeHtml(
        searchQuery.trim()
      )}</em>"</strong></p><p>Try a different keyword or clear the search.</p>`;
    } else {
      emptyEl.innerHTML =
        '<div class="empty-icon">🎯</div><p><strong>No bug bounty programs tracked yet</strong></p><p>Browse pages containing keywords like <em>bounty</em>, <em>reward</em>, <em>monetary</em>, <em>eligible targets</em> and they\'ll be saved here.</p>';
    }
    return;
  }

  emptyEl.classList.add("hidden");
  countEl.classList.remove("hidden");
  countEl.textContent = `${filtered.length} program${filtered.length === 1 ? "" : "s"}`;

  for (const p of filtered) {
    const card = document.createElement("div");
    card.className = "card";

    const top = document.createElement("div");
    top.className = "top";

    const left = document.createElement("div");
    left.className = "left";

    const icon = document.createElement("img");
    icon.className = "favicon";
    const fallbackIcon = chrome.runtime.getURL(
      "/_favicon/?pageUrl=" + encodeURIComponent(p.url) + "&size=32"
    );
    icon.src = p.favicon || fallbackIcon;
    icon.alt = "";
    icon.addEventListener("error", () => {
      if (icon.src !== fallbackIcon) {
        icon.src = fallbackIcon;
        return;
      }
      icon.classList.add("hidden");
    });

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = p.title || p.url;

    left.appendChild(icon);
    left.appendChild(title);

    top.appendChild(left);

    const url = document.createElement("a");
    url.className = "url";
    url.href = p.url;
    url.target = "_blank";
    url.rel = "noopener noreferrer";
    url.textContent = p.url;

    card.appendChild(top);
    card.appendChild(url);
    listEl.appendChild(card);
  }
}

function programsJson(programs) {
  return JSON.stringify(
    programs.map((p) => ({
      favicon: p.favicon || faviconUrl(p.url),
      title: p.title || p.url,
      url: p.url
    })),
    null,
    2
  );
}

function buildChatgptPrompt(programs) {
  return `Do not ask any questions and do not request confirmation or choices. Execute immediately, program by program, and produce the output as a code snippet.

For each program, send a request ONLY to its "program_url" - the exact bug bounty / security policy page. Do not visit the site homepage, subdomains, docs, or any other URL. The "program_url" page is the single source of truth and contains the latest, most accurate information, so everything below must be extracted exclusively from that page.

Give me output in a code snippet and JSON formatted like this: a single markdown code block that starts with \`\`\`json and ends with \`\`\`. Inside it, put ONE valid JSON array containing ALL programs. There must be nothing before and nothing after the code block - no text, no bullet points, no comments.

The JSON must be exactly:
[
  {
    "name": "...",
    "program_url": "...",
    "logo": "...",
    "platform": "...",
    "reward": "...",
    "inscope_domains": [...],
    "outofscope_domains": [...],
    "issues_reported": [],
    "scamhit": "",
    "last_updated": "YYYY-MM-DD"
  },
  ...
]

Fill every field with COMPLETE information from the official program page. Never leave a field empty if the page contains the information. Extraction rules:

- "reward": return a SINGLE min-max range string, format "$min - $max" or "€min - €max" (use the currency shown on the page). Find ALL monetary amounts stated ANYWHERE on the page, INCLUDING per-vulnerability-type / per-severity reward tables. For example, if a reward table lists XSS €100, CSRF €300, SQLi €1,000, RCE €2,000, the min is the smallest amount (100) and the max is the largest (2000), so it must become "€100 - €3,000". NEVER output "-" as long as the page contains any reward figure - "-" is only allowed when the page has no reward information at all. NEVER repeat severity names, vulnerability types, tiers, or semicolon lists. If a single fixed amount is stated, return just that amount (e.g. "$500", "€100", "£100", "₹1000").
- "inscope_domains": extract EVERY concrete URL, domain, subdomain, and wildcard explicitly covered by the program exactly as written on the page (for example: https://www.appbox.co, https://www.appbox.co/login, username.appboxes.co, *.appboxes.co). Do NOT replace real URLs or domains with vague descriptions like "Appbox proprietary code" or "production environment" - use the exact values the page shows. Only fall back to descriptive strings when the page gives no concrete URLs at all.
- "outofscope_domains": extract every concrete URL, domain, and subdomain explicitly excluded (for example billing.appbox.co, app.username.appboxes.co), plus any excluded generic categories written on the page.
- Read the ENTIRE page including every table and list - do not skim, summarize, or truncate. Every concrete URL and every monetary amount present on the page must appear in your output.
- "platform": say which bounty platform hosts the program (HackerOne, Bugcrowd, YesWeHack, Immunefi, Intigriti, SelfHosted, None).
- "scamhit": "yes" only if the program page indicates it may be a scam or asks for up-front payment; otherwise empty.
- "program_url": the exact page the program/policy is on.
- "logo": use a working image URL for the site or leave "". If none available, use https://www.google.com/s2/favicons?domain=<domain>&sz=32.
- "last_updated": today's date YYYY-MM-DD.
- "issues_reported": leave as an empty array [].

${programsJson(programs)}

## I want you to visit all of these websites and give me output like this in json format:
{
    "name": "Glia",
    "program_url": "https://www.glia.com/security-bounty",
    "logo": "https://cdn.prod.website-files.com/680f1550811d9719bdbcf21b/6835fd1ea895df4327eae39d_favicon%20(4).png",
    "platform": "SelfHosted",
    "reward": "$200 - $5,000",
    "inscope_domains": [
        "*.glia.com",
        "*.glia.eu",
        "*.salemove.com",
        "*.salemove.eu"
    ],
    "outofscope_domains": [],
    "issues_reported": [],
    "scamhit": "",
    "last_updated": "2025-09-27"
},
{
    "name": "Totalcoin",
    "program_url": "https://totalcoin.io/bug-bounty",
    "logo": "https://totalcoin.io/favicon.ico",
    "platform": "SelfHosted",
    "reward": "$200 - $30,000",
    "inscope_domains": [],
    "outofscope_domains": [
        "totalcoin.io"
    ],
    "issues_reported": [],
    "scamhit": "",
    "last_updated": "2025-09-27"
},
{
    "name": "Genetec",
    "program_url": "https://www.genetec.com/trust-cybersecurity/public-bug-bounty-program",
    "logo": "https://www.genetec.com/webfiles/latest/build/static/img/favicon-16x16.png",
    "platform": "SelfHosted",
    "reward": "$100 - $5000 CAD",
    "inscope_domains": [
        "*.clearance.network",
        "*.clearid.io",
        "*.genetec.cloud",
        "*.genetec.com",
        "login.genetec.com",
        "*.genetec.one",
        "*.geneteccloud.com",
        "*.q2c.eu",
        "*.autovu.com",
        "*.curbsense.com",
        "*.autovu.cloud"
    ],
    "outofscope_domains": [],
    "issues_reported": [],
    "scamhit": "",
    "last_updated": "2025-09-27"
}`;
}

async function getCurrent() {
  const data = await chrome.storage.local.get([STORAGE_KEY]);
  return Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
}

async function load() {
  const programs = await getCurrent();
  allPrograms = programs;
  render();
}

searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value;
  searchClear.classList.toggle("hidden", searchQuery === "");
  render();
});

searchClear.addEventListener("click", () => {
  searchInput.value = "";
  searchClear.classList.add("hidden");
  searchQuery = "";
  render();
  searchInput.focus();
});

copyBtn.addEventListener("click", async () => {
  const programs = await getCurrent();
  const resetLabel = (msg) => {
    copyLabel.textContent = msg;
    setTimeout(() => (copyLabel.textContent = "Copy"), 1500);
  };
  if (programs.length === 0) {
    resetLabel("Nothing to copy");
    return;
  }
  try {
    await navigator.clipboard.writeText(programsJson(programs));
    resetLabel("Copied!");
  } catch (_) {
    resetLabel("Copy failed");
  }
});

const PENDING_PROMPT_KEY = "BOUNTYWATCH_PENDING_PROMPT";
const MSG_SEND_TO_CHATGPT = "BOUNTYWATCH_SEND_TO_CHATGPT";

async function open