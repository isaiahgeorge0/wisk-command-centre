import { getLeadsWithActivity } from "@/app/(dashboard)/leads/actions";
import { LeadsPageClient } from "@/components/leads/leads-page-client";

export default async function LeadsPage() {
  const leads = await getLeadsWithActivity();

  return <LeadsPageClient initialLeads={leads} />;
}
