"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import {
  createUserManually,
  resetUserOnboarding,
  resetUserPersonalisation,
} from "@/app/(dashboard)/admin/actions";
import type { AdminUser } from "@/lib/admin/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

type AdminQuickActionsProps = {
  users: AdminUser[];
};

type ConfirmAction = "onboarding" | "personalisation" | null;

export function AdminQuickActions({ users }: AdminQuickActionsProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [isPending, startTransition] = useTransition();

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) {
      return users;
    }
    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(query) ||
        (user.name ?? "").toLowerCase().includes(query)
    );
  }, [userSearch, users]);

  const selectedUser = users.find((user) => user.id === selectedUserId);
  const selectedUserLabel =
    selectedUser?.name?.trim() ||
    selectedUser?.email.split("@")[0] ||
    "this user";

  function handleCreateUser(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await createUserManually(name, email);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setName("");
      setEmail("");
      setMessage("Invite sent.");
    });
  }

  function handleConfirmReset() {
    if (!selectedUserId || !confirmAction) {
      return;
    }

    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result =
        confirmAction === "onboarding"
          ? await resetUserOnboarding(selectedUserId)
          : await resetUserPersonalisation(selectedUserId);

      setConfirmAction(null);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setMessage(
        confirmAction === "onboarding"
          ? "Onboarding reset for selected user."
          : "Personalisation reset for selected user."
      );
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
          <CardDescription>
            Common admin tasks without leaving the overview.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <form onSubmit={handleCreateUser} className="grid max-w-md gap-3">
            <div>
              <h3 className="text-sm font-medium">Create user manually</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Sends a Supabase invite email to the new account.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quick-name">Name</Label>
              <Input
                id="quick-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isPending}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quick-email">Email</Label>
              <Input
                id="quick-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isPending}
                required
              />
            </div>
            <Button type="submit" size="sm" disabled={isPending} className="w-fit">
              Send invite
            </Button>
          </form>

          <div className="grid max-w-md gap-3 border-t border-border/50 pt-8">
            <div>
              <h3 className="text-sm font-medium">Reset user flows</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick a user, then reset onboarding or personalisation.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="user-search">Search users</Label>
              <Input
                id="user-search"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Search name or email…"
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="user-picker">User</Label>
              <select
                id="user-picker"
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                disabled={isPending}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="">Select a user…</option>
                {filteredUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {(user.name?.trim() || user.email.split("@")[0]) +
                      ` (${user.email})`}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!selectedUserId || isPending}
                onClick={() => setConfirmAction("onboarding")}
              >
                Reset onboarding
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!selectedUserId || isPending}
                onClick={() => setConfirmAction("personalisation")}
              >
                Reset personalisation
              </Button>
            </div>
          </div>

          <div className="border-t border-border/50 pt-8">
            <h3 className="text-sm font-medium">Send announcement</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Jump straight to the announcements create form.
            </p>
            <Link
              href="/admin/announcements"
              className="mt-3 inline-flex h-7 items-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Open announcements →
            </Link>
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="text-sm text-wisk-lime">{message}</p>
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmAction(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "onboarding"
                ? "Reset onboarding?"
                : "Reset personalisation?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "onboarding"
                ? `This will send ${selectedUserLabel} through the onboarding flow again on their next login. Are you sure?`
                : `This will send ${selectedUserLabel} through the welcome personalisation flow again on their next login. Are you sure?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={handleConfirmReset}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
