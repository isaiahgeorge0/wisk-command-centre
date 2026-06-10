import { Resend } from "resend";

const APPROVAL_SUBJECT = "You're in — your WISK access has been approved";

function buildApprovalNotificationHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're in</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:48px 24px;">
    <div style="font-size:20px;font-weight:700;background:linear-gradient(135deg,#a855f7,#14b8a6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-0.5px;margin-bottom:40px;">WISK</div>
    <div style="background:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:36px 32px;">
      <h1 style="color:#f4f4f5;font-size:20px;font-weight:600;margin:0 0 12px;">You're in.</h1>
      <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 20px;">Your request to access WISK has been approved. You'll receive a separate email shortly with a link to set up your password and access your command centre.</p>
      <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 20px;">WISK is your single place to manage projects, tasks, goals, content, leads, and ideas — everything whisked together.</p>
      <p style="color:#71717a;font-size:13px;line-height:1.5;border-top:1px solid rgba(255,255,255,0.07);padding-top:20px;margin:8px 0 0;">Keep an eye on your inbox — your invite link is on its way.</p>
    </div>
    <div style="margin-top:32px;color:#52525b;font-size:12px;text-align:center;">Built by IGC. — <a href="https://wiskapp.com" style="color:#52525b;text-decoration:none;">wiskapp.com</a></div>
  </div>
</body>
</html>`;
}

export async function sendApprovalNotification({
  email,
}: {
  name: string;
  email: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.error(
      "sendApprovalNotification: RESEND_API_KEY or RESEND_FROM_EMAIL is not set"
    );
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: email.trim().toLowerCase(),
    subject: APPROVAL_SUBJECT,
    html: buildApprovalNotificationHtml(),
  });

  if (error) {
    throw new Error(error.message);
  }
}
