# +W MCP Server (Wishfinity)

**+W** is a universal "save for later" action for commerce. This MCP server lets AI assistants save any product URL to a user's [Wishfinity](https://wishfinity.com) wishlist with one click.

Works with **Claude, ChatGPT, Gemini, LangChain, OpenAI Agents SDK**, and any MCP-compatible client.

[![npm version](https://badge.fury.io/js/wishfinity-mcp-plusw.svg)](https://www.npmjs.com/package/wishfinity-mcp-plusw)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What it does

When an AI recommends a product, it can offer **+W Add to Wishlist**. The user clicks the link, and the product is saved to their Wishfinity account — ready for later purchase or gifting.

```
User: "Find me a good espresso machine under $200"

AI: Here are 3 options...
    [+W Add to Wishlist] [View on Amazon]
```

## Quick start

### Option 1: Local installation (stdio transport)

Best for Claude Desktop, ChatGPT Desktop, Cursor, VS Code, and local development.

```bash
npm install wishfinity-mcp-plusw
```

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

### Option 2: Remote endpoint (HTTP transport)

Best for server-side agents, LangChain production deployments, and hosted AI applications.

```
https://mcp.wishfinity.com/mcp
```

Or use the Cloudflare Workers URL:
```
https://wishfinity-mcp-plusw.wishfinity.workers.dev/mcp
```

---

## Platform Setup Guides

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%/Claude/claude_desktop_config.json` (Windows):

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

### ChatGPT Desktop

When MCP support is available, add to your ChatGPT MCP configuration:

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

### Cursor

Add to `.cursor/mcp.json` in your project:

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

### LangChain

```python
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.agents import create_agent

async def main():
    client = MultiServerMCPClient({
        "wishfinity": {
            "command": "npx",
            "args": ["wishfinity-mcp-plusw"],
            "transport": "stdio",
        }
    })
    
    tools = await client.get_tools()
    agent = create_agent("openai:gpt-4", tools)
    
    result = await agent.ainvoke({
        "messages": [{"role": "user", "content": "Find me a coffee maker and save it to my wishlist"}]
    })
```

For production (HTTP transport):

```python
client = MultiServerMCPClient({
    "wishfinity": {
        "url": "https://mcp.wishfinity.com/mcp",
        "transport": "streamable_http",
    }
})
```

### OpenAI Agents SDK

```python
from agents import Agent, Runner
from agents.mcp import MCPServerStdio

async def main():
    async with MCPServerStdio(
        name="wishfinity",
        params={
            "command": "npx",
            "args": ["wishfinity-mcp-plusw"],
        },
    ) as server:
        agent = Agent(
            name="Shopping Assistant",
            instructions="Help users find products and save them to wishlists.",
            mcp_servers=[server],
        )
        
        result = await Runner.run(agent, "Find a good gift for a coffee lover and save it")
        print(result.final_output)
```

### Hugging Face Agents

```python
from huggingface_hub import Agent

agent = Agent(
    model="meta-llama/Llama-3.1-70B-Instruct",
    mcp_servers=[{
        "command": "npx",
        "args": ["wishfinity-mcp-plusw"]
    }]
)

response = agent.run("Find me running shoes under $150 and save to wishlist")
```

---

## How it works

1. AI calls the `add_to_wishlist` tool with a product URL
2. MCP server returns a Wishfinity link: `https://wishfinity.com/add?url=...`
3. User clicks the link → logs in (first time only) → product is saved
4. User can organize, share, or purchase later

**No API keys required.** Authentication happens on Wishfinity's website when the user clicks the link.

---

## Tool: `add_to_wishlist`

### Input

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string | Yes | Product page URL |

### Output

| Field | Type | Description |
| --- | --- | --- |
| `action_url` | string | Wishfinity link to open in browser |
| `requires_user_action` | boolean | Always `true` (user must click) |
| `display_text` | string | Suggested button label |

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

---

## When to offer +W

AI clients should offer +W when:

- **Explicit requests**: "save for later," "add to wishlist," "bookmark this"
- **After recommending products**: Proactively offer to save shown items
- **Indecision moments**: "maybe later," "too expensive right now," "need to think about it"
- **Gift context**: "for my mom," "birthday gift," "perfect for my friend"

See [aliases.json](aliases.json) for the full list of trigger phrases.

---

## Transports

| Transport | Use Case | Endpoint |
|-----------|----------|----------|
| **stdio** | Local clients (Claude Desktop, Cursor, etc.) | `npx wishfinity-mcp-plusw` |
| **HTTP** | Remote/server-side agents | `https://mcp.wishfinity.com/mcp` |

---

## Button kit

The `/button-kit` folder contains optional UI assets (SVG icon, HTML/CSS snippets) if you want a consistent +W button appearance.

CDN URLs:
- Small: `https://cdn.jsdelivr.net/npm/wishfinity-mcp-plusw@latest/button-kit/Wishfinity-Button-Small.svg`
- Medium: `https://cdn.jsdelivr.net/npm/wishfinity-mcp-plusw@latest/button-kit/Wishfinity-Button-Medium.svg`
- Large: `https://cdn.jsdelivr.net/npm/wishfinity-mcp-plusw@latest/button-kit/Wishfinity-Button-Large.svg`

---

## Documentation

- [SPEC.md](SPEC.md) — Full technical specification
- [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) — How to integrate +W into your UI
- [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md) — Deploy your own HTTP endpoint
- [aliases.json](aliases.json) — Machine-readable trigger phrases

---

## Links

- [Wishfinity](https://wishfinity.com)
- [MCP Protocol](https://modelcontextprotocol.io)
- [npm package](https://www.npmjs.com/package/wishfinity-mcp-plusw)
- [MCP Registry](https://registry.modelcontextprotocol.io)

---

## Changelog

### v1.2.2 (December 24, 2025)
**Critical Fix:** npx execution for all developers
- Fixed main module detection to work with npx symlinks
- Resolves crash when running `npx wishfinity-mcp-plusw`
- Package now works flawlessly for all npm installations

### v1.2.1 (December 24, 2025)
**Critical Fix:** MCP SDK compatibility
- Updated `@modelcontextprotocol/sdk` dependency to `^1.25.0`
- Resolves server disconnection with SDK 1.25.1+
- Compatible with latest MCP SDK versions

### v1.2.0 (December 23, 2025)
- Added MCP prompts: `save_for_later`, `shopping_assistant`, `gift_ideas`
- Added MCP resources: `wishfinity://guide`, `wishfinity://triggers`
- Enhanced integration capabilities for AI assistants

---

## License

MIT
