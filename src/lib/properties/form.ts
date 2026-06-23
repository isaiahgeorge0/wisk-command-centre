import type { Property, PropertyFormInput } from "@/lib/properties/types";

export const EMPTY_PROPERTY_FORM: PropertyFormInput = {
  name: "",
  address_line1: "",
  address_line2: "",
  city: "",
  postcode: "",
  property_type: "flat",
  status: "vacant",
  bedrooms: undefined,
  bathrooms: undefined,
  monthly_rent: undefined,
  purchase_price: undefined,
  current_value: undefined,
  notes: "",
};

export function propertyToFormInput(property: Property): PropertyFormInput {
  return {
    name: property.name,
    address_line1: property.address_line1,
    address_line2: property.address_line2 ?? "",
    city: property.city,
    postcode: property.postcode,
    property_type: property.property_type,
    bedrooms: property.bedrooms ?? undefined,
    bathrooms: property.bathrooms ?? undefined,
    status: property.status,
    purchase_price: property.purchase_price ?? undefined,
    current_value: property.current_value ?? undefined,
    monthly_rent: property.monthly_rent ?? undefined,
    notes: property.notes ?? "",
  };
}
