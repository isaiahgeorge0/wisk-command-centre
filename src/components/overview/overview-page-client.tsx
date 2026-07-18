"use client";

import { AnimatePresence } from "framer-motion";
import {
  Building2,
  CheckSquare,
  FileText,
  FolderOpen,
  Lightbulb,
  Mail,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { PageTransition } from "@/components/layout/page-transition";
import { useNavMode } from "@/components/layout/nav-mode-context";
import { MorningBriefing } from "@/components/overview/morning-briefing";
import { MorningBriefingModal } from "@/components/overview/morning-briefing-modal";
import { OverviewHeader } from "@/components/overview/overview-header";
import {
  OverviewViewToggle,
  type OverviewView,
} from "@/components/overview/overview-view-toggle";
import { PropertiesOverviewSummary } from "@/components/overview/properties-overview-summary";
import { SectionCard } from "@/components/overview/section-card";
import type { SectionCardItem } from "@/components/overview/section-card";
import { SectionCardModal } from "@/components/overview/section-card-modal";
import { WhileYouWereAway } from "@/components/overview/while-you-were-away";
import type { AwaySummary } from "@/lib/away/build-away-summary";
import type { Goal } from "@/lib/goals/types";
import type { Idea } from "@/lib/ideas/types";
import type { Lead } from "@/lib/leads/types";
import type { MorningBriefingContent } from "@/lib/morning/briefing-generator";
import type { OverviewSnapshot } from "@/lib/overview/selectors";
import type { Project } from "@/lib/projects/types";
import type {
  ContractorAccessRequestWithDetails,
  MaintenanceTicketWithJobSheet,
  PortfolioStats,
  PropertyCertificate,
  PropertyInsuranceWithProperty,
  PropertyMortgageWithProperty,
  RentDueFlag,
} from "@/lib/properties/types";
import type { SmartSuggestion } from "@/lib/suggestions/types";
import { cn } from "@/lib/utils";

const SECTION_COLOURS_DARK = {
  projects: "#aca0ff",
  tasks: "#2dd4bf",
  goals: "#baf7e1",
  ideas: "#fea9e0",
  leads: "#ff5d00",
  content: "#0066ff",
  email: "#818cf8",
  properties: "#e8001d",
  calendar: "#00c4b4",
  winston: "#8b00ff",
} as const;

const SECTION_COLOURS_LIGHT = {
  projects: "#4a3db0",
  tasks: "#016c81",
  goals: "#085041",
  ideas: "#c4207e",
  leads: "#cc3d00",
  content: "#0044cc",
  email: "#3730a3",
  properties: "#e8001d",
  calendar: "#007a70",
  winston: "#6200b3",
} as const;

const SUGGESTION_DOT_CLASSES: Record<string, string> = {
  "text-indigo-400": "bg-indigo-400",
  "text-wisk-coral": "bg-wisk-coral",
  "text-purple-400": "bg-purple-400",
  "text-wisk-teal": "bg-wisk-teal",
  "text-blue-400": "bg-blue-400",
};

const PRIORITY_COLOURS: Record<string, string> = {
  high: "#e8001d",
  medium: "#ff5d00",
  low: "#aca0ff",
};

const LEAD_STATUS_COLOURS: Record<string, string> = {
  new: "#aca0ff",
  contacted: "#2dd4bf",
  qualified: "#0066ff",
  proposal_sent: "#ff5d00",
  won: "#baf7e1",
  lost: "#e8001d",
};

const CONTENT_STATUS_COLOURS: Record<string, string> = {
  published: "#baf7e1",
  scheduled: "#0066ff",
  idea: "#aca0ff",
  planned: "#aca0ff",
  in_progress: "#ff5d00",
};

function goalProgressColour(pct: number): string {
  if (pct >= 75) return "#baf7e1";
  if (pct >= 40) return "#ff5d00";
  return "#e8001d";
}

type EmailIntegration = {
  id: string;
  provider: string;
  label: string | null;
};

type OverviewPageClientProps = {
  snapshot: OverviewSnapshot;
  suggestions: SmartSuggestion[];
  canAccessWhileAway: boolean;
  morningBriefing: MorningBriefingContent | null;
  awaySummary: AwaySummary | null;
  lastSyncedAt: string | null;
  lastActiveAt: string | null;
  projects: Project[];
  goals: Goal[];
  ideas: Idea[];
  leads: Lead[];
  hasProperties: boolean;
  portfolioStats: PortfolioStats | null;
  rentDueFlags: RentDueFlag[];
  openMaintenanceTickets: MaintenanceTicketWithJobSheet[];
  unreadMessageCount: number;
  expiringCertificates: PropertyCertificate[];
  pendingAccessRequests: ContractorAccessRequestWithDetails[];
  mortgages: PropertyMortgageWithProperty[];
  insurance: PropertyInsuranceWithProperty[];
  emailIntegrations: EmailIntegration[];
};

export function OverviewPageClient({
  snapshot,
  suggestions,
  canAccessWhileAway,
  morningBriefing,
  awaySummary,
  lastSyncedAt,
  lastActiveAt,
  projects,
  goals,
  ideas,
  leads,
  hasProperties,
  portfolioStats,
  rentDueFlags,
  openMaintenanceTickets,
  unreadMessageCount,
  expiringCertificates,
  pendingAccessRequests,
  mortgages,
  insurance,
  emailIntegrations,
}: OverviewPageClientProps) {
  const { resolvedTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);
  useEffect(() => {
    setThemeReady(true);
  }, []);
  const isDark = themeReady && resolvedTheme === "dark";
  const SECTION_COLOURS = isDark
    ? SECTION_COLOURS_DARK
    : SECTION_COLOURS_LIGHT;
  const [view, setView] = useState<OverviewView>("overview");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const { setNavMode } = useNavMode();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    if (!hasProperties) {
      setNavMode("standard");
      return;
    }
    setNavMode(view === "properties" ? "properties" : "standard");
  }, [hasProperties, setNavMode, view]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpandedCard(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = expandedCard ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [expandedCard]);

  const projectItems = snapshot.recentProjects.slice(0, 3).map((project) => {
    const taskStats = snapshot.projectTaskStats[project.id];
    const pct =
      taskStats && taskStats.total > 0
        ? Math.round((taskStats.completed / taskStats.total) * 100)
        : null;
    return {
      label: project.project_name,
      sub:
        taskStats && taskStats.total > 0
          ? `${taskStats.completed}/${taskStats.total} tasks`
          : undefined,
      subColour:
        pct !== null
          ? pct === 100
            ? "#baf7e1"
            : pct >= 50
              ? "#aca0ff"
              : undefined
          : undefined,
      href: `/projects?project=${project.id}`,
    };
  });
  const expandedProjectItems = projects.slice(0, 10).map((project) => {
    const taskStats = snapshot.projectTaskStats[project.id];
    const pct =
      taskStats && taskStats.total > 0
        ? Math.round((taskStats.completed / taskStats.total) * 100)
        : null;
    return {
      label: project.project_name,
      sub:
        taskStats && taskStats.total > 0
          ? `${taskStats.completed}/${taskStats.total} tasks`
          : undefined,
      subColour:
        pct !== null
          ? pct === 100
            ? "#baf7e1"
            : pct >= 50
              ? "#aca0ff"
              : undefined
          : undefined,
      href: `/projects?project=${project.id}`,
    };
  });

  const taskItems = snapshot.overdueTasks.slice(0, 3).map((task) => ({
    label: task.title,
    sub: task.due_date ? `Due ${task.due_date}` : undefined,
    subColour: task.priority
      ? PRIORITY_COLOURS[task.priority] ?? "#e8001d"
      : "#e8001d",
    href: "/tasks",
  }));
  const expandedTaskItems = snapshot.overdueTasks.slice(0, 10).map((task) => ({
    label: task.title,
    sub: task.due_date
      ? `${task.priority ? `${task.priority} · ` : ""}Due ${task.due_date}`
      : (task.priority ?? undefined),
    subColour: task.priority
      ? PRIORITY_COLOURS[task.priority] ?? "#e8001d"
      : "#e8001d",
    href: "/tasks",
  }));

  const activeGoals = goals.filter(
    (goal) => (goal.status ?? "active") === "active"
  );

  const goalItems = activeGoals.slice(0, 3).map((goal) => {
    const pct =
      goal.target && goal.target > 0
        ? Math.round((goal.current / goal.target) * 100)
        : null;
    return {
      label: goal.title,
      sub: pct !== null ? `${pct}%` : (goal.deadline ?? undefined),
      subColour: pct !== null ? goalProgressColour(pct) : undefined,
      href: "/goals",
    };
  });
  const expandedGoalItems = activeGoals.slice(0, 10).map((goal) => {
    const pct =
      goal.target && goal.target > 0
        ? Math.round((goal.current / goal.target) * 100)
        : null;
    return {
      label: goal.title,
      sub:
        pct !== null
          ? `${pct}% · ${goal.current}/${goal.target}${
              goal.deadline ? ` · Due ${goal.deadline}` : ""
            }`
          : (goal.deadline ?? undefined),
      subColour: pct !== null ? goalProgressColour(pct) : undefined,
      href: "/goals",
    };
  });

  const leadItems = snapshot.recentLeads.slice(0, 3).map((lead) => ({
    label: lead.name,
    sub: lead.value
      ? `£${Number(lead.value).toLocaleString("en-GB")} · ${lead.status}`
      : (lead.status ?? undefined),
    subColour: lead.status
      ? LEAD_STATUS_COLOURS[lead.status]
      : undefined,
    href: "/leads",
  }));
  const expandedLeadItems = leads.slice(0, 10).map((lead) => ({
    label: lead.name,
    sub:
      [lead.status, lead.value ? `£${Number(lead.value).toLocaleString("en-GB")}` : null]
        .filter(Boolean)
        .join(" · ") || undefined,
    subColour: lead.status
      ? LEAD_STATUS_COLOURS[lead.status]
      : undefined,
    href: "/leads",
  }));

  const ideaItems = snapshot.recentIdeas.slice(0, 3).map((idea) => ({
    label:
      idea.title ||
      idea.description?.slice(0, 50) ||
      "Untitled",
    sub: idea.category ?? undefined,
    subColour: idea.category ? "#fea9e0" : undefined,
    href: "/ideas",
  }));
  const expandedIdeaItems = ideas.slice(0, 10).map((idea) => ({
    label:
      idea.title ||
      idea.description?.slice(0, 50) ||
      "Untitled",
    sub: idea.category ?? undefined,
    subColour: idea.category ? "#fea9e0" : undefined,
    href: "/ideas",
  }));

  const expandedContentItems = snapshot.contentDueThisWeekGrouped.flatMap(
    (group) =>
      group.posts.map((post) => ({
        label: post.title || "Untitled post",
        sub: post.status
          ? `${post.status} · ${group.date}`
          : group.date,
        subColour: post.status
          ? CONTENT_STATUS_COLOURS[post.status]
          : undefined,
        href: "/content",
      }))
  );
  const contentItems = snapshot.contentDueThisWeekGrouped
    .flatMap((group) =>
      group.posts.slice(0, 2).map((post) => ({
        label: post.title || "Untitled post",
        sub: post.status
          ? `${post.status} · ${group.date}`
          : group.date,
        subColour: post.status
          ? CONTENT_STATUS_COLOURS[post.status]
          : undefined,
        href: "/content",
      }))
    )
    .slice(0, 3);

  const propertiesItems = [
    portfolioStats
      ? {
          label: `£${portfolioStats.totalMonthlyRent.toLocaleString("en-GB")}/mo expected`,
          sub: `${portfolioStats.occupiedCount}/${portfolioStats.totalProperties} occupied`,
          subColour:
            portfolioStats.occupiedCount === portfolioStats.totalProperties
              ? "#baf7e1"
              : "#ff5d00",
          href: "/properties/finances",
        }
      : null,
    rentDueFlags.length > 0
      ? {
          label: `${rentDueFlags.length} rent payment${rentDueFlags.length > 1 ? "s" : ""} due`,
          sub: "Action needed",
          subColour: "#ff5d00",
          href: "/properties/finances",
        }
      : null,
    openMaintenanceTickets.length > 0
      ? {
          label: `${openMaintenanceTickets.length} open maintenance`,
          sub: openMaintenanceTickets.some(
            (ticket) => ticket.priority === "emergency"
          )
            ? "Emergency"
            : "In progress",
          subColour: openMaintenanceTickets.some(
            (ticket) => ticket.priority === "emergency"
          )
            ? "#e8001d"
            : "#ff5d00",
          href: "/properties/maintenance",
        }
      : null,
  ].filter(Boolean) as SectionCardItem[];

  const expandedPropertiesItems: SectionCardItem[] = [
    ...propertiesItems,
    ...rentDueFlags.slice(0, 5).map((flag) => ({
      label: flag.tenant_name || "Tenant",
      sub: `£${flag.amount.toLocaleString("en-GB")} due`,
      subColour: "#ff5d00",
      href: "/properties/finances",
    })),
  ];

  const emailItems = emailIntegrations.map((integration) => ({
    label: integration.label ?? integration.provider,
    sub: integration.provider === "gmail" ? "Gmail" : "Outlook",
    href: "/email",
  }));

  const taskAlert =
    snapshot.overdueTasks.length > 0
      ? { label: "overdue", count: snapshot.overdueTasks.length }
      : null;
  const notStartedGoals = activeGoals.filter(
    (goal) => goal.target && goal.current === 0 && goal.deadline
  );
  const goalAlert =
    notStartedGoals.length > 0
      ? { label: "not started", count: notStartedGoals.length }
      : null;
  const emergencyMaintenanceCount = openMaintenanceTickets.filter(
    (ticket) => ticket.priority === "emergency"
  ).length;
  const propertiesAlert =
    emergencyMaintenanceCount > 0
      ? { label: "emergency", count: emergencyMaintenanceCount }
      : null;

  const closeExpandedCard = () => setExpandedCard(null);

  const expandedModal =
    expandedCard === "morning" && morningBriefing ? (
      <MorningBriefingModal
        cardId="morning"
        briefing={morningBriefing}
        onClose={closeExpandedCard}
      />
    ) : expandedCard === "projects" ? (
      <SectionCardModal
        cardId="projects"
        title="Projects"
        href="/projects"
        accent={SECTION_COLOURS.projects}
        icon={
          <FolderOpen size={20} style={{ color: SECTION_COLOURS.projects }} />
        }
        stat={{ label: "active", value: snapshot.stats.activeProjects }}
        alert={null}
        items={projectItems}
        expandedItems={expandedProjectItems}
        emptyMessage="No active projects yet."
        cta="View projects"
        onClose={closeExpandedCard}
      />
    ) : expandedCard === "tasks" ? (
      <SectionCardModal
        cardId="tasks"
        title="Tasks"
        href="/tasks"
        accent={SECTION_COLOURS.tasks}
        icon={<CheckSquare size={20} style={{ color: SECTION_COLOURS.tasks }} />}
        stat={{
          label: "due or overdue",
          value: snapshot.stats.tasksDueTodayOrOverdue,
        }}
        alert={taskAlert}
        items={taskItems}
        expandedItems={expandedTaskItems}
        emptyMessage="No tasks due. You're on top of it."
        cta="View tasks"
        onClose={closeExpandedCard}
      />
    ) : expandedCard === "goals" ? (
      <SectionCardModal
        cardId="goals"
        title="Goals"
        href="/goals"
        accent={SECTION_COLOURS.goals}
        icon={<Target size={20} style={{ color: SECTION_COLOURS.goals }} />}
        stat={{ label: "in progress", value: snapshot.stats.activeGoals }}
        alert={goalAlert}
        items={goalItems}
        expandedItems={expandedGoalItems}
        emptyMessage="No goals set yet."
        cta="View goals"
        onClose={closeExpandedCard}
      />
    ) : expandedCard === "leads" ? (
      <SectionCardModal
        cardId="leads"
        title="Leads"
        href="/leads"
        accent={SECTION_COLOURS.leads}
        icon={<Users size={20} style={{ color: SECTION_COLOURS.leads }} />}
        stat={{
          label: "active",
          value: leads.filter(
            (lead) => lead.status !== "won" && lead.status !== "lost"
          ).length,
        }}
        alert={null}
        items={leadItems}
        expandedItems={expandedLeadItems}
        emptyMessage="No leads in your pipeline."
        cta="View leads"
        onClose={closeExpandedCard}
      />
    ) : expandedCard === "ideas" ? (
      <SectionCardModal
        cardId="ideas"
        title="Ideas"
        href="/ideas"
        accent={SECTION_COLOURS.ideas}
        icon={<Lightbulb size={20} style={{ color: SECTION_COLOURS.ideas }} />}
        stat={{ label: "in bank", value: snapshot.stats.ideasCount }}
        alert={null}
        items={ideaItems}
        expandedItems={expandedIdeaItems}
        emptyMessage="No ideas captured yet."
        cta="View ideas"
        onClose={closeExpandedCard}
      />
    ) : expandedCard === "content" ? (
      <SectionCardModal
        cardId="content"
        title="Content"
        href="/content"
        accent={SECTION_COLOURS.content}
        icon={<FileText size={20} style={{ color: SECTION_COLOURS.content }} />}
        stat={{
          label: "published this month",
          value: snapshot.stats.contentPublishedThisMonth,
        }}
        alert={null}
        items={contentItems}
        expandedItems={expandedContentItems}
        emptyMessage="Nothing scheduled this week."
        cta="View content"
        onClose={closeExpandedCard}
      />
    ) : expandedCard === "properties" && hasProperties ? (
      <SectionCardModal
        cardId="properties"
        title="Properties"
        href="/properties/dashboard"
        accent={SECTION_COLOURS.properties}
        icon={
          <Building2 size={20} style={{ color: SECTION_COLOURS.properties }} />
        }
        stat={{
          label: "properties",
          value: portfolioStats?.totalProperties ?? 0,
        }}
        alert={propertiesAlert}
        items={propertiesItems}
        expandedItems={expandedPropertiesItems}
        emptyMessage="Add your first property to get started."
        cta="View properties"
        onClose={closeExpandedCard}
      />
    ) : expandedCard === "email" && emailIntegrations.length > 0 ? (
      <SectionCardModal
        cardId="email"
        title="Email"
        href="/email"
        accent={SECTION_COLOURS.email}
        icon={<Mail size={20} style={{ color: SECTION_COLOURS.email }} />}
        stat={{ label: "connected", value: emailIntegrations.length }}
        alert={null}
        items={emailItems}
        expandedItems={emailItems}
        emptyMessage="No email accounts connected."
        cta="View inbox"
        onClose={closeExpandedCard}
      />
    ) : null;

  const suggestionPills =
    suggestions.length > 0 ? (
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {suggestions.slice(0, 4).map((suggestion) => {
          const className =
            "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground";
          const content = (
            <>
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  SUGGESTION_DOT_CLASSES[suggestion.accentColour] ??
                    "bg-wisk-section-winston"
                )}
              />
              <span className="truncate">{suggestion.title}</span>
            </>
          );

          return suggestion.actionHref ? (
            <Link
              href={suggestion.actionHref}
              key={suggestion.id}
              className={className}
            >
              {content}
            </Link>
          ) : (
            <span key={suggestion.id} className={className}>
              {content}
            </span>
          );
        })}
      </div>
    ) : null;

  return (
    <>
      <PageTransition>
        {hasProperties ? (
          <div className="mb-6">
            <OverviewViewToggle value={view} onChange={setView} />
          </div>
        ) : null}

        {hasProperties && view === "properties" ? (
          <>
            <OverviewHeader header={snapshot.header} />
            <PropertiesOverviewSummary
              stats={portfolioStats!}
              rentDueFlags={rentDueFlags}
              openMaintenanceTickets={openMaintenanceTickets}
              unreadMessageCount={unreadMessageCount}
              expiringCertificates={expiringCertificates}
              pendingAccessRequests={pendingAccessRequests}
              mortgages={mortgages}
              insurance={insurance}
            />
          </>
        ) : (
          <>
            <div className="mb-6 flex items-start justify-between gap-6">
              <div className="min-w-0 flex-1">
                <OverviewHeader header={snapshot.header} />
              </div>

              {canAccessWhileAway ? (
                <div className="hidden w-72 shrink-0 md:block">
                  <MorningBriefing
                    briefing={morningBriefing}
                    canAccess={canAccessWhileAway}
                    cardId="morning"
                    onExpand={() => setExpandedCard("morning")}
                    isExpanded={expandedCard === "morning"}
                  />
                </div>
              ) : null}
            </div>

            {suggestionPills}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <SectionCard
                cardId="projects"
                title="Projects"
                href="/projects"
                accent={SECTION_COLOURS.projects}
                icon={
                  <FolderOpen
                    size={16}
                    style={{ color: SECTION_COLOURS.projects }}
                  />
                }
                stat={{ label: "active", value: snapshot.stats.activeProjects }}
                alert={null}
                items={projectItems}
                expandedItems={expandedProjectItems}
                emptyMessage="No active projects yet."
                cta="View projects"
                onExpand={() => setExpandedCard("projects")}
                isExpanded={expandedCard === "projects"}
              />

              <SectionCard
                cardId="tasks"
                title="Tasks"
                href="/tasks"
                accent={SECTION_COLOURS.tasks}
                icon={
                  <CheckSquare
                    size={16}
                    style={{ color: SECTION_COLOURS.tasks }}
                  />
                }
                stat={{
                  label: "due or overdue",
                  value: snapshot.stats.tasksDueTodayOrOverdue,
                }}
                alert={taskAlert}
                items={taskItems}
                expandedItems={expandedTaskItems}
                emptyMessage="No tasks due. You're on top of it."
                cta="View tasks"
                onExpand={() => setExpandedCard("tasks")}
                isExpanded={expandedCard === "tasks"}
              />

              <SectionCard
                cardId="goals"
                title="Goals"
                href="/goals"
                accent={SECTION_COLOURS.goals}
                icon={
                  <Target size={16} style={{ color: SECTION_COLOURS.goals }} />
                }
                stat={{
                  label: "in progress",
                  value: snapshot.stats.activeGoals,
                }}
                alert={goalAlert}
                items={goalItems}
                expandedItems={expandedGoalItems}
                emptyMessage="No goals set yet."
                cta="View goals"
                onExpand={() => setExpandedCard("goals")}
                isExpanded={expandedCard === "goals"}
              />

              <SectionCard
                cardId="leads"
                title="Leads"
                href="/leads"
                accent={SECTION_COLOURS.leads}
                icon={
                  <Users size={16} style={{ color: SECTION_COLOURS.leads }} />
                }
                stat={{
                  label: "active",
                  value: leads.filter(
                    (lead) => lead.status !== "won" && lead.status !== "lost"
                  ).length,
                }}
                alert={null}
                items={leadItems}
                expandedItems={expandedLeadItems}
                emptyMessage="No leads in your pipeline."
                cta="View leads"
                onExpand={() => setExpandedCard("leads")}
                isExpanded={expandedCard === "leads"}
              />

              <SectionCard
                cardId="ideas"
                title="Ideas"
                href="/ideas"
                accent={SECTION_COLOURS.ideas}
                icon={
                  <Lightbulb
                    size={16}
                    style={{ color: SECTION_COLOURS.ideas }}
                  />
                }
                stat={{ label: "in bank", value: snapshot.stats.ideasCount }}
                alert={null}
                items={ideaItems}
                expandedItems={expandedIdeaItems}
                emptyMessage="No ideas captured yet."
                cta="View ideas"
                onExpand={() => setExpandedCard("ideas")}
                isExpanded={expandedCard === "ideas"}
              />

              <SectionCard
                cardId="content"
                title="Content"
                href="/content"
                accent={SECTION_COLOURS.content}
                icon={
                  <FileText
                    size={16}
                    style={{ color: SECTION_COLOURS.content }}
                  />
                }
                stat={{
                  label: "published this month",
                  value: snapshot.stats.contentPublishedThisMonth,
                }}
                alert={null}
                items={contentItems}
                expandedItems={expandedContentItems}
                emptyMessage="Nothing scheduled this week."
                cta="View content"
                onExpand={() => setExpandedCard("content")}
                isExpanded={expandedCard === "content"}
              />

              {hasProperties ? (
                <SectionCard
                  cardId="properties"
                  title="Properties"
                  href="/properties/dashboard"
                  accent={SECTION_COLOURS.properties}
                  icon={
                    <Building2
                      size={16}
                      style={{ color: SECTION_COLOURS.properties }}
                    />
                  }
                  stat={{
                    label: "properties",
                    value: portfolioStats?.totalProperties ?? 0,
                  }}
                  alert={propertiesAlert}
                  items={propertiesItems}
                  expandedItems={expandedPropertiesItems}
                  emptyMessage="Add your first property to get started."
                  cta="View properties"
                  onExpand={() => setExpandedCard("properties")}
                  isExpanded={expandedCard === "properties"}
                />
              ) : null}

              {emailIntegrations.length > 0 ? (
                <SectionCard
                  cardId="email"
                  title="Email"
                  href="/email"
                  accent={SECTION_COLOURS.email}
                  icon={
                    <Mail size={16} style={{ color: SECTION_COLOURS.email }} />
                  }
                  stat={{
                    label: "connected",
                    value: emailIntegrations.length,
                  }}
                  alert={null}
                  items={emailItems}
                  expandedItems={emailItems}
                  emptyMessage="No email accounts connected."
                  cta="View inbox"
                  onExpand={() => setExpandedCard("email")}
                  isExpanded={expandedCard === "email"}
                />
              ) : null}
            </div>

            {canAccessWhileAway ? (
              <div className="mt-5">
                <WhileYouWereAway
                  summary={awaySummary}
                  lastSyncedAt={lastSyncedAt}
                  lastActiveAt={lastActiveAt}
                  canAccess={canAccessWhileAway}
                />
              </div>
            ) : null}
          </>
        )}
      </PageTransition>
      <AnimatePresence>{expandedModal}</AnimatePresence>
    </>
  );
}
