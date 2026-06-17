"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  changePassword,
  setUsername,
  updateDisplayName,
  updateProfileName,
} from "@/app/(dashboard)/settings/actions";
import { UserAvatar } from "@/components/settings/user-avatar";
import { UsernameField } from "@/components/username/username-field";
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
import { displayUsername } from "@/lib/users/username";

type SettingsProfileSectionProps = {
  email: string;
  initialDisplayName: string;
  initialName: string;
  initialUsername: string | null;
};

export function SettingsProfileSection({
  email,
  initialDisplayName,
  initialName,
  initialUsername,
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

  // Username state
  const [savedUsername, setSavedUsername] = useState(initialUsername);
  const [usernameEditMode, setUsernameEditMode] = useState(!initialUsername);
  const [usernameInput, setUsernameInput] = useState(initialUsername ?? "");
  const [usernameAvailable, setUsernameAvailable] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isUsernamePending, startUsernameTransition] = useTransition();

  const handleSaveUsername = (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameMessage(null);
    setUsernameError(null);

    startUsernameTransition(async () => {
      const result = await setUsername(usernameInput);
      if (!result.success) {
        setUsernameError(result.error);
        return;
      }
      setSavedUsername(usernameInput.toLowerCase().trim());
      setUsernameEditMode(false);
      setUsernameMessage("Username saved.");
      router.refresh();
    });
  };

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

        {/* Username section */}
        <div className="max-w-md border-b border-border/50 pb-8">
          <h3 className="mb-4 text-sm font-medium text-foreground">Username</h3>
          {!usernameEditMode && savedUsername ? (
            <div className="flex items-center gap-3">
              <span className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm font-medium text-foreground">
                {displayUsername(savedUsername)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setUsernameInput(savedUsername);
                  setUsernameEditMode(true);
                  setUsernameMessage(null);
                  setUsernameError(null);
                }}
              >
                <Pencil className="mr-1.5 size-3.5" aria-hidden />
                Change
              </Button>
              {usernameMessage ? (
                <p className="text-xs text-wisk-teal">{usernameMessage}</p>
              ) : null}
            </div>
          ) : (
            <form onSubmit={handleSaveUsername} className="grid gap-4">
              <UsernameField
                id="settings-username"
                value={usernameInput}
                onChange={setUsernameInput}
                onAvailabilityChange={setUsernameAvailable}
                disabled={isUsernamePending}
                currentUsername={savedUsername}
              />
              {usernameError ? (
                <p className="text-sm text-destructive">{usernameError}</p>
              ) : null}
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isUsernamePending || !usernameAvailable || !usernameInput.trim()}
                  className="w-fit"
                >
                  {isUsernamePending ? "Saving…" : "Save username"}
                </Button>
                {savedUsername ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUsernameInput(savedUsername);
                      setUsernameEditMode(false);
                      setUsernameError(null);
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          )}
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
