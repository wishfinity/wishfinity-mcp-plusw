/**
 * Wishfinity +W MCP Server - Cloudflare Worker (HTTP Transport)
 *
 * This handles the Streamable HTTP transport for remote MCP clients.
 * Deploy with: wrangler deploy
 */
import { classifyWishlistUrl } from "./wishlist-url.js";
// Wishfinity base URL
const WISHFINITY_ADD_URL = "https://wishfinity.com/add";
// Tool definition (same as stdio version)
const ADD_TO_WISHLIST_TOOL = {
    name: "add_to_wishlist",
    title: "Add to Wishfinity wishlist",
    description: `Saves a product to the user's Wishfinity wishlist, so they can find it again, sort it into lists, and share it with friends and family. Use when the user wants to save, bookmark, remember or wishlist a product, or keep a gift idea for later (e.g. "save this for later", "add this to my wishlist", "save this as a gift idea for my mom"). Requires a specific product page URL, not a search-results or category page; if only a search page is available, ask the user for the product link. Works with any store. Wishfinity looks up the product's name, description, image and price itself when the link is opened. Returns a link the user opens to finish the save on wishfinity.com, where people without an account can sign up. Does not read or change existing lists.`,
    inputSchema: {
        type: "object",
        properties: {
            url: {
                type: "string",
                description: "The specific product page URL to save. Not a search-results or category page; if only a search page is available, ask the user for the product link.",
            },
        },
        required: ["url"],
    },
    annotations: {
        title: "Add to Wishfinity wishlist",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
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
        description: "A shopping assistant that helps the user discover products and save interesting finds to their Wishfinity wishlist.",
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
        description: "Describes the add_to_wishlist tool and the link it returns.",
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
const RESOURCE_CONTENTS = {
    "wishfinity://guide": `Wishfinity Integration Guide

The add_to_wishlist tool saves a product to the user's Wishfinity wishlist. It takes a product page URL from any store and returns a link the user opens to finish the save on wishfinity.com, where people without an account can sign up. Saved products can be found again, sorted into lists, and shared with friends and family. The tool does not read or change existing lists.`,
    "wishfinity://triggers": JSON.stringify([
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
    ], null, 2),
};
// Generate Wishfinity add URL
function generateAddUrl(productUrl) {
    const encodedUrl = encodeURIComponent(productUrl);
    return `${WISHFINITY_ADD_URL}?url=${encodedUrl}&source=mcp-plusw`;
}
// Validate URL format
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    }
    catch {
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
function jsonRpcResponse(id, result) {
    return {
        jsonrpc: "2.0",
        id,
        result,
    };
}
function jsonRpcError(id, code, message) {
    return {
        jsonrpc: "2.0",
        id,
        error: { code, message },
    };
}
// Handle MCP JSON-RPC requests
async function handleMcpRequest(request) {
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
                    version: "1.2.4",
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
            const { note } = classifyWishlistUrl(url);
            const response = {
                action_url: actionUrl,
                requires_user_action: true,
                display_text: "+W Save to Wishfinity",
                intent: "save_commerce_item",
                ...(note ? { note } : {}),
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
            let messages = [];
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
            }
            else if (promptName === "shopping_assistant") {
                messages = [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: `Act as a shopping assistant. Help me discover products and save interesting finds to my Wishfinity wishlist.`,
                        },
                    },
                ];
            }
            else if (promptName === "gift_ideas") {
                const recipient = promptArgs?.recipient || "someone special";
                const occasion = promptArgs?.occasion || "an occasion";
                messages = [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: `Help me find gift ideas for ${recipient} for ${occasion}, and save the options I want to my Wishfinity wishlist so I can keep track of possibilities.`,
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
    async fetch(request, env) {
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
            return new Response(JSON.stringify({
                status: "ok",
                server: "wishfinity-mcp-plusw",
                version: "1.2.4",
                transport: "streamable-http",
            }), {
                headers: {
                    "Content-Type": "application/json",
                    ...CORS_HEADERS,
                },
            });
        }
        // OpenAI Apps domain-verification challenge. Served as plain text from a
        // Worker secret (OPENAI_APPS_CHALLENGE); a real 404 while the secret is
        // unset. CloudFront forwards every path, so this answers on both
        // workers.dev and mcp.wishfinity.com with no route change.
        if (url.pathname === "/.well-known/openai-apps-challenge") {
            const token = env.OPENAI_APPS_CHALLENGE?.trim();
            if (token) {
                return new Response(token, {
                    status: 200,
                    headers: { "Content-Type": "text/plain; charset=utf-8" },
                });
            }
            return new Response("Not Found", {
                status: 404,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
        }
        // MCP endpoint (Streamable HTTP)
        if (url.pathname === "/mcp") {
            // GET request - used for SSE streaming (optional, return method not allowed for simple impl)
            if (request.method === "GET") {
                return new Response(JSON.stringify({ error: "GET not supported, use POST for requests" }), {
                    status: 405,
                    headers: {
                        "Content-Type": "application/json",
                        ...CORS_HEADERS,
                    },
                });
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
                }
                catch (error) {
                    return new Response(JSON.stringify(jsonRpcError(null, -32700, "Parse error")), {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json",
                            ...CORS_HEADERS,
                        },
                    });
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
