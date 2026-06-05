"use client";

import { useCallback, useEffect, useState } from "react";

import { PIPELINE_STATUSES } from "@/lib/content/constants";
import type { ContentPost, ContentStatus } from "@/lib/content/types";

function defaultExpanded(
  grouped: Record<ContentStatus, ContentPost[]>
): Record<ContentStatus, boolean> {
  return Object.fromEntries(
    PIPELINE_STATUSES.map((status) => [status, grouped[status].length > 0])
  ) as Record<ContentStatus, boolean>;
}

export function useContentPipelineCollapse(
  grouped: Record<ContentStatus, ContentPost[]>
) {
  const [expanded, setExpanded] = useState<Record<ContentStatus, boolean>>(() =>
    defaultExpanded(grouped)
  );

  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev };
      for (const status of PIPELINE_STATUSES) {
        if (grouped[status].length === 0) {
          next[status] = false;
        } else if (grouped[status].length > 0 && !prev[status]) {
          next[status] = true;
        }
      }
      return next;
    });
  }, [grouped]);

  const toggle = useCallback((status: ContentStatus) => {
    setExpanded((prev) => ({ ...prev, [status]: !prev[status] }));
  }, []);

  const expandStage = useCallback((status: ContentStatus) => {
    setExpanded((prev) => ({ ...prev, [status]: true }));
  }, []);

  return { expanded, toggle, expandStage };
}
