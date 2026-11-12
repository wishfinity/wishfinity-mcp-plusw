# Wishfinity +W MCP Server

## Project Overview

This is an MCP (Model Context Protocol) server that adds wishlist functionality to AI assistants like Claude and ChatGPT. When users discuss products, the AI can offer to save items to their Wishfinity wishlist.

**Current Version:** 1.2.3 (on `feature/epic-g13`, unreleased; published `latest` is 1.2.2)
**Status:** ✅ Production (v1.2.2 live on npm + Cloudflare Workers)
**Source:** TypeScript — `src/*.ts` compiled to `dist/` via `tsc`
**Tests:** No automated test harness (`npm test` has no script); verify by running the server — see Verification

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

# Type-check + build (TypeScript -> dist/)
npm run build

# There is NO automated test harness; `npm test` has no script.
# Verify by running the server and issuing real tools/list + tools/call.
```

## Architecture

### Dual Transport System

The server supports two transports:

1. **stdio (local)** — For Claude Desktop, ChatGPT Desktop, and local MCP clients
   - Source: `src/index.ts` → compiled to `dist/index.js` (the npm `bin`/`main`)
   - Config: Users add to their `claude_desktop_config.json`

2. **HTTP (remote)** — For web clients, hosted on Cloudflare Workers
   - Source: `src/worker.ts` — wrangler bundles this directly (`dist/worker.js` is built by tsc but NOT used for the deploy)
   - Endpoint: `https://wishfinity-mcp-plusw.wishfinity.workers.dev/mcp` ← the live endpoint
   - Health: `https://wishfinity-mcp-plusw.wishfinity.workers.dev/health`
   - ⚠️ `mcp.wishfinity.com` is NOT routed to the Worker (it redirects to the main site); the `wrangler.toml` custom-domain route is commented out.

### Key Files

```
src/
├── index.ts          # stdio server  (compiled to dist/index.js; npm bin/main)
└── worker.ts         # Cloudflare Worker (Streamable HTTP); wrangler bundles this directly

dist/                 # tsc build output — TRACKED and shipped to npm (package.json "files")
├── index.js          # the published stdio entry
└── worker.js         # built by tsc, but the Worker deploy uses src/worker.ts

button-kit/           # SVG buttons for web embedding (NOT for chat display)
```

> **No `src/server.js`, no `src/tools/`.** The entire server — tool
> definition, prompts, resources, and the `generateAddUrl()` URL builder —
> lives inline in BOTH `index.ts` and `worker.ts`. The two files duplicate
> the tool definition and the URL builder; keep them in sync by hand (there
> is no shared module).

### Tool: add_to_wishlist

**Purpose:** Saves a product URL to the user's Wishfinity wishlist

**Input:**
```json
{
  "url": "https://amazon.com/dp/B0D1XD1ZV3"
}
```

**Output:** a single text content block whose text is this JSON:
```json
{
  "action_url": "https://wishfinity.com/add?url=https%3A%2F%2Famazon.com%2Fdp%2FB0D1XD1ZV3&source=mcp-plusw",
  "requires_user_action": true,
  "display_text": "Open to add to Wishfinity",
  "intent": "save_commerce_item"
}
```
Generated add-URLs carry `&source=mcp-plusw` (surface attribution). The tool
is annotated `readOnlyHint: true` — it only builds a URL, writing nothing
server-side.

**Trigger Behavior:** The tool description is crafted to encourage AI assistants to proactively offer saving when users:
- Express indecision ("maybe I'll wait for a sale")
- Discuss gifts ("looking for a birthday gift")
- Ask to save/bookmark products
- Share product URLs for review

### MCP Prompts (v1.2.0+)

Three prompts help developers integrate wishlist functionality:

1. **save_for_later** - Quick product save with URL parameter
2. **shopping_assistant** - Activates shopping assistant mode with engagement insights
3. **gift_ideas** - Gift finding with optional recipient/occasion parameters

### MCP Resources (v1.2.0+)

Two resources provide context to AI assistants:

1. **wishfinity://guide** (text/plain) - Integration guide with best practices
2. **wishfinity://triggers** (application/json) - Trigger phrases from aliases.json

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

## Verification

There is **no automated test harness** in this repo (`npm test` has no
script). Verify changes by building (`npm run build`) and issuing real MCP
calls against a running server — stdio (`node dist/index.js`) and the Worker
(`npx wrangler dev`). The table below is a **manual** smoke-check from
December 2025 (historical, not an automated suite):

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

## Version History

### v1.2.3 (November 11, 2026) — unreleased, on `feature/epic-g13`
- Generated add-URLs now carry `&source=mcp-plusw` (surface attribution).
- `add_to_wishlist` annotated `readOnlyHint: true` (installed SDK 1.25.1).
- Version strings aligned to 1.2.3 across `package.json`, `server.json`, and both transports' serverInfo/health (the Worker previously reported 1.2.0).
- Repo hygiene: added `.gitignore`, stopped tracking `node_modules`.

### v1.2.2 (December 24, 2025)
**Critical Fix:** npx execution for all developers
- Fixed main module detection to work with npx symlinks
- Simplified entry point check from complex ESM URL matching to `if (process.argv[1])`
- **Impact:** Resolves crash when developers run `npx wishfinity-mcp-plusw`
- **Result:** Package now works flawlessly for all npm installations

### v1.2.1 (December 24, 2025)
**Critical Fix:** MCP SDK compatibility
- Updated `@modelcontextprotocol/sdk` dependency from `^1.0.0` to `^1.25.0`
- **Impact:** Resolves server disconnection when SDK 1.25.1 was installed by npm
- **Result:** Compatible with latest SDK versions

### v1.2.0 (December 23, 2025)
- Added MCP prompts: `save_for_later`, `shopping_assistant`, `gift_ideas`
- Added MCP resources: `wishfinity://guide`, `wishfinity://triggers`
- Enhanced integration capabilities for AI assistants

## Known Limitations

1. **Button kit is for web embedding only** — Claude cannot display SVG buttons inline; it returns text links instead
2. **ChatGPT Desktop** — Doesn't support MCP configuration yet; separate ChatGPT App built via OpenAI Apps SDK (pending publishing)
3. **Amazon blocking** — Claude can't fetch Amazon product pages directly, but wishlist save still works
4. **`mcp.wishfinity.com` not wired to the Worker** — it currently redirects to the main site; only the `workers.dev` endpoint is live. (v1.3.0 will revisit the custom domain + current-spec Streamable HTTP.)
5. **`package-lock.json` is stale** — root version 1.1.0, records sdk `^1.0.0` (vs `package.json` `^1.25.0`), so `npm ci` would fail. Regenerate with `npm install` as a separate hygiene step.

## Related Projects

- **ChatGPT App (OpenAI Apps SDK):** Separate implementation for ChatGPT, deployed on Render, pending OpenAI App Store publishing
- **Wishfinity Core:** Main wishlist platform at wishfinity.com

## Development Notes

- **Source is TypeScript.** Edit `src/*.ts`, run `npm run build` (tsc → `dist/`), and commit the regenerated `dist/` with the change. The npm package ships `dist/`; the Worker deploys `src/worker.ts` via wrangler.
- **Two files, one behaviour.** `index.ts` (stdio) and `worker.ts` (HTTP) each hold their own copy of the tool definition and `generateAddUrl()`. Change both, identically.
- Tool description wording is critical — it determines when Claude proactively offers to save
- Test changes with real Claude Desktop conversations before deploying
- The `action_url` uses Wishfinity's `/add` endpoint which handles the actual save flow
