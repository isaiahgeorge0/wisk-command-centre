import type { BillingPlan } from "@/lib/billing/types";

export function shouldShowUpgradeBanner(params: {
  plan: BillingPlan;
  hasPropertiesSubscription: boolean;
  hasPropertiesProSubscription: boolean;
  userCreatedAt: string;
  dismissedAt: string | null;
  now?: Date;
}): boolean {
  const {
    plan,
    hasPropertiesSubscription,
    hasPropertiesProSubscription,
    userCreatedAt,
    dismissedAt,
    now,
  } = params;

  if (
    plan !== "free" ||
    hasPropertiesSubscription ||
    hasPropertiesProSubscription
  ) {
    return false;
  }

  const today = now ?? new Date();

  if (dismissedAt !== null) {
    const dismissed = new Date(dismissedAt);
    const resetDate = new Date(
      dismissed.getFullYear(),
      dismissed.getMonth() + 1,
      1
    );

    if (today < resetDate) {
      return false;
    }
  }

  const createdAt = new Date(userCreatedAt);
  const joinDay = createdAt.getDate();

  if (joinDay >= 1 && joinDay <= 15) {
    if (today.getDate() !== 1) {
      return false;
    }
  } else if (joinDay >= 16) {
    const joinMonth = createdAt.getMonth();
    const joinYear = createdAt.getFullYear();
    const inJoinMonth =
      today.getFullYear() === joinYear && today.getMonth() === joinMonth;

    if (inJoinMonth) {
      return true;
    }

    if (today.getDate() !== 1) {
      return false;
    }
  }

  return true;
}
