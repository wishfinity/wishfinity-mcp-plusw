/**
 * wishlist-url.ts — shared URL classification for add_to_wishlist.
 *
 * Wishfinity saves best from a link to ONE specific product page (its own
 * title, image and price). When the incoming URL is clearly something else
 * (a search-results page, a category, a store home page, a cart, a wishlist,
 * an article, ...), the tool still returns the add link but adds a short
 * `note` so the assistant can relay it. All checks are simple URL-shape
 * tests — NO page fetching.
 *
 * This is the one piece of logic shared by both builders (src/index.ts and
 * src/worker.ts) so it can be unit-tested directly (test/wishlist-url.test.mjs).
 * The tool definition and generateAddUrl() stay duplicated by hand as before.
 */

export interface WishlistUrlClassification {
  /** Present only when the URL is clearly not a single product page. */
  note?: string;
  /** Internal label for the detected page type (undefined when none). */
  pageType?: string;
}

/** Host-only shorteners that redirect to a specific product — always fine. */
const PRODUCT_SHORTLINK_HOSTS = new Set([
  "a.co",
  "amzn.to",
  "amzn.eu",
  "ebay.us",
]);

/** Social / article hosts — a link here is a post or article, not a product. */
const SOCIAL_ARTICLE_HOSTS = new Set([
  "twitter.com",
  "x.com",
  "facebook.com",
  "m.facebook.com",
  "fb.com",
  "instagram.com",
  "tiktok.com",
  "reddit.com",
  "youtube.com",
  "youtu.be",
  "pinterest.com",
  "threads.net",
  "linkedin.com",
  "medium.com",
  "substack.com",
  "tumblr.com",
]);

function stripWww(host: string): string {
  return host.replace(/^www\./, "");
}

function isSocialArticleHost(host: string): boolean {
  return (
    SOCIAL_ARTICLE_HOSTS.has(host) ||
    host.endsWith(".substack.com") ||
    host.endsWith(".medium.com") ||
    host.endsWith(".tumblr.com")
  );
}

/** Strong "this IS a single product page" patterns (whitelist). */
function isLikelyProductUrl(host: string, path: string): boolean {
  if (PRODUCT_SHORTLINK_HOSTS.has(host) && path.length > 1) return true;

  if (/\/dp\/[a-z0-9]/i.test(path)) return true; // Amazon and others
  if (/\/gp\/product\//i.test(path)) return true; // Amazon
  if (/\/gp\/aw\/d\//i.test(path)) return true; // Amazon mobile
  if (/\/gp\/offer-listing\//i.test(path)) return true; // Amazon offers for one product
  if (/\/itm\/\d/i.test(path)) return true; // eBay item
  if (/\/ip\/[^/]/i.test(path)) return true; // Walmart
  if (/\/listing\/\d/i.test(path)) return true; // Etsy
  if (/\/products\/[^/]/i.test(path)) return true; // Shopify and many others
  if (/\/product\/[^/]/i.test(path)) return true; // generic singular product
  if (/\/pd\/[^/]/i.test(path)) return true; // Lowe's and others
  if (/\/p\/[^/]/i.test(path)) return true; // Target, Home Depot, many others
  if (/\/site\/[^/]+\/\d+\.p\b/i.test(path)) return true; // Best Buy <slug>/<sku>.p
  return false;
}

/** Clearly-not-a-single-product patterns. Returns a label or "". */
function nonProductLabel(host: string, path: string, search: string): string {
  const q = search; // lower-cased, includes leading "?"

  // Cart / checkout / sign-in / account.
  if (
    /(^|\/)(cart|checkout|basket|bag)(\/|$)/.test(path) ||
    /\/gp\/cart\b/.test(path) ||
    /(^|\/)(login|signin|sign-in|account|auth)(\/|$)/.test(path) ||
    /\/ap\/signin\b/.test(path) ||
    /\/gp\/(css|sign-in)\b/.test(path)
  ) {
    return "cart, checkout, or account";
  }

  // Wishlists / registries / lists on other sites.
  if (
    /\/hz\/wishlist\b/.test(path) ||
    /(^|\/)(wishlist|registry|gift-registry|wedding-registry|baby-registry)(\/|$)/.test(path) ||
    /\/gp\/registry\b/.test(path) ||
    /(^|\/)lists?(\/|$)/.test(path)
  ) {
    return "wishlist or registry";
  }

  // Google Shopping / comparison results (before generic search).
  if (
    (host.includes("google.") && (/\/shopping\b/.test(path) || /tbm=shop/.test(q))) ||
    host.startsWith("shopping.google.") ||
    /(^|\/)compare(\/|$)/.test(path)
  ) {
    return "comparison or shopping results";
  }

  // Search results.
  if (
    path === "/s" ||
    /^\/s\//.test(path) ||
    /(^|\/)search(\/|$)/.test(path) ||
    /\/sch\//.test(path) || // eBay search
    /[?&](k|q|query|keywords|searchterm|field-keywords)=/.test(q)
  ) {
    return "search results";
  }

  // Brand / storefront pages.
  if (/\/stores?\//.test(path) || /(^|\/)brand(\/|$)/.test(path)) {
    return "brand or storefront";
  }

  // Category / department / collection browse pages.
  if (
    path === "/b" ||
    /^\/b\//.test(path) ||
    /\/gp\/(browse|bestsellers|most-wished-for|new-releases)\b/.test(path) ||
    /[?&]node=/.test(q) ||
    /(^|\/)(category|categories|department|dept|collections|collection)(\/|$)/.test(path)
  ) {
    return "category or department";
  }

  // Article / blog paths on ordinary hosts (social hosts handled earlier).
  if (/(^|\/)(blog|news|article|articles|story|stories)(\/|$)/.test(path)) {
    return "article or social post";
  }

  // Store home page (no product path at all).
  if (path === "" || path === "/") {
    return "store home";
  }

  return "";
}

function buildNote(label: string): string {
  return (
    `This link looks like a ${label} page, not a single product. ` +
    `Wishfinity saves best from a link to one specific product that has its own title, image and price. ` +
    `If you have the product's own page link, use that one instead.`
  );
}

/**
 * Classify an add_to_wishlist URL. Returns { note, pageType } when the URL is
 * clearly not a single product page, or {} when it looks like a product (or is
 * unrecognised, in which case we give it the benefit of the doubt).
 */
export function classifyWishlistUrl(rawUrl: string): WishlistUrlClassification {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return {}; // invalid URLs are handled by the caller's validation
  }

  // Only classify web pages; other schemes (ftp:, javascript:, ...) are left alone.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {};
  }

  const host = stripWww(parsed.hostname.toLowerCase());
  const path = parsed.pathname.toLowerCase();
  const search = parsed.search.toLowerCase();

  // Social / article hosts first: these use product-looking paths (e.g.
  // instagram.com/p/<id>) that would otherwise match the product whitelist.
  if (isSocialArticleHost(host)) {
    const label = "article or social post";
    return { note: buildNote(label), pageType: label };
  }

  // Whitelist wins: an obvious product URL never gets a note.
  if (isLikelyProductUrl(host, path)) {
    return {};
  }

  const label = nonProductLabel(host, path, search);
  if (label) {
    return { note: buildNote(label), pageType: label };
  }

  return {};
}
