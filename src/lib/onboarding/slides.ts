import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CheckSquare,
  Clapperboard,
  FolderKanban,
  LayoutDashboard,
  Lightbulb,
  Plug,
  Settings,
  Sparkles,
  Target,
  UserPlus,
} from "lucide-react";

export type OnboardingSlideKind = "welcome" | "feature" | "ready";

export type OnboardingSlide = {
  id: string;
  kind: OnboardingSlideKind;
  headline: string;
  body?: string;
  subline?: string;
  icon?: LucideIcon;
  accentClass?: string;
  iconBgClass?: string;
  primaryCta?: string;
  secondaryCta?: string;
};

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: "welcome",
    kind: "welcome",
    headline: "Welcome to WISK",
    subline: "Your business. Centralised. Let us show you around.",
    primaryCta: "Get started →",
  },
  {
    id: "overview",
    kind: "feature",
    headline: "Your command centre",
    body: "Every time you open WISK you see what matters most. Overdue tasks, upcoming deadlines, recent activity, and a weekly plan every Monday.",
    icon: LayoutDashboard,
    accentClass: "text-wisk-teal",
    iconBgClass: "bg-wisk-teal/15 text-wisk-teal",
  },
  {
    id: "projects",
    kind: "feature",
    headline: "Track every client project",
    body: "Add your client projects with deadlines, next actions, and values. Link tasks and milestones. See Vercel deployment health and GitHub activity right on the project card.",
    icon: FolderKanban,
    accentClass: "text-wisk-purple",
    iconBgClass: "bg-wisk-purple/15 text-wisk-purple",
  },
  {
    id: "tasks",
    kind: "feature",
    headline: "Never miss what needs doing",
    body: "Add tasks linked to projects or standalone. Priority badges, due dates, and a clean checklist keep you on top of your work.",
    icon: CheckSquare,
    accentClass: "text-wisk-teal",
    iconBgClass: "bg-wisk-teal/15 text-wisk-teal",
  },
  {
    id: "goals",
    kind: "feature",
    headline: "Build toward something",
    body: "Set revenue targets, project counts, content output goals and more. Track progress with visual indicators and keep your long-term vision in sight.",
    icon: Target,
    accentClass: "text-wisk-purple",
    iconBgClass: "bg-wisk-purple/15 text-wisk-purple",
  },
  {
    id: "ideas",
    kind: "feature",
    headline: "Capture ideas before they disappear",
    body: "Log content ideas, product concepts, and business observations instantly. Categorise and revisit them when the time is right.",
    icon: Lightbulb,
    accentClass: "text-amber-400",
    iconBgClass: "bg-amber-500/15 text-amber-400",
  },
  {
    id: "calendar",
    kind: "feature",
    headline: "See everything in one timeline",
    body: "Project deadlines, task due dates, goal milestones, and planned content all in one calendar. Filter by type and see what's coming in the next 30, 60, or 90 days.",
    icon: CalendarDays,
    accentClass: "text-wisk-teal",
    iconBgClass: "bg-wisk-teal/15 text-wisk-teal",
  },
  {
    id: "leads",
    kind: "feature",
    headline: "Manage your pipeline",
    body: "Capture inbound enquiries from content and referrals. Move leads through your pipeline from New to Won. Track conversion rate and pipeline value.",
    icon: UserPlus,
    accentClass: "text-wisk-coral",
    iconBgClass: "bg-wisk-coral/15 text-wisk-coral",
  },
  {
    id: "content",
    kind: "feature",
    headline: "Plan and track your content",
    body: "Schedule content across TikTok, Instagram, YouTube, LinkedIn and more. Track your publishing streak and link posts to your content goals.",
    icon: Clapperboard,
    accentClass: "text-wisk-purple",
    iconBgClass: "bg-wisk-purple/15 text-wisk-purple",
  },
  {
    id: "ready",
    kind: "ready",
    headline: "You're all set",
    subline: "Start by adding your first project or task. Everything else will follow.",
    icon: Sparkles,
    accentClass: "text-emerald-400",
    iconBgClass: "bg-emerald-500/15 text-emerald-400",
    primaryCta: "Let's go →",
    secondaryCta: "Explore on your own",
  },
];

export type FeatureReferenceSection = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  iconBgClass: string;
};

export const FEATURE_REFERENCE_SECTIONS: FeatureReferenceSection[] = [
  {
    id: "overview",
    name: "Overview",
    description:
      "Your daily command centre. See overdue tasks, upcoming deadlines, content due this week, and recent activity at a glance.",
    icon: LayoutDashboard,
    iconBgClass: "bg-wisk-teal/15 text-wisk-teal",
  },
  {
    id: "projects",
    name: "Projects",
    description:
      "Track client work with deadlines, values, next actions, and milestones. Monitor Vercel health and GitHub activity from each project card.",
    icon: FolderKanban,
    iconBgClass: "bg-wisk-purple/15 text-wisk-purple",
  },
  {
    id: "tasks",
    name: "Tasks",
    description:
      "Manage work with priorities, due dates, and project links. Keep a clean checklist of what needs doing today and this week.",
    icon: CheckSquare,
    iconBgClass: "bg-wisk-teal/15 text-wisk-teal",
  },
  {
    id: "goals",
    name: "Goals",
    description:
      "Set revenue, project, and content targets with progress tracking. Visual indicators help you stay aligned with long-term aims.",
    icon: Target,
    iconBgClass: "bg-wisk-purple/15 text-wisk-purple",
  },
  {
    id: "ideas",
    name: "Ideas",
    description:
      "Capture content angles, product thoughts, and business observations before they slip away. Categorise and revisit when ready.",
    icon: Lightbulb,
    iconBgClass: "bg-amber-500/15 text-amber-400",
  },
  {
    id: "calendar",
    name: "Calendar",
    description:
      "One timeline for project deadlines, tasks, goals, milestones, and content. Filter by type and scan the next 30, 60, or 90 days.",
    icon: CalendarDays,
    iconBgClass: "bg-wisk-teal/15 text-wisk-teal",
  },
  {
    id: "leads",
    name: "Leads",
    description:
      "Move enquiries through your sales pipeline from New to Won. Track conversion rate, pipeline value, and average response time.",
    icon: UserPlus,
    iconBgClass: "bg-wisk-coral/15 text-wisk-coral",
  },
  {
    id: "content",
    name: "Content",
    description:
      "Plan and schedule posts across platforms. Use the calendar and board views, track your publishing streak, and link to content goals.",
    icon: Clapperboard,
    iconBgClass: "bg-wisk-purple/15 text-wisk-purple",
  },
  {
    id: "settings",
    name: "Settings",
    description:
      "Update your profile, customise field visibility, manage service types, and connect integrations from one place.",
    icon: Settings,
    iconBgClass: "bg-muted text-muted-foreground",
  },
  {
    id: "integrations",
    name: "Integrations",
    description:
      "Connect Vercel and GitHub to import projects, monitor deployment health, and see recent repository activity on project cards.",
    icon: Plug,
    iconBgClass: "bg-wisk-teal/15 text-wisk-teal",
  },
];

export const ONBOARDING_SLIDE_COUNT = ONBOARDING_SLIDES.length;
