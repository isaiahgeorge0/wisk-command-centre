export type LeadGrade = "A" | "B" | "C" | "D";

export type LeadScore = {
  score: number;
  grade: LeadGrade;
  label: string;
  factors: {
    stageScore: number;
    valueScore: number;
    activityScore: number;
    followUpScore: number;
    velocityScore: number;
  };
};

const STAGE_SCORES: Record<string, number> = {
  new: 5,
  contacted: 12,
  qualified: 20,
  proposal_sent: 28,
  won: 30,
  lost: 0,
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function calculateLeadScore(lead: {
  status: string;
  value: number | null;
  contacted_at: string | null;
  follow_up_date: string | null;
  last_activity_at?: string | null;
  created_at: string;
}): LeadScore {
  const now = new Date();
  const stageScore = STAGE_SCORES[lead.status] ?? 5;

  const value = lead.value ?? 0;
  const valueScore =
    value <= 0
      ? 0
      : value < 1000
        ? 5
        : value < 5000
          ? 10
          : value < 10000
            ? 15
            : 20;

  const lastActivity = lead.last_activity_at ?? lead.contacted_at;
  let activityScore = 0;
  if (lastActivity) {
    const daysSince = Math.floor(
      (now.getTime() - new Date(lastActivity).getTime()) / DAY_MS
    );
    activityScore =
      daysSince === 0
        ? 25
        : daysSince <= 2
          ? 20
          : daysSince <= 7
            ? 15
            : daysSince <= 14
              ? 8
              : daysSince <= 30
                ? 3
                : 0;
  }

  let followUpScore = 0;
  if (lead.follow_up_date) {
    const daysUntil = Math.floor(
      (new Date(lead.follow_up_date).getTime() - now.getTime()) / DAY_MS
    );
    followUpScore =
      daysUntil < 0
        ? -5
        : daysUntil === 0
          ? 15
          : daysUntil <= 3
            ? 12
            : daysUntil <= 7
              ? 8
              : 5;
  }

  const daysInStage = Math.floor(
    (now.getTime() - new Date(lead.created_at).getTime()) / DAY_MS
  );
  const velocityScore =
    daysInStage < 7
      ? 10
      : daysInStage < 14
        ? 7
        : daysInStage < 30
          ? 4
          : daysInStage < 60
            ? 1
            : 0;

  const raw =
    stageScore +
    valueScore +
    activityScore +
    followUpScore +
    velocityScore;
  const score = Math.max(0, Math.min(100, raw));
  const grade: LeadGrade =
    score >= 70 ? "A" : score >= 50 ? "B" : score >= 30 ? "C" : "D";
  const label =
    grade === "A"
      ? "Hot"
      : grade === "B"
        ? "Warm"
        : grade === "C"
          ? "Cool"
          : "Cold";

  return {
    score,
    grade,
    label,
    factors: {
      stageScore,
      valueScore,
      activityScore,
      followUpScore,
      velocityScore,
    },
  };
}
