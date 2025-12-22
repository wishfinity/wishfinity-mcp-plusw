# +W Button Kit

This folder contains UI assets for the +W (Add to Wishlist) button.

## Contents

- `plusw-icon.svg` — The +W icon (add your SVG here)
- `plusw-button.html` — HTML snippet for the button
- `plusw-styles.css` — CSS styles and color tokens

## Usage

### Basic HTML Button

```html
<a href="https://wishfinity.com/add?url=ENCODED_URL" 
   class="plusw-button" 
   target="_blank">
  <img src="plusw-icon.svg" alt="" class="plusw-icon">
  +W Add to Wishlist
</a>
```

### Minimal Inline

```html
<a href="https://wishfinity.com/add?url=ENCODED_URL">+W</a>
```

## Colors

| Token              | Value     | Usage                    |
|--------------------|-----------|--------------------------|
| `--plusw-primary`  | `#6366f1` | Button background        |
| `--plusw-hover`    | `#4f46e5` | Button hover state       |
| `--plusw-text`     | `#ffffff` | Button text              |

## Adding Your Assets

Drop your SVG files and custom styles into this folder:

1. `plusw-icon.svg` — Your +W logo/icon
2. `plusw-icon-dark.svg` — Dark mode variant (optional)
3. `plusw-button.html` — Complete button HTML
4. `plusw-styles.css` — Your CSS styles
