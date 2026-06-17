import { ConnectionsPageClient } from "@/components/connections/connections-page-client";
import { getConnections, getPendingRequests } from "@/app/(dashboard)/connections/actions";

export default async function ConnectionsPage() {
  const [connectionsResult, pendingResult] = await Promise.all([
    getConnections(),
    getPendingRequests(),
  ]);

  return (
    <ConnectionsPageClient
      initialConnections={connectionsResult.success ? (connectionsResult.data ?? []) : []}
      initialPending={pendingResult.success ? (pendingResult.data ?? []) : []}
    />
  );
}
