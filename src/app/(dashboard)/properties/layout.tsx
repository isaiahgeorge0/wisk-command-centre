import { getTotalUnreadMessageCount } from "@/app/(dashboard)/properties/actions";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasPackageAccess } from "@/lib/billing/access";
import { PropertiesMessageToastProvider } from "@/components/properties/properties-message-toast-provider";
import { PropertiesSidebar } from "@/components/properties/properties-sidebar";
import { PropertiesTeaserPage } from "@/components/properties/properties-teaser-page";

export default async function PropertiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, userId } = await getScopedSupabase();
  const hasProperties = await hasPackageAccess(userId, "properties", supabase);

  if (!hasProperties) {
    return <PropertiesTeaserPage />;
  }

  const unreadMessageCount = await getTotalUnreadMessageCount();

  return (
    <div className="-mx-4 flex min-h-[calc(100dvh-4rem)] md:-mx-6 lg:-mx-8">
      <PropertiesSidebar
        className="hidden md:flex"
        unreadMessageCount={unreadMessageCount}
        landlordUserId={userId}
      />
      <PropertiesMessageToastProvider landlordUserId={userId}>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 md:px-6 lg:px-8">
          {children}
        </div>
      </PropertiesMessageToastProvider>
    </div>
  );
}
