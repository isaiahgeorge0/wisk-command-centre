"use client";

import { useEffect } from "react";

const TEXT_FIELD_SELECTOR =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="hidden"]):not([type="color"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="image"]), textarea, select, [contenteditable="true"], .ProseMirror';

const SCALE_STUCK_THRESHOLD = 1.01;

function isTextField(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.matches(TEXT_FIELD_SELECTOR) ||
    Boolean(target.closest(TEXT_FIELD_SELECTOR))
  );
}

function readViewportMeta(): HTMLMetaElement | null {
  return document.querySelector('meta[name="viewport"]');
}

/**
 * Briefly toggle maximum-scale on the viewport meta so iOS Safari
 * recomputes scale after focus-zoom, then restore the prior content so
 * pinch-to-zoom stays available.
 */
function forceViewportScaleReset() {
  const meta = readViewportMeta();
  if (!meta) return;

  const previous =
    meta.getAttribute("content") ?? "width=device-width, initial-scale=1";
  const withoutMax = previous
    .split(",")
    .map((part) => part.trim())
    .filter(
      (part) =>
        !/^maximum-scale=/i.test(part) && !/^user-scalable=/i.test(part)
    )
    .join(", ");

  meta.setAttribute(
    "content",
    `${withoutMax || "width=device-width, initial-scale=1"}, maximum-scale=1`
  );

  window.setTimeout(() => {
    meta.setAttribute(
      "content",
      withoutMax || "width=device-width, initial-scale=1"
    );
  }, 50);
}

/**
 * iOS Safari sometimes leaves the page zoomed after blurring a field.
 * Prefer preventing zoom via 16px controls; this only runs when scale
 * grew during a text-field focus session (not intentional pinch).
 */
export function IosViewportZoomReset() {
  useEffect(() => {
    let scaleAtSessionStart = 1;

    const onFocusIn = (event: FocusEvent) => {
      if (!isTextField(event.target)) return;
      // New session only when arriving from outside text fields.
      if (!isTextField(event.relatedTarget)) {
        scaleAtSessionStart = window.visualViewport?.scale ?? 1;
      }
    };

    const onFocusOut = (event: FocusEvent) => {
      if (!isTextField(event.target)) return;
      // Still inside the form (tabbing input → input) — keep session baseline.
      if (isTextField(event.relatedTarget)) return;

      const start = scaleAtSessionStart;
      window.setTimeout(() => {
        const scale = window.visualViewport?.scale ?? 1;
        const grewDuringFocus =
          start <= SCALE_STUCK_THRESHOLD && scale > SCALE_STUCK_THRESHOLD;
        if (!grewDuringFocus) return;
        forceViewportScaleReset();
      }, 0);
    };

    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    return () => {
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
    };
  }, []);

  return null;
}
