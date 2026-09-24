const STRONG_KEYWORDS = [
  "eligible targets",
  "we offer a monetary",
  "we offer monetary reward",
  "we offer reward",
  "we offer rewards",
  "monetary reward",
  "monetary rewards",
  "eligible for a reward",
  "we award a bounty",
  "rewards program",
  "bug bounty program",
  "responsible disclosure",
  "vulnerability disclosure policy",
  "security reward program",
  "security bounty program"
];

const WEAK_KEYWORDS = [
  "scope",
  "bounty",
  "bounties",
  "reward",
  "rewards",
  "monetary",
  "compensation"
];

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildMatcher(list) {
  return list.map((kw) => new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i"));
}

const STRONG_RE = buildMatcher(STRONG_KEYWORDS);
const WEAK_RE = buildMatcher(WEAK_KEYWORDS);

function scanText(text) {
  if (!text) return null;

  const strongMatches = [];
  const weakMatches = [];

  for (let i = 0; i < STRONG_RE.length; i++) {
    if (STRONG_RE[i].test(text)) strongMatches.push(STRONG_KEYWORDS[i]);
  }
  for (let i = 0; i < WEAK_RE.length; i++) {
    if (WEAK_RE[i].test(text)) weakMatches.push(WEAK_KEYWORDS[i]);
  }

  if (strongMatches.length === 0 && weakMatches.length === 0) return null;

  return { strong: strongMatches, weak: weakMatches };
}

function normalizeUrl(href) {
  if (!href) return "";
  try {
    const u = new URL(href);
    u.hash = "";
    return u.href;
  } catch (_) {
    return href;
  }
}

function faviconUrl(href, size = 32) {
  if (!href) return "";
  try {
    const domain = new URL(href).hostname;
    return (
      "https://www.google.com/s2/favicons?domain=" +
      encodeURIComponent(domain) +
      "&sz=" +
      size
    );
  } catch (_) {
    return "";
  }
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<title[^>]*>([\s\S]*?)<\/title>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return "";
  return m[1]
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}