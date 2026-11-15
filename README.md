# +W MCP Server (Wishfinity)

**+W** is a universal "save for later" action for commerce. This MCP server lets an AI assistant turn any product into a link the user opens to save it to their [Wishfinity](https://wishfinity.com) wishlist — where they can find it again, sort it into lists, and share it with friends and family.

Listed in **Claude's connector directory** ([claude.ai/directory/wishfinity](https://claude.ai/directory/wishfinity)) and works in **ChatGPT, Grok, OpenClaw/ClawHub**, and any MCP-compatible client.

[![npm version](https://badge.fury.io/js/wishfinity-mcp-plusw.svg)](https://www.npmjs.com/package/wishfinity-mcp-plusw)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What it does

The server exposes one tool, `add_to_wishlist`. Give it a product page URL and it returns a ready-made link labelled **+W Save to Wishfinity**. The user opens the link to finish saving the product on wishfinity.com (signing up there if they don't have an account). The server itself only builds the link — it doesn't sign anyone in, and it doesn't read or change existing lists.

```
User: "Find me a good espresso machine under $200"

AI: Here are three options…
    +W Save to Wishfinity → https://wishfinity.com/add?url=…&source=mcp-plusw
```

## Quick start

### Hosted endpoint (recommended) — Streamable HTTP, no key

Point any HTTP MCP client at:

```
https://mcp.wishfinity.com/mcp
```

Always-available alternate:

```
https://wishfinity-mcp-plusw.wishfinity.workers.dev/mcp
```

No API key, no sign-up to connect — authentication happens on Wishfinity's site only when the user opens a save link.

### Local (stdio) — npx

For Claude Desktop, Cursor, and local development:

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

---

## Client setup

### Claude

- **Directory:** install from Claude's connector directory — [claude.ai/directory/wishfinity](https://claude.ai/directory/wishfinity).
- **Claude Desktop (local):** add the stdio config above to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%/Claude/claude_desktop_config.json` (Windows).

### ChatGPT

Settings → **Plugins → Add custom MCP server**, and enter the URL:

```
https://mcp.wishfinity.com/mcp
```

### Grok

Add a remote MCP server with the same hosted URL (`https://mcp.wishfinity.com/mcp`).

### OpenClaw / ClawHub

Install the **Wishfinity** skill from ClawHub, or point a remote MCP client at the hosted URL above.

### LangChain (production, HTTP)

```python
from langchain_mcp_adapters.client import MultiServerMCPClient

client = MultiServerMCPClient({
    "wishfinity": {
        "url": "https://mcp.wishfinity.com/mcp",
        "transport": "streamable_http",
    }
})
tools = await client.get_tools()
```

### OpenAI Agents SDK (local, stdio)

```python
from agents.mcp import MCPServerStdio

async with MCPServerStdio(
    name="wishfinity",
    params={"command": "npx", "args": ["-y", "wishfinity-mcp-plusw"]},
) as server:
    ...
```

---

## Tool: `add_to_wishlist`

### Input

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string | Yes | The product page URL to save |

### Output

The tool returns **two text content blocks**:

1. A ready-made markdown link, so the assistant can surface it directly:

   ```
   [+W Save to Wishfinity](https://wishfinity.com/add?url=…&source=mcp-plusw)
   ```

2. A JSON object with the same data for clients that read fields:

   ```json
   {
     "action_url": "https://wishfinity.com/add?url=https%3A%2F%2Famazon.com%2Fdp%2FB0EXAMPLE&source=mcp-plusw",
     "requires_user_action": true,
     "display_text": "+W Save to Wishfinity",
     "intent": "save_commerce_item"
   }
   ```

Every `action_url` carries `&source=mcp-plusw` (surface attribution). If the URL is a search-results or category page rather than a single product, the JSON adds a short `note` field explaining that. The tool is read-only — it builds a link and writes nothing server-side.

### Example prompts

- "Find me a coffee maker under $80 and save it to my wishlist."
- "Save this for later: `https://…`"
- "That would make a great birthday gift — add it to my Wishfinity list."

---

## What it doesn't do / privacy

- **Builds a save link only.** The server returns a URL; it does not place orders or move money.
- **No sign-in through the server.** The user authenticates on wishfinity.com when they open the link.
- **Doesn't read or change your lists.** The tool is read-only and has no access to existing wishlists.
- **Stores nothing.** The server keeps no user data — it just constructs the link from the URL you pass.
- Privacy policy: [info.wishfinity.com/privacy](https://info.wishfinity.com/privacy).

---

## MCP prompts & resources

The server also registers a few optional prompts (`save_for_later`, `shopping_assistant`, `gift_ideas`) and resources (`wishfinity://guide`, and `wishfinity://triggers` — example phrases a user might say when they want to save something). They are conveniences for clients that use them; the `add_to_wishlist` tool is all you need.

---

## Button kit

`/button-kit` holds optional +W button assets (SVG icons, HTML/CSS). CDN:

- `https://cdn.jsdelivr.net/npm/wishfinity-mcp-plusw@latest/button-kit/Wishfinity-Button-Medium.svg`

---

## Documentation

- [SPEC.md](SPEC.md) — technical specification
- [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) — integrating the +W button into your UI

---

## Links

- [Wishfinity](https://wishfinity.com)
- [MCP Protocol](https://modelcontextprotocol.io)
- [npm package](https://www.npmjs.com/package/wishfinity-mcp-plusw)
- [MCP Registry](https://registry.modelcontextprotocol.io)

---

## Changelog

Full history: [GitHub Releases](https://github.com/wishfinity/wishfinity-mcp-plusw/releases).

### v1.3.1
- The tool result now leads with a ready-made `[+W Save to Wishfinity](…)` markdown link, followed by the JSON (two text blocks).
- npm publishing moved to tokenless GitHub Actions (OIDC) with provenance.

### v1.3.0
- Advertises MCP protocol version `2025-06-18` (still negotiates older revisions).
- Per-tool icon; `readOnlyHint` annotation; SDK and tooling updates.

### v1.2.0–v1.2.5
- Added MCP prompts and resources; non-product-URL note; ChatGPT-plugin readiness; npx execution fixes. See Releases for details.

---

## License

MIT
