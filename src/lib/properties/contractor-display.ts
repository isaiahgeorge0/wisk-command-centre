const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function formatDisplayName(name: string): string {
  return name
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
    .trim();
}

export function formatPersonDisplayName(
  name: string | null | undefined,
  fallback: string
): string {
  const trimmed = name?.trim();
  if (!trimmed || UUID_RE.test(trimmed)) return fallback;
  const formatted = formatDisplayName(trimmed);
  return formatted || fallback;
}

export function formatContractorDisplayName(
  name: string | null | undefined
): string {
  return formatPersonDisplayName(name, "Unknown contractor");
}

export function formatJobSheetStatus(status: string): string {
  const map: Record<string, string> = {
    sent: "Sent",
    viewed: "Viewed",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return map[status] ?? status;
}

export function formatAccessRequestStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    declined: "Declined",
  };
  return map[status] ?? status;
}
