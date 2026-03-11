---
name: shadcn-theme-extractor
description: >
  Extract design tokens from a shadcn/ui configuration URL and generate
  a JSON token file plus CSS variables. Use when the user pastes a
  shadcn/ui create URL (ui.shadcn.com/create?...), asks to update the
  design system, change theme colors, or apply a new shadcn preset.
  Covers OKLCH color handling, Tailwind v3/v4 integration, and
  globals.css generation.
user-invocable: true
argument-hint: '<shadcn-create-url>'
allowed-tools: [Bash, Read, Write, Edit]
---

# shadcn/ui Theme Extractor

Use this skill when the user provides a shadcn/ui create URL or asks to
extract/update design tokens from a shadcn configuration.

## When to Use

- User pastes a URL like `https://ui.shadcn.com/create?baseColor=stone&theme=emerald&...`
- User asks to "update the theme", "change colors", or "apply a new shadcn preset"
- User wants to generate `globals.css` variables from a theme configuration
- User needs a `design-tokens-*.json` file for the design system

## Quick Start

```bash
# From a full URL
python shadcn-theme-extractor/scripts/shadcn_token_extractor.py \
  "https://ui.shadcn.com/create?baseColor=stone&theme=emerald&style=nova&radius=small" \
  --output design-tokens.json --css --verbose

# From individual flags
python shadcn-theme-extractor/scripts/shadcn_token_extractor.py \
  --baseColor stone --theme emerald --style nova --radius small \
  --output design-tokens.json --css
```

## URL Parameters Reference

| Parameter     | Values                                                                       | Default   |
|---------------|------------------------------------------------------------------------------|-----------|
| `baseColor`   | `neutral`, `stone`, `zinc`, `gray`                                           | `neutral` |
| `theme`       | `neutral`, `stone`, `zinc`, `gray`, `amber`, `blue`, `cyan`, `emerald`, `fuchsia`, `green`, `indigo`, `lime`, `orange`, `pink`, `purple`, `red`, `rose`, `sky`, `teal`, `violet`, `yellow` | `neutral` |
| `style`       | `vega`, `nova`, `maia`, `lyra`, `mira`                                       | `nova`    |
| `radius`      | `default`, `none`, `small`, `medium`, `large`                                | `default` |
| `base`        | `radix`, `base`                                                              | `radix`   |
| `iconLibrary` | `lucide`, `hugeicons`, `phosphor`, `tabler`, etc.                            | `lucide`  |
| `font`        | `inter`, `geist`, `geist-mono`, `figtree`, `jetbrains-mono`, etc.            | `inter`   |
| `menuAccent`  | `subtle`, `bold`                                                             | `subtle`  |
| `menuColor`   | `default`, `inverted`                                                        | `default` |

## Output Structure

The script produces a JSON file with this structure:

```json
{
  "name": "Nova Emerald Stone",
  "colorSpace": "oklch",
  "style": "nova",
  "baseColor": "stone",
  "theme": "emerald",
  "tokens": {
    "light": { "--primary": "oklch(0.60 0.13 163)", "..." : "..." },
    "dark":  { "--primary": "oklch(0.70 0.15 162)", "..." : "..." }
  },
  "config": {
    "style": "radix-nova",
    "baseColor": "stone",
    "iconLibrary": "phosphor",
    "font": "geist-mono",
    "radius": "small",
    "menuAccent": "subtle",
    "menuColor": "default"
  }
}
```

## Step-by-Step Workflow

### 1. Extract Tokens

Run the script with the user's URL or parameters:

```bash
python shadcn-theme-extractor/scripts/shadcn_token_extractor.py "<URL>" \
  --output design-tokens.json --css --verbose
```

This produces:
- `design-tokens.json` — structured token file
- `design-tokens.css` — ready-to-paste CSS custom properties

### 2. Apply to globals.css

#### Tailwind CSS v4 (Native OKLCH Support)

For projects using Tailwind v4, paste the CSS variables directly. The
`@theme inline` block exposes them as Tailwind utilities:

```css
@import "tailwindcss";

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.147 0.004 49.25);
  --primary: oklch(0.60 0.13 163);
  /* ... all tokens from the .css output ... */
}

.dark {
  --background: oklch(0.147 0.004 49.25);
  --foreground: oklch(0.985 0.001 106.423);
  --primary: oklch(0.70 0.15 162);
  /* ... */
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  /* Map each token to a --color-* utility */
}
```

#### Tailwind CSS v3 (OKLCH via CSS Variables)

For Tailwind v3 projects, two approaches:

**Option A — Modern browsers (recommended):**

Place OKLCH values directly in `globals.css` variables. Modern browsers
support `oklch()` natively. Use in `tailwind.config.ts`:

```ts
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        // ... etc
      },
    },
  },
};
```

**Option B — Alpha channel support:**

If you need `bg-primary/50` syntax with opacity modifiers, wrap with
the `oklch()` function reference:

```ts
colors: {
  primary: "oklch(var(--primary) / <alpha-value>)",
}
```

And store only the raw values (without `oklch()` wrapper) in CSS:
```css
:root { --primary: 0.60 0.13 163; }
```

### 3. Verify

After applying, visually compare against the shadcn preview at the
original URL to confirm colors match.

## OKLCH Color Space — Critical Notes

**OKLCH is the standard for shadcn/ui vibrant themes.** All color values
from the registry use `oklch()` format for perceptual uniformity.

### Why OKLCH matters

- **Perceptual uniformity**: Equal numeric steps produce equal visual
  differences, unlike HSL/Hex.
- **Tailwind v4 native**: Tailwind v4 uses OKLCH internally.
- **Vibrant themes**: The "vibrant" themes (emerald, blue, purple, etc.)
  are specifically designed in OKLCH. Converting to Hex/RGB will produce
  visually "flatter" results.

### Conversion warnings

If the user requests conversion to Hex/RGB:

1. **Warn** that perceptual uniformity will be lost
2. **Warn** that the theme may look "washed out" compared to the live
   shadcn preview
3. Only convert if explicitly confirmed
4. Use Python's `coloraide` library or CSS `color()` function for
   accurate conversion if needed

### String cleaning

The script normalizes OKLCH values automatically:
- Trims whitespace
- Collapses multiple inner spaces: `oklch( 0.60  0.13  163 )` → `oklch(0.60 0.13 163)`
- Preserves alpha notation: `oklch(1 0 0 / 10%)`

## How the Script Works

The script mirrors shadcn's internal `buildRegistryTheme()` logic:

1. **Fetches** the `themes.ts` registry from the shadcn GitHub repo
2. **Parses** the TypeScript source to extract all theme definitions
3. **Merges** the base color (stone, neutral, etc.) with the vibrant
   theme (emerald, blue, etc.) — theme values override base values
4. **Applies** radius and menu accent transformations
5. **Outputs** structured JSON and/or CSS

This is the same merge logic used by `npx shadcn create` internally.

## Related Files

- Script: `shadcn-theme-extractor/scripts/shadcn_token_extractor.py`
- Example output: `design-tokens-nova.json` (root of project)
- Application target: `shadcn-preset/app/globals.css`
