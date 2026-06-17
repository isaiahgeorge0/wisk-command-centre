"use client";

import { Check, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { checkUsernameAvailable } from "@/app/(dashboard)/settings/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUsername, validateUsername } from "@/lib/users/username";
import { cn } from "@/lib/utils";

type AvailabilityStatus = "idle" | "checking" | "available" | "unavailable";

type UsernameFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onAvailabilityChange?: (available: boolean) => void;
  disabled?: boolean;
  currentUsername?: string | null;
};

export function UsernameField({
  id = "username",
  value,
  onChange,
  onAvailabilityChange,
  disabled = false,
  currentUsername = null,
}: UsernameFieldProps) {
  const [status, setStatus] = useState<AvailabilityStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const lower = formatUsername(value);

    // If unchanged from saved username, treat as available without API call
    if (currentUsername && lower === formatUsername(currentUsername)) {
      setStatus("available");
      setStatusMessage("Your current username");
      onAvailabilityChange?.(true);
      return;
    }

    if (!lower) {
      setStatus("idle");
      setStatusMessage(null);
      onAvailabilityChange?.(false);
      return;
    }

    const validation = validateUsername(lower);
    if (!validation.valid) {
      setStatus("unavailable");
      setStatusMessage(validation.error ?? "Invalid username");
      onAvailabilityChange?.(false);
      return;
    }

    setStatus("checking");
    setStatusMessage(null);

    debounceRef.current = setTimeout(async () => {
      const result = await checkUsernameAvailable(lower);
      if (!result.success) {
        setStatus("unavailable");
        setStatusMessage(result.error);
        onAvailabilityChange?.(false);
        return;
      }
      const available = result.data?.available ?? false;
      setStatus(available ? "available" : "unavailable");
      setStatusMessage(available ? "Available" : "Username already taken");
      onAvailabilityChange?.(available);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, currentUsername, onAvailabilityChange]);

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Username</Label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm select-none">
          @
        </span>
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
          disabled={disabled}
          placeholder="yourname"
          autoComplete="username"
          className="pl-7 pr-8"
          spellCheck={false}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          {status === "checking" ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
          ) : status === "available" ? (
            <Check className="size-4 text-emerald-500" aria-hidden />
          ) : status === "unavailable" ? (
            <X className="size-4 text-destructive" aria-hidden />
          ) : null}
        </span>
      </div>
      {statusMessage ? (
        <p
          className={cn(
            "text-xs",
            status === "available" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
          )}
        >
          {statusMessage}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          3–20 characters. Letters, numbers, underscores, hyphens.
        </p>
      )}
    </div>
  );
}
