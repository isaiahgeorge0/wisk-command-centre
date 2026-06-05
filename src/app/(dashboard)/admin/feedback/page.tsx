import { getFeedback } from "@/app/(dashboard)/admin/actions";
import { FeedbackClient } from "@/components/admin/feedback-client";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";

export default async function AdminFeedbackPage() {
  const feedback = await getFeedback("all");

  return (
    <div className="space-y-6">
      <div>
        <h1 className={PAGE_TITLE_CLASS}>Feedback</h1>
        <p className={PAGE_SUBTITLE_CLASS}>
          User submissions — bugs, feature requests, and general feedback.
        </p>
      </div>
      <FeedbackClient feedback={feedback} />
    </div>
  );
}
