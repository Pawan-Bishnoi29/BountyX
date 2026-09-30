importScripts("common.js");

const STORAGE_KEY = "BOUNTYX_PROGRAMS";
const MSG_DETECT = "BOUNTYX_DETECT";
const MSG_CLEAR = "BOUNTYX_CLEAR";
const MSG_SCAN_URLS = "BOUNTYX_SCAN_URLS";

const MAX_LINKS_PER_SERP = 40;
const MAX_CONCURRENT = 3;
const FETCH_TIMEOUT = 20000;
const URL_COOLDOWN_MS = 300000;
const DOMAIN_COOLDOWN_MS = 8000;

// Professional theme colors
const THEME = {
  badgeBackground: "#6366f1", // Indigo-500 professional color
  badgeText: "#ffffff"
};

async function getPrograms() {
  const data = await chrome.storage.local.get([STORAGE_KEY]);
  return Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
}

async function setPrograms(programs) {
  await chrome.storage.local.set({ [STORAGE_KEY]: programs });
}

async function addOrUpdateProgram(program) {
  const url = normalizeUrl(program.url);
  if (!url) return;

  const programs = await getPrograms();
  const idx = programs.findIndex((p) => p.url === url);

  if (idx >= 0) {
    const existing = programs[idx];
    const title = program.title || existing.title || url;
    programs[idx] = { favicon: faviconUrl(url), title, url };
  } else {
    programs.push({
      favicon: faviconUrl(url),
      title: program.title || url,
      url
    });
  }

  await setPrograms(programs);
}

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (_) {
    return "";
  }
}

function badgeText(count) {
  return count > 0 ? String(count) : "";
}

async function initBadge() {
  const programs = await getPrograms();
  await chrome.action.setBadgeBackgroundColor({ color: THEME.badgeBackground });
  await chrome.action.setBadgeTextColor({ color: THEME.badgeText });
  await chrome.action.setBadgeText({ text: badgeText(programs.length) });
}

async function cleanLegacyFragments() {
  const programs = await getPrograms();
  let changed = false;
  const cleaned = programs.map((p) => {
    const normalized = normalizeUrl(p.url);
    if (normalized !== p.url) {
      changed = true;
      return { ...p, url: normalized };
    }
    return p;
  });
  if (changed) await setPrograms(cleaned);
}

chrome.runtime.onInstalled.addListener(() => {
  cleanLegacyFragments();
  initBadge();
});

chrome.runtime.onStartup.addListener(() => {
  cleanLegacyFragments();
  initBadge();
});

initBadge();
cleanLegacyFragments();

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === "local" && changes[STORAGE_KEY]) {
    await chrome.action.setBadgeBackgroundColor({ color: THEME.badgeBackground });
    await chrome.action.setBadgeTextColor({ color: THEME.badgeText });
    await chrome.action.setBadgeText({
      text: badgeText(changes[STORAGE_KEY].newValue.length)
    });
  }
});

const queue = [];
let active = 0;
const recentUrlScans = new Map();
const recentDomainScans = new Map();

function fetchWithTimeout(url, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal })
    .catch((err) => {
      if (err && err.name === "AbortError") throw new Error("timeout");
      throw err;
    })
    .finally(() => clearTimeout(timer));
}

function pump() {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const job = queue.shift();
    active++;
    runScan(job)
      .catch(() => {})
      .finally(() => {
        active--;
        pump();
      });
  }
}

async function runScan(link) {
  const { title: serpTitle } = link;
  const url = normalizeUrl(link.url);
  if (!url) return;
  recentUrlScans.set(url, Date.now());

  const domain = getDomain(url);
  if (!domain) return;
  recentDomainScans.set(domain, Date.now());

  let res;
  try {
    res = await fetchWithTimeout(url, FETCH_TIMEOUT);
  } catch (_) {
    return;
  }

  if (!res.ok || !res.headers.get("content-type")?.includes("text/html")) {
    return;
  }

  let html;
  try {
    html = await res.text();
  } catch (_) {
    return;
  }

  const result = scanText(htmlToText(html));
  if (!result) return;

  const title = extractTitle(html) || serpTitle || domain;

  await addOrUpdateProgram({ url, title });
}

async function scanLinks(links) {
  const now = Date.now();
  let added = 0;
  const queueCopy = [];

  for (const link of links) {
    if (added >= MAX_LINKS_PER_SERP) break;
    const url = normalizeUrl(link.url);
    if (!url || !/^https?:/i.test(url)) continue;

    const lastUrl = recentUrlScans.get(url);
    if (lastUrl && now - lastUrl < URL_COOLDOWN_MS) continue;

    const domain = getDomain(url);
    const lastDomain = recentDomainScans.get(domain);
    if (lastDomain && now - lastDomain < DOMAIN_COOLDOWN_MS) continue;

    added++;
    queueCopy.push({ url, title: link.title });
  }

  for (const link of queueCopy) {
    const { url } = link;
    if (recentUrlScans.get(url)) continue;
    recentUrlScans.set(url, now);
    queue.push(link);
  }
  pump();

  return { added };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === MSG_DETECT && sender.tab) {
    (async () => {
      try {
        const url = normalizeUrl(sender.tab.url || "");
        const domain = getDomain(url);

        await addOrUpdateProgram({
          url,
          title: sender.tab.title || domain
        });

        sendResponse({ ok: true, stored: true });
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true;
  }

  if (msg && msg.type === MSG_SCAN_URLS && sender.tab) {
    scanLinks(msg.links || []).then(({ added }) =>
      sendResponse({ ok: true, queued: added })
    );
    return true;
  }

  if (msg && msg.type === MSG_CLEAR && sender.tab) {
    (async () => {
      const programs = await getPrograms();
      await chrome.action.setBadgeBackgroundColor({ color: THEME.badgeBackground });
      await chrome.action.setBadgeTextColor({ color: THEME.badgeText });
      await chrome.action.setBadgeText({ text: badgeText(programs.length) });
      sendResponse({ ok: true });
    })();
    return true;
  }

  return false;
});