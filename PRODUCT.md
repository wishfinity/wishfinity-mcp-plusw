# Wishfinity +W MCP Server — Product Documentation

## Executive Summary

Wishfinity +W is an MCP (Model Context Protocol) server that enables AI assistants to save products to a universal wishlist. When users chat with Claude, ChatGPT, or other MCP-compatible assistants about products, the AI can offer to save items for later—creating a seamless bridge between AI-powered product discovery and purchase intent capture.

**Version:** 1.1.0  
**Status:** Production  
**Last Updated:** December 22, 2025

---

## Table of Contents

1. [Product Vision](#product-vision)
2. [How It Works](#how-it-works)
3. [Infrastructure & Hosting](#infrastructure--hosting)
4. [Distribution Channels](#distribution-channels)
5. [Client Configuration](#client-configuration)
6. [The Button Kit](#the-button-kit)
7. [Test Results](#test-results)
8. [Known Limitations](#known-limitations)
9. [GTM Status](#gtm-status)
10. [Roadmap](#roadmap)
11. [Related Projects](#related-projects)

---

## Product Vision

### The Problem

Users discover products through AI conversations but have no native way to save them. They either:
- Manually copy URLs to notes/bookmarks
- Lose track of products mentioned in chat
- Miss out on purchases they intended to make later

### The Solution

Wishfinity +W integrates directly into AI assistants via MCP, enabling:
- **Explicit saves:** "Save this to my wishlist"
- **Proactive offers:** AI notices indecision and offers to save
- **Universal wishlist:** All products saved to one Wishfinity account, regardless of which AI or store

### Target Users

| Segment | Use Case | Value |
|---------|----------|-------|
| AI Power Users | Save products while chatting with Claude/ChatGPT | Convenience |
| Gift Shoppers | Track gift ideas across conversations | Organization |
| Comparison Shoppers | Save options to review later | Decision support |
| Developers | Build shopping agents with wishlist capability | Integration |
| Retailers | Capture intent from AI-assisted shopping | Conversion |

---

## How It Works

### User Flow

```
1. User chats with Claude about a product
   "I'm looking at this coffee maker: [URL] — what do you think?"

2. Claude analyzes the product and responds
   "Here's what I found... Would you like me to save it to your wishlist?"

3. User agrees (or Claude offers proactively)
   "Yes, save it for later"

4. Claude calls the add_to_wishlist tool
   → Returns an action URL

5. User clicks the link
   → Opens Wishfinity's /add page
   → Product is saved to their wishlist

6. User can access saved products anytime at wishfinity.com
```

### Technical Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Claude    │────▶│  MCP Tool   │────▶│  Generate   │────▶│    User     │
│   Desktop   │     │  Called     │     │  Action URL │     │   Clicks    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                   │
                                                                   ▼
                                                            ┌─────────────┐
                                                            │  Wishfinity │
                                                            │  /add Page  │
                                                            └─────────────┘
                                                                   │
                                                                   ▼
                                                            ┌─────────────┐
                                                            │  Product    │
                                                            │   Saved!    │
                                                            └─────────────┘
```

### The Tool

**Name:** `add_to_wishlist`

**Description (what Claude sees):**
> Save a product to the user's Wishfinity wishlist. Use this when:
> - The user asks to save a product for later
> - The user says "add to wishlist", "bookmark this", "save for later", etc.
> - After recommending products (offer as an option)
> - When the user expresses indecision about purchasing
>
> Returns a link the user must click to complete the save.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "description": "The product page URL to save to the wishlist"
    }
  },
  "required": ["url"]
}
```

**Output:**
```json
{
  "success": true,
  "action_url": "https://wishfinity.com/add?url=<encoded_url>",
  "message": "Click the link to save this product to your Wishfinity wishlist"
}
```

---

## Infrastructure & Hosting

### Overview

The MCP server is deployed in two ways to support different clients:

| Transport | Hosting | URL | Use Case |
|-----------|---------|-----|----------|
| stdio | npm (local execution) | N/A | Claude Desktop, local MCP clients |
| HTTP | Cloudflare Workers | `wishfinity-mcp-plusw.wishfinity.workers.dev` | Web clients, remote integrations |

### npm Package

- **Package Name:** `wishfinity-mcp-plusw`
- **Registry:** npmjs.com
- **URL:** https://npmjs.com/package/wishfinity-mcp-plusw
- **Install:** `npx -y wishfinity-mcp-plusw`
- **Publish Command:** `npm publish`

The npm package runs the MCP server locally via stdio transport. Users configure their AI client to spawn it as a subprocess.

### Cloudflare Workers

- **Worker Name:** `wishfinity-mcp-plusw`
- **Account:** Wishfinity
- **URL:** https://wishfinity-mcp-plusw.wishfinity.workers.dev
- **Endpoints:**
  - `/mcp` — MCP protocol endpoint (Streamable HTTP transport)
  - `/health` — Health check (returns JSON status)
- **Config File:** `wrangler.toml`
- **Deploy Command:** `npx wrangler deploy`

Health check response:
```json
{
  "status": "ok",
  "server": "wishfinity-mcp-plusw",
  "version": "1.1.0",
  "transport": "streamable-http"
}
```

### MCP Registry

- **Listed:** Yes ✅
- **Registry URL:** https://registry.modelcontextprotocol.io
- **Search Term:** "wishfinity"

### GitHub Repository

- **Repo:** `wishfinity/wishfinity-mcp-plusw`
- **Visibility:** Public
- **URL:** https://github.com/wishfinity/wishfinity-mcp-plusw

### Source Files

```
wishfinity-mcp-plusw/
├── src/
│   ├── index.js          # stdio entry point (npm)
│   ├── worker.js         # Cloudflare Worker entry point
│   ├── server.js         # Core MCP server logic
│   └── tools/
│       └── wishlist.js   # add_to_wishlist implementation
├── button-kit/           # SVG assets for web embedding
├── package.json
├── wrangler.toml         # Cloudflare config
├── CLAUDE.md             # Claude Code context
├── PRODUCT.md            # This file
└── README.md             # Public documentation
```

---

## Distribution Channels

### Primary Channels (Active)

| Channel | Status | URL |
|---------|--------|-----|
| npm | ✅ Published | npmjs.com/package/wishfinity-mcp-plusw |
| GitHub | ✅ Public | github.com/wishfinity/wishfinity-mcp-plusw |
| MCP Registry | ✅ Listed | registry.modelcontextprotocol.io |
| Cloudflare Workers | ✅ Deployed | wishfinity-mcp-plusw.wishfinity.workers.dev |

### Directory Listings (GTM Wave 1)

| Directory | Status | URL |
|-----------|--------|-----|
| awesome-mcp-servers | 🔲 Pending | github.com/punkpeye/awesome-mcp-servers |
| MCP.so | 🔲 Pending | mcp.so |
| PulseMCP | 🔲 Pending | pulsemcp.com |
| mcpservers.org | 🔲 Pending | mcpservers.org |

### Community Channels (GTM Wave 2)

| Channel | Status |
|---------|--------|
| MCP Discord #showcase | 🔲 Pending |
| r/ClaudeAI | 🔲 Pending |
| r/ChatGPT | 🔲 Pending |
| X/Twitter | 🔲 Pending |

---

## Client Configuration

### Claude Desktop (macOS)

**Config Location:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Configuration:**
```json
{
  "mcpServers": {
    "wishfinity": {
      "command": "npx",
      "args": ["-y", "wishfinity-mcp-plusw"]
    }
  }
}
```

**Setup Steps:**
1. Open the config file (create if doesn't exist)
2. Add the wishfinity server to `mcpServers`
3. Restart Claude Desktop
4. Verify by asking Claude: "What MCP tools do you have?"

### Claude Desktop (Windows)

**Config Location:** `%APPDATA%\Claude\claude_desktop_config.json`

Same configuration as macOS.

### HTTP Clients

For clients that support HTTP transport:

```
Endpoint: https://wishfinity-mcp-plusw.wishfinity.workers.dev/mcp
Transport: Streamable HTTP
```

### ChatGPT Desktop

⚠️ **Not yet supported.** ChatGPT Desktop does not currently expose MCP configuration.

A separate ChatGPT App has been built using the OpenAI Apps SDK and is pending OpenAI App Store publishing. See [Related Projects](#related-projects).

---

## The Button Kit

### Purpose

The button kit provides branded SVG buttons for **web and app integration**. These are designed for:
- Retailers embedding "Save to Wishfinity" buttons on product pages
- Developers building shopping apps with wishlist functionality
- Marketing materials and documentation

### Important Limitation

⚠️ **The button kit is NOT for display in AI chat interfaces.**

Claude and other AI assistants cannot render external SVG images as clickable buttons. The MCP tool returns text links, not visual buttons. This is a platform limitation, not a bug.

### Available Assets

| Size | Dimensions | CDN URL |
|------|------------|---------|
| Small | 120x36 | `cdn.jsdelivr.net/npm/wishfinity-mcp-plusw@latest/button-kit/Wishfinity-Button-Small.svg` |
| Medium | 160x48 | `cdn.jsdelivr.net/npm/wishfinity-mcp-plusw@latest/button-kit/Wishfinity-Button-Medium.svg` |
| Large | 200x60 | `cdn.jsdelivr.net/npm/wishfinity-mcp-plusw@latest/button-kit/Wishfinity-Button-Large.svg` |

### Usage (Web Embedding)

```html
<a href="https://wishfinity.com/add?url=PRODUCT_URL">
  <img src="https://cdn.jsdelivr.net/npm/wishfinity-mcp-plusw@latest/button-kit/Wishfinity-Button-Medium.svg" 
       alt="Save to Wishfinity" />
</a>
```

---

## Test Results

**Test Date:** December 22, 2025  
**Test Platform:** Claude Desktop (macOS)  
**Version Tested:** 1.1.0

### P0 Tests — Core Functionality

| # | Test | Result | Notes |
|---|------|--------|-------|
| A1 | Tool appears in Claude | ✅ PASS | `wishfinity:add_to_wishlist` visible |
| A2 | Explicit save works | ✅ PASS | Returns clickable action URL |
| A3 | Link opens correctly | ✅ PASS | Opens Wishfinity /add page |
| A4 | Product saves | ✅ PASS | Product appears in wishlist |
| A5 | HTTP endpoint responds | ✅ PASS | Health check returns 200 |

### P1 Tests — Inferred Triggers

| # | Scenario | Result | Notes |
|---|----------|--------|-------|
| B3 | Indecision trigger | ✅ PASS | Claude proactively offered to save |
| B4 | Gift context | ✅ PASS | Claude proactively offered to save |

### Cross-Platform Tests

| # | Test | Result | Notes |
|---|------|--------|-------|
| C1-4 | ChatGPT Desktop | ⏭️ SKIP | MCP not available; separate app exists |

### Button Display Test

| Test | Result | Notes |
|------|--------|-------|
| SVG display in Claude | ❌ NOT POSSIBLE | CDN blocked; chat can't render external images as buttons |

---

## Known Limitations

1. **Button kit is for web only**  
   Claude cannot display SVG buttons inline. The tool returns text links, which work correctly.

2. **ChatGPT Desktop lacks MCP support**  
   As of December 2025, ChatGPT Desktop doesn't expose MCP configuration. A separate ChatGPT App exists via OpenAI Apps SDK.

3. **Amazon page fetching blocked**  
   Claude can't fetch Amazon product pages directly (blocked by Amazon). However, the wishlist save functionality still works—Claude just can't analyze the product details.

4. **User must click link**  
   Due to MCP security model, the tool returns an action URL that users must click. Products don't save automatically.

---

## GTM Status

**Current Phase:** Ready for GTM execution

### Completed
- ✅ v1.1.0 shipped with dual transport
- ✅ npm package published
- ✅ Cloudflare Worker deployed
- ✅ MCP Registry listing
- ✅ All P0 and key P1 tests passing

### Next Steps
1. **Wave 1:** Directory submissions (awesome-mcp-servers, MCP.so, PulseMCP)
2. **Wave 2:** Community announcements (MCP Discord, r/ClaudeAI, r/ChatGPT, X)
3. **Wave 3:** Broader reach (Hacker News, LangChain Discord)
4. **Wave 4:** Content & guides (integration tutorials, landing pages)

See `wishfinity_mcp_gtm_plan.docx` for detailed execution plan.

---

## Roadmap

### Near Term (Q1 2025)
- [ ] GTM Wave 1-2 execution
- [ ] Demo GIF for social posts
- [ ] ChatGPT App publishing (pending OpenAI)
- [ ] Track adoption metrics (npm downloads, GitHub stars)

### Medium Term (Q2 2025)
- [ ] LangChain integration guide
- [ ] OpenAI Agents SDK guide
- [ ] wishfinity.com/ai landing page
- [ ] wishfinity.com/developers portal

### Long Term
- [ ] Retailer partnerships (embedded button kit)
- [ ] Price tracking notifications
- [ ] Multi-user wishlists (gift registries)
- [ ] Additional AI platform integrations

---

## Related Projects

### ChatGPT App (OpenAI Apps SDK)

A separate implementation for ChatGPT users, built using OpenAI's Apps SDK instead of MCP.

- **Status:** Build complete, pending OpenAI App Store publishing
- **Hosting:** Render
- **Transport:** SSE (Server-Sent Events)
- **Blocking Dependency:** OpenAI hasn't opened App Store submissions to developers

### Wishfinity Core

The main Wishfinity platform.

- **URL:** https://wishfinity.com
- **Features:** Universal wishlist, product tracking, sharing
- **Integration Point:** The `/add` endpoint that receives products from MCP

---

## Support & Resources

- **GitHub Issues:** https://github.com/wishfinity/wishfinity-mcp-plusw/issues
- **npm Package:** https://npmjs.com/package/wishfinity-mcp-plusw
- **MCP Documentation:** https://modelcontextprotocol.io/docs

---

*Last updated: December 22, 2025*
