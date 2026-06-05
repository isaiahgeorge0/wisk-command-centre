"use client";

import { useEffect, useState, useTransition } from "react";

import { submitFeedback } from "@/app/(dashboard)/settings/feedback/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FeedbackType } from "@/lib/feedback/types";
import { FEEDBACK_TYPE_LABELS } from "@/lib/feedback/types";
import { cn } from "@/lib/utils";

const FEEDBACK_TYPES: FeedbackType[] = [
  "bug_report",
  "feature_request",
  "general",
];

export function SettingsFeedbackSection() {
  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (window.location.hash !== "#feedback") {
      return;
    }

    setHighlight(true);
    const section = document.getElementById("feedback");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });

    const timer = window.setTimeout(() => setHighlight(false), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await submitFeedback(type, message);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setMessage("");
      setType("general");
      setSuccess(true);
    });
  }

  return (
    <Card
      id="feedback"
      className={cn(
        "border-border/60 bg-card/80 scroll-mt-24 transition-shadow",
        highlight && "ring-2 ring-wisk-purple/30"
      )}
    >
      <CardHeader>
        <CardTitle>Feedback</CardTitle>
        <CardDescription>
          Share bugs, ideas, or anything on your mind. We read every message.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid max-w-md gap-4">
          <div className="grid gap-2">
            <Label htmlFor="feedback-type">Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as FeedbackType)}
              disabled={isPending}
            >
              <SelectTrigger id="feedback-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_TYPES.map((feedbackType) => (
                  <SelectItem key={feedbackType} value={feedbackType}>
                    {FEEDBACK_TYPE_LABELS[feedbackType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="feedback-message">Message</Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              minLength={10}
              required
              disabled={isPending}
              placeholder="Tell us what's working, what's not, or what you'd love to see…"
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm text-wisk-teal">
              Thanks for your feedback — we really appreciate it.
            </p>
          ) : null}

          <Button type="submit" size="sm" disabled={isPending} className="w-fit">
            {isPending ? "Sending…" : "Send feedback"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
