import type { EmailProvider } from "@/lib/email/types";

export function buildReplySubject(subject: string): string {
  const trimmed = subject.trim();
  if (/^re:\s/i.test(trimmed)) return trimmed;
  return `Re: ${trimmed}`;
}

export function buildProviderComposeUrl(options: {
  provider: EmailProvider;
  toEmail: string;
  subject: string;
  body: string;
}): string {
  const replySubject = buildReplySubject(options.subject);

  if (options.provider === "gmail") {
    const params = new URLSearchParams({
      view: "cm",
      to: options.toEmail,
      su: replySubject,
      body: options.body,
    });
    return `https://mail.google.com/mail/?${params.toString()}`;
  }

  const params = new URLSearchParams({
    to: options.toEmail,
    subject: replySubject,
    body: options.body,
  });
  return `https://outlook.live.com/mail/0/deeplink/compose?${params.toString()}`;
}
