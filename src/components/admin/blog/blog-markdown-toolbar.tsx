"use client";

import type { ReactNode } from "react";
import {
  Bold,
  Code,
  Heading2,
  Italic,
  Link2,
  List,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type BlogMarkdownToolbarProps = {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

type InsertSpec = {
  label: string;
  icon: ReactNode;
  before: string;
  after: string;
  placeholder?: string;
};

const INSERT_ACTIONS: InsertSpec[] = [
  { label: "Bold", icon: <Bold className="size-3.5" />, before: "**", after: "**", placeholder: "bold text" },
  { label: "Italic", icon: <Italic className="size-3.5" />, before: "*", after: "*", placeholder: "italic text" },
  { label: "Heading", icon: <Heading2 className="size-3.5" />, before: "## ", after: "", placeholder: "Heading" },
  { label: "Link", icon: <Link2 className="size-3.5" />, before: "[", after: "](https://)", placeholder: "link text" },
  { label: "Code", icon: <Code className="size-3.5" />, before: "`", after: "`", placeholder: "code" },
  { label: "Bullet list", icon: <List className="size-3.5" />, before: "- ", after: "", placeholder: "List item" },
];

export function BlogMarkdownToolbar({
  textareaRef,
  value,
  onChange,
  disabled,
}: BlogMarkdownToolbarProps) {
  const insertMarkdown = (spec: InsertSpec) => {
    const textarea = textareaRef.current;
    if (!textarea || disabled) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || spec.placeholder || "";
    const insertion = `${spec.before}${selected}${spec.after}`;
    const nextValue = value.slice(0, start) + insertion + value.slice(end);

    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursorStart = start + spec.before.length;
      const cursorEnd = cursorStart + selected.length;
      textarea.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  return (
    <div className="flex flex-wrap gap-1 rounded-t-lg border border-b-0 border-border/60 bg-muted/30 p-1.5">
      {INSERT_ACTIONS.map((action) => (
        <Button
          key={action.label}
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs"
          disabled={disabled}
          onClick={() => insertMarkdown(action)}
          aria-label={action.label}
        >
          {action.icon}
          <span className="hidden sm:inline">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}
