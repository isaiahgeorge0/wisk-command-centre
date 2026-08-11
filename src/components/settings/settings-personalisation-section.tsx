"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateGreetingPreferences } from "@/app/(dashboard)/settings/actions";
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
import {
  normalizeGender,
  resolveGreetingTerm,
  type UserGender,
} from "@/lib/morning/greeting";

type SettingsPersonalisationSectionProps = {
  initialGender: UserGender;
  initialGreetingTerm: string | null;
};

const GENDER_OPTIONS: Array<{ value: UserGender; label: string }> = [
  { value: "unspecified", label: "Prefer not to say" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export function SettingsPersonalisationSection({
  initialGender,
  initialGreetingTerm,
}: SettingsPersonalisationSectionProps) {
  const router = useRouter();
  const [gender, setGender] = useState<UserGender>(
    normalizeGender(initialGender)
  );
  const [greetingTerm, setGreetingTerm] = useState(
    initialGreetingTerm?.trim() ?? ""
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const previewTerm = resolveGreetingTerm(
    gender,
    greetingTerm.trim() || null
  );

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await updateGreetingPreferences({
        gender,
        greetingTerm,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessage("Personalisation saved.");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Winston greetings</CardTitle>
        <CardDescription>
          Optional. Used in morning briefings and similar Winston copy —
          collected for personalisation only.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="grid max-w-md gap-4">
          <div className="grid gap-2">
            <Label htmlFor="settings-gender">How should Winston address you?</Label>
            <select
              id="settings-gender"
              value={gender}
              onChange={(event) =>
                setGender(normalizeGender(event.target.value))
              }
              disabled={isPending}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Defaults to a neutral greeting. You can change this any time.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="settings-greeting-term">
              Custom greeting term (optional)
            </Label>
            <Input
              id="settings-greeting-term"
              value={greetingTerm}
              onChange={(event) => setGreetingTerm(event.target.value)}
              disabled={isPending}
              placeholder="e.g. captain"
              maxLength={40}
            />
            <p className="text-xs text-muted-foreground">
              If set, Winston uses this instead of the gender default. Preview:{" "}
              <span className="text-foreground/80">
                Good morning, {previewTerm}
              </span>
            </p>
          </div>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          {message ? (
            <p className="text-sm text-wisk-turquoise">{message}</p>
          ) : null}

          <Button type="submit" size="sm" disabled={isPending} className="w-fit">
            {isPending ? "Saving…" : "Save greetings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
