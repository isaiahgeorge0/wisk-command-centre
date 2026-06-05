"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deleteBlogPost } from "@/app/(dashboard)/admin/blog/actions";
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

type DeleteBlogPostDialogProps = {
  postId: string | null;
  postTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (id: string) => void;
};

export function DeleteBlogPostDialog({
  postId,
  postTitle,
  open,
  onOpenChange,
  onDeleted,
}: DeleteBlogPostDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!postId) return;

    startTransition(async () => {
      const result = await deleteBlogPost(postId);
      if (!result.success) return;
      onDeleted?.(postId);
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete blog post?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{postTitle}&rdquo; will be permanently removed from the
            marketing site. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
