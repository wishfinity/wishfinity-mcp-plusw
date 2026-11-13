// Unit tests for the add_to_wishlist URL classifier.
// Run with: npm test   (builds first, then `node --test`)
// Imports the COMPILED module so the shipped code is what's under test.
import test from "node:test";
import assert from "node:assert/strict";
import { classifyWishlistUrl } from "../dist/wishlist-url.js";

// --- Negatives: real product URLs from several stores must get NO note. ---
const PRODUCTS = [
  "https://www.amazon.com/dp/B0D1XD1ZV3",
  "https://www.amazon.com/Some-Product-Name/dp/B004D9XYWU?th=1&psc=1",
  "https://www.amazon.com/gp/product/B004D9XYWU",
  "https://www.amazon.com/gp/aw/d/B004D9XYWU",
  "https://a.co/d/abc123",
  "https://amzn.to/3xyzABC",
  "https://www.target.com/p/some-product/-/A-12345678",
  "https://www.walmart.com/ip/Some-Product/123456789",
  "https://www.etsy.com/listing/123456789/handmade-thing",
  "https://www.ebay.com/itm/123456789012",
  "https://www.bestbuy.com/site/some-product/6512345.p?skuId=6512345",
  "https://shop.example.com/products/cool-widget",
  "https://www.homedepot.com/p/Brand-Thing/312345678",
  "https://www.lowes.com/pd/Brand-Thing/5001234567",
];

test("product URLs produce no note", () => {
  for (const url of PRODUCTS) {
    const { note, pageType } = classifyWishlistUrl(url);
    assert.equal(note, undefined, `expected NO note for ${url}`);
    assert.equal(pageType, undefined, `expected no pageType for ${url}`);
  }
});

// --- Positives: each page type must get a note with the expected label. ---
const NON_PRODUCTS = [
  ["https://www.amazon.com/s?k=coffee+maker", "search results"],
  ["https://www.amazon.com/s/ref=nb_sb_noss?k=headphones", "search results"],
  ["https://www.ebay.com/sch/i.html?_nkw=headphones", "search results"],
  ["https://www.target.com/search?searchTerm=blender", "search results"],
  ["https://www.amazon.com/b?node=172282", "category or department"],
  ["https://www.amazon.com/gp/browse.html?node=283155", "category or department"],
  ["https://shop.example.com/collections/kitchen", "category or department"],
  ["https://www.example.com/category/electronics", "category or department"],
  ["https://www.amazon.com/stores/Nike/page/ABCDEF12-3456", "brand or storefront"],
  ["https://www.amazon.com", "store home"],
  ["https://www.target.com/", "store home"],
  ["https://www.amazon.com/gp/cart/view.html", "cart, checkout, or account"],
  ["https://www.example.com/checkout", "cart, checkout, or account"],
  ["https://www.amazon.com/ap/signin", "cart, checkout, or account"],
  ["https://www.example.com/account/orders", "cart, checkout, or account"],
  ["https://www.amazon.com/hz/wishlist/ls/ABC123", "wishlist or registry"],
  ["https://www.target.com/gift-registry/gift/some-registry", "wishlist or registry"],
  ["https://www.example.com/lists/favorites", "wishlist or registry"],
  ["https://www.google.com/search?q=running+shoes&tbm=shop", "comparison or shopping results"],
  ["https://shopping.google.com/search?q=shoes", "comparison or shopping results"],
  ["https://www.instagram.com/p/ABC123/", "article or social post"],
  ["https://x.com/someone/status/123456789", "article or social post"],
  ["https://youtu.be/dQw4w9WgXcQ", "article or social post"],
  ["https://www.example.com/blog/best-coffee-makers-2026", "article or social post"],
  ["https://news.example.com/news/gadget-roundup", "article or social post"],
];

test("non-product URLs produce a note with the expected page type", () => {
  for (const [url, expected] of NON_PRODUCTS) {
    const { note, pageType } = classifyWishlistUrl(url);
    assert.equal(pageType, expected, `expected pageType "${expected}" for ${url}, got "${pageType}"`);
    assert.ok(note && note.includes(expected), `expected note to mention "${expected}" for ${url}`);
    assert.ok(!note.includes("—"), `note must not contain an em-dash: ${url}`);
  }
});

// --- Invalid / empty input is handled gracefully (no throw, no note). ---
test("invalid URLs do not throw and produce no note", () => {
  for (const url of ["not a url", "", "javascript:alert(1)", "ftp:/bad"]) {
    const { note } = classifyWishlistUrl(url);
    assert.equal(note, undefined, `expected no note for invalid input ${JSON.stringify(url)}`);
  }
});

// --- The short-link + product whitelist must beat the social/other checks. ---
test("short product links are never flagged", () => {
  for (const url of ["https://a.co/d/9ABCxyz", "https://amzn.to/4abcDEF"]) {
    assert.equal(classifyWishlistUrl(url).note, undefined, url);
  }
});
