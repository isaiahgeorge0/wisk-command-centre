import type { Lead } from "@/lib/leads/types";

export function buildLeadEmailUrl(
  lead: Lead,
  subject: string,
  body: string
): string {
  const params = new URLSearchParams({
    subject,
    body,
  });
  return `mailto:${lead.email}?${params.toString()}`;
}

export function getDefaultEmailSubject(lead: Lead): string {
  const subjects: Record<string, string> = {
    new: `Following up — ${lead.service_interest ?? "your enquiry"}`,
    contacted: "Following up on our conversation",
    qualified: `Next steps for ${lead.service_interest ?? "your project"}`,
    proposal_sent: "Following up on your proposal",
    won: `Welcome — next steps for ${lead.service_interest ?? "your project"}`,
    lost: "Checking in",
  };
  return subjects[lead.status] ?? `Following up — ${lead.name}`;
}

export function getDefaultEmailBody(lead: Lead): string {
  const name = lead.name.split(" ")[0];

  const bodies: Record<string, string> = {
    new: `Hi ${name},\n\nI wanted to reach out regarding ${lead.service_interest ?? "your enquiry"}.\n\nWould you be available for a quick call to discuss further?\n\nBest regards`,
    contacted: `Hi ${name},\n\nJust following up on our recent conversation.\n\nPlease let me know if you have any questions or would like to move forward.\n\nBest regards`,
    qualified: `Hi ${name},\n\nThank you for our conversation. I'm putting together some details for you regarding ${lead.service_interest ?? "your project"}.\n\nI'll be in touch shortly with more information.\n\nBest regards`,
    proposal_sent: `Hi ${name},\n\nI wanted to follow up on the proposal I sent over.\n\nDo you have any questions or feedback? I'm happy to jump on a call to discuss.\n\nBest regards`,
    won: `Hi ${name},\n\nExcited to get started on your project!\n\nI'll be in touch shortly with the next steps.\n\nBest regards`,
    lost: `Hi ${name},\n\nI hope you're well. I wanted to check in and see if there's anything I can help with.\n\nFeel free to reach out if your needs have changed.\n\nBest regards`,
  };

  return bodies[lead.status] ?? `Hi ${name},\n\nJust following up.\n\nBest regards`;
}

export function wrapWinstonEmailBody(lead: Lead, bodyParagraphs: string): string {
  const name = lead.name.split(" ")[0];
  return `Hi ${name},\n\n${bodyParagraphs.trim()}\n\nBest regards`;
}
