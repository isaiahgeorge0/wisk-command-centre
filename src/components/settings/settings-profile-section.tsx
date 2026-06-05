"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  changePassword,
  updateDisplayName,
  updateProfileName,
} from "@/app/(dashboard)/settings/actions";
import { UserAvatar } from "@/components/settings/user-avatar";
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

type SettingsProfileSectionProps = {
  email: string;
  initialDisplayName: string;
  initialName: string;
};

export function SettingsProfileSection({
  email,
  initialDisplayName,
  initialName,
}: SettingsProfileSectionProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [name, setName] = useState(initialName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isProfilePending, startProfileTransition] = useTransition();
  const [isPasswordPending, startPasswordTransition] = useTransition();

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setProfileError(null);

    startProfileTransition(async () => {
      const [displayResult, nameResult] = await Promise.all([
        updateDisplayName(displayName),
        updateProfileName(name),
      ]);

      if (!displayResult.success) {
        setProfileError(displayResult.error);
        return;
      }

      if (!nameResult.success) {
        setProfileError(nameResult.error);
        return;
      }

      setProfileMessage("Profile saved.");
      router.refresh();
    });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    startPasswordTransition(async () => {
      const result = await changePassword(
        currentPassword,
        newPassword,
        confirmPassword
      );
      if (!result.success) {
        setPasswordError(result.error);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated.");
    });
  };

  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Your name and sign-in details for WISK Command Centre.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="flex items-center gap-4">
          <UserAvatar name={displayName} email={email} />
          <div className="min-w-0">
            <p className="font-medium text-foreground">
              {displayName || email}
            </p>
            <p className="truncate text-sm text-muted-foreground">{email}</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="grid max-w-md gap-4">
          <div className="grid gap-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isProfilePending}
              required
            />
            <p className="text-xs text-muted-foreground">
              Shown in the nav, greetings, and across the app.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="account-name">Name</Label>
            <Input
              id="account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isProfilePending}
              required
            />
            <p className="text-xs text-muted-foreground">
              Your account name stored on your profile.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} readOnly disabled className="opacity-80" />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed here.
            </p>
          </div>
          {profileError ? (
            <p className="text-sm text-destructive">{profileError}</p>
          ) : null}
          {profileMessage ? (
            <p className="text-sm text-wisk-teal">{profileMessage}</p>
          ) : null}
          <Button type="submit" size="sm" disabled={isProfilePending} className="w-fit">
            {isProfilePending ? "Saving…" : "Save profile"}
          </Button>
        </form>

        <form
          onSubmit={handleChangePassword}
          className="grid max-w-md gap-4 border-t border-border/50 pt-8"
        >
          <div>
            <h3 className="text-sm font-medium text-foreground">Change password</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Minimum 8 characters.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isPasswordPending}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isPasswordPending}
              minLength={8}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isPasswordPending}
              minLength={8}
              required
            />
          </div>
          {passwordError ? (
            <p className="text-sm text-destructive">{passwordError}</p>
          ) : null}
          {passwordMessage ? (
            <p className="text-sm text-wisk-teal">{passwordMessage}</p>
          ) : null}
          <Button type="submit" size="sm" disabled={isPasswordPending} className="w-fit">
            {isPasswordPending ? "Saving…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
