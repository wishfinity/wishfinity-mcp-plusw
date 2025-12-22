# Cloudflare Workers Setup Guide

This guide walks you through deploying the Wishfinity +W MCP server to Cloudflare Workers for HTTP transport support.

**Time required:** 10-15 minutes  
**Cost:** Free (100,000 requests/day included)  
**Prerequisites:** Node.js installed, GitHub repo access

---

## Step 1: Create a Cloudflare Account (5 minutes)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Click "Sign up"
3. Enter email and password
4. Verify your email

**No credit card required** for the free tier.

---

## Step 2: Install Wrangler CLI (1 minute)

Wrangler is Cloudflare's command-line tool. It's already in your `devDependencies`, so just run:

```bash
npm install
```

Or install globally if you prefer:

```bash
npm install -g wrangler
```

---

## Step 3: Login to Cloudflare (1 minute)

```bash
npx wrangler login
```

This opens a browser window. Click "Allow" to authorize Wrangler.

You'll see:
```
Successfully logged in.
```

---

## Step 4: Deploy (30 seconds)

```bash
npm run deploy
```

Or directly:

```bash
npx wrangler deploy
```

**First deploy output:**

```
Your worker has been deployed!
https://wishfinity-mcp-plusw.YOUR_SUBDOMAIN.workers.dev
```

🎉 **That's it. Your HTTP MCP server is live globally.**

---

## Step 5: Test the Deployment

### Health check:

```bash
curl https://wishfinity-mcp-plusw.YOUR_SUBDOMAIN.workers.dev/health
```

Expected response:
```json
{
  "status": "ok",
  "server": "wishfinity-mcp-plusw",
  "version": "1.1.0",
  "transport": "streamable-http"
}
```

### Test MCP endpoint:

```bash
curl -X POST https://wishfinity-mcp-plusw.YOUR_SUBDOMAIN.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Expected response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "add_to_wishlist",
        "description": "Save a product to the user's Wishfinity wishlist...",
        ...
      }
    ]
  }
}
```

---

## Step 6: Update server.json with Your URL

After deploy, update `server.json` with your actual Workers URL:

```json
{
  "remoteEndpoints": [
    {
      "url": "https://wishfinity-mcp-plusw.YOUR_SUBDOMAIN.workers.dev/mcp",
      "transport": {
        "type": "streamable-http"
      }
    }
  ]
}
```

---

## Optional: Custom Domain (mcp.wishfinity.com)

If you want to use your own domain instead of the `.workers.dev` URL:

### Option A: Via Cloudflare Dashboard

1. Go to Workers & Pages in Cloudflare dashboard
2. Click on your worker
3. Go to "Settings" → "Triggers" → "Custom Domains"
4. Add `mcp.wishfinity.com`
5. Cloudflare will guide you through DNS setup

### Option B: Via wrangler.toml

Uncomment in `wrangler.toml`:

```toml
routes = [
  { pattern = "mcp.wishfinity.com", custom_domain = true }
]
```

Then redeploy:

```bash
npm run deploy
```

**Note:** Your domain must be on Cloudflare DNS for this to work. If wishfinity.com isn't on Cloudflare yet, you'll need to add it first (free).

---

## Local Development

To test the worker locally before deploying:

```bash
npm run cf:dev
```

This starts a local server at `http://localhost:8787` that simulates the Cloudflare environment.

---

## Viewing Logs

To see real-time logs from your deployed worker:

```bash
npm run cf:tail
```

This streams logs as requests come in — useful for debugging.

---

## Updating the Worker

After making code changes:

```bash
npm run deploy
```

Updates are live globally in ~30 seconds.

---

## GitHub Actions (Optional CI/CD)

To auto-deploy on push to main, create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

To get the API token:
1. Cloudflare Dashboard → Profile → API Tokens
2. Create Token → Use "Edit Cloudflare Workers" template
3. Copy token to GitHub repo secrets as `CLOUDFLARE_API_TOKEN`

---

## Troubleshooting

### "Error: You need to login first"
Run: `npx wrangler login`

### "Error: Could not find wrangler.toml"
Make sure you're in the project root directory.

### "Error: Workers account not found"
Your Cloudflare account needs Workers enabled. Go to dash.cloudflare.com → Workers & Pages → click "Get started" if prompted.

### CORS errors from browser
The worker includes CORS headers for `*`. If you need to restrict origins, edit the `CORS_HEADERS` in `src/worker.ts`.

---

## Summary

| Task | Command |
|------|---------|
| Install dependencies | `npm install` |
| Login to Cloudflare | `npx wrangler login` |
| Deploy to production | `npm run deploy` |
| Local development | `npm run cf:dev` |
| View live logs | `npm run cf:tail` |

Your MCP server now supports:
- **stdio** via `npx wishfinity-mcp-plusw` (local clients)
- **HTTP** via `https://wishfinity-mcp-plusw.YOUR_SUBDOMAIN.workers.dev/mcp` (remote clients)
