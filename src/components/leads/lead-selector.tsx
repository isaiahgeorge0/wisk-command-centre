"use client";

import { ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import type { Lead } from "@/lib/leads/types";
import { cn } from "@/lib/utils";

type LeadSelectorProps = {
  leads: Lead[];
  value: string | null;
  onChange: (leadId: string | null) => void;
  placeholder?: string;
  className?: string;
};

export function LeadSelector({
  leads,
  value,
  onChange,
  placeholder = "Select a lead...",
  className,
}: LeadSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const sortedLeads = useMemo(
    () =>
      [...leads].sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ),
    [leads]
  );

  const selectedLead = sortedLeads.find((lead) => lead.id === value) ?? null;

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sortedLeads;
    return sortedLeads.filter((lead) =>
      lead.name.toLowerCase().includes(query)
    );
  }, [search, sortedLeads]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (leadId: string) => {
    onChange(leadId);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-left text-sm transition-colors hover:border-border"
      >
        {selectedLead ? (
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate font-medium text-foreground">
              {selectedLead.name}
            </span>
            <LeadStatusBadge status={selectedLead.status} />
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border/60 bg-popover shadow-lg">
          <div className="border-b border-border/60 p-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads..."
                className="w-full rounded-md border border-border/60 bg-background py-1.5 pr-2 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-wisk-teal/40"
                autoFocus
              />
            </div>
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {filteredLeads.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">
                No leads found
              </li>
            ) : (
              filteredLeads.map((lead) => (
                <li key={lead.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(lead.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/60",
                      value === lead.id && "bg-muted/40"
                    )}
                  >
                    <span className="truncate font-medium text-foreground">
                      {lead.name}
                    </span>
                    <LeadStatusBadge status={lead.status} />
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
