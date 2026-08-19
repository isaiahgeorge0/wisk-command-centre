import { getSubscriptionRevenueBreakdown } from "@/app/(dashboard)/admin/actions";
import { SubscriptionRevenueSection } from "@/components/admin/subscription-revenue-section";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";

export default async function AdminSubscriptionsPage() {
  const breakdown = await getSubscriptionRevenueBreakdown();

  return (
    <div className="space-y-6">
      <div>
        <h1 className={PAGE_TITLE_CLASS}>Subscriptions</h1>
        <p className={PAGE_SUBTITLE_CLASS}>
          Current package counts and recurring revenue across all users.
        </p>
      </div>
      <SubscriptionRevenueSection initialData={breakdown} />
    </div>
  );
}
