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
 * Escapes special regex characters in a string
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds regex matchers from keyword list
 * @param {string[]} list - Array of keywords
 * @returns {RegExp[]} Array of word-boundary regex patterns
 */
function buildMatcher(list) {
  return list.map((kw) => new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i"));
}

// Pre-compiled matchers for performance
const STRONG_RE = buildMatcher(STRONG_KEYWORDS);
const WEAK_RE = buildMatcher(WEAK_KEYWORDS);

// ==================== Text Scanning ====================

/**
 * Scans text for bounty-related keywords
 * @param {string} text - Text content to scan
 * @returns {Object|null} Object with strong/weak matches, or null if none found
 */
function scanText(text) {
  if (!text || typeof text !== "string") return null;

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

  // Return only if any matches found
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
 * Normalizes URL by removing hash fragments
 * @param {string} href - Raw URL string
 * @returns {string} Normalized URL or empty string if invalid
 */
function normalizeUrl(href) {
  if (!href || typeof href !== "string") return "";
  
  try {
    const url = new URL(href);
    url.hash = ""; // Remove fragment
    return url.href;
  } catch (_) {
    // Return original if parsing fails
    return href;
  }
}

/**
 * Generates favicon URL from Google service
 * @param {string} href - Page URL
 * @param {number} size - Icon size (default: 32)
 * @returns {string} Favicon URL or empty string
 */
function faviconUrl(href, size = 32) {
  if (!href || typeof href !== "string") return "";
  
  try {
    const domain = new URL(href).hostname;
    if (!domain) return "";
    
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

/**
 * Extracts domain from URL
 * @param {string} url - Full URL
 * @returns {string} Domain hostname or empty string
 */
function getDomain(url) {
  if (!url) return "";
  
  try {
    return new URL(url).hostname;
  } catch (_) {
    return "";
  }
}

// ==================== HTML Processing ====================

/**
 * Converts HTML to plain text
 * @param {string} html - Raw HTML content
 * @returns {string} Plain text with tags removed
 */
function htmlToText(html) {
  if (!html || typeof html !== "string") return "";
  
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
 * Extracts title from HTML
 * @param {string} html - Raw HTML content
 * @returns {string} Page title or empty string
 */
function extractTitle(html) {
  if (!html || typeof html !== "string") return "";
  
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return "";
  
  return match[1]
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// ==================== Exports ====================

// Browser environment
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

// Node.js environment (for testing)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    STRONG_KEYWORDS,
    WEAK_KEYWORDS,
    THEME,
    scanText,
    normalizeUrl,
    faviconUrl,
    getDomain,
    htmlToText,
    extractTitle,
    escapeRegExp,
    buildMatcher,
    STRONG_RE,
    WEAK_RE
  };
}