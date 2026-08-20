#!/usr/bin/env node
/**
 * Builds WISK-branded GoTrue auth email templates and optionally PATCHes
 * them via the Supabase Management API.
 *
 *   node scripts/apply-auth-email-templates.mjs           # write JSON only
 *   node scripts/apply-auth-email-templates.mjs --apply   # write + PATCH
 *
 * Requires for --apply:
 *   SUPABASE_ACCESS_TOKEN  personal access token (supabase.com/dashboard/account/tokens)
 *   PROJECT_REF            defaults to the linked project in supabase/.temp/project-ref
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const JSON_PATH = join(ROOT, "auth-email-templates.json");
const EXPECTED_SITE_URL = "https://app.wiskapp.com";
const LOGO_SRC = `${EXPECTED_SITE_URL}/PNG-MAIN-WISK-LOGO-WHITE.png`;
const CONFIRMATION_URL = "{{ .ConfirmationURL }}";
const TOKEN = "{{ .Token }}";
const NEW_EMAIL = "{{ .NewEmail }}";

const APPLY = process.argv.includes("--apply");

function shell({ heading, body, actionHtml, footerNote }) {
  return [
    `<div style="background:#0a0a0a;padding:40px 24px;font-family:-apple-system,Helvetica,Arial,sans-serif;">`,
    `  <div style="max-width:480px;margin:0 auto;">`,
    `    <img src="${LOGO_SRC}" alt="WISK" height="28" style="margin-bottom:32px;" />`,
    `    <h1 style="color:#ffffff;font-size:20px;font-weight:600;margin:0 0 12px;">${heading}</h1>`,
    `    <p style="color:#a3a3a3;font-size:15px;line-height:1.5;margin:0 0 28px;">${body}</p>`,
    `    ${actionHtml}`,
    `    <p style="color:#666666;font-size:13px;line-height:1.5;margin:32px 0 0;">${footerNote}</p>`,
    `  </div>`,
    `</div>`,
  ].join("\n");
}

function ctaButton(label) {
  return `<a href="${CONFIRMATION_URL}" style="display:inline-block;background:#c3ff32;color:#0a0a0a;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">${label}</a>`;
}

const TOKEN_BLOCK = [
  `<div style="background:#161616;border-radius:8px;padding:16px 24px;display:inline-block;">`,
  `  <span style="color:#c3ff32;font-size:24px;font-weight:700;letter-spacing:4px;">${TOKEN}</span>`,
  `</div>`,
].join("\n    ");

function buttonTemplate({ heading, body, cta, footer }) {
  return shell({
    heading,
    body,
    actionHtml: ctaButton(cta),
    footerNote: footer,
  });
}

function buildPayload() {
  return {
    mailer_subjects_confirmation: "Confirm your WISK account",
    mailer_templates_confirmation_content: buttonTemplate({
      heading: "Confirm your email",
      body: "You're almost in. Confirm your email to finish setting up your WISK account.",
      cta: "Confirm email",
      footer: "If you didn't create a WISK account, you can ignore this email.",
    }),

    mailer_subjects_invite: "You're invited to WISK",
    mailer_templates_invite_content: buttonTemplate({
      heading: "You've been invited",
      body: "WISK is invite-only. Someone thought you'd be a good fit. Accept your invite to get started.",
      cta: "Accept invite",
      footer:
        "This invite was sent by a WISK user. If you weren't expecting this, you can ignore it.",
    }),

    mailer_subjects_magic_link: "Your WISK sign-in link",
    mailer_templates_magic_link_content: buttonTemplate({
      heading: "Sign in to WISK",
      body: "Click below to sign in. This link expires shortly and can only be used once.",
      cta: "Sign in",
      footer: "If you didn't request this, you can safely ignore this email.",
    }),

    mailer_subjects_email_change: "Confirm your new email address",
    mailer_templates_email_change_content: buttonTemplate({
      heading: "Confirm your new email",
      body: `Confirm ${NEW_EMAIL} as the new email address for your WISK account.`,
      cta: "Confirm new email",
      footer:
        "If you didn't request this change, you can safely ignore this email.",
    }),

    mailer_subjects_recovery: "Reset your WISK password",
    mailer_templates_recovery_content: buttonTemplate({
      heading: "Reset your password",
      body: "We received a request to reset your password. Choose a new one below.",
      cta: "Reset password",
      footer:
        "If you didn't request this, you can safely ignore this email and your password won't change.",
    }),

    mailer_subjects_reauthentication: `${TOKEN} is your WISK verification code`,
    mailer_templates_reauthentication_content: shell({
      heading: "Verify it's you",
      body: "Use this code to confirm a sensitive change on your WISK account.",
      actionHtml: TOKEN_BLOCK,
      footerNote:
        "This code expires shortly. If you didn't request this, you can safely ignore this email.",
    }),
  };
}

function assertGoTruePlaceholders(payload) {
  const checks = [
    ["mailer_templates_confirmation_content", CONFIRMATION_URL],
    ["mailer_templates_invite_content", CONFIRMATION_URL],
    ["mailer_templates_magic_link_content", CONFIRMATION_URL],
    ["mailer_templates_email_change_content", CONFIRMATION_URL],
    ["mailer_templates_email_change_content", NEW_EMAIL],
    ["mailer_templates_recovery_content", CONFIRMATION_URL],
    ["mailer_templates_reauthentication_content", TOKEN],
    ["mailer_subjects_reauthentication", TOKEN],
  ];

  for (const [key, needle] of checks) {
    if (!payload[key].includes(needle)) {
      throw new Error(`${key} is missing ${needle}`);
    }
  }

  if (payload.mailer_templates_reauthentication_content.includes(CONFIRMATION_URL)) {
    throw new Error("reauthentication template must not include a ConfirmationURL button");
  }
}

function readProjectRef() {
  if (process.env.PROJECT_REF?.trim()) return process.env.PROJECT_REF.trim();
  try {
    return readFileSync(join(ROOT, "supabase/.temp/project-ref"), "utf8").trim();
  } catch {
    return "";
  }
}

function decodeGoKeyringToken(raw) {
  const trimmed = raw.trim();
  const prefix = "go-keyring-base64:";
  if (!trimmed.startsWith(prefix)) return trimmed;
  return Buffer.from(trimmed.slice(prefix.length), "base64").toString("utf8").trim();
}

function readAccessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
    return decodeGoKeyringToken(process.env.SUPABASE_ACCESS_TOKEN);
  }

  try {
    const raw = execFileSync(
      "security",
      ["find-generic-password", "-a", "supabase", "-s", "Supabase CLI", "-w"],
      { encoding: "utf8" }
    );
    return decodeGoKeyringToken(raw);
  } catch {
    return "";
  }
}

async function managementFetch(ref, token, { method, body } = {}) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/config/auth`,
    {
      method: method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": "WISK-auth-email-templates/1.0",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    }
  );

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const detail =
      typeof json?.message === "string"
        ? json.message
        : text.slice(0, 500) || res.statusText;
    throw new Error(`Management API ${method ?? "GET"} ${res.status}: ${detail}`);
  }

  return json;
}

function summarizeAuthConfig(config) {
  return {
    site_url: config.site_url ?? null,
    uri_allow_list: config.uri_allow_list ?? null,
    smtp_sender_name: config.smtp_sender_name ?? null,
    smtp_admin_email: config.smtp_admin_email ?? null,
    smtp_host: config.smtp_host ?? null,
    mailer_autoconfirm: config.mailer_autoconfirm ?? null,
  };
}

function templatePreview(html) {
  const heading = html.match(/<h1[^>]*>([^<]*)<\/h1>/)?.[1] ?? "(no h1)";
  const hasButton = html.includes(CONFIRMATION_URL) && html.includes("background:#c3ff32");
  const hasToken = html.includes(TOKEN) && html.includes("letter-spacing:4px");
  return { heading, hasButton, hasToken };
}

async function apply(payload) {
  const token = readAccessToken();
  const ref = readProjectRef();

  if (!token) {
    throw new Error(
      "No Management API token. Export SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens (or run supabase login)."
    );
  }
  if (!ref) {
    throw new Error("PROJECT_REF is not set and supabase/.temp/project-ref is missing");
  }

  console.log(`GET auth config for project ${ref}…`);
  const before = await managementFetch(ref, token);
  const summary = summarizeAuthConfig(before);
  console.log("Current Auth settings:", JSON.stringify(summary, null, 2));

  if (summary.site_url !== EXPECTED_SITE_URL) {
    console.log(
      `Site URL is ${JSON.stringify(summary.site_url)}, expected ${EXPECTED_SITE_URL}. Updating first.`
    );
    await managementFetch(ref, token, {
      method: "PATCH",
      body: { site_url: EXPECTED_SITE_URL },
    });
    const afterSite = await managementFetch(ref, token);
    if (afterSite.site_url !== EXPECTED_SITE_URL) {
      throw new Error(
        `Failed to set site_url. Still ${JSON.stringify(afterSite.site_url)}`
      );
    }
    console.log(`Site URL now ${afterSite.site_url}`);
  } else {
    console.log(`Site URL confirmed: ${summary.site_url}`);
  }

  console.log("PATCH six mailer subjects + templates…");
  await managementFetch(ref, token, { method: "PATCH", body: payload });

  const after = await managementFetch(ref, token);
  if (after.site_url !== EXPECTED_SITE_URL) {
    throw new Error(
      `Site URL drifted after template PATCH: ${JSON.stringify(after.site_url)}`
    );
  }

  const keys = Object.keys(payload);
  const mismatches = [];
  for (const key of keys) {
    if (after[key] !== payload[key]) {
      mismatches.push(key);
    }
  }

  if (mismatches.length > 0) {
    throw new Error(
      `GET-after-PATCH mismatch on: ${mismatches.join(", ")}`
    );
  }

  console.log("Verified all 12 mailer keys match the payload.");
  for (const key of keys.filter((k) => k.endsWith("_content"))) {
    console.log(`  ${key}:`, templatePreview(after[key]));
  }
  console.log(`  reauthentication subject: ${after.mailer_subjects_reauthentication}`);
}

const payload = buildPayload();
assertGoTruePlaceholders(payload);
writeFileSync(JSON_PATH, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${JSON_PATH}`);

if (APPLY) {
  await apply(payload);
} else {
  console.log("JSON only. Re-run with --apply after exporting SUPABASE_ACCESS_TOKEN.");
}
