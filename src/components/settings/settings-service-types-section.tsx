"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  addServiceType,
  removeServiceType,
  reorderServiceType,
} from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SettingsServiceTypesSectionProps = {
  serviceTypes: string[];
};

export function SettingsServiceTypesSection({
  serviceTypes,
}: SettingsServiceTypesSectionProps) {
  const router = useRouter();
  const [newType, setNewType] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ success: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.success) {
        setError(result.error ?? "Something went wrong");
        return;
      }
      router.refresh();
    });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    run(() => addServiceType(newType).then((r) => {
      if (r.success) setNewType("");
      return r;
    }));
  };

  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader>
        <CardTitle>Service types</CardTitle>
        <CardDescription>
          Options shown when adding or editing projects. Reorder to match how you
          work.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y divide-border/50 rounded-lg border border-border/60">
          {serviceTypes.map((type, index) => (
            <li
              key={type}
              className="flex items-center gap-2 px-3 py-2.5 text-sm"
            >
              <span className="min-w-0 flex-1 font-medium text-foreground">
                {type}
              </span>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={isPending || index === 0}
                  aria-label={`Move ${type} up`}
                  onClick={() => run(() => reorderServiceType(type, "up"))}
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={isPending || index === serviceTypes.length - 1}
                  aria-label={`Move ${type} down`}
                  onClick={() => run(() => reorderServiceType(type, "down"))}
                >
                  <ChevronDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={isPending || serviceTypes.length <= 1}
                  className="text-destructive hover:text-destructive"
                  aria-label={`Delete ${type}`}
                  onClick={() => run(() => removeServiceType(type))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>

        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            placeholder="New service type"
            disabled={isPending}
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
            <Plus className="size-4" />
            Add
          </Button>
        </form>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
