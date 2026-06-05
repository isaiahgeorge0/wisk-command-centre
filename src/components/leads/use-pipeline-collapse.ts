"use client";

import { useCallback, useEffect, useState } from "react";

import { PIPELINE_STATUSES } from "@/lib/leads/constants";
import type { Lead } from "@/lib/leads/types";
import type { LeadStatus } from "@/lib/leads/types";

function defaultExpanded(
  grouped: Record<LeadStatus, Lead[]>
): Record<LeadStatus, boolean> {
  return Object.fromEntries(
    PIPELINE_STATUSES.map((status) => [status, grouped[status].length > 0])
  ) as Record<LeadStatus, boolean>;
}

export function usePipelineCollapse(grouped: Record<LeadStatus, Lead[]>) {
  const [expanded, setExpanded] = useState<Record<LeadStatus, boolean>>(() =>
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

  const toggle = useCallback((status: LeadStatus) => {
    setExpanded((prev) => ({ ...prev, [status]: !prev[status] }));
  }, []);

  const expandStage = useCallback((status: LeadStatus) => {
    setExpanded((prev) => ({ ...prev, [status]: true }));
  }, []);

  return { expanded, toggle, expandStage };
}
