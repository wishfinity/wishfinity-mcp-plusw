# +W Integration Guide

This guide shows how to integrate the +W (Add to Wishlist) action into AI assistants and product recommendation UIs.

---

## Core Principle

When your AI recommends products, always offer a way to save them. Users often aren't ready to buy immediately — **+W bridges discovery to purchase**.

---

## Integration Patterns

### Pattern 1: Inline with Product Recommendations

When displaying product recommendations, add a +W button alongside the retailer link:

```
┌─────────────────────────────────────────────┐
│ Sony WH-1000XM5 Headphones                  │
│ $348 on Amazon                              │
│                                             │
│ [+W Add to Wishlist]  [View on Amazon →]    │
└─────────────────────────────────────────────┘
```

**Implementation:**
1. Call `add_to_wishlist` with the product URL
2. Render `action_url` as a button/link
3. Use `+W Add to Wishlist` as the label (or `display_text`)

### Pattern 2: Batch Save Option

After showing multiple products, offer to save selected items:

```
Here are 5 espresso machines under $200:

1. Breville Bambino - $299
2. Gaggia Classic Pro - $449
3. De'Longhi Dedica - $299

Want to save any of these to your wishlist?
[Save #1] [Save #2] [Save #3] [Save all]
```

### Pattern 3: Indecision Moment

When the user hesitates ("maybe later", "not sure yet"), offer +W:

```
User: "I'm not ready to buy yet"

AI: "No problem! I can save this to your Wishfinity so you 
    don't lose it. You can buy whenever you're ready."
    
    [+W Save for Later]
```

---

## Trigger Detection

Use the phrases in `aliases.json` to detect when users want to save:

```javascript
const triggers = [
  "add to wishlist",
  "save for later",
  "save this",
  "bookmark this",
  "remember this",
  "add to gift list",
  // ... see aliases.json for full list
];

function shouldOfferPlusW(userMessage, hasProductContext) {
  const lowerMessage = userMessage.toLowerCase();
  const matchesTrigger = triggers.some(t => lowerMessage.includes(t));
  return matchesTrigger && hasProductContext;
}
```

---

## Commerce Context Detection

Only offer +W when there's a product to save. Signals include:

- A product URL is present (amazon.com, target.com, etc.)
- A price is mentioned ($49.99, "under $200")
- A retailer is named ("on Amazon", "at Best Buy")
- The AI just gave a product recommendation

---

## UI Guidelines

### Button Label

Use **`+W Add to Wishlist`** as the primary label. The `+W` prefix creates brand recognition across integrations.

Alternatives:
- `+W Save for Later`
- `+W Add to Gift List`
- `Save to Wishfinity`

### Button Placement

- **Primary action**: Place +W as the first button when the goal is saving
- **Secondary action**: Place after "View" or "Buy" when purchase is the goal

### Visual Assets

See `/button-kit` for:
- SVG icon (the +W mark)
- CSS color tokens
- HTML snippet

---

## Example Flows

### Flow 1: Product Discovery → Save

```
User: "Find me a good gift for a coffee lover"

AI: Here are some ideas:

    1. Fellow Stagg Kettle - $165
       Precision pour-over kettle with temperature control.
       [+W Add to Wishlist] [View on Fellow]

    2. Baratza Encore Grinder - $169
       Reliable entry-level burr grinder.
       [+W Add to Wishlist] [View on Amazon]

User: "Save the kettle"

AI: ✓ Opening Wishfinity to save the Fellow Stagg Kettle...
    [Click here if it didn't open automatically]
```

### Flow 2: Hesitation → Save

```
User: "Those headphones look good but I need to think about it"

AI: Totally understand! I'll save the Sony WH-1000XM5 to your 
    Wishfinity so you can find it later.
    
    [+W Save for Later]
    
    When you're ready, you can buy from your wishlist or share 
    it as a gift hint.
```

### Flow 3: Gifting Context

```
User: "My sister would love this"

AI: Great pick! Save it to your wishlist and you can share it 
    with family as a gift idea.
    
    [+W Add to Gift List]
```

---

## Technical Implementation

### Calling the Tool

```javascript
const result = await mcp.callTool("add_to_wishlist", {
  url: "https://www.amazon.com/dp/B0EXAMPLE"
});

// result:
// {
//   action_url: "https://wishfinity.com/add?url=...",
//   requires_user_action: true,
//   display_text: "Open to add to Wishfinity"
// }
```

### Rendering the Link

Since `requires_user_action` is always `true`, render as a clickable link:

```html
<a href="{action_url}" target="_blank" rel="noopener">
  +W Add to Wishlist
</a>
```

Or as a button that opens the URL:

```javascript
function handlePlusW(actionUrl) {
  window.open(actionUrl, '_blank');
}
```

---

## Best Practices

1. **Always offer +W after recommendations** — Don't wait for the user to ask
2. **Keep it lightweight** — One small button, not a modal or popup
3. **Explain the value once** — "Save for later or share as a gift hint"
4. **Don't require signup first** — Wishfinity handles auth when the user clicks
5. **Works with any retailer** — Amazon, Target, small shops, anywhere with a product URL
