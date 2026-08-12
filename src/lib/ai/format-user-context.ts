import type { UserContext } from "@/lib/ai/context-builder";
import {
  formatLeadValue,
  formatPipelineValueSplit,
} from "@/lib/leads/format";

function isProTier(ctx: UserContext): boolean {
  return ctx.subscriptionTier === "ai_pro" || ctx.subscriptionTier === "max";
}

/**
 * Curated, sliced business context for Winston prompts.
 * Shared by digest and chat so neither dumps the full UserContext JSON.
 */
export function formatBusinessContext(
  ctx: UserContext,
  options?: { includeProExtras?: boolean }
): string {
  const includePro =
    options?.includeProExtras ?? isProTier(ctx);
  const lines: string[] = [];

  lines.push(`User: ${ctx.user.name}`);
  lines.push(`Context window: ${ctx.weekStart} to ${ctx.weekEnd}`);
  lines.push(`Generated at: ${ctx.generatedAt}`);
  lines.push("");

  lines.push(`## PROJECTS (Active: ${ctx.projects.active.length})`);
  for (const p of ctx.projects.active.slice(0, 20)) {
    const deadline = p.deadline ? `, deadline ${p.deadline}` : "";
    const value = p.value ? `, value £${p.value}` : "";
    const tasks = p.task_count > 0 ? `, ${p.task_count} open tasks` : "";
    const next = p.next_action ? `, next: "${p.next_action}"` : "";
    lines.push(`- ${p.name}${deadline}${value}${tasks}${next}`);
  }
  if (ctx.projects.stalled.length > 0) {
    lines.push(
      `Stalled (no update in 7+ days): ${ctx.projects.stalled.slice(0, 12).join(", ")}`
    );
  }
  if (ctx.projects.deadlineSoon.length > 0) {
    lines.push(
      `Deadline this week: ${ctx.projects.deadlineSoon.slice(0, 12).join(", ")}`
    );
  }
  lines.push("");

  lines.push(`## TASKS`);
  lines.push(`Completed this week: ${ctx.tasks.completedCount}`);
  if (ctx.tasks.completedTitles.length > 0) {
    lines.push(
      `Completed titles: ${ctx.tasks.completedTitles.slice(0, 10).join(", ")}`
    );
  }
  if (ctx.tasks.overdue.length > 0) {
    lines.push(
      `Overdue (${ctx.tasks.overdue.length}): ${ctx.tasks.overdue.slice(0, 8).join(", ")}`
    );
  }
  if (ctx.tasks.dueSoon.length > 0) {
    lines.push(
      `Due this week: ${ctx.tasks.dueSoon.slice(0, 8).join(", ")}`
    );
  }
  if (ctx.tasks.highPriorityIncomplete.length > 0) {
    lines.push(
      `High priority incomplete: ${ctx.tasks.highPriorityIncomplete.slice(0, 5).join(", ")}`
    );
  }
  lines.push("");

  lines.push(`## GOALS`);
  for (const g of ctx.goals.all.slice(0, 8)) {
    const deadline = g.deadline ? `, deadline ${g.deadline}` : "";
    lines.push(
      `- ${g.title}: ${g.percentComplete}% (${g.current}/${g.target} ${g.unit ?? ""})${deadline} [${g.status}]`
    );
  }
  if (ctx.goals.completedThisWeek.length > 0) {
    lines.push(
      `Reached 100% this week: ${ctx.goals.completedThisWeek.slice(0, 8).join(", ")}`
    );
  }
  if (ctx.goals.noProgressStalled.length > 0) {
    lines.push(
      `No progress in 7+ days: ${ctx.goals.noProgressStalled.slice(0, 8).join(", ")}`
    );
  }
  lines.push("");

  lines.push(`## LEADS`);
  lines.push(
    `Pipeline value: ${formatPipelineValueSplit(ctx.leads.pipelineValue)}`
  );
  lines.push(
    `Annualized pipeline (for comparison only): ${formatLeadValue(ctx.leads.totalPipelineValue, "one_time")}`
  );
  lines.push(`Active leads: ${ctx.leads.activeLeadCount}`);
  if (ctx.leads.newThisWeek.length > 0) {
    lines.push(
      `New this week: ${ctx.leads.newThisWeek.slice(0, 10).join(", ")}`
    );
  }
  if (ctx.leads.wonThisWeek.length > 0) {
    const wonStr = ctx.leads.wonThisWeek
      .slice(0, 10)
      .map((l) =>
        l.value
          ? `${l.name} (${formatLeadValue(l.value, l.value_type)})`
          : l.name
      )
      .join(", ");
    lines.push(`Won this week: ${wonStr}`);
  }
  if (ctx.leads.stalled.length > 0) {
    lines.push(
      `Stalled 14+ days: ${ctx.leads.stalled.slice(0, 12).join(", ")}`
    );
  }
  lines.push("");

  if (includePro) {
    lines.push(`## LEAD INTELLIGENCE`);
    lines.push(`Conversion rate: ${ctx.leads.conversionRate}%`);
    lines.push(
      `Avg response time: ${
        ctx.leads.avgResponseTimeDays != null
          ? `${ctx.leads.avgResponseTimeDays} days`
          : "no data"
      }`
    );
    lines.push(`Overdue follow-ups: ${ctx.leads.overdueFollowUps.length}`);
    if (ctx.leads.overdueFollowUps.length > 0) {
      for (const followUp of ctx.leads.overdueFollowUps.slice(0, 8)) {
        lines.push(`  - ${followUp.name} (due ${followUp.follow_up_date})`);
      }
    }
    lines.push(`Engagement:`);
    for (const lead of ctx.leads.engagementSummary.slice(0, 10)) {
      const days =
        lead.daysSinceActivity != null
          ? `${lead.daysSinceActivity} days since activity`
          : "no activity logged";
      lines.push(`  - ${lead.name} (${lead.status}): ${days}`);
    }
    lines.push("");

    lines.push(`## CONTENT PERFORMANCE`);
    lines.push(`Publishing streak: ${ctx.content.publishingStreak} weeks`);
    lines.push(`Avg posts/week (8wk): ${ctx.content.avgPostsPerWeek}`);
    if (ctx.content.publishedThisWeek.length > 0) {
      lines.push(`Published this week:`);
      for (const post of ctx.content.publishedThisWeek.slice(0, 10)) {
        lines.push(
          `  - "${post.title}"${post.platforms ? ` (${post.platforms})` : ""}`
        );
      }
    } else {
      lines.push(`Published this week: none`);
    }
    if (ctx.content.scheduledNextWeek.length > 0) {
      lines.push(`Scheduled next week:`);
      for (const post of ctx.content.scheduledNextWeek.slice(0, 10)) {
        lines.push(
          `  - "${post.title}"${post.platforms ? ` (${post.platforms})` : ""}`
        );
      }
    } else {
      lines.push(`Scheduled next week: none`);
    }
    lines.push("");

    lines.push(`## GOAL VELOCITY`);
    if (ctx.goals.velocityByGoal.length > 0) {
      for (const goal of ctx.goals.velocityByGoal.slice(0, 8)) {
        const projected = goal.projectedCompletion
          ? `projected ${goal.projectedCompletion}`
          : "no projection";
        lines.push(
          `- ${goal.title}: ${goal.percentComplete}% complete, ${projected}`
        );
      }
    } else {
      lines.push(`- No active goals with velocity data`);
    }
    lines.push("");
  }

  // Base content section (always — Pro also gets the richer section above)
  if (!includePro) {
    lines.push(`## CONTENT`);
    if (ctx.content.publishedThisWeek.length > 0) {
      lines.push(`Published this week:`);
      for (const p of ctx.content.publishedThisWeek.slice(0, 10)) {
        lines.push(
          `  - "${p.title}"${p.platforms ? ` (${p.platforms})` : ""}`
        );
      }
    } else {
      lines.push(`Published this week: none`);
    }
    if (ctx.content.scheduledNextWeek.length > 0) {
      lines.push(`Scheduled next 7 days:`);
      for (const p of ctx.content.scheduledNextWeek.slice(0, 10)) {
        lines.push(
          `  - "${p.title}"${p.platforms ? ` (${p.platforms})` : ""}`
        );
      }
    }
    lines.push("");
  }

  if (ctx.ideas.newThisWeek.length > 0) {
    lines.push(`## IDEAS CAPTURED THIS WEEK`);
    lines.push(ctx.ideas.newThisWeek.slice(0, 8).join(", "));
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
