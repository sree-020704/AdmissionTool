// Small, dependency-free color math used to derive a full palette from a
// single chosen primary color, and to convert between hex/HSL for pickers.

export function hexToRgb(hex) {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  const num = parseInt(h, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex({ r, g, b }) {
  const toHex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export function hexToHsl(hex) {
  return rgbToHsl(hexToRgb(hex));
}

export function hslToHex(hsl) {
  return rgbToHex(hslToRgb(hsl));
}

/**
 * Derive a full palette from the DEFAULT_THEME by rotating every token's hue
 * by the same delta as the chosen primary color, and gently scaling
 * saturation. Lightness is preserved per-token, which is what keeps pale
 * backgrounds pale and dark text dark — so contrast and "which element is
 * which" never breaks, no matter which primary color is picked.
 *
 * Near-neutral tokens (very low default saturation, e.g. pure white / grays)
 * are left alone on purpose so surfaces don't turn into color washes.
 */
export function derivePaletteFromPrimary(defaultTheme, primaryTokenKey, newPrimaryHex) {
  const basePrimaryHsl = hexToHsl(defaultTheme[primaryTokenKey]);
  const newPrimaryHsl = hexToHsl(newPrimaryHex);
  const hueDelta = newPrimaryHsl.h - basePrimaryHsl.h;
  const satRatio = basePrimaryHsl.s === 0 ? 1 : Math.min(1.6, Math.max(0.4, newPrimaryHsl.s / basePrimaryHsl.s));

  const result = {};
  for (const [token, hex] of Object.entries(defaultTheme)) {
    const hsl = hexToHsl(hex);
    if (hsl.s < 6) {
      // Near-neutral (white/gray/near-black) — keep as-is.
      result[token] = hex;
      continue;
    }
    const newH = (hsl.h + hueDelta + 360) % 360;
    const newS = Math.min(100, Math.max(0, hsl.s * satRatio));
    result[token] = hslToHex({ h: newH, s: newS, l: hsl.l });
  }
  // Make sure the exact chosen color always wins for the primary token itself.
  result[primaryTokenKey] = newPrimaryHex.toUpperCase();
  return result;
}
