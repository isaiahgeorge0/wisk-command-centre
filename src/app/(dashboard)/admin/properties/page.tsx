import { getPropertiesOverview } from "@/app/(dashboard)/admin/actions";
import { PropertiesOverviewSection } from "@/components/admin/properties-overview-section";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";

export default async function AdminPropertiesPage() {
  const overview = await getPropertiesOverview();

  return (
    <div className="space-y-6">
      <div>
        <h1 className={PAGE_TITLE_CLASS}>Properties</h1>
        <p className={PAGE_SUBTITLE_CLASS}>
          Properties portfolio health across active package users.
        </p>
      </div>
      <PropertiesOverviewSection initialData={overview} />
    </div>
  );
}

