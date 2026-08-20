/**
 * Shared form-control styles — iOS Safari zoom prevention + focus chrome.
 *
 * iOS zooms focused fields under 16px. Keep text at 16px on all breakpoints
 * (including md+) so iPad landscape cannot slip back to text-sm.
 */
export const FORM_CONTROL_TEXT =
  "text-base"; /* 16px — do not pair with md:text-sm */

/** Premium focus lift: slow ease, subtle scale + shadow, not a snap. */
export const FORM_CONTROL_FOCUS_TRANSITION =
  "origin-center transition-[transform,box-shadow,background-color,border-color,ring-color] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none motion-reduce:transform-none";

export const FORM_CONTROL_FOCUS_STATE =
  "focus-visible:scale-[1.015] focus-visible:border-ring focus-visible:bg-background focus-visible:shadow-[0_10px_28px_-12px_rgba(0,0,0,0.22)] focus-visible:ring-3 focus-visible:ring-ring/50 dark:focus-visible:bg-input/40 dark:focus-visible:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.55)]";

export const FORM_CONTROL_FOCUS = `${FORM_CONTROL_FOCUS_TRANSITION} ${FORM_CONTROL_FOCUS_STATE}`;
