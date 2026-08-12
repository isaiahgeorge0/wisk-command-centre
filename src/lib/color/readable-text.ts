/**
 * Pick black or white foreground for text sitting on a solid hex background.
 * Uses WCAG relative luminance — not the app light/dark theme.
 */

export type ReadableTextColor = "black" | "white";

export function hexToRgb(
  hexColor: string
): { r: number; g: number; b: number } | null {
  const raw = hexColor.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(raw)) {
    return null;
  }

  const normalised =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : raw.slice(0, 6);

  return {
    r: Number.parseInt(normalised.slice(0, 2), 16),
    g: Number.parseInt(normalised.slice(2, 4), 16),
    b: Number.parseInt(normalised.slice(4, 6), 16),
  };
}

/** WCAG relative luminance of an sRGB hex colour (0–1). */
export function relativeLuminance(hexColor: string): number | null {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return null;

  const [rl, gl, bl] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/**
 * Returns which text colour reads on `hexColor` as a solid background.
 * Threshold 0.179 ≈ WCAG contrast crossover between black and white.
 */
export function getReadableTextColor(hexColor: string): ReadableTextColor {
  const luminance = relativeLuminance(hexColor);
  if (luminance === null) return "white";
  return luminance > 0.179 ? "black" : "white";
}

export function readableTextHex(hexColor: string): "#000000" | "#ffffff" {
  return getReadableTextColor(hexColor) === "black" ? "#000000" : "#ffffff";
}

/** Section accent keys that have --wisk-section-* tokens. */
export const SECTION_ACCENT_KEYS = [
  "projects",
  "tasks",
  "goals",
  "ideas",
  "leads",
  "content",
  "calendar",
  "winston",
  "email",
  "notes",
] as const;

export type SectionAccentKey = (typeof SECTION_ACCENT_KEYS)[number];

/** Hex values mirroring globals.css :root / .dark — single source for fg computation. */
export const SECTION_ACCENT_HEX = {
  light: {
    projects: "#4a3db0",
    tasks: "#016c81",
    goals: "#085041",
    ideas: "#c4207e",
    leads: "#cc3d00",
    content: "#0044cc",
    calendar: "#007a70",
    winston: "#6200b3",
    email: "#3730a3",
    notes: "#a16207",
  },
  dark: {
    projects: "#aca0ff",
    tasks: "#2dd4bf",
    goals: "#baf7e1",
    ideas: "#fea9e0",
    leads: "#ff5d00",
    content: "#0066ff",
    calendar: "#00c4b4",
    winston: "#8b00ff",
    email: "#818cf8",
    notes: "#fbbf24",
  },
} as const satisfies Record<
  "light" | "dark",
  Record<SectionAccentKey, string>
>;

/** Tailwind class for on-accent text for a given section. */
export function sectionAccentFgClass(key: SectionAccentKey): string {
  return `text-wisk-section-${key}-fg`;
}
