"use client";

import { useState } from "react";

import type { AccessRequest } from "@/lib/admin/types";
import { DEFAULT_INVITE_WELCOME_MESSAGE } from "@/lib/admin/platform";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ApproveRequestDialogProps = {
  request: AccessRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (welcomeMessage: string) => void;
  isPending: boolean;
};

export function ApproveRequestDialog({
  request,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: ApproveRequestDialogProps) {
  const [welcomeMessage, setWelcomeMessage] = useState(
    DEFAULT_INVITE_WELCOME_MESSAGE
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve access request</DialogTitle>
          <DialogDescription>
            Send an invite to {request?.email}. Customise the welcome message
            stored on their account.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="welcome-message">Welcome message</Label>
          <Textarea
            id="welcome-message"
            value={welcomeMessage}
            onChange={(event) => setWelcomeMessage(event.target.value)}
            rows={5}
            disabled={isPending}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isPending || !welcomeMessage.trim()}
            onClick={() => onConfirm(welcomeMessage)}
          >
            {isPending ? "Sending invite…" : "Approve & send invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
