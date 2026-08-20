import { ACTIVE_PIPELINE_STATUSES } from "@/lib/leads/constants";
import type { Lead } from "@/lib/leads/types";
import type { MorningBriefingContent } from "@/lib/morning/briefing-generator";
import type { FocusSignal } from "@/lib/overview/focus-signals";
import {
  buildDigestFocusSignals,
  buildPropertiesFocusSignals,
  buildResearchFocusSignals,
  buildSnapshotFocusSignals,
  buildStalledLeadFocusSignals,
  sortFocusSignals,
} from "@/lib/overview/focus-signals";
import type {
  MaintenanceTicketWithJobSheet,
  PropertyCertificate,
  RentDueFlag,
} from "@/lib/properties/types";
import { loadResearchFocusSignals } from "@/lib/research/data";
import { createAdminClient } from "@/lib/supabase/admin";

type OverviewTaskRow = {
  id: string;
  title: string;
  due_date: string | null;
  completed: boolean;
  projects?: { project_name: string } | { project_name: string }[] | null;
};

type OverviewProjectRow = {
  id: string;
  project_name: string;
  client_name: string | null;
  status: string | null;
  next_action: string | null;
};

type OverviewGoalRow = {
  id: string;
  title: string;
  deadline: string | null;
  status: string | null;
  current: number | null;
};

type OverviewLeadRow = {
  id: string;
  name: string;
  status: string;
  contacted_at: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
  value: number | null;
  value_type?: string | null;
  user_id: string;
  email: string | null;
  phone: string | null;
  source: string;
  service_interest: string;
  notes: string | null;
};

function getCurrentMonthBounds(now = new Date()) {
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDay = now.getDate();

  return {
    todayYear,
    todayMonth,
    todayDay,
    monthStart: `${todayYear}-${String(todayMonth + 1).padStart(2, "0")}-01`,
    monthEnd: `${todayYear}-${String(todayMonth + 2).padStart(2, "0")}-00`,
  };
}

function formatPropertyAddress(property: {
  address_line1: string;
  address_line2: string | null;
  city: string;
  postcode: string;
}) {
  return [
    property.address_line1,
    property.address_line2,
    property.city,
    property.postcode,
  ]
    .filter(Boolean)
    .join(", ");
}

async function getAdminRentDueFlags(userId: string): Promise<RentDueFlag[]> {
  const admin = createAdminClient();
  const { monthStart, monthEnd, todayDay, todayYear, todayMonth } =
    getCurrentMonthBounds();

  const { data: tenants, error } = await admin
    .from("tenants")
    .select(
      "id, first_name, last_name, property_id, rent_amount, rent_due_day, properties(address_line1, address_line2, city, postcode)"
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .not("rent_due_day", "is", null);

  if (error) {
    console.error("[focus] getAdminRentDueFlags tenants:", error);
    return [];
  }

  const tenantIds = (tenants ?? []).map((tenant) => tenant.id as string);
  if (tenantIds.length === 0) return [];

  const { data: payments, error: paymentsError } = await admin
    .from("rent_payments")
    .select("id, tenant_id, status, due_date")
    .eq("user_id", userId)
    .in("tenant_id", tenantIds)
    .gte("due_date", monthStart)
    .lte("due_date", monthEnd);

  if (paymentsError) {
    console.error("[focus] getAdminRentDueFlags payments:", paymentsError);
    return [];
  }

  const paymentByTenant = new Map<string, { id: string; status: string }>();
  for (const payment of payments ?? []) {
    paymentByTenant.set(payment.tenant_id as string, {
      id: payment.id as string,
      status: payment.status as string,
    });
  }

  const flags: RentDueFlag[] = [];
  for (const row of tenants ?? []) {
    const rentDueDay = row.rent_due_day as number;
    if (todayDay < rentDueDay - 1) continue;

    const payment = paymentByTenant.get(row.id as string);
    if (payment?.status === "paid") continue;
    if (
      payment &&
      payment.status !== "pending" &&
      payment.status !== "late" &&
      payment.status !== "partial" &&
      payment.status !== "missed"
    ) {
      continue;
    }

    const dueDate = `${todayYear}-${String(todayMonth + 1).padStart(2, "0")}-${String(rentDueDay).padStart(2, "0")}`;
    const dueDateObj = new Date(todayYear, todayMonth, rentDueDay);
    const todayObj = new Date(todayYear, todayMonth, todayDay);
    const daysOverdue = Math.floor(
      (todayObj.getTime() - dueDateObj.getTime()) / 86_400_000
    );

    const propertyRaw = row.properties as
      | {
          address_line1: string;
          address_line2: string | null;
          city: string;
          postcode: string;
        }
      | {
          address_line1: string;
          address_line2: string | null;
          city: string;
          postcode: string;
        }[]
      | null;
    const property = Array.isArray(propertyRaw) ? propertyRaw[0] : propertyRaw;

    flags.push({
      tenant_id: row.id as string,
      tenant_name: `${row.first_name} ${row.last_name}`.trim(),
      property_id: row.property_id as string,
      property_address: property ? formatPropertyAddress(property) : "Unknown",
      amount: row.rent_amount as number,
      due_date: dueDate,
      days_overdue: daysOverdue,
      payment_id: payment?.id ?? null,
    });
  }

  return flags.sort((a, b) => b.days_overdue - a.days_overdue);
}

export async function buildCachedFocusSignals(input: {
  userId: string;
  hasProperties: boolean;
  hasResearch: boolean;
  morningBriefing: MorningBriefingContent | null;
}): Promise<FocusSignal[]> {
  const { userId, hasProperties, hasResearch, morningBriefing } = input;
  const admin = createAdminClient();
  const todayISO = new Date().toISOString().slice(0, 10);
  const certificatesCutoff = new Date();
  certificatesCutoff.setDate(certificatesCutoff.getDate() + 90);

  const [
    tasksRes,
    projectsRes,
    goalsRes,
    leadsRes,
    certsRes,
    maintenanceRes,
    rentFlags,
    researchSignals,
  ] =
    await Promise.all([
      admin
        .from("tasks")
        .select("id, title, due_date, completed, projects(project_name)")
        .eq("user_id", userId)
        .order("completed", { ascending: true })
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false }),
      admin
        .from("projects")
        .select("id, project_name, client_name, status, next_action")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      admin
        .from("goals")
        .select("id, title, deadline, status, current, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      admin
        .from("leads")
        .select(
          "id, user_id, name, email, phone, source, service_interest, status, value, value_type, notes, contacted_at, follow_up_date, created_at, updated_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      hasProperties
        ? admin
            .from("property_certificates")
            .select("id, user_id, property_id, certificate_type, issue_date, expiry_date, notes, created_at, updated_at, properties(name)")
            .eq("user_id", userId)
            .lte("expiry_date", certificatesCutoff.toISOString().slice(0, 10))
            .gte("expiry_date", todayISO)
            .order("expiry_date", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      hasProperties
        ? admin
            .from("maintenance_tickets")
            .select("*, properties(name), job_sheets(id, token, status, planned_visit_date, contractors(name), job_sheet_updates(content, created_at))")
            .eq("user_id", userId)
            .in("status", ["new", "in_progress"])
        : Promise.resolve({ data: [], error: null }),
      hasProperties ? getAdminRentDueFlags(userId) : Promise.resolve([]),
      hasResearch ? loadResearchFocusSignals(admin, userId) : Promise.resolve([]),
    ]);

  if (tasksRes.error) throw new Error(`Could not load Focus tasks: ${tasksRes.error.message}`);
  if (projectsRes.error) {
    throw new Error(`Could not load Focus projects: ${projectsRes.error.message}`);
  }
  if (goalsRes.error) throw new Error(`Could not load Focus goals: ${goalsRes.error.message}`);
  if (leadsRes.error) throw new Error(`Could not load Focus leads: ${leadsRes.error.message}`);
  if (certsRes.error) {
    throw new Error(
      `Could not load Focus certificates: ${certsRes.error.message}`
    );
  }
  if (maintenanceRes.error) {
    throw new Error(
      `Could not load Focus maintenance: ${maintenanceRes.error.message}`
    );
  }

  const tasks = ((tasksRes.data ?? []) as OverviewTaskRow[]).map((task) => ({
    ...task,
    projects: Array.isArray(task.projects) ? task.projects[0] ?? null : task.projects,
    project_name: Array.isArray(task.projects)
      ? (task.projects[0]?.project_name ?? null)
      : (task.projects?.project_name ?? null),
  }));

  const snapshot = {
    overdueTasks: tasks.filter((task) => !task.completed && !!task.due_date && task.due_date < todayISO),
    projectsMissingNextAction: ((projectsRes.data ?? []) as OverviewProjectRow[]).filter(
      (project) => (project.status ?? "active") === "active" && !project.next_action?.trim()
    ),
    goalsAtZeroWithDeadline: ((goalsRes.data ?? []) as OverviewGoalRow[]).filter(
      (goal) => (goal.status ?? "active") === "active" && !!goal.deadline && (goal.current ?? 0) === 0
    ),
    tasksDueThisWeekGrouped: [],
    projectDeadlinesThisWeek: [],
    contentDueThisWeekGrouped: [],
    recentIdeas: [],
    recentProjects: [],
    recentLeads: [],
    projectTaskStats: {},
  };

  const leads = ((leadsRes.data ?? []) as OverviewLeadRow[])
    .filter((lead) => ACTIVE_PIPELINE_STATUSES.includes(lead.status as never))
    .map(
      (lead) =>
        ({
          ...lead,
          value_type:
            lead.value_type === "monthly" || lead.value_type === "one_time"
              ? lead.value_type
              : undefined,
        }) satisfies Lead
    );

  return sortFocusSignals([
    ...buildSnapshotFocusSignals(snapshot),
    ...buildStalledLeadFocusSignals(leads),
    ...(hasProperties
      ? buildPropertiesFocusSignals(
          (certsRes.data ?? []) as PropertyCertificate[],
          (maintenanceRes.data ?? []) as MaintenanceTicketWithJobSheet[],
          rentFlags
        )
      : []),
    ...buildDigestFocusSignals(morningBriefing),
    ...buildResearchFocusSignals(researchSignals),
  ]);
}
