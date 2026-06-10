"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  createCalendarEvent,
  updateCalendarEvent,
} from "@/app/(dashboard)/calendar/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  EMPTY_STANDALONE_CALENDAR_EVENT_FORM,
  standaloneEventToFormInput,
} from "@/lib/calendar/standalone-form";
import type {
  StandaloneCalendarEvent,
  StandaloneCalendarEventFormInput,
} from "@/lib/calendar/types";

type CalendarEventFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: StandaloneCalendarEvent | null;
  prefillDate?: string | null;
  prefillEventType?: "lifestyle" | "other" | null;
};

export function CalendarEventFormDialog({
  open,
  onOpenChange,
  event,
  prefillDate,
  prefillEventType,
}: CalendarEventFormDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(event);
  const [values, setValues] = useState<StandaloneCalendarEventFormInput>(
    EMPTY_STANDALONE_CALENDAR_EVENT_FORM
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = isEdit ? `edit-calendar-event-${event?.id}` : "add-calendar-event-form";

  useEffect(() => {
    if (!open) return;

    if (event) {
      setValues(standaloneEventToFormInput(event));
      return;
    }

    setValues({
      ...EMPTY_STANDALONE_CALENDAR_EVENT_FORM,
      ...(prefillDate ? { date: prefillDate } : {}),
      ...(prefillEventType ? { event_type: prefillEventType } : {}),
    });
  }, [open, event, prefillDate, prefillEventType]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setValues(EMPTY_STANDALONE_CALENDAR_EVENT_FORM);
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const setField = <K extends keyof StandaloneCalendarEventFormInput>(
    key: K,
    value: StandaloneCalendarEventFormInput[K]
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = isEdit
        ? await updateCalendarEvent(event!.id, values)
        : await createCalendarEvent(values);

      if (!result.success) {
        setError(result.error);
        return;
      }

      handleOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit calendar event" : "Add calendar event"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this personal calendar entry."
              : "Add a lifestyle or other event to your calendar."}
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${formId}-title`}>Title *</Label>
            <Input
              id={`${formId}-title`}
              value={values.title}
              onChange={(e) => setField("title", e.target.value)}
              disabled={isPending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-event-type`}>Type *</Label>
            <Select
              value={values.event_type}
              onValueChange={(value) =>
                setField("event_type", value as "lifestyle" | "other")
              }
              disabled={isPending}
            >
              <SelectTrigger id={`${formId}-event-type`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lifestyle">Lifestyle/Personal</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-date`}>Date *</Label>
            <Input
              id={`${formId}-date`}
              type="date"
              value={values.date}
              onChange={(e) => setField("date", e.target.value)}
              disabled={isPending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-end-date`}>End date</Label>
            <Input
              id={`${formId}-end-date`}
              type="date"
              value={values.end_date ?? ""}
              onChange={(e) => setField("end_date", e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-notes`}>Notes</Label>
            <Textarea
              id={`${formId}-notes`}
              value={values.notes ?? ""}
              onChange={(e) => setField("notes", e.target.value)}
              disabled={isPending}
              rows={3}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={isPending}>
            {isPending ? "Saving…" : isEdit ? "Save changes" : "Add event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
