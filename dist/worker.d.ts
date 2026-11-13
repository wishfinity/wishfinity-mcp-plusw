/**
 * Wishfinity +W MCP Server - Cloudflare Worker (HTTP Transport)
 *
 * This handles the Streamable HTTP transport for remote MCP clients.
 * Deploy with: wrangler deploy
 */
interface Env {
    OPENAI_APPS_CHALLENGE?: string;
    WISHFINITY_BASE_URL?: string;
}
declare const _default: {
    fetch(request: Request, env: Env): Promise<Response>;
};
export default _default;
//# sourceMappingURL=worker.d.ts.map