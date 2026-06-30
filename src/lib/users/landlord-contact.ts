export type LandlordContact = {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  phone: string | null;
};

export function formatLandlordAddress(contact: LandlordContact): string {
  const cityPostcode = [contact.city, contact.postcode]
    .filter((part) => part?.trim())
    .join(", ");

  return [contact.addressLine1, contact.addressLine2, cityPostcode]
    .filter((line) => line?.trim())
    .join("\n");
}

export function hasLandlordAddress(contact: LandlordContact): boolean {
  return Boolean(
    contact.addressLine1?.trim() ||
      contact.addressLine2?.trim() ||
      contact.city?.trim() ||
      contact.postcode?.trim()
  );
}
