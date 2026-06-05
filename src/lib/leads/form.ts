import type { Lead, LeadFormInput, LeadStatus } from "@/lib/leads/types";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/lib/leads/types";

export const EMPTY_LEAD_FORM: LeadFormInput = {
  name: "",
  email: "",
  phone: "",
  source: "Website",
  service_interest: "",
  status: "new",
  value: "",
  notes: "",
};

export function leadToFormInput(lead: Lead): LeadFormInput {
  return {
    name: lead.name,
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    source: isLeadSourceValue(lead.source) ? lead.source : "Other",
    service_interest: lead.service_interest,
    status: isLeadStatus(lead.status) ? lead.status : "new",
    value: lead.value != null ? String(lead.value) : "",
    notes: lead.notes ?? "",
  };
}

function isLeadStatus(status: string): status is LeadStatus {
  return LEAD_STATUSES.includes(status as LeadStatus);
}

function isLeadSourceValue(source: string): source is (typeof LEAD_SOURCES)[number] {
  return LEAD_SOURCES.includes(source as (typeof LEAD_SOURCES)[number]);
}
