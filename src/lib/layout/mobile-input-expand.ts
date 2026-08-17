const SKIP_EXPAND_SELECTOR = [
  "[data-mobile-send-compose]",
  "[data-mobile-sheet-content]",
  '[role="dialog"]',
  '[data-slot="dialog-content"]',
  '[data-slot="alert-dialog-content"]',
  '[data-no-mobile-input-expand]',
].join(",");

export function shouldSkipMobileInputExpand(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return true;
  return Boolean(target.closest(SKIP_EXPAND_SELECTOR));
}
