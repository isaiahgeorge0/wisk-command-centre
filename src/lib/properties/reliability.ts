export type ReliabilityGrade = "A" | "B" | "C" | "D" | "F";

export type TenantReliabilityScore = {
  tenantId: string;
  score: number;
  grade: ReliabilityGrade;
  totalPayments: number;
  onTimeCount: number;
  lateCount: number;
  partialCount: number;
  missedCount: number;
  avgDaysLate: number;
  currentStreak: number;
  label: string;
};

type PaymentInput = {
  status: string;
  due_date: string;
  paid_date: string | null;
  amount: number;
};

type PaymentOutcome = "on_time" | "late" | "partial" | "missed";

const SETTLED_STATUSES = new Set(["paid", "late", "partial", "missed"]);

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
}

function daysBetween(start: string, end: string): number {
  const startDate = parseLocalDate(start);
  const endDate = parseLocalDate(end);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(
    0,
    Math.round((endDate.getTime() - startDate.getTime()) / msPerDay)
  );
}

function classifyPayment(payment: PaymentInput): PaymentOutcome {
  if (payment.status === "missed") return "missed";
  if (payment.status === "partial") return "partial";

  if (payment.status === "paid" || payment.status === "late") {
    if (
      payment.paid_date &&
      payment.paid_date > payment.due_date
    ) {
      return "late";
    }
    return "on_time";
  }

  return "on_time";
}

function getGradeAndLabel(
  score: number,
  totalPayments: number
): { grade: ReliabilityGrade; label: string } {
  if (totalPayments === 0) {
    return { grade: "F", label: "No history" };
  }
  if (score >= 85) return { grade: "A", label: "Excellent" };
  if (score >= 70) return { grade: "B", label: "Good" };
  if (score >= 50) return { grade: "C", label: "Fair" };
  if (score >= 30) return { grade: "D", label: "Poor" };
  return { grade: "F", label: "At risk" };
}

export function calculateReliabilityScore(
  tenantId: string,
  payments: PaymentInput[]
): TenantReliabilityScore {
  const settled = payments.filter((payment) =>
    SETTLED_STATUSES.has(payment.status)
  );

  if (settled.length === 0) {
    return {
      tenantId,
      score: 0,
      grade: "F",
      totalPayments: 0,
      onTimeCount: 0,
      lateCount: 0,
      partialCount: 0,
      missedCount: 0,
      avgDaysLate: 0,
      currentStreak: 0,
      label: "No history",
    };
  }

  const outcomes = settled.map((payment) => ({
    payment,
    outcome: classifyPayment(payment),
  }));

  let onTimeCount = 0;
  let lateCount = 0;
  let partialCount = 0;
  let missedCount = 0;
  const daysLateValues: number[] = [];

  for (const { payment, outcome } of outcomes) {
    switch (outcome) {
      case "on_time":
        onTimeCount += 1;
        break;
      case "late":
        lateCount += 1;
        if (payment.paid_date) {
          daysLateValues.push(daysBetween(payment.due_date, payment.paid_date));
        }
        break;
      case "partial":
        partialCount += 1;
        break;
      case "missed":
        missedCount += 1;
        break;
    }
  }

  const avgDaysLate =
    daysLateValues.length > 0
      ? daysLateValues.reduce((sum, value) => sum + value, 0) /
        daysLateValues.length
      : 0;

  const sortedByDueDate = [...outcomes].sort((a, b) =>
    b.payment.due_date.localeCompare(a.payment.due_date)
  );

  let currentStreak = 0;
  for (const { outcome } of sortedByDueDate) {
    if (outcome !== "on_time") break;
    currentStreak += 1;
  }

  let score = 100;
  score -= missedCount * 20;
  score -= partialCount * 10;
  score -= lateCount * 5;
  score -= Math.min(15, avgDaysLate * 0.5);

  if (currentStreak >= 12) {
    score += 15;
  } else if (currentStreak >= 6) {
    score += 10;
  } else if (currentStreak >= 3) {
    score += 5;
  }

  score = Math.max(0, Math.min(100, score));

  const { grade, label } = getGradeAndLabel(score, settled.length);

  return {
    tenantId,
    score,
    grade,
    totalPayments: settled.length,
    onTimeCount,
    lateCount,
    partialCount,
    missedCount,
    avgDaysLate,
    currentStreak,
    label,
  };
}

export function calculatePortfolioReliability(scores: TenantReliabilityScore[]): {
  averageScore: number;
  gradeDistribution: Record<ReliabilityGrade, number>;
  atRiskCount: number;
  excellentCount: number;
} {
  const gradeDistribution: Record<ReliabilityGrade, number> = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    F: 0,
  };

  const scored = scores.filter((score) => score.totalPayments > 0);

  for (const score of scored) {
    gradeDistribution[score.grade] += 1;
  }

  const averageScore =
    scored.length > 0
      ? scored.reduce((sum, score) => sum + score.score, 0) / scored.length
      : 0;

  return {
    averageScore,
    gradeDistribution,
    atRiskCount: scored.filter(
      (score) => score.grade === "D" || score.grade === "F"
    ).length,
    excellentCount: scored.filter((score) => score.grade === "A").length,
  };
}
