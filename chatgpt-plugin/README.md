# Wishfinity +W — ChatGPT plugin package

Submission package for publishing `wishfinity-mcp-plusw` in OpenAI's ChatGPT
Directory as a **plugin with MCP** (no UI/app component). The MCP server itself
is the same one at `https://mcp.wishfinity.com/mcp`; this folder only describes
the plugin for OpenAI's directory.

## Files
| file | purpose |
|---|---|
| `plugin.json` | Agent Plugins manifest; directory-listing fields live under `extensions["com.openai"].interface`, plus `review.commerce`. |
| `mcp.json` | Points the plugin at `https://mcp.wishfinity.com/mcp`, transport `streamable-http`, auth `none`. |
| `assets/icon.png` | 256×256 PNG, referenced by `composerIcon` and `logo` as `./assets/icon.png`. |
| `chatgpt-app-submission.json` | Companion uploaded separately in the submission form: hint justifications + 5 positive / 3 negative test cases. |
| `build.sh` | Produces the submission ZIP. |

## Build the ZIP
```bash
cd chatgpt-plugin && ./build.sh
```
Output lands at `chatgpt-plugin/dist/wishfinity-plugin.zip` (a build artifact —
**gitignored, not committed**). It contains `plugin.json`, `mcp.json` and
`assets/` at the root. Upload that ZIP via OpenAI's "With MCP" path;
upload `chatgpt-app-submission.json` separately when the form asks.

## Before submitting — open items for Lee / Distribution
- **`category: "Shopping"` is UNCONFIRMED.** OpenAI's docs publish no category
  enum (only "Productivity" and "Developer Tools" appear as examples). Pick the
  real category from the dashboard list at submission; if "Shopping" is not
  offered, choose the closest and update `plugin.json` + `chatgpt-app-submission.json`.
- **`longDescription` / listing copy** here is a neutral draft; Distribution
  supplies the final text.
- **`developerName` = "Wishfinity"**, but OpenAI business verification is under
  **EGGTOOTH LLC** — confirm which name the directory shows.
- **Demo recording:** OpenAI's review wants a `demo_recording_url` (reviewer
  video). Lee records the walkthrough and adds it at submission.
- **Domain verification (item 2):** the server already serves
  `/.well-known/openai-apps-challenge` from the `OPENAI_APPS_CHALLENGE` Worker
  secret. Set the secret when OpenAI shows the token (see the v1.2.5 release
  sheet §T).

## `openWorldHint` note
Set to `true`, justified as "accepts a product URL for any store on the open
internet (an open-ended set of destinations)." OpenAI's official wording is
"Set to `true` if the tool accesses the public internet or open-ended external
entities." A narrower reading — the tool fetches nothing at call time and only
builds a `wishfinity.com` link — would support `false`. We follow the
open-ended-destinations reading; revisit if a reviewer flags it.

## Source of the schema
- Plugin / MCP manifests: https://developers.openai.com/plugins/build/plugins.md
- Submission + review: https://developers.openai.com/plugins/deploy/submission.md ·
  https://developers.openai.com/plugins/deploy/app-review.md
- `chatgpt-app-submission.json` is generated authoritatively by OpenAI's skill:
  `npx skills add https://github.com/openai/plugins --skill chatgpt-app-submission`
  (the hand-written copy here matches that schema as of 2026-11-13).
