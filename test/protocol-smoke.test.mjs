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
const SERVER_VERSION = "1.4.0";
const ADVERTISED_PROTOCOL = "2025-06-18"; // what the server returns when not asked for a supported legacy one
const LEGACY_PROTOCOL = "2024-11-05"; // a legacy revision that must still negotiate (back-compat)
const TOOL_NAME = "add_to_wishlist";
const TOOL_TITLE = "Add to Wishfinity wishlist";
const DISPLAY_TEXT = "+W Save to Wishfinity";
const SOURCE_TAG = "source=mcp-plusw";
const PRODUCT_URL = "https://www.amazon.com/dp/B0D1XD1ZV3";
const SEARCH_URL = "https://www.amazon.com/s?k=coffee+maker";
// v1.4.0 (G.18): add by name.
const TITLE = "Dyson V15 cordless vacuum";
const LONG_TITLE = "x".repeat(121); // 121 > the server's 120-char title cap
// v1.2.0 prompts/resources (served on both transports).
const PROMPT_NAMES = ["save_for_later", "shopping_assistant", "gift_ideas"];
const RESOURCE_URIS = ["wishfinity://guide", "wishfinity://triggers"];
// Off-rule behaviour-instruction words that must not appear in any served PROSE
// (Distribution / Anthropic / Meta). Checked by the gate below.
const BANNED_WORDS = /(proactively|offer|always|trigger)/i;

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
  // v1.4.0 (G.18): add by name — schema + wording.
  const props = tool.inputSchema && tool.inputSchema.properties;
  assert.ok(props && props.title, "inputSchema has a title property");
  assert.equal(props.title.type, "string", "title is a string");
  assert.ok(props.title.description.includes("Up to 120 characters"), "title description states the 120-char cap");
  assert.equal(props.url.description, "The product page URL. Optional if `title` is given.", "url description is Distribution's exact text");
  assert.ok(!JSON.stringify(tool).includes("ask the user"), "no 'ask the user' instruction anywhere in the tool (schema or description)");
  assert.ok(!(Array.isArray(tool.inputSchema.required) && tool.inputSchema.required.includes("url")), "url is no longer schema-required");
  assert.ok(tool.description.includes("Accepts a product page URL, or a product name when there isn't one."), "description carries the add-by-name wording");
  assert.ok(tool.description.includes("Wishfinity asks the user to confirm the wish before saving it."), "description carries the confirm wording");
  assert.ok(!tool.description.includes("Requires a specific product page URL"), "old URL-required wording is gone");
  return true;
}

// --- Shared assertions on a tools/call result.
// v1.3.1 (G.17 S1 / #195): the result is TWO text blocks — block 0 is a
// ready-made markdown link (so clients like Grok surface it verbatim instead
// of paraphrasing display_text), block 1 is the JSON contract, unchanged.
// parseToolCallPayload reads the JSON (block 1); assertLinkBlock checks block 0.
function parseToolCallPayload(result) {
  assert.ok(result && Array.isArray(result.content), "content array present");
  assert.equal(result.content.length, 2, "two content blocks (link + JSON)");
  assert.equal(result.content[1].type, "text", "block 1 is text (JSON)");
  return JSON.parse(result.content[1].text);
}
function assertLinkBlock(result, encodedUrl) {
  assert.ok(result && Array.isArray(result.content) && result.content[0], "link block present");
  assert.equal(result.content[0].type, "text", "block 0 is text");
  const link = result.content[0].text;
  assert.ok(
    link.startsWith(`[${DISPLAY_TEXT}](`) && link.endsWith(")"),
    "block 0 is a markdown link labelled with display_text"
  );
  assert.ok(link.includes(SOURCE_TAG), "link carries source attribution");
  if (encodedUrl) assert.ok(link.includes(encodedUrl), "link carries the percent-encoded target URL");
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
// v1.4.0 (G.18): add by name.
function assertTitlePayload(payload, title) {
  assert.equal(payload.display_text, DISPLAY_TEXT, "display_text");
  assert.equal(payload.requires_user_action, true, "requires_user_action");
  assert.equal(payload.intent, "save_commerce_item", "intent");
  assert.ok(payload.action_url.includes(SOURCE_TAG), "action_url carries source attribution");
  assert.ok(payload.action_url.includes("title=" + encodeURIComponent(title)), "action_url carries the percent-encoded title");
  assert.ok(!payload.action_url.includes("url="), "a title-only save has no url= param");
  assert.ok(!("note" in payload), "a title save carries no note");
}
function assertUrlWinsPayload(payload) {
  assert.ok(payload.action_url.includes("url=" + encodeURIComponent(PRODUCT_URL)), "url= present (URL wins when both are given)");
  assert.ok(!payload.action_url.includes("title="), "title= absent when a URL is also given (URL wins)");
}
function assertToolError(result, needle) {
  assert.equal(result.isError, true, "isError is true");
  assert.ok(Array.isArray(result.content) && result.content[0] && result.content[0].type === "text", "error carries a text block");
  assert.ok(result.content[0].text.includes(needle), `error message includes "${needle}" (got: ${result.content[0] && result.content[0].text})`);
}
// Collect the human-facing PROSE the server serves — NOT identifiers/URIs: the
// tool description + param descriptions, prompt descriptions + message texts,
// resource names + descriptions + bodies. (A resource URI like
// wishfinity://triggers is a client-facing key, not prose, so it is excluded.)
function collectServedProse({ tool, prompts, promptMessages, resources, resourceBodies }) {
  const out = [];
  if (tool) {
    out.push(tool.description);
    for (const p of Object.values(tool.inputSchema?.properties || {})) out.push(p.description);
  }
  for (const p of prompts || []) out.push(p.description);
  for (const m of promptMessages || []) out.push(m);
  for (const r of resources || []) { out.push(r.name); out.push(r.description); }
  for (const b of resourceBodies || []) out.push(b);
  return out.filter((s) => typeof s === "string" && s.length > 0);
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
    // Request a legacy revision: the SDK must echo it back (back-compat).
    const initResp = await client.request("initialize", {
      protocolVersion: LEGACY_PROTOCOL,
      capabilities: {},
      clientInfo: { name: "smoke-harness", version: "0.0.0" },
    });
    const init = initResp.result;

    await t.test("initialize returns serverInfo + negotiates the legacy version", () => {
      assert.ok(init, "initialize result present");
      assert.equal(init.serverInfo.name, SERVER_NAME, "serverInfo.name");
      assert.equal(init.serverInfo.version, SERVER_VERSION, "serverInfo.version");
      // stdio sets no fixed version — the SDK negotiates. A legacy client must
      // still get its requested version back.
      assert.equal(init.protocolVersion, LEGACY_PROTOCOL, "SDK echoes the requested legacy version (back-compat)");
    });
    t.diagnostic(`stdio negotiated protocolVersion (requested ${LEGACY_PROTOCOL}) = ${init.protocolVersion}`);

    client.notify("notifications/initialized", {});

    await t.test("tools/list exposes the tool with title + hints", async () => {
      const resp = await client.request("tools/list", {});
      assert.ok(Array.isArray(resp.result.tools) && resp.result.tools.length === 1, "one tool");
      const hasIcons = assertToolShape(resp.result.tools[0]);
      t.diagnostic(`stdio tool.icons present = ${hasIcons}`);
    });

    await t.test("tools/call on a product URL returns a link, no note", async () => {
      const resp = await client.request("tools/call", { name: TOOL_NAME, arguments: { url: PRODUCT_URL } });
      assertLinkBlock(resp.result, encodeURIComponent(PRODUCT_URL));
      assertProductPayload(parseToolCallPayload(resp.result));
    });

    await t.test("tools/call on a search URL returns the note", async () => {
      const resp = await client.request("tools/call", { name: TOOL_NAME, arguments: { url: SEARCH_URL } });
      assertLinkBlock(resp.result, encodeURIComponent(SEARCH_URL));
      assertSearchPayload(parseToolCallPayload(resp.result));
    });

    await t.test("tools/call with a title only returns a ?title= link", async () => {
      const resp = await client.request("tools/call", { name: TOOL_NAME, arguments: { title: TITLE } });
      assertLinkBlock(resp.result, encodeURIComponent(TITLE));
      assertTitlePayload(parseToolCallPayload(resp.result), TITLE);
    });

    await t.test("tools/call with both url and title -> URL wins", async () => {
      const resp = await client.request("tools/call", { name: TOOL_NAME, arguments: { url: PRODUCT_URL, title: TITLE } });
      assertUrlWinsPayload(parseToolCallPayload(resp.result));
    });

    await t.test("tools/call with neither url nor title -> tool error", async () => {
      const resp = await client.request("tools/call", { name: TOOL_NAME, arguments: {} });
      assertToolError(resp.result, "provide a product url or a title");
    });

    await t.test("tools/call with a 121-char title -> refused", async () => {
      const resp = await client.request("tools/call", { name: TOOL_NAME, arguments: { title: LONG_TITLE } });
      assertToolError(resp.result, "120 characters or fewer");
    });

    // --- prompts + resources (v1.2.0), served on stdio ---
    const sPrompts = (await client.request("prompts/list", {})).result.prompts;
    const sPromptMessages = [];
    await t.test("prompts/list + prompts/get (x3)", async () => {
      assert.deepEqual(sPrompts.map((p) => p.name).sort(), [...PROMPT_NAMES].sort(), "the three prompts");
      for (const name of PROMPT_NAMES) {
        const got = (await client.request("prompts/get", { name, arguments: {} })).result;
        assert.ok(Array.isArray(got.messages) && got.messages.length > 0, `prompts/get ${name} returns messages`);
        for (const m of got.messages) sPromptMessages.push(m.content.text);
      }
    });
    const sResources = (await client.request("resources/list", {})).result.resources;
    const sResourceBodies = [];
    await t.test("resources/list + resources/read (x2)", async () => {
      assert.deepEqual(sResources.map((r) => r.uri).sort(), [...RESOURCE_URIS].sort(), "the two resources");
      for (const uri of RESOURCE_URIS) {
        const got = (await client.request("resources/read", { uri })).result;
        assert.ok(Array.isArray(got.contents) && got.contents[0] && typeof got.contents[0].text === "string", `resources/read ${uri} returns text`);
        sResourceBodies.push(got.contents[0].text);
      }
    });
    const sTool = (await client.request("tools/list", {})).result.tools[0];
    await t.test(
      "no served prose says proactively/offer/always/trigger",
      { todo: "EXPECTED FAIL until S5(b): the wishfinity://triggers resource name still reads 'Wishlist Trigger Phrases'. When Distribution renames the name+description, remove this todo marker." },
      () => {
        const prose = collectServedProse({ tool: sTool, prompts: sPrompts, promptMessages: sPromptMessages, resources: sResources, resourceBodies: sResourceBodies });
        for (const s of prose) assert.ok(!BANNED_WORDS.test(s), `off-rule word in served prose: ${JSON.stringify(s).slice(0, 90)}`);
      }
    );
  } finally {
    client.close();
  }
});

test("stdio negotiates a requested current revision (SDK echo-or-default)", async () => {
  const client = makeStdioClient();
  try {
    const r = await client.request("initialize", {
      protocolVersion: ADVERTISED_PROTOCOL,
      capabilities: {},
      clientInfo: { name: "smoke-harness", version: "0.0.0" },
    });
    assert.equal(r.result.protocolVersion, ADVERTISED_PROTOCOL, "stdio echoes a supported current revision");
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

  await t.test("initialize advertises 2025-06-18 by default; echoes a supported legacy version", async () => {
    // Default: no protocolVersion requested -> the advertised/preferred value.
    const def = await (await post(worker, rpc("initialize", {
      capabilities: {}, clientInfo: { name: "smoke", version: "0" },
    }))).json();
    assert.equal(def.result.serverInfo.name, SERVER_NAME, "serverInfo.name");
    assert.equal(def.result.serverInfo.version, SERVER_VERSION, "serverInfo.version");
    assert.equal(def.result.protocolVersion, ADVERTISED_PROTOCOL, "advertised protocolVersion");
    t.diagnostic(`http advertised protocolVersion = ${def.result.protocolVersion}`);
    // Back-compat: a client requesting legacy 2024-11-05 still negotiates it.
    const legacy = await (await post(worker, rpc("initialize", {
      protocolVersion: LEGACY_PROTOCOL, capabilities: {}, clientInfo: { name: "smoke", version: "0" },
    }))).json();
    assert.equal(legacy.result.protocolVersion, LEGACY_PROTOCOL, "legacy client still negotiates 2024-11-05");
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
    const result = (await res.json()).result;
    assertLinkBlock(result, encodeURIComponent(PRODUCT_URL));
    assertProductPayload(parseToolCallPayload(result));
  });

  await t.test("tools/call on a search URL returns the note", async () => {
    const res = await post(worker, rpc("tools/call", { name: TOOL_NAME, arguments: { url: SEARCH_URL } }));
    const result = (await res.json()).result;
    assertLinkBlock(result, encodeURIComponent(SEARCH_URL));
    assertSearchPayload(parseToolCallPayload(result));
  });

  await t.test("tools/call with a title only returns a ?title= link", async () => {
    const res = await post(worker, rpc("tools/call", { name: TOOL_NAME, arguments: { title: TITLE } }));
    const result = (await res.json()).result;
    assertLinkBlock(result, encodeURIComponent(TITLE));
    assertTitlePayload(parseToolCallPayload(result), TITLE);
  });

  await t.test("tools/call with both url and title -> URL wins", async () => {
    const res = await post(worker, rpc("tools/call", { name: TOOL_NAME, arguments: { url: PRODUCT_URL, title: TITLE } }));
    assertUrlWinsPayload(parseToolCallPayload((await res.json()).result));
  });

  await t.test("tools/call with neither url nor title -> tool error", async () => {
    const res = await post(worker, rpc("tools/call", { name: TOOL_NAME, arguments: {} }));
    assertToolError((await res.json()).result, "provide a product url or a title");
  });

  await t.test("tools/call with a 121-char title -> refused", async () => {
    const res = await post(worker, rpc("tools/call", { name: TOOL_NAME, arguments: { title: LONG_TITLE } }));
    assertToolError((await res.json()).result, "120 characters or fewer");
  });

  // --- prompts + resources (v1.2.0), served on HTTP ---
  const hPrompts = (await (await post(worker, rpc("prompts/list", {}))).json()).result.prompts;
  const hPromptMessages = [];
  await t.test("prompts/list + prompts/get (x3)", async () => {
    assert.deepEqual(hPrompts.map((p) => p.name).sort(), [...PROMPT_NAMES].sort(), "the three prompts");
    for (const name of PROMPT_NAMES) {
      const got = (await (await post(worker, rpc("prompts/get", { name, arguments: {} }))).json()).result;
      assert.ok(Array.isArray(got.messages) && got.messages.length > 0, `prompts/get ${name} returns messages`);
      for (const m of got.messages) hPromptMessages.push(m.content.text);
    }
  });
  const hResources = (await (await post(worker, rpc("resources/list", {}))).json()).result.resources;
  const hResourceBodies = [];
  await t.test("resources/list + resources/read (x2)", async () => {
    assert.deepEqual(hResources.map((r) => r.uri).sort(), [...RESOURCE_URIS].sort(), "the two resources");
    for (const uri of RESOURCE_URIS) {
      const got = (await (await post(worker, rpc("resources/read", { uri }))).json()).result;
      assert.ok(Array.isArray(got.contents) && got.contents[0] && typeof got.contents[0].text === "string", `resources/read ${uri} returns text`);
      hResourceBodies.push(got.contents[0].text);
    }
  });
  const hTool = (await (await post(worker, rpc("tools/list", {}))).json()).result.tools[0];
  await t.test(
    "no served prose says proactively/offer/always/trigger",
    { todo: "EXPECTED FAIL until S5(b): the wishfinity://triggers resource name still reads 'Wishlist Trigger Phrases'. When Distribution renames the name+description, remove this todo marker." },
    () => {
      const prose = collectServedProse({ tool: hTool, prompts: hPrompts, promptMessages: hPromptMessages, resources: hResources, resourceBodies: hResourceBodies });
      for (const s of prose) assert.ok(!BANNED_WORDS.test(s), `off-rule word in served prose: ${JSON.stringify(s).slice(0, 90)}`);
    }
  );

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
