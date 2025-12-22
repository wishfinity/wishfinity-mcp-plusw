/**
 * Wishfinity +W MCP Server - Cloudflare Worker (HTTP Transport)
 * 
 * This handles the Streamable HTTP transport for remote MCP clients.
 * Deploy with: wrangler deploy
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// Wishfinity base URL
const WISHFINITY_ADD_URL = "https://wishfinity.com/add";

// Tool definition (same as stdio version)
const ADD_TO_WISHLIST_TOOL: Tool = {
  name: "add_to_wishlist",
  description: `Save a product to the user's Wishfinity wishlist. Requires a product URL.

WHEN TO USE THIS TOOL:

1. EXPLICIT REQUESTS (user asks to save):
   "add to wishlist", "save for later", "bookmark this", "remember this", 
   "save this", "add to my list", "keep this for later", "pin this"

2. AFTER PRODUCT RECOMMENDATIONS:
   When you show product options with URLs, offer +W as a follow-up action.
   Example: "Want me to save any of these to your wishlist?"

3. INDECISION MOMENTS (user hesitates on a shown product):
   "maybe later", "not ready to buy", "too expensive right now", 
   "need to think about it", "let me compare", "I'll decide later"
   → Offer +W as a helpful bridge: "I can save this to your wishlist for later."

4. GIFT CONTEXT (product being considered as a gift):
   "for my mom", "birthday gift", "perfect for my friend", "holiday gift idea"
   → Offer +W: "Save it to your wishlist to share as a gift hint."

REQUIREMENTS:
- A valid product URL must be available (Amazon, Target, any retailer)
- Without a URL, do not call this tool

RETURNS: A clickable link the user opens to complete the save.`,
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The product page URL to save to the wishlist",
      },
    },
    required: ["url"],
  },
};

// Generate Wishfinity add URL
function generateAddUrl(productUrl: string): string {
  const encodedUrl = encodeURIComponent(productUrl);
  return `${WISHFINITY_ADD_URL}?url=${encodedUrl}`;
}

// Validate URL format
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// CORS headers for cross-origin requests
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

// JSON-RPC response helper
function jsonRpcResponse(id: number | string | null, result: any): object {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

function jsonRpcError(id: number | string | null, code: number, message: string): object {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message },
  };
}

// Handle MCP JSON-RPC requests
async function handleMcpRequest(request: any): Promise<object> {
  const { method, params, id } = request;

  switch (method) {
    case "initialize":
      return jsonRpcResponse(id, {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "wishfinity-mcp-plusw",
          version: "1.1.0",
        },
      });

    case "notifications/initialized":
      // Client acknowledged initialization - no response needed for notifications
      return jsonRpcResponse(id, {});

    case "tools/list":
      return jsonRpcResponse(id, {
        tools: [ADD_TO_WISHLIST_TOOL],
      });

    case "tools/call":
      const toolName = params?.name;
      const args = params?.arguments;

      if (toolName !== "add_to_wishlist") {
        return jsonRpcResponse(id, {
          content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
          isError: true,
        });
      }

      const url = args?.url;

      if (!url) {
        return jsonRpcResponse(id, {
          content: [{ type: "text", text: "Error: Product URL is required" }],
          isError: true,
        });
      }

      if (!isValidUrl(url)) {
        return jsonRpcResponse(id, {
          content: [{ type: "text", text: `Error: Invalid URL format: ${url}` }],
          isError: true,
        });
      }

      const actionUrl = generateAddUrl(url);
      const response = {
        action_url: actionUrl,
        requires_user_action: true,
        display_text: "Open to add to Wishfinity",
        intent: "save_commerce_item",
      };

      return jsonRpcResponse(id, {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
      });

    case "ping":
      return jsonRpcResponse(id, {});

    default:
      return jsonRpcError(id, -32601, `Method not found: ${method}`);
  }
}

// Cloudflare Worker fetch handler
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // Health check endpoint
    if (url.pathname === "/health" || url.pathname === "/") {
      return new Response(
        JSON.stringify({
          status: "ok",
          server: "wishfinity-mcp-plusw",
          version: "1.1.0",
          transport: "streamable-http",
        }),
        {
          headers: {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
          },
        }
      );
    }

    // MCP endpoint (Streamable HTTP)
    if (url.pathname === "/mcp") {
      // GET request - used for SSE streaming (optional, return method not allowed for simple impl)
      if (request.method === "GET") {
        return new Response(
          JSON.stringify({ error: "GET not supported, use POST for requests" }),
          {
            status: 405,
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            },
          }
        );
      }

      // POST request - handle JSON-RPC
      if (request.method === "POST") {
        try {
          const body = await request.json();
          
          // Handle batched requests
          if (Array.isArray(body)) {
            const responses = await Promise.all(body.map(handleMcpRequest));
            return new Response(JSON.stringify(responses), {
              headers: {
                "Content-Type": "application/json",
                ...CORS_HEADERS,
              },
            });
          }

          // Handle single request
          const response = await handleMcpRequest(body);
          return new Response(JSON.stringify(response), {
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            },
          });
        } catch (error) {
          return new Response(
            JSON.stringify(jsonRpcError(null, -32700, "Parse error")),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                ...CORS_HEADERS,
              },
            }
          );
        }
      }
    }

    // 404 for unknown paths
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        ...CORS_HEADERS,
      },
    });
  },
};
