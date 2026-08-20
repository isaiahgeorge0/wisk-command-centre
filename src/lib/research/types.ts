import type { ActionResult } from "@/lib/leads/types";
import type { ResearchWinRateDashboard } from "@/lib/research/win-rate";

export type ResearchCompetitor = {
  id: string;
  user_id: string;
  name: string;
  url: string | null;
  google_place_id: string | null;
  google_place_label: string | null;
  created_at: string;
  updated_at: string;
};

export type ResearchCheckSource = "tavily" | "google_places";

export type ResearchCheckUrgency = "high" | "medium" | "low";

export type ResearchCompetitorCheck = {
  id: string;
  competitor_id: string;
  user_id: string;
  source: ResearchCheckSource;
  snapshot: Record<string, unknown>;
  has_meaningful_change: boolean;
  change_summary: string | null;
  urgency: ResearchCheckUrgency | null;
  checked_at: string;
  created_at: string;
};

export type ResearchPlaceMatch = {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  rating: number | null;
  userRatingCount: number | null;
};

export type ResearchCompetitorListItem = {
  competitor: ResearchCompetitor;
  latestChecks: ResearchCompetitorCheck[];
  latestMeaningfulSignals: ResearchSignal[];
};

export type ResearchSignal = {
  checkId: string;
  competitorId: string;
  competitorName: string;
  source: ResearchCheckSource;
  summary: string;
  detail?: string;
  urgency: ResearchCheckUrgency;
  checkedAt: string;
};

export type ResearchPageData = {
  canAccessResearchPro: boolean;
  competitorCap: number;
  competitors: ResearchCompetitorListItem[];
  winRate: ResearchWinRateDashboard;
};

export type ResearchOverviewStats = {
  canAccessResearchPro: boolean;
  competitorCap: number;
  competitorCount: number;
  signalCount: number;
  winRatePercent: number | null;
  winRatePeriodLabel: string;
  briefsThisMonth: number;
  briefsTotal: number;
  leadsWithoutBrief: number;
};

export type ResearchLeadBriefIndexItem = {
  id: string;
  name: string;
  status: string;
  serviceInterest: string;
  summary: string | null;
  generatedAt: string;
};

export type ResearchLeadIntelligenceData = {
  briefsThisMonth: number;
  briefsTotal: number;
  briefs: ResearchLeadBriefIndexItem[];
  leadsWithoutBrief: number;
};

export type ResearchActionResult<T = void> = ActionResult<T>;
