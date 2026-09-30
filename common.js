/**
 * BountyX - Common Utilities
 * Shared helper functions for content scanning and URL processing
 */

// ==================== Configuration ====================

/** Strong indicators of bug bounty programs */
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

/** Weak indicators that support strong matches */
const WEAK_KEYWORDS = [
  "scope",
  "bounty",
  "bounties",
  "reward",
  "rewards",
  "monetary",
  "compensation"
];

/** Theme colors for UI consistency */
const THEME = {
  badgeBackground: "#6366f1",
  badgeText: "#ffffff",
  accentPrimary: "#6366f1",
  accentSecondary: "#06b6d4"
};

// ==================== Regex Builders ====================

/**
 * Escapes special regex characters in a string.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds regex matchers from keyword list.
 *
 * @param {string[]} list
 * @returns {RegExp[]}
 */
function buildMatcher(list) {
  return list.map(function (kw) {
    return new RegExp("\\b" + escapeRegExp(kw) + "\\b", "i");
  });
}

// Pre-compiled matchers for performance
const STRONG_RE = buildMatcher(STRONG_KEYWORDS);
const WEAK_RE = buildMatcher(WEAK_KEYWORDS);

// ==================== Text Scanning ====================

/**
 * Scans text for bounty-related keywords.
 *
 * @param {string} text
 * @returns {Object|null}
 */
function scanText(text) {
  if (!text || typeof text !== "string") {
    return null;
  }

  const strongMatches = [];
  const weakMatches = [];

  // Check strong indicators
  for (let i = 0; i < STRONG_RE.length; i++) {
    if (STRONG_RE[i].test(text)) {
      strongMatches.push(STRONG_KEYWORDS[i]);
    }
  }

  // Check weak indicators
  for (let i = 0; i < WEAK_RE.length; i++) {
    if (WEAK_RE[i].test(text)) {
      weakMatches.push(WEAK_KEYWORDS[i]);
    }
  }

  // No matches
  if (strongMatches.length === 0 && weakMatches.length === 0) {
    return null;
  }

  return {
    strong: strongMatches,
    weak: weakMatches,
    score: strongMatches.length * 2 + weakMatches.length
  };
}

// ==================== URL Utilities ====================

/**
 * Normalizes a URL by removing hash fragments.
 *
 * @param {string} href
 * @returns {string}
 */
function normalizeUrl(href) {
  if (!href || typeof href !== "string") {
    return "";
  }

  try {
    const url = new URL(href);
    url.hash = "";
    return url.href;
  } catch (error) {
    return href;
  }
}

/**
 * Generates a favicon URL using Google's favicon service.
 *
 * @param {string} href
 * @param {number} size
 * @returns {string}
 */
function faviconUrl(href, size) {
  if (!href || typeof href !== "string") {
    return "";
  }

  if (!size) {
    size = 32;
  }

  try {
    const domain = new URL(href).hostname;

    if (!domain) {
      return "";
    }

    return (
      "https://www.google.com/s2/favicons?domain=" +
      encodeURIComponent(domain) +
      "&sz=" +
      size
    );
  } catch (error) {
    return "";
  }
}

/**
 * Extracts domain from URL.
 *
 * @param {string} url
 * @returns {string}
 */
function getDomain(url) {
  if (!url || typeof url !== "string") {
    return "";
  }

  try {
    return new URL(url).hostname;
  } catch (error) {
    return "";
  }
}

// ==================== HTML Processing ====================

/**
 * Converts HTML to plain text.
 *
 * @param {string} html
 * @returns {string}
 */
function htmlToText(html) {
  if (!html || typeof html !== "string") {
    return "";
  }

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

/**
 * Extracts title from HTML.
 *
 * @param {string} html
 * @returns {string}
 */
function extractTitle(html) {
  if (!html || typeof html !== "string") {
    return "";
  }

  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  if (!match) {
    return "";
  }

  return match[1]
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// ==================== Browser Exports ====================

if (typeof window !== "undefined") {
  window.STRONG_KEYWORDS = STRONG_KEYWORDS;
  window.WEAK_KEYWORDS = WEAK_KEYWORDS;
  window.THEME = THEME;

  window.scanText = scanText;
  window.normalizeUrl = normalizeUrl;
  window.faviconUrl = faviconUrl;
  window.getDomain = getDomain;
  window.htmlToText = htmlToText;
  window.extractTitle = extractTitle;

  window.escapeRegExp = escapeRegExp;
  window.buildMatcher = buildMatcher;
}
