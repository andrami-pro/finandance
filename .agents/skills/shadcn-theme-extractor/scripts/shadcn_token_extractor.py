#!/usr/bin/env python3
"""
shadcn/ui Design Token Extractor

Extracts design tokens from a shadcn/ui configuration URL
(e.g. https://ui.shadcn.com/create?baseColor=stone&theme=emerald&...)
and outputs a structured JSON file with OKLCH color values preserved.

The script fetches the theme registry data directly from the shadcn/ui
GitHub repository, merges base color + theme overrides (mirroring the
official buildRegistryTheme logic), and writes a clean design-tokens JSON.

Usage:
    python shadcn_token_extractor.py <URL_or_params> [options]

Examples:
    python shadcn_token_extractor.py "https://ui.shadcn.com/create?baseColor=stone&theme=emerald&style=nova&radius=small"
    python shadcn_token_extractor.py "baseColor=stone&theme=emerald&style=nova" --output tokens.json
    python shadcn_token_extractor.py --baseColor stone --theme emerald --style nova --radius small
"""

import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from urllib.request import urlopen, Request
from urllib.error import URLError

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

REGISTRY_RAW_BASE = (
    "https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry"
)

# Matches the RADII constant in the shadcn source
RADII = {
    "default": "",
    "none": "0",
    "small": "0.45rem",
    "medium": "0.625rem",
    "large": "0.875rem",
}

VALID_BASE_COLORS = ["neutral", "stone", "zinc", "gray"]

VALID_STYLES = ["vega", "nova", "maia", "lyra", "mira"]

VALID_ICON_LIBRARIES = [
    "lucide", "hugeicons", "phosphor", "tabler",
    "remix", "fontawesome", "simple-icons",
]

# ---------------------------------------------------------------------------
# TypeScript → Python parser for themes.ts
# ---------------------------------------------------------------------------

def _clean_oklch(value: str) -> str:
    """Normalize an OKLCH string: trim whitespace, collapse inner spaces."""
    value = value.strip()
    # Collapse multiple spaces inside oklch()
    value = re.sub(r"\s+", " ", value)
    return value


def _parse_ts_themes(ts_source: str) -> list[dict]:
    """
    Parse the TypeScript themes.ts source into a list of theme dicts.
    Each dict has: name, title, type, cssVars.{light, dark}.
    """
    themes = []

    # Split by theme object boundaries
    # Each theme starts with `{` after the array element and has name/title/type/cssVars
    theme_blocks = re.split(r"\n  \{", ts_source)

    for block in theme_blocks[1:]:  # skip preamble
        name_m = re.search(r'name:\s*"([^"]+)"', block)
        title_m = re.search(r'title:\s*"([^"]+)"', block)
        if not name_m:
            continue

        theme = {
            "name": name_m.group(1),
            "title": title_m.group(1) if title_m else name_m.group(1).title(),
            "cssVars": {"light": {}, "dark": {}},
        }

        # Extract light and dark sections
        for mode in ("light", "dark"):
            pattern = rf"{mode}:\s*\{{(.*?)\}}"
            mode_match = re.search(pattern, block, re.DOTALL)
            if not mode_match:
                continue
            pairs = re.findall(
                r'(?:"([^"]+)"|(\w[\w-]*))\s*:\s*"([^"]+)"',
                mode_match.group(1),
            )
            for quoted_key, bare_key, value in pairs:
                key = quoted_key or bare_key
                theme["cssVars"][mode][key] = _clean_oklch(value)

        themes.append(theme)

    return themes


# ---------------------------------------------------------------------------
# Network helpers
# ---------------------------------------------------------------------------

def _fetch_text(url: str) -> str:
    """Fetch a URL and return its text content."""
    req = Request(url, headers={"User-Agent": "shadcn-token-extractor/1.0"})
    try:
        with urlopen(req, timeout=15) as resp:
            return resp.read().decode("utf-8")
    except URLError as exc:
        print(f"Error fetching {url}: {exc}", file=sys.stderr)
        sys.exit(1)


def fetch_themes_registry() -> list[dict]:
    """Download and parse the shadcn themes.ts registry."""
    url = f"{REGISTRY_RAW_BASE}/themes.ts"
    ts_source = _fetch_text(url)
    return _parse_ts_themes(ts_source)


# ---------------------------------------------------------------------------
# Core logic — mirrors shadcn's buildRegistryTheme()
# ---------------------------------------------------------------------------

def build_theme(
    all_themes: list[dict],
    base_color_name: str,
    theme_name: str,
    radius: str = "default",
    menu_accent: str = "subtle",
) -> dict:
    """
    Merge a base color with a vibrant theme, applying radius and accent
    overrides.  Returns merged cssVars dict with light/dark keys.
    """
    base_color = next((t for t in all_themes if t["name"] == base_color_name), None)
    theme = next((t for t in all_themes if t["name"] == theme_name), None)

    if not base_color:
        print(
            f"Error: Base color '{base_color_name}' not found. "
            f"Valid: {VALID_BASE_COLORS}",
            file=sys.stderr,
        )
        sys.exit(1)

    if not theme:
        available = [t["name"] for t in all_themes]
        print(
            f"Error: Theme '{theme_name}' not found. Available: {available}",
            file=sys.stderr,
        )
        sys.exit(1)

    # Merge: base color first, theme overrides on top (same as spread in TS)
    light = {**base_color["cssVars"]["light"], **theme["cssVars"]["light"]}
    dark = {**base_color["cssVars"]["dark"], **theme["cssVars"]["dark"]}

    # Apply menu accent = bold
    if menu_accent == "bold":
        for vars_ in (light, dark):
            vars_["accent"] = vars_["primary"]
            vars_["accent-foreground"] = vars_["primary-foreground"]
            vars_["sidebar-accent"] = vars_["primary"]
            vars_["sidebar-accent-foreground"] = vars_["primary-foreground"]

    # Apply radius override
    if radius != "default" and radius in RADII:
        radius_value = RADII[radius]
        if radius_value:
            light["radius"] = radius_value
            # Dark inherits from light for radius

    return {"light": light, "dark": dark}


# ---------------------------------------------------------------------------
# URL / param parsing
# ---------------------------------------------------------------------------

def parse_config_from_url(url_or_params: str) -> dict:
    """
    Accept either a full URL or bare query string and return a config dict.
    """
    if url_or_params.startswith("http"):
        parsed = urlparse(url_or_params)
        qs = parse_qs(parsed.query)
    else:
        qs = parse_qs(url_or_params)

    def first(key: str, default: str = "") -> str:
        values = qs.get(key, qs.get(to_camel(key), []))
        return values[0] if values else default

    return {
        "baseColor": first("baseColor", "neutral"),
        "theme": first("theme", "neutral"),
        "style": first("style", "nova"),
        "radius": first("radius", "default"),
        "iconLibrary": first("iconLibrary", "lucide"),
        "font": first("font", "inter"),
        "menuAccent": first("menuAccent", "subtle"),
        "menuColor": first("menuColor", "default"),
        "base": first("base", "radix"),
    }


def to_camel(s: str) -> str:
    """Convert kebab-case / snake_case to camelCase."""
    parts = re.split(r"[-_]", s)
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


# ---------------------------------------------------------------------------
# Output generation
# ---------------------------------------------------------------------------

def build_output(config: dict, merged_vars: dict) -> dict:
    """Build the final design-tokens JSON structure."""
    base_color = config["baseColor"]
    theme = config["theme"]
    style = config["style"]

    # Determine display name
    if base_color == theme:
        display_name = f"{base_color.title()} {style.title()}"
    else:
        display_name = f"{style.title()} {theme.title()} {base_color.title()}"

    return {
        "name": display_name,
        "colorSpace": "oklch",
        "style": style,
        "baseColor": base_color,
        "theme": theme,
        "tokens": merged_vars,
        "config": {
            "style": f"{config['base']}-{style}",
            "baseColor": base_color,
            "iconLibrary": config["iconLibrary"],
            "font": config["font"],
            "radius": config["radius"],
            "menuAccent": config["menuAccent"],
            "menuColor": config["menuColor"],
        },
    }


def generate_css_variables(merged_vars: dict) -> str:
    """Generate CSS custom property declarations for globals.css."""
    lines = [":root {"]
    for key, value in merged_vars["light"].items():
        lines.append(f"  --{key}: {value};")
    lines.append("}\n")
    lines.append(".dark {")
    for key, value in merged_vars["dark"].items():
        lines.append(f"  --{key}: {value};")
    lines.append("}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Extract shadcn/ui design tokens from a create URL.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "url",
        nargs="?",
        help=(
            "Full shadcn/ui create URL or bare query string. "
            "If omitted, use --baseColor/--theme flags instead."
        ),
    )
    parser.add_argument("--baseColor", default=None, help="Base color palette")
    parser.add_argument("--theme", default=None, help="Vibrant theme name")
    parser.add_argument("--style", default=None, help="Component style")
    parser.add_argument("--radius", default=None, help="Border radius preset")
    parser.add_argument("--iconLibrary", default=None, help="Icon library")
    parser.add_argument("--font", default=None, help="Font family")
    parser.add_argument("--menuAccent", default=None, help="Menu accent (subtle|bold)")
    parser.add_argument("--menuColor", default=None, help="Menu color (default|inverted)")
    parser.add_argument("--base", default=None, help="Component base (radix|base)")
    parser.add_argument(
        "-o", "--output",
        help="Output JSON file path (default: stdout)",
    )
    parser.add_argument(
        "--css",
        action="store_true",
        help="Also output CSS custom properties to <output>.css or stdout",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Print progress information to stderr",
    )

    args = parser.parse_args()

    # Build config from URL or flags
    if args.url:
        config = parse_config_from_url(args.url)
    else:
        config = {
            "baseColor": "neutral",
            "theme": "neutral",
            "style": "nova",
            "radius": "default",
            "iconLibrary": "lucide",
            "font": "inter",
            "menuAccent": "subtle",
            "menuColor": "default",
            "base": "radix",
        }

    # Override with explicit CLI flags
    for key in [
        "baseColor", "theme", "style", "radius",
        "iconLibrary", "font", "menuAccent", "menuColor", "base",
    ]:
        val = getattr(args, key, None)
        if val is not None:
            config[key] = val

    if args.verbose:
        print(f"[info] Config: {json.dumps(config, indent=2)}", file=sys.stderr)

    # Fetch registry
    if args.verbose:
        print("[info] Fetching themes registry from GitHub...", file=sys.stderr)

    all_themes = fetch_themes_registry()

    if args.verbose:
        names = [t["name"] for t in all_themes]
        print(f"[info] Found {len(all_themes)} themes: {names}", file=sys.stderr)

    # Build merged theme
    merged = build_theme(
        all_themes,
        base_color_name=config["baseColor"],
        theme_name=config["theme"],
        radius=config["radius"],
        menu_accent=config["menuAccent"],
    )

    # Build output
    output = build_output(config, merged)
    json_str = json.dumps(output, indent=2, ensure_ascii=False)

    # Write JSON
    if args.output:
        out_path = Path(args.output)
        out_path.write_text(json_str, encoding="utf-8")
        print(f"Design tokens written to {out_path}", file=sys.stderr)
    else:
        print(json_str)

    # Optionally write CSS
    if args.css:
        css_str = generate_css_variables(merged)
        if args.output:
            css_path = Path(args.output).with_suffix(".css")
            css_path.write_text(css_str, encoding="utf-8")
            print(f"CSS variables written to {css_path}", file=sys.stderr)
        else:
            print("\n/* --- CSS Custom Properties --- */")
            print(css_str)


if __name__ == "__main__":
    main()
