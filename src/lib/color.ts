/**
 * Convert a hex colour (#rgb / #rrggbb / #rrggbbaa) to an rgba() string.
 * Avoids color-mix() in inline styles, which can mismatch between SSR and hydration.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(raw)) {
    return hex;
  }

  const normalised =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : raw.slice(0, 6);

  const r = Number.parseInt(normalised.slice(0, 2), 16);
  const g = Number.parseInt(normalised.slice(2, 4), 16);
  const b = Number.parseInt(normalised.slice(4, 6), 16);

  return `rgba(${r},${g},${b},${alpha})`;
}
