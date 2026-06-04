import { QuickAddFab } from "@/components/layout/quick-add-fab";
import { TopNav } from "@/components/layout/top-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-7xl px-6 pt-16 pb-24 lg:px-8">
        {children}
      </main>
      <QuickAddFab />
    </div>
  );
}
