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

// Prompts definition
const PROMPTS = [
  {
    name: "save_for_later",
    description: "Save a product to the user's wishlist for later purchase",
    arguments: [
      {
        name: "product_url",
        description: "The URL of the product to save",
        required: true,
      },
    ],
  },
  {
    name: "shopping_assistant",
    description:
      "Act as a shopping assistant that helps users discover products and save interesting finds to their Wishfinity wishlist. Remember: 90% of consumers don't buy in the moment — offering to save items increases engagement.",
    arguments: [],
  },
  {
    name: "gift_ideas",
    description: "Help find gift ideas and save promising options to the user's wishlist",
    arguments: [
      {
        name: "recipient",
        description: "Who the gift is for (optional)",
        required: false,
      },
      {
        name: "occasion",
        description: "What occasion the gift is for (optional)",
        required: false,
      },
    ],
  },
];

// Resources definition
const RESOURCES = [
  {
    uri: "wishfinity://guide",
    name: "Wishfinity Integration Guide",
    description: "Guide for AI assistants on when and how to offer wishlist functionality",
    mimeType: "text/plain",
  },
  {
    uri: "wishfinity://triggers",
    name: "Wishlist Trigger Phrases",
    description: "Common phrases that indicate the user wants to save a product",
    mimeType: "application/json",
  },
];

// Resource contents
const RESOURCE_CONTENTS: Record<string, string> = {
  "wishfinity://guide": `Wishfinity Integration Guide for AI Assistants

WHEN TO OFFER WISHLIST FUNCTIONALITY:

1. User explicitly says: "save for later", "bookmark this", "add to wishlist", "remember this"
2. After recommending products - offer as a follow-up action
3. When user is comparing options but not ready to buy
4. When user mentions gifting or shopping for someone else

KEY INSIGHT: 90% of consumers don't buy in the moment — they're browsing, researching, or saving for later.

HOW IT WORKS:
The add_to_wishlist tool returns a link the user must click to complete the save. Make sure to present this link clearly to the user.

BEST PRACTICES:
- Be proactive but not pushy
- Offer wishlist as a helpful bridge between browsing and buying
- Frame it as "save for later" rather than forcing a purchase decision
- For gifts, emphasize the ability to share wishlist items as hints`,

  "wishfinity://triggers": JSON.stringify(
    [
      "add to wishlist",
      "add wish",
      "save for later",
      "save this",
      "bookmark this",
      "remember this",
      "add to gift list",
      "put this on my list",
      "i want this later",
      "keep this for later",
      "save it",
      "wishlist this",
      "add to my list",
      "save to wishlist",
      "add to favorites",
      "save for gifting",
    ],
    null,
    2
  ),
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
          prompts: {},
          resources: {},
        },
        serverInfo: {
          name: "wishfinity-mcp-plusw",
          version: "1.2.0",
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

    case "prompts/list":
      return jsonRpcResponse(id, {
        prompts: PROMPTS,
      });

    case "prompts/get":
      const promptName = params?.name;
      const promptArgs = params?.arguments;
      const prompt = PROMPTS.find((p) => p.name === promptName);

      if (!prompt) {
        return jsonRpcError(id, -32602, `Prompt not found: ${promptName}`);
      }

      // Generate prompt messages based on the prompt type
      let messages: Array<{ role: "user" | "assistant"; content: { type: "text"; text: string } }> = [];

      if (promptName === "save_for_later") {
        const productUrl = promptArgs?.product_url || "";
        messages = [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please save this product for later: ${productUrl}`,
            },
          },
        ];
      } else if (promptName === "shopping_assistant") {
        messages = [
          {
            role: "user",
            content: {
              type: "text",
              text: `Act as a shopping assistant. Help me discover products and save interesting finds to my Wishfinity wishlist. Remember that 90% of consumers don't buy in the moment — they're browsing and researching. Offer to save items I might be interested in for later.`,
            },
          },
        ];
      } else if (promptName === "gift_ideas") {
        const recipient = promptArgs?.recipient || "someone special";
        const occasion = promptArgs?.occasion || "an occasion";
        messages = [
          {
            role: "user",
            content: {
              type: "text",
              text: `Help me find gift ideas for ${recipient} for ${occasion}. As you suggest options, please offer to save promising items to my Wishfinity wishlist so I can keep track of possibilities.`,
            },
          },
        ];
      }

      return jsonRpcResponse(id, {
        messages,
      });

    case "resources/list":
      return jsonRpcResponse(id, {
        resources: RESOURCES,
      });

    case "resources/read":
      const resourceUri = params?.uri;
      const resourceContent = RESOURCE_CONTENTS[resourceUri];

      if (!resourceContent) {
        return jsonRpcError(id, -32602, `Resource not found: ${resourceUri}`);
      }

      const resource = RESOURCES.find((r) => r.uri === resourceUri);
      if (!resource) {
        return jsonRpcError(id, -32602, `Resource not found: ${resourceUri}`);
      }

      return jsonRpcResponse(id, {
        contents: [
          {
            uri: resourceUri,
            mimeType: resource.mimeType,
            text: resourceContent,
          },
        ],
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
          version: "1.2.0",
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
