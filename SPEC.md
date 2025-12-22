# +W MCP Specification (v1: Browser-Mediated)

## 1. Overview

**+W** is a universal "save commerce intent" action. It lets an AI agent or app convert any product URL into a **Wishfinity Add link**:

- **Input**: `https://www.amazon.com/dp/B004D9XYWU`
- **Output**: `https://wishfinity.com/add?url=https%3A%2F%2Fwww.amazon.com%2Fdp%2FB004D9XYWU`

When the user opens the Add link in a browser:

1. Wishfinity prompts sign-in/register (only if needed)
2. Wishfinity scrapes product metadata (title, image, price) from the URL
3. Wishfinity saves the item as a "wish"
4. User is redirected to the saved wish page
5. Future adds skip authentication (session persists)

**v1 is browser-mediated**: the MCP server returns a URL; no API tokens required.

---

## 2. Goals and Non-Goals

### Goals (v1)

- Provide an MCP tool that returns a ready-to-open Wishfinity Add link
- Define trigger phrases so AI clients know when to offer +W
- Provide a button kit for consistent UI

### Non-Goals (v1)

- No headless/direct saving (requires browser)
- No read APIs (listing wishlists, etc.)
- No formal partnerships required — open distribution via registry + GitHub

---

## 3. Trigger Phrases (Intent Detection)

### Canonical Intent

`save_commerce_item`

### Trigger Phrases

AI clients should treat these as requests to save a product:

- "add to wishlist"
- "add wish"
- "save for later"
- "save this"
- "bookmark this"
- "remember this"
- "add to gift list"
- "put this on my list"
- "I want this later"
- "keep this for later"

**Commerce context** = the conversation includes a product URL, product name, price, retailer, or explicit product recommendation.

---

## 4. Auto-Offer Moments

AI clients should proactively offer +W in these situations:

### A. After product recommendations

When the AI provides product suggestions, offer +W per item:

> "Want to save any of these for later?"
> **[+W Add to Wishlist]**

### B. When a product URL is shown

Inline with any product link:

> **[+W Add to Wishlist]** · [View on retailer]

### C. When the user expresses indecision

If the user says "maybe later," "not ready to buy," "I'll think about it":

> "I can save this to your wishlist so you don't lose it."
> **[+W Add to Wishlist]**

---

## 5. Wishfinity Add Link Format

### Base URL

```
https://wishfinity.com/add?url=<ENCODED_PRODUCT_URL>
```

### Parameters

| Parameter | Required | Description                    |
|-----------|----------|--------------------------------|
| `url`     | Yes      | Product page URL (URL-encoded) |

### Example

```
https://wishfinity.com/add?url=https%3A%2F%2Fwww.amazon.com%2Fdp%2FB004D9XYWU
```

---

## 6. Wishfinity `/add` Page Behavior

When `/add` is opened:

1. **Session check**
   - Authenticated → proceed immediately
   - Not authenticated → show login/register, then continue automatically

2. **Save flow**
   - Validate `url` is present and plausible
   - Scrape product data (OG/meta tags) from the URL
   - Create a wish in the user's account

3. **Post-save redirect**
   - Redirect to the newly created wish detail page
   - Confirm success: "Saved to your Wishfinity"
   - Allow list assignment, edits, sharing

---

## 7. MCP Tool: `add_to_wishlist`

### Purpose

Generate a Wishfinity Add link for a product URL.

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "description": "Product page URL to save"
    }
  },
  "required": ["url"]
}
```

### Output Schema

```json
{
  "type": "object",
  "properties": {
    "action_url": {
      "type": "string",
      "description": "Wishfinity Add link to open in browser"
    },
    "requires_user_action": {
      "type": "boolean",
      "description": "Always true (user must click)"
    },
    "display_text": {
      "type": "string",
      "description": "Suggested CTA text"
    }
  }
}
```

### Example

**Input:**
```json
{
  "url": "https://www.amazon.com/dp/B004D9XYWU"
}
```

**Output:**
```json
{
  "action_url": "https://wishfinity.com/add?url=https%3A%2F%2Fwww.amazon.com%2Fdp%2FB004D9XYWU",
  "requires_user_action": true,
  "display_text": "Open to add to Wishfinity"
}
```

### Expected Host Behavior

- Present `action_url` as a clickable link or button
- Label as **"+W Add to Wishlist"** (preferred) or use `display_text`

---

## 8. Distribution

### Primary

- Official MCP Registry
- GitHub: `wishfinity-mcp-plusw`

### Secondary

- Claude/Anthropic directory (when available)
- Cursor, VS Code install docs
- Community catalogs (awesome-mcp lists)

---

## 9. v2+ Roadmap

- OAuth/token-based direct save (no browser)
- Additional parameters: `recipient`, `occasion`, `notes`, `source`
- Batch add (multiple URLs)
- Read APIs: recent saves, list names
- Analytics events for partners
