"use client";

import LinkExtension from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, ChevronDown, Italic, Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";

import {
  updateSignature,
} from "@/app/(dashboard)/settings/integrations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { stripHtml } from "@/lib/email/utils";
import type { SafeIntegration } from "@/lib/integrations/types";
import { cn } from "@/lib/utils";

type IntegrationSignatureSectionProps = {
  integration: SafeIntegration;
  providerLabel: "Gmail" | "Outlook";
};

function ToolbarButton({
  label,
  isActive,
  onClick,
  children,
}: {
  label: string;
  isActive?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors",
        isActive
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function IntegrationSignatureSection({
  integration,
  providerLabel,
}: IntegrationSignatureSectionProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedSignature, setSavedSignature] = useState(integration.signature);
  const [isPending, startTransition] = useTransition();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        listItem: false,
        orderedList: false,
        strike: false,
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
    ],
    content: integration.signature ?? "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[120px] px-3 py-2 text-sm leading-relaxed focus:outline-none",
      },
    },
  });

  useEffect(() => {
    setSavedSignature(integration.signature);
    editor?.commands.setContent(integration.signature ?? "");
  }, [editor, integration.id, integration.signature]);

  const handleSetLink = () => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter link URL", previousUrl ?? "https://");

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const handleSave = () => {
    if (!editor) return;

    setSaveError(null);
    const html = editor.getHTML();
    const isEmpty = !editor.getText().trim();
    const signature = isEmpty ? "" : html;
    const signaturePlain = isEmpty ? "" : stripHtml(html);

    startTransition(async () => {
      const result = await updateSignature(
        integration.id,
        signature,
        signaturePlain,
        phoneNumber.trim() || undefined
      );

      if (!result.success) {
        setSaveError(result.error);
        return;
      }

      const savedHtml = phoneNumber.trim()
        ? signature.trim()
          ? `${signature.trim()}<p>${phoneNumber.trim()}</p>`
          : `<p>${phoneNumber.trim()}</p>`
        : signature;

      setSavedSignature(savedHtml.trim() || null);
      setExpanded(false);
      router.refresh();
    });
  };

  const statusLabel = integration.signature_auto_fetched
    ? `Auto-fetched from ${providerLabel}`
    : integration.signature
      ? "Custom signature saved"
      : "No signature set";

  return (
    <div className="border-t border-border/40 pt-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-foreground">Email signature</p>
          <p className="text-[11px] text-muted-foreground">{statusLabel}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 gap-1 text-xs"
          onClick={() => setExpanded((current) => !current)}
        >
          Edit signature
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              expanded && "rotate-180"
            )}
            aria-hidden
          />
        </Button>
      </div>

      {savedSignature ? (
        <div
          className="prose-email mt-2 rounded-md border border-border/40 bg-background/60 px-3 py-2 text-xs text-muted-foreground [&_a]:text-primary [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: savedSignature }}
        />
      ) : null}

      {expanded ? (
        <div className="mt-3 space-y-3">
          <div className="overflow-hidden rounded-md border border-border/60 bg-background">
            <div className="flex items-center gap-1 border-b border-border/60 px-2 py-1">
              <ToolbarButton
                label="Bold"
                isActive={editor?.isActive("bold")}
                onClick={() => editor?.chain().focus().toggleBold().run()}
              >
                <Bold className="size-3.5" aria-hidden />
              </ToolbarButton>
              <ToolbarButton
                label="Italic"
                isActive={editor?.isActive("italic")}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
              >
                <Italic className="size-3.5" aria-hidden />
              </ToolbarButton>
              <ToolbarButton
                label="Link"
                isActive={editor?.isActive("link")}
                onClick={handleSetLink}
              >
                <Link2 className="size-3.5" aria-hidden />
              </ToolbarButton>
            </div>
            <EditorContent editor={editor} />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={`signature-phone-${integration.id}`}
              className="text-[11px] font-medium text-muted-foreground"
            >
              Phone number (optional)
            </label>
            <Input
              id={`signature-phone-${integration.id}`}
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="+44 7700 900000"
              className="h-9"
            />
          </div>

          {saveError ? (
            <p className="text-xs text-destructive">{saveError}</p>
          ) : null}

          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={handleSave}
          >
            {isPending ? "Saving…" : "Save signature"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
