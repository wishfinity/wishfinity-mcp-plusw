// Protocol smoke harness for the Wishfinity +W MCP server.
//
// Proves — on EVERY release — that both transports still speak the protocol
// our clients (Claude, ChatGPT, Grok/Cursor, Desktop via npm) rely on. It
// exercises the SHIPPED compiled code:
//   * stdio  — spawns `node dist/index.js` and speaks newline-delimited
//              JSON-RPC over stdin/stdout (the real SDK Server path).
//   * HTTP   — imports the compiled Worker (`dist/worker.js`) and calls its
//              `fetch(request, env)` handler IN-PROCESS. This is the
//              in-process equivalent of `wrangler dev`: same handler wrangler
//              bundles and serves, but no network, no auth prompt, and
//              deterministic env injection (needed to test the challenge
//              secret both set and unset). `npm run build` (run by `npm test`)
//              produces dist/ first.
//
// Run with: npm test   (builds, then `node --test` discovers this file).
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");
const STDIO_ENTRY = join(REPO, "dist", "index.js");

// Stable phrases/values that today's clients key on. If any of these must
// change, it is a deliberate protocol-visible change and this harness should
// be updated in the same commit — never silently.
const SERVER_NAME = "wishfinity-mcp-plusw";
const SERVER_VERSION = "1.2.5";
const TOOL_NAME = "add_to_wishlist";
const TOOL_TITLE = "Add to Wishfinity wishlist";
const DISPLAY_TEXT = "+W Save to Wishfinity";
const SOURCE_TAG = "source=mcp-plusw";
const PRODUCT_URL = "https://www.amazon.com/dp/B0D1XD1ZV3";
const SEARCH_URL = "https://www.amazon.com/s?k=coffee+maker";

// --- Shared assertions on a tools/list result (same shape on both transports).
function assertToolShape(tool) {
  assert.equal(tool.name, TOOL_NAME, "tool name");
  assert.equal(tool.title, TOOL_TITLE, "tool title");
  assert.equal(typeof tool.description, "string");
  assert.ok(tool.description.includes("Wishfinity wishlist"), "description mentions the wishlist");
  assert.ok(tool.description.includes("Works with any store"), "description mentions any store");
  assert.ok(tool.annotations, "annotations present");
  assert.equal(tool.annotations.readOnlyHint, true, "readOnlyHint");
  assert.equal(tool.annotations.destructiveHint, false, "destructiveHint");
  assert.equal(tool.annotations.openWorldHint, false, "openWorldHint");
  // Per-tool icons (R2): REQUIRED on every tool now, both transports.
  assert.ok(Array.isArray(tool.icons) && tool.icons.length > 0, "icons is a non-empty array");
  const icon = tool.icons[0];
  assert.equal(icon.src, "https://wishfinity.com/w_icon_256.png", "icon.src");
  assert.equal(icon.mimeType, "image/png", "icon.mimeType");
  assert.ok(Array.isArray(icon.sizes) && icon.sizes.includes("256x256"), "icon.sizes includes 256x256");
  return true;
}

// --- Shared assertions on a tools/call text payload.
function parseToolCallPayload(result) {
  assert.ok(result && Array.isArray(result.content) && result.content[0], "content block present");
  assert.equal(result.content[0].type, "text", "content is text");
  return JSON.parse(result.content[0].text);
}
function assertProductPayload(payload) {
  assert.equal(payload.display_text, DISPLAY_TEXT, "display_text");
  assert.equal(payload.requires_user_action, true, "requires_user_action");
  assert.equal(payload.intent, "save_commerce_item", "intent");
  assert.ok(payload.action_url.includes(SOURCE_TAG), "action_url carries source attribution");
  assert.ok(
    payload.action_url.includes(encodeURIComponent(PRODUCT_URL)),
    "action_url carries the percent-encoded product URL"
  );
  assert.ok(!("note" in payload), "a real product URL carries no note");
}
function assertSearchPayload(payload) {
  assert.ok(typeof payload.note === "string" && payload.note.length > 0, "search URL carries a note");
  assert.ok(payload.note.includes("search results"), "note names the page type");
  assert.ok(payload.action_url.includes(SOURCE_TAG), "action_url still carries source attribution");
}

// =====================================================================
// stdio transport — spawn `node dist/index.js`, speak JSON-RPC over stdio.
// =====================================================================
function makeStdioClient() {
  const child = spawn(process.execPath, [STDIO_ENTRY], { stdio: ["pipe", "pipe", "pipe"] });
  const pending = new Map();
  let buf = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buf += chunk;
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }
      if (msg.id != null && pending.has(msg.id)) {
        pending.get(msg.id).resolve(msg);
        pending.delete(msg.id);
      }
    }
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (c) => { stderr += c; });
  let nextId = 1;
  function request(method, params) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error(`timeout waiting for ${method}; stderr so far: ${stderr}`));
        }
      }, 15000);
      pending.set(id, { resolve: (m) => { clearTimeout(timer); resolve(m); }, reject });
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    });
  }
  function notify(method, params) {
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
  }
  function close() {
    try { child.stdin.end(); } catch {}
    child.kill();
  }
  return { request, notify, close };
}

test("stdio transport (node dist/index.js)", async (t) => {
  const client = makeStdioClient();
  try {
    // MCP handshake: initialize -> notifications/initialized, then requests.
    const initResp = await client.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "smoke-harness", version: "0.0.0" },
    });
    const init = initResp.result;

    await t.test("initialize returns serverInfo + protocolVersion", () => {
      assert.ok(init, "initialize result present");
      assert.equal(init.serverInfo.name, SERVER_NAME, "serverInfo.name");
      assert.equal(init.serverInfo.version, SERVER_VERSION, "serverInfo.version");
      assert.ok(
        typeof init.protocolVersion === "string" && /^\d{4}-\d{2}-\d{2}$/.test(init.protocolVersion),
        `protocolVersion is a date-shaped string (got ${JSON.stringify(init.protocolVersion)})`
      );
    });
    // Negotiated value is SDK-driven on stdio; surface it for the report.
    t.diagnostic(`stdio negotiated protocolVersion = ${init.protocolVersion}`);

    client.notify("notifications/initialized", {});

    await t.test("tools/list exposes the tool with title + hints", async () => {
      const resp = await client.request("tools/list", {});
      assert.ok(Array.isArray(resp.result.tools) && resp.result.tools.length === 1, "one tool");
      const hasIcons = assertToolShape(resp.result.tools[0]);
      t.diagnostic(`stdio tool.icons present = ${hasIcons}`);
    });

    await t.test("tools/call on a product URL returns a link, no note", async () => {
      const resp = await client.request("tools/call", { name: TOOL_NAME, arguments: { url: PRODUCT_URL } });
      assertProductPayload(parseToolCallPayload(resp.result));
    });

    await t.test("tools/call on a search URL returns the note", async () => {
      const resp = await client.request("tools/call", { name: TOOL_NAME, arguments: { url: SEARCH_URL } });
      assertSearchPayload(parseToolCallPayload(resp.result));
    });
  } finally {
    client.close();
  }
});

// =====================================================================
// HTTP transport — in-process worker.fetch(request, env).
// =====================================================================
async function loadWorker() {
  const mod = await import(join(REPO, "dist", "worker.js"));
  return mod.default;
}
function post(worker, body, env = {}) {
  const req = new Request("https://mcp.wishfinity.com/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return worker.fetch(req, env);
}
function rpc(method, params, id = 1) {
  return { jsonrpc: "2.0", id, method, params };
}

test("http transport (in-process worker.fetch)", async (t) => {
  const worker = await loadWorker();

  await t.test("initialize returns serverInfo + protocolVersion", async () => {
    const res = await post(worker, rpc("initialize", {
      protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "smoke", version: "0" },
    }));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.result.serverInfo.name, SERVER_NAME, "serverInfo.name");
    assert.equal(body.result.serverInfo.version, SERVER_VERSION, "serverInfo.version");
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(body.result.protocolVersion), "protocolVersion date-shaped");
    t.diagnostic(`http advertised protocolVersion = ${body.result.protocolVersion}`);
  });

  await t.test("tools/list exposes the tool with title + hints", async () => {
    const res = await post(worker, rpc("tools/list", {}));
    const body = await res.json();
    assert.ok(Array.isArray(body.result.tools) && body.result.tools.length === 1, "one tool");
    const hasIcons = assertToolShape(body.result.tools[0]);
    t.diagnostic(`http tool.icons present = ${hasIcons}`);
  });

  await t.test("tools/call on a product URL returns a link, no note", async () => {
    const res = await post(worker, rpc("tools/call", { name: TOOL_NAME, arguments: { url: PRODUCT_URL } }));
    assertProductPayload(parseToolCallPayload((await res.json()).result));
  });

  await t.test("tools/call on a search URL returns the note", async () => {
    const res = await post(worker, rpc("tools/call", { name: TOOL_NAME, arguments: { url: SEARCH_URL } }));
    assertSearchPayload(parseToolCallPayload((await res.json()).result));
  });

  await t.test("malformed JSON body -> -32700 Parse error (400)", async () => {
    const res = await post(worker, "{ this is not json");
    assert.equal(res.status, 400, "HTTP 400");
    const body = await res.json();
    assert.equal(body.error.code, -32700, "JSON-RPC parse error code");
    assert.equal(body.id, null, "id is null on parse error");
  });

  await t.test("GET /mcp -> 405 method not allowed", async () => {
    const res = await worker.fetch(new Request("https://mcp.wishfinity.com/mcp", { method: "GET" }), {});
    assert.equal(res.status, 405);
  });

  await t.test(".well-known OAuth paths -> 404 non-HTML", async () => {
    for (const p of ["/.well-known/oauth-authorization-server", "/.well-known/oauth-protected-resource"]) {
      const res = await worker.fetch(new Request("https://mcp.wishfinity.com" + p), {});
      assert.equal(res.status, 404, `${p} is 404`);
      assert.ok(res.headers.get("content-type").includes("application/json"), `${p} is JSON, not HTML`);
      const body = await res.json();
      assert.equal(body.error, "not_found", `${p} error body`);
    }
  });

  await t.test("openai-apps challenge: 404 unset, 200 token when set", async () => {
    const CH = "/.well-known/openai-apps-challenge";
    const unset = await worker.fetch(new Request("https://mcp.wishfinity.com" + CH), {});
    assert.equal(unset.status, 404, "404 when secret unset");
    assert.equal(await unset.text(), "Not Found");

    const TOKEN = "tok_smoke_test_only_123";
    const set = await worker.fetch(new Request("https://mcp.wishfinity.com" + CH), { OPENAI_APPS_CHALLENGE: TOKEN });
    assert.equal(set.status, 200, "200 when secret set");
    assert.ok(set.headers.get("content-type").includes("text/plain"), "served as plain text");
    assert.equal(await set.text(), TOKEN, "echoes the token verbatim");
  });

  await t.test("/health -> 200 with version", async () => {
    const res = await worker.fetch(new Request("https://mcp.wishfinity.com/health"), {});
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "ok");
    assert.equal(body.version, SERVER_VERSION);
  });
});
