export type PropertyStatus = "occupied" | "vacant" | "maintenance" | "listed";

export type PropertyType = "flat" | "house" | "hmo" | "commercial" | "other";

export type Property = {
  id: string;
  user_id: string;
  name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  postcode: string;
  property_type: PropertyType;
  bedrooms: number | null;
  bathrooms: number | null;
  status: PropertyStatus;
  purchase_price: number | null;
  current_value: number | null;
  monthly_rent: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PropertyFormInput = {
  name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postcode: string;
  property_type: PropertyType;
  bedrooms?: number;
  bathrooms?: number;
  status: PropertyStatus;
  purchase_price?: number;
  current_value?: number;
  monthly_rent?: number;
  notes?: string;
};

export type PropertyWithStats = Property & {
  tenant_count: number;
  open_maintenance_count: number;
  monthly_rent_total: number;
};

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export type PortfolioStats = {
  totalProperties: number;
  occupiedCount: number;
  vacantCount: number;
  totalMonthlyRent: number;
  openMaintenanceCount: number;
};
