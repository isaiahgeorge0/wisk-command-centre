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
  alerts_enabled?: boolean;
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

export type TenantStatus = "active" | "notice" | "ended";

export type RentFrequency = "weekly" | "monthly";

export type Tenant = {
  id: string;
  user_id: string;
  property_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  tenancy_start: string;
  tenancy_end: string | null;
  rent_amount: number;
  rent_frequency: RentFrequency;
  deposit_amount: number | null;
  deposit_protected: boolean;
  status: TenantStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TenantFormInput = {
  property_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  tenancy_start: string;
  tenancy_end?: string;
  rent_amount: number;
  rent_frequency: RentFrequency;
  deposit_amount?: number;
  deposit_protected: boolean;
  status: TenantStatus;
  notes?: string;
};

export type TenantWithProperty = Tenant & { property_name: string };

export type MaintenanceStatus = "new" | "in_progress" | "resolved";

export type MaintenancePriority = "low" | "medium" | "high" | "emergency";

export type MaintenanceCategory =
  | "plumbing"
  | "electrical"
  | "heating"
  | "structural"
  | "appliance"
  | "other";

export type MaintenanceTicket = {
  id: string;
  user_id: string;
  property_id: string;
  tenant_id: string | null;
  title: string;
  description: string | null;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  category: MaintenanceCategory | null;
  assigned_to: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  reported_date: string;
  resolved_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MaintenanceTicketFormInput = {
  property_id: string;
  tenant_id?: string;
  title: string;
  description?: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  category?: MaintenanceCategory;
  assigned_to?: string;
  estimated_cost?: number;
  actual_cost?: number;
  reported_date: string;
  resolved_date?: string;
  notes?: string;
};

export type MaintenanceTicketWithProperty = MaintenanceTicket & {
  property_name: string;
};

export type RentPaymentStatus =
  | "pending"
  | "paid"
  | "late"
  | "partial"
  | "missed";

export type RentPayment = {
  id: string;
  user_id: string;
  property_id: string;
  tenant_id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: RentPaymentStatus;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
};

export type RentPaymentFormInput = {
  property_id: string;
  tenant_id: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  status: RentPaymentStatus;
  payment_method?: string;
  notes?: string;
};

export type RentPaymentWithDetails = RentPayment & {
  tenant_name: string;
  property_name?: string;
};

export type CertificateType =
  | "gas_safety"
  | "epc"
  | "eicr"
  | "fire_alarm"
  | "pat_testing"
  | "other";

export type PropertyCertificate = {
  id: string;
  user_id: string;
  property_id: string;
  certificate_type: CertificateType;
  issue_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PropertyCertificateFormInput = {
  property_id: string;
  certificate_type: CertificateType;
  issue_date?: string;
  expiry_date?: string;
  notes?: string;
};

export type CertificateAlertType = "90_days" | "30_days" | "7_days" | "expired";

export type CertificateAlertLog = {
  id: string;
  user_id: string;
  property_id: string;
  certificate_id: string;
  alert_type: CertificateAlertType;
  sent_at: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
};

export type PropertyCertificateWithAlerts = PropertyCertificate & {
  alerts: CertificateAlertLog[];
};

export type PropertyDocumentType =
  | "lease"
  | "certificate"
  | "inspection"
  | "correspondence"
  | "other";

export type PropertyDocument = {
  id: string;
  user_id: string;
  property_id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  document_type: PropertyDocumentType | null;
  created_at: string;
};

export type PropertyInsightType = "weekly_digest" | "monthly_digest" | "inline";

export type PropertyInsightContent = {
  portfolio_health: string;
  wins: string[];
  attention: string[];
  financial_snapshot: string;
  winstons_insight: string;
  maintenance_summary: string;
};

export type PropertyInsight = {
  id: string;
  user_id: string;
  insight_type: PropertyInsightType;
  content: PropertyInsightContent;
  generated_at: string;
  period_start: string | null;
  period_end: string | null;
};
