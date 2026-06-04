/** Shared motion tokens — durations in seconds for Framer Motion */

export const MOTION_DURATION = {
  fast: 0.2,
  normal: 0.3,
  slow: 0.4,
  progressBar: 0.6,
  fabPulse: 0.4,
} as const;

export const MOTION_EASE = {
  smooth: [0.25, 0.1, 0.25, 1] as const,
  easeOut: [0.33, 1, 0.68, 1] as const,
  countUp: [0.22, 1, 0.36, 1] as const,
};

export const MOTION_OFFSET = {
  pageY: 10,
  itemY: 8,
  dialogY: 8,
  popoverScale: 0.98,
} as const;

export const STAGGER_CHILD_DELAY = 0.06;

export const fadeUpHidden = {
  opacity: 0,
  y: MOTION_OFFSET.itemY,
};

export const fadeUpVisible = {
  opacity: 1,
  y: 0,
};

export const pageEnterHidden = {
  opacity: 0,
  y: MOTION_OFFSET.pageY,
};

export const pageEnterVisible = {
  opacity: 1,
  y: 0,
};

export const dialogEnterHidden = {
  opacity: 0,
  y: MOTION_OFFSET.dialogY,
};

export const dialogEnterVisible = {
  opacity: 1,
  y: 0,
};

export const popoverEnterHidden = {
  opacity: 0,
  scale: MOTION_OFFSET.popoverScale,
};

export const popoverEnterVisible = {
  opacity: 1,
  scale: 1,
};
