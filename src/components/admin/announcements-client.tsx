"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import {
  createAnnouncement,
  deleteAnnouncement,
} from "@/app/(dashboard)/admin/actions";
import type { Announcement } from "@/lib/admin/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AnnouncementsClientProps = {
  announcements: Announcement[];
};

function formatDate(iso: string | null) {
  if (!iso) {
    return "Never";
  }
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AnnouncementsClient({
  announcements,
}: AnnouncementsClientProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isCreating, startCreateTransition] = useTransition();
  const [, startDeleteTransition] = useTransition();

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startCreateTransition(async () => {
      const result = await createAnnouncement(title, message, expiresAt || null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setTitle("");
      setMessage("");
      setExpiresAt("");
    });
  }

  function handleDelete(id: string) {
    setError(null);
    setPendingId(id);
    startDeleteTransition(async () => {
      const result = await deleteAnnouncement(id);
      setPendingId(null);
      if (!result.success) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create announcement</CardTitle>
          <CardDescription>
            Shown as a dismissible banner on the dashboard for all users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="announcement-title">Title</Label>
              <Input
                id="announcement-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcement-message">Message</Label>
              <Textarea
                id="announcement-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcement-expires">Expires at (optional)</Label>
              <Input
                id="announcement-expires"
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Creating…" : "Create announcement"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-base font-medium">All announcements</h2>
        {announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        ) : (
          announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{announcement.title}</CardTitle>
                    <CardDescription className="mt-1">
                      Created {formatDate(announcement.created_at)}
                      {announcement.expires_at
                        ? ` · Expires ${formatDate(announcement.expires_at)}`
                        : " · No expiry"}
                      {" · "}
                      {announcement.dismissal_count} dismissal
                      {announcement.dismissal_count === 1 ? "" : "s"}
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={pendingId === announcement.id}
                    onClick={() => handleDelete(announcement.id)}
                    aria-label={`Delete ${announcement.title}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {announcement.message}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
