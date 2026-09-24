(() => {
  const MSG_DETECT = "BOUNTYWATCH_DETECT";
  const MSG_CLEAR = "BOUNTYWATCH_CLEAR";
  const MSG_SCAN_URLS = "BOUNTYWATCH_SCAN_URLS";

  const SEARCH_HOSTS = /(^|\.)google\.(com|co\.uk|de|fr|in|ca|au|jp|br|mx|it|es|nl|se|pl|ch|be|at|tr|ru|cz|dk|fi|no|pt|com\.mx|com\.br|com\.au|com\.in|co\.in|co\.jp|co\.kr)/i;

  function isSearchResultsPage() {
    const host = location.hostname.replace(/^www\./, "");
    if (!/google(\.[a-z]{2,3})?(\.[a-z]{2})?$/.test(host)) return false;
    const q = location.pathname.replace(/\/+$/, "") === "/search";
    return q || location.search.includes("q=");
  }

  function isSearchOrAssetHost(host) {
    return (
      SEARCH_HOSTS.test(host) ||
      /googleusercontent\.com$|gstatic\.com$/.test(host)
    );
  }

  function resolveHref(raw) {
    if (!raw) return "";
    let href = raw.trim();
    if (href.startsWith("//")) href = "https:" + href;

    try {
      const u = new URL(href, location.href);
      if (u.pathname === "/url" && u.searchParams.has("q")) {
        return u.searchParams.get("q");
      }
      return u.href;
    } catch (_) {
      return "";
    }
  }

  function closestResultHeading(a) {
    let el = a;
    for (let i = 0; i < 6 && el; i++) {
      const h = el.querySelector("h1, h2, h3, h4");
      if (h && h.textContent) return h.textContent.trim();
      el = el.parentElement;
    }
    return "";
  }

  function extractResultLinks() {
    const links = [];
    const seen = new Set();

    const anchors = document.querySelectorAll("a[href]");
    for (const a of anchors) {
      const url = normalizeUrl(resolveHref(a.getAttribute("href") || ""));
      if (!/^https?:/i.test(url)) continue;

      let host;
      try {
        host = new URL(url).hostname;
      } catch (_) {
        continue;
      }
      if (isSearchOrAssetHost(host)) continue;
      if (seen.has(url)) continue;

      const title = closestResultHeading(a);
      seen.add(url);
      links.push({ url, title });
    }

    return links;
  }

  function report() {
    if (isSearchResultsPage()) {
      const links = extractResultLinks();
      if (links.length > 0) {
        chrome.runtime
          .sendMessage({ type: MSG_SCAN_URLS, links })
          .catch(() => {});
      }
      return;
    }

    const result = scanText(document.body ? document.body.innerText : "");
    if (!result) {
      chrome.runtime.sendMessage({ type: MSG_CLEAR }).catch(() => {});
      return;
    }

    chrome.runtime
      .sendMessage({
        type: MSG_DETECT,
        keywords: result.strong.concat(result.weak),
        strong: result.strong,
        weak: result.weak
      })
      .catch(() => {});
  }

  let lastHref = location.href;
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      report();
    }
  }, 1500);

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", report);
  } else {
    report();
  }
})();