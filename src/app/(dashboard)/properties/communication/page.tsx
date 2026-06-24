import { getConversations } from "@/app/(dashboard)/properties/actions";
import { CommunicationPageClient } from "@/components/properties/communication/communication-page-client";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";

export default async function PropertiesCommunicationPage() {
  const { userId } = await getScopedSupabase();
  const conversations = await getConversations();

  return (
    <CommunicationPageClient
      initialConversations={conversations}
      landlordUserId={userId}
    />
  );
}
