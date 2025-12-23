# Wishfinity +W MCP Server

## Project Overview

This is an MCP (Model Context Protocol) server that adds wishlist functionality to AI assistants like Claude and ChatGPT. When users discuss products, the AI can offer to save items to their Wishfinity wishlist.

**Current Version:** 1.1.0  
**Status:** ✅ Production — All tests passing, ready for GTM  
**Last Tested:** December 22, 2025

## Quick Commands

```bash
# Install dependencies
npm install

# Run locally (stdio transport)
npm start

# Run Cloudflare Worker locally
npx wrangler dev

# Deploy to Cloudflare Workers
npx wrangler deploy

# Publish to npm
npm publish

# Run tests
npm test
```

## Architecture

### Dual Transport System

The server supports two transports:

1. **stdio (local)** — For Claude Desktop, ChatGPT Desktop, and local MCP clients
   - Entry: `src/index.js`
   - Config: Users add to their `claude_desktop_config.json`

2. **HTTP (remote)** — For web clients, hosted on Cloudflare Workers
   - Entry: `src/worker.js`
   - Endpoint: `https://wishfinity-mcp-plusw.wishfinity.workers.dev/mcp`
   - Health: `https://wishfinity-mcp-plusw.wishfinity.workers.dev/health`

### Key Files

```
src/
├── index.js          # stdio entry point (npm package)
├── worker.js         # Cloudflare Worker entry point
├── server.js         # Core MCP server logic (shared)
└── tools/
    └── wishlist.js   # add_to_wishlist tool implementation

button-kit/           # SVG buttons for web embedding (NOT for chat display)
├── Wishfinity-Button-Small.svg
├── Wishfinity-Button-Medium.svg
├── Wishfinity-Button-Large.svg
└── README.md
```

### Tool: add_to_wishlist

**Purpose:** Saves a product URL to the user's Wishfinity wishlist

**Input:**
```json
{
  "url": "https://amazon.com/dp/B0D1XD1ZV3"
}
```

**Output:**
```json
{
  "success": true,
  "action_url": "https://wishfinity.com/add?url=https%3A%2F%2Famazon.com%2Fdp%2FB0D1XD1ZV3",
  "message": "Click the link to save this product to your Wishfinity wishlist"
}
```

**Trigger Behavior:** The tool description is crafted to encourage AI assistants to proactively offer saving when users:
- Express indecision ("maybe I'll wait for a sale")
- Discuss gifts ("looking for a birthday gift")
- Ask to save/bookmark products
- Share product URLs for review

## Infrastructure

### npm Package
- **Name:** `wishfinity-mcp-plusw`
- **Registry:** https://npmjs.com/package/wishfinity-mcp-plusw
- **Install:** `npx -y wishfinity-mcp-plusw`

### Cloudflare Workers
- **Account:** Wishfinity
- **Worker Name:** `wishfinity-mcp-plusw`
- **URL:** `wishfinity-mcp-plusw.wishfinity.workers.dev`
- **Config:** `wrangler.toml`

### MCP Registry
- **Listed:** Yes
- **URL:** https://registry.modelcontextprotocol.io (search "wishfinity")

### GitHub
- **Repo:** `wishfinity/wishfinity-mcp-plusw`
- **Visibility:** Public

## Client Configuration

### Claude Desktop
Location: `~/Library/Application Support/Claude/claude_desktop_config.json`

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

### HTTP Clients
```
Endpoint: https://wishfinity-mcp-plusw.wishfinity.workers.dev/mcp
Transport: Streamable HTTP
```

## Test Status (December 2025)

| Test | Status |
|------|--------|
| Tool appears in Claude | ✅ Pass |
| Explicit save works | ✅ Pass |
| Link opens correctly | ✅ Pass |
| Product saves to Wishfinity | ✅ Pass |
| HTTP endpoint responds | ✅ Pass |
| Indecision trigger (proactive offer) | ✅ Pass |
| Gift context trigger (proactive offer) | ✅ Pass |
| ChatGPT Desktop | ⏭️ Skipped (MCP not available) |

## Known Limitations

1. **Button kit is for web embedding only** — Claude cannot display SVG buttons inline; it returns text links instead
2. **ChatGPT Desktop** — Doesn't support MCP configuration yet; separate ChatGPT App built via OpenAI Apps SDK (pending publishing)
3. **Amazon blocking** — Claude can't fetch Amazon product pages directly, but wishlist save still works

## Related Projects

- **ChatGPT App (OpenAI Apps SDK):** Separate implementation for ChatGPT, deployed on Render, pending OpenAI App Store publishing
- **Wishfinity Core:** Main wishlist platform at wishfinity.com

## Development Notes

- Tool description wording is critical — it determines when Claude proactively offers to save
- Test changes with real Claude Desktop conversations before deploying
- The `action_url` uses Wishfinity's `/add` endpoint which handles the actual save flow
