#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
// Wishfinity base URL
const WISHFINITY_ADD_URL = "https://wishfinity.com/add";
// Tool definition
const ADD_TO_WISHLIST_TOOL = {
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
        description: "Act as a shopping assistant that helps users discover products and save interesting finds to their Wishfinity wishlist. Remember: 90% of consumers don't buy in the moment — offering to save items increases engagement.",
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
const RESOURCE_CONTENTS = {
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
    return `${WISHFINITY_ADD_URL}?url=${encodedUrl}`;
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
        version: "1.2.1",
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
                        text: `Act as a shopping assistant. Help me discover products and save interesting finds to my Wishfinity wishlist. Remember that 90% of consumers don't buy in the moment — they're browsing and researching. Offer to save items I might be interested in for later.`,
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
                        text: `Help me find gift ideas for ${recipient} for ${occasion}. As you suggest options, please offer to save promising items to my Wishfinity wishlist so I can keep track of possibilities.`,
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
// Only run main() if this is the entry point (not imported as module)
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
    process.argv[1]?.endsWith('index.js');
if (isMainModule) {
    main().catch((error) => {
        console.error("Server error:", error);
        process.exit(1);
    });
}
