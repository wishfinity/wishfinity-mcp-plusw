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
  description: `Save a product to the user's Wishfinity wishlist. 
  
Use this when:
- The user asks to save a product for later
- The user says "add to wishlist", "bookmark this", "save for later", etc.
- After recommending products (offer as an option)
- When the user expresses indecision about purchasing

Returns a link the user must click to complete the save.`,
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
    version: "1.0.0",
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
