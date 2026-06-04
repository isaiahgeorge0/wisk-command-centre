"use client";

import { ChevronDown } from "lucide-react";

import { signOut } from "@/app/(dashboard)/actions/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UserMenuProps = {
  userEmail: string;
  userName: string | null;
};

export function UserMenu({ userEmail, userName }: UserMenuProps) {
  const label = userName?.trim() || userEmail;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="max-w-[140px] min-h-11 gap-1.5 text-muted-foreground hover:text-foreground md:max-w-[180px] md:min-h-8"
          />
        }
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="size-4 shrink-0 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium text-foreground">{label}</p>
          {userName ? (
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          ) : null}
        </div>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => {
            signOut();
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
