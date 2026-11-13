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
/**
 * Classify an add_to_wishlist URL. Returns { note, pageType } when the URL is
 * clearly not a single product page, or {} when it looks like a product (or is
 * unrecognised, in which case we give it the benefit of the doubt).
 */
export declare function classifyWishlistUrl(rawUrl: string): WishlistUrlClassification;
//# sourceMappingURL=wishlist-url.d.ts.map