import { getContractors } from "@/app/(dashboard)/properties/actions";
import { ContractorsPageClient } from "@/components/properties/contractors/contractors-page-client";

export default async function PropertiesContractorsPage() {
  const contractors = await getContractors();

  return <ContractorsPageClient contractors={contractors} />;
}
