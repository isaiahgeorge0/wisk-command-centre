"use client";

import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SettingsToolsSection() {
  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader>
        <CardTitle>Tools</CardTitle>
        <CardDescription>Additional features and utilities.</CardDescription>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        <Link
          href="/ai-digest"
          className="flex min-h-11 items-center gap-3 px-6 py-3 transition-colors hover:bg-muted/50"
        >
          <Sparkles className="size-5 shrink-0 text-wisk-purple" aria-hidden />
          <span className="min-w-0 flex-1 font-medium text-foreground">
            AI Digest
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      </CardContent>
    </Card>
  );
}
