import { getAccessRequests } from "@/app/(dashboard)/admin/actions";
import { RequestsClient } from "@/components/admin/requests-client";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";

export default async function AdminRequestsPage() {
  const requests = await getAccessRequests("all");

  return (
    <div className="space-y-6">
      <div>
        <h1 className={PAGE_TITLE_CLASS}>Access requests</h1>
        <p className={PAGE_SUBTITLE_CLASS}>
          Review and approve or decline access requests from the marketing site.
        </p>
      </div>
      <RequestsClient requests={requests} />
    </div>
  );
}
