"use client";

export default function ContractorError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <p className="text-lg font-medium text-foreground">
        Something went wrong
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.message ?? "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white"
      >
        Try again
      </button>
    </div>
  );
}
