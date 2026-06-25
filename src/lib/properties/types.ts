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
  rentDueThisMonth: number;
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
  portal_enabled: boolean;
  portal_user_id: string | null;
  portal_invited_at: string | null;
  portal_invite_token: string | null;
  portal_theme: "light" | "dark";
  rent_due_day: number | null;
  rent_reminder_days: number;
  rent_reminder_enabled: boolean;
  last_seen_at: string | null;
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
  rent_due_day?: number | null;
  rent_reminder_days?: number;
  rent_reminder_enabled?: boolean;
};

export type RentDueFlag = {
  tenant_id: string;
  tenant_name: string;
  property_id: string;
  property_address: string;
  amount: number;
  due_date: string;
  days_overdue: number;
  payment_id: string | null;
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
  reported_by_tenant: boolean;
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

export type CertificateAlertType =
  | "90_days"
  | "30_days"
  | "7_days"
  | "expired"
  | "7_days_overdue"
  | "30_days_overdue";

export type MortgageType = "repayment" | "interest_only";

export type PropertyMortgage = {
  id: string;
  user_id: string;
  property_id: string;
  lender: string;
  account_reference: string | null;
  monthly_payment: number;
  interest_rate: number | null;
  mortgage_type: MortgageType;
  fixed_rate_end_date: string | null;
  mortgage_end_date: string | null;
  outstanding_balance: number | null;
  notes: string | null;
  alerts_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type PropertyMortgageFormInput = {
  property_id: string;
  lender: string;
  account_reference?: string;
  monthly_payment: number;
  interest_rate?: number;
  mortgage_type: MortgageType;
  fixed_rate_end_date?: string;
  mortgage_end_date?: string;
  outstanding_balance?: number;
  notes?: string;
  alerts_enabled: boolean;
};

export type MortgageAlertType = "180_days" | "90_days" | "30_days" | "7_days";

export type InsuranceType =
  | "buildings"
  | "contents"
  | "landlord_liability"
  | "combined"
  | "other";

export type PropertyInsurance = {
  id: string;
  user_id: string;
  property_id: string;
  insurer: string;
  policy_number: string | null;
  insurance_type: InsuranceType;
  annual_premium: number | null;
  renewal_date: string | null;
  start_date: string | null;
  notes: string | null;
  alerts_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type PropertyInsuranceFormInput = {
  property_id: string;
  insurer: string;
  policy_number?: string;
  insurance_type: InsuranceType;
  annual_premium?: number;
  renewal_date?: string;
  start_date?: string;
  notes?: string;
  alerts_enabled: boolean;
};

export type InsuranceAlertType = "90_days" | "30_days" | "7_days";

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
  certificate_id: string | null;
  certificate_type: CertificateType | null;
  certificate_expiry: string | null;
  shared_with_tenant: boolean;
  created_at: string;
};

export type TenantMessageSenderType = "landlord" | "tenant";

export type TenantMessage = {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_user_id: string;
  sender_type: TenantMessageSenderType;
  sender_id: string;
  message: string;
  read: boolean;
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

export type ValuationConfidence = "high" | "medium" | "low";
export type SearchLevel = "postcode" | "town";
export type ComparableType = "rental" | "sale";

export type PropertyComparable = {
  id: string;
  user_id: string;
  property_id: string;
  address: string;
  comparable_type: ComparableType;
  price: number;
  date: string | null;
  source: string | null;
  bedrooms: number | null;
  property_type: string | null;
  notes: string | null;
  created_at: string;
};

export type PropertyComparableFormInput = {
  property_id: string;
  address: string;
  comparable_type: ComparableType;
  price: number;
  date?: string;
  source?: string;
  bedrooms?: number;
  property_type?: string;
  notes?: string;
};

export type ValuationWebSource = {
  title: string;
  url: string;
  snippet: string;
};

export type PropertyValuation = {
  id: string;
  user_id: string;
  property_id: string;
  rental_min: number | null;
  rental_max: number | null;
  sale_min: number | null;
  sale_max: number | null;
  confidence: ValuationConfidence;
  search_level: SearchLevel;
  reasoning: string;
  web_sources: ValuationWebSource[] | null;
  manual_comparables: PropertyComparable[] | null;
  generated_at: string;
  next_available_at: string;
};

export type FinancialSummary = {
  property_id: string;
  period: "monthly" | "annual";
  rental_income: number;
  expected_income: number;
  vacancy_loss: number;
  mortgage_cost: number;
  insurance_cost: number;
  maintenance_cost: number;
  total_costs: number;
  net_income: number;
  gross_yield: number | null;
  net_yield: number | null;
  roi: number | null;
  monthly_breakdown: Array<{
    month: string;
    income: number;
    costs: number;
    net: number;
  }>;
};

export type PortfolioFinancialOverview = {
  totalNetIncomeMonthly: number;
  totalNetIncomeAnnual: number;
  bestPerforming: {
    propertyId: string;
    propertyName: string;
    netYield: number;
  } | null;
  negativeNetIncomeProperties: Array<{
    propertyId: string;
    propertyName: string;
    netIncome: number;
  }>;
};

export type ConversationSummary = {
  tenant_id: string;
  tenant_name: string;
  property_id: string;
  property_name: string;
  latest_message: string;
  latest_message_at: string;
  unread_count: number;
  other_party_last_seen_at: string | null;
};

export type Contractor = {
  id: string;
  user_id: string;
  name: string;
  trade: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ContractorFormInput = {
  name: string;
  trade?: string;
  email?: string;
  phone?: string;
  notes?: string;
};

export type JobSheetStatus =
  | "sent"
  | "viewed"
  | "in_progress"
  | "completed"
  | "cancelled";

export type JobSheet = {
  id: string;
  user_id: string;
  property_id: string;
  ticket_id: string;
  contractor_id: string | null;
  token: string;
  status: JobSheetStatus;
  contractor_notes: string | null;
  planned_visit_date: string | null;
  created_at: string;
  updated_at: string;
};

export type JobSheetUpdate = {
  id: string;
  job_sheet_id: string;
  author: string;
  content: string;
  created_at: string;
};

export type ContractorAccessRequestStatus = "pending" | "approved" | "declined";

export type ContractorAccessRequest = {
  id: string;
  job_sheet_id: string;
  property_id: string;
  tenant_id: string;
  requested_date: string;
  requested_time: string | null;
  notes: string | null;
  status: ContractorAccessRequestStatus;
  tenant_response_at: string | null;
  created_at: string;
};

export type JobSheetWithDetails = JobSheet & {
  contractors: Contractor | null;
  maintenance_tickets: {
    title: string;
    description: string;
    priority: string;
    category: string;
    status: string;
  } | null;
  properties: {
    name: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    postcode: string;
  } | null;
  job_sheet_updates: JobSheetUpdate[];
  contractor_access_requests: ContractorAccessRequest[];
};

export type ContractorAccessRequestWithDetails = ContractorAccessRequest & {
  job_sheets: {
    contractors: { name: string } | null;
    maintenance_tickets: { title: string } | null;
  } | null;
};
