import {
  getDocumentsByProperty,
  getProperties,
} from "@/app/(dashboard)/properties/actions";
import { DocumentsPageClient } from "@/components/properties/documents-page-client";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasPackageAccess } from "@/lib/billing/access";

export default async function PropertiesDocumentsPage() {
  const { supabase, userId } = await getScopedSupabase();
  const [properties, hasProPlan] = await Promise.all([
    getProperties(),
    hasPackageAccess(userId, "properties_pro", supabase),
  ]);
  const groups = await Promise.all(
    properties.map(async (property) => ({
      propertyId: property.id,
      propertyName: property.name,
      documents: await getDocumentsByProperty(property.id),
    }))
  );

  const nonEmptyGroups = groups
    .filter((group) => group.documents.length > 0)
    .sort((a, b) => a.propertyName.localeCompare(b.propertyName));

  return (
    <DocumentsPageClient groups={nonEmptyGroups} hasProPlan={hasProPlan} />
  );
}
