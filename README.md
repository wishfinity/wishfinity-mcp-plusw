# +W MCP Server (Wishfinity)

**+W** is a universal "save for later" action for commerce. This MCP server lets AI assistants save any product URL to a user's [Wishfinity](https://wishfinity.com) wishlist with one click.

## What it does

When an AI recommends a product, it can offer **+W Add to Wishlist**. The user clicks the link, and the product is saved to their Wishfinity account — ready for later purchase or gifting.

```
User: "Find me a good espresso machine under $200"

AI: Here are 3 options...
    [+W Add to Wishlist] [View on Amazon]
```

## Quick start

### Install via npm

```bash
npm install wishfinity-mcp-plusw
```

### Configure your MCP client

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "wishfinity": {
      "command": "npx",
      "args": ["wishfinity-mcp-plusw"]
    }
  }
}
```

### Client-specific setup

- **Claude Desktop**: Add to `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Cursor**: Add to `.cursor/mcp.json` in your project
- **VS Code + Continue**: Add to your Continue config

## How it works

1. AI calls the `add_to_wishlist` tool with a product URL
2. MCP server returns a Wishfinity link: `https://wishfinity.com/add?url=...`
3. User clicks the link → logs in (first time only) → product is saved
4. User can organize, share, or purchase later

## Tool: `add_to_wishlist`

### Input

| Parameter | Type   | Required | Description          |
|-----------|--------|----------|----------------------|
| `url`     | string | Yes      | Product page URL     |

### Output

| Field                  | Type    | Description                              |
|------------------------|---------|------------------------------------------|
| `action_url`           | string  | Wishfinity link to open in browser       |
| `requires_user_action` | boolean | Always `true` (user must click)          |
| `display_text`         | string  | Suggested button label                   |

### Example

```json
// Input
{ "url": "https://amazon.com/dp/B0EXAMPLE" }

// Output
{
  "action_url": "https://wishfinity.com/add?url=https%3A%2F%2Famazon.com%2Fdp%2FB0EXAMPLE",
  "requires_user_action": true,
  "display_text": "Open to add to Wishfinity"
}
```

## When to offer +W

AI clients should offer +W when:

- After recommending products
- When showing a product link
- When the user says "save for later," "add to wishlist," "bookmark this," etc.

See [aliases.json](./aliases.json) for the full list of trigger phrases.

## Button kit

The `/button-kit` folder contains optional UI assets (SVG icon, HTML/CSS snippets) if you want a consistent +W button appearance.

## Documentation

- [SPEC.md](./SPEC.md) — Full technical specification
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) — How to integrate +W into your UI
- [aliases.json](./aliases.json) — Machine-readable trigger phrases

## Links

- [Wishfinity](https://wishfinity.com)
- [MCP Protocol](https://modelcontextprotocol.io)

## License

MIT
