import { getChangelogEntries } from "@/app/(dashboard)/admin/actions";
import { ChangelogAdminClient } from "@/components/admin/changelog-admin-client";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";

export default async function AdminChangelogPage() {
  const entries = await getChangelogEntries();

  return (
    <div className="space-y-6">
      <div>
        <h1 className={PAGE_TITLE_CLASS}>Changelog</h1>
        <p className={PAGE_SUBTITLE_CLASS}>
          Publish product updates shown in the user-facing What&apos;s new panel.
        </p>
      </div>
      <ChangelogAdminClient entries={entries} />
    </div>
  );
}
