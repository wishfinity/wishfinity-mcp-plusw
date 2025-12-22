#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// Wishfinity base URL
const WISHFINITY_ADD_URL = "https://wishfinity.com/add";

// Tool definition
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
    type: "object" as const,
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

// Create the MCP server
const server = new Server(
  {
    name: "wishfinity-mcp-plusw",
    version: "1.0.2",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

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

  const url = (args as { url?: string })?.url;

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

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Wishfinity +W MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
