export function extractPlainTextFromNoteContent(content: string | null): string {
  if (!content?.trim()) return "";

  try {
    const json = JSON.parse(content) as {
      type?: string;
      text?: string;
      content?: unknown[];
    };

    return extractPlainTextFromNode(json).replace(/\s+/g, " ").trim();
  } catch {
    return content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
}

function extractPlainTextFromNode(node: {
  type?: string;
  text?: string;
  content?: unknown[];
}): string {
  if (node.type === "text" && node.text) {
    return node.text;
  }

  if (!Array.isArray(node.content)) {
    return "";
  }

  const parts = node.content.map((child) =>
    extractPlainTextFromNode(child as { type?: string; text?: string; content?: unknown[] })
  );

  if (node.type === "paragraph" || node.type === "heading") {
    return `${parts.join("")}\n`;
  }

  return parts.join("");
}

export function getNotePreview(content: string | null): string {
  const plain = extractPlainTextFromNoteContent(content);
  const firstLine = plain.split("\n").find((line) => line.trim()) ?? "";
  return firstLine.trim();
}

export function formatNoteRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  }).format(date);
}
