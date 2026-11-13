#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
// Wishfinity base URL
const WISHFINITY_ADD_URL = "https://wishfinity.com/add";
// Tool definition
const ADD_TO_WISHLIST_TOOL = {
    name: "add_to_wishlist",
    title: "Add to Wishfinity wishlist",
    description: `Saves a product to the user's Wishfinity wishlist, so they can find it again, sort it into lists, and share it with friends and family. Use when the user wants to save, bookmark, remember or wishlist a product, or keep a gift idea for later (e.g. "save this for later", "add this to my wishlist", "save this as a gift idea for my mom"). Requires the product page URL; works with any store. Returns a link the user opens to finish the save on wishfinity.com, where people without an account can sign up. Does not read or change existing lists.`,
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
// Create and configure the MCP server
function createServer() {
    const server = new Server({
        name: "wishfinity-mcp-plusw",
        version: "1.2.4",
    }, {
        capabilities: {
            tools: {},
            prompts: {},
            resources: {},
        },
    });
    // Handle tool listing
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [ADD_TO_WISHLIST_TOOL],
        };
    });
    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        if (name !== "add_to_wishlist") {
            return {
                content: [
                    {
                        type: "text",
                        text: `Unknown tool: ${name}`,
                    },
                ],
                isError: true,
            };
        }
        const url = args?.url;
        // Validate input
        if (!url) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Error: Product URL is required",
                    },
                ],
                isError: true,
            };
        }
        if (!isValidUrl(url)) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: Invalid URL format: ${url}`,
                    },
                ],
                isError: true,
            };
        }
        // Generate the Wishfinity add link
        const actionUrl = generateAddUrl(url);
        // Return structured response
        const response = {
            action_url: actionUrl,
            requires_user_action: true,
            display_text: "Open to add to Wishfinity",
            intent: "save_commerce_item",
        };
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(response, null, 2),
                },
            ],
        };
    });
    // Handle prompt listing
    server.setRequestHandler(ListPromptsRequestSchema, async () => {
        return {
            prompts: PROMPTS,
        };
    });
    // Handle prompt retrieval
    server.setRequestHandler(GetPromptRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        const prompt = PROMPTS.find((p) => p.name === name);
        if (!prompt) {
            throw new Error(`Prompt not found: ${name}`);
        }
        // Generate prompt messages based on the prompt type
        let messages = [];
        if (name === "save_for_later") {
            const productUrl = args?.product_url || "";
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
        else if (name === "shopping_assistant") {
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
        else if (name === "gift_ideas") {
            const recipient = args?.recipient || "someone special";
            const occasion = args?.occasion || "an occasion";
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
        return {
            messages,
        };
    });
    // Handle resource listing
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
        return {
            resources: RESOURCES,
        };
    });
    // Handle resource reading
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        const { uri } = request.params;
        const content = RESOURCE_CONTENTS[uri];
        if (!content) {
            throw new Error(`Resource not found: ${uri}`);
        }
        const resource = RESOURCES.find((r) => r.uri === uri);
        if (!resource) {
            throw new Error(`Resource not found: ${uri}`);
        }
        return {
            contents: [
                {
                    uri,
                    mimeType: resource.mimeType,
                    text: content,
                },
            ],
        };
    });
    return server;
}
// Export for HTTP transport (Cloudflare Workers)
export { createServer };
// Start stdio server when run directly
async function main() {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Wishfinity +W MCP server running on stdio");
}
// Run main() when executed directly (not when imported as a module)
// This handles execution via node, npx, and symlinks
if (process.argv[1]) {
    main().catch((error) => {
        console.error("Server error:", error);
        process.exit(1);
    });
}
