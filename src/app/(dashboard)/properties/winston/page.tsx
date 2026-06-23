import { getLatestPropertyInsight, getProperties } from "@/app/(dashboard)/properties/actions";
import { PropertiesWinstonClient } from "@/components/properties/properties-winston-client";
import { isAdminEmail } from "@/lib/auth/is-admin";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";

export default async function PropertiesWinstonPage() {
  const { supabase } = await getScopedSupabase();
  const { data: authUser } = await supabase.auth.getUser();

  const [insight, properties] = await Promise.all([
    getLatestPropertyInsight(),
    getProperties(),
  ]);

  return (
    <PropertiesWinstonClient
      insight={insight}
      propertyCount={properties.length}
      isAdmin={isAdminEmail(authUser.user?.email)}
    />
  );
}
