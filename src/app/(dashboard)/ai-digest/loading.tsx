export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center gap-4">
        <div className="size-10 rounded-xl bg-muted/40" />
        <div className="space-y-2">
          <div className="h-6 w-48 rounded-lg bg-muted/40" />
          <div className="h-4 w-32 rounded-lg bg-muted/30" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-2xl bg-muted/30" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-muted/20" />
        ))}
      </div>
    </div>
  );
}
