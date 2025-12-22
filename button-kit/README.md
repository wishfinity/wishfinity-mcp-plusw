# +W Button Kit

UI assets for the +W (Add to Wishlist) button.

## CDN URLs (Ready to Use)

Embed directly via jsDelivr CDN:

| Button | URL |
|--------|-----|
| Small | `https://cdn.jsdelivr.net/npm/wishfinity-mcp-plusw@1.0.1/button-kit/Wishfinity-Button-Small.svg` |
| Medium | `https://cdn.jsdelivr.net/npm/wishfinity-mcp-plusw@1.0.1/button-kit/Wishfinity-Button-Medium.svg` |
| Medium Outline | `https://cdn.jsdelivr.net/npm/wishfinity-mcp-plusw@1.0.1/button-kit/Wishfinity-Button-Medium-Outline.svg` |
| Large | `https://cdn.jsdelivr.net/npm/wishfinity-mcp-plusw@1.0.1/button-kit/Wishfinity-Button-Large.svg` |
| Large Outline | `https://cdn.jsdelivr.net/npm/wishfinity-mcp-plusw@1.0.1/button-kit/Wishfinity-Button-Large-Outline.svg` |

> 💡 Replace `@1.0.1` with `@latest` to always get the newest version.

## HTML Snippets

### Basic Link Button
```html
<a href="https://wishfinity.com/add?url=ENCODED_PRODUCT_URL" target="_blank">
  <img src="https://cdn.jsdelivr.net/npm/wishfinity-mcp-plusw@latest/button-kit/Wishfinity-Button-Medium.svg" 
       alt="+W Add to Wishlist" 
       height="40">
</a>
```

### Inline with Product
```html
<div class="product-actions">
  <a href="https://amazon.com/dp/B0EXAMPLE" target="_blank">View on Amazon</a>
  <a href="https://wishfinity.com/add?url=https%3A%2F%2Famazon.com%2Fdp%2FB0EXAMPLE" target="_blank">
    <img src="https://cdn.jsdelivr.net/npm/wishfinity-mcp-plusw@latest/button-kit/Wishfinity-Button-Small.svg" 
         alt="+W" 
         height="24">
  </a>
</div>
```

## From npm

If you've installed the package:
```javascript
// Path to assets
const buttonPath = 'node_modules/wishfinity-mcp-plusw/button-kit/Wishfinity-Button-Medium.svg';
```

## Button Variants

| Variant | Use Case |
|---------|----------|
| Small | Inline with text, tight spaces |
| Medium | Standard button placement |
| Medium Outline | Light backgrounds |
| Large | Hero sections, prominent CTAs |
| Large Outline | Light backgrounds, hero sections |
