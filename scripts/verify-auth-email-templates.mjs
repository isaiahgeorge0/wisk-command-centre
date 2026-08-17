#!/usr/bin/env node
/**
 * Production E2E for the branded auth templates.
 *
 * generateLink sends the real Resend SMTP email (the send-only API key cannot
 * list delivered HTML). We verify:
 *   1. live Management API templates still match the branded shell
 *   2. action_link redirect_to is https://app.wiskapp.com
 *   3. following the verify URL actually lands on the production app
 *
 *   node scripts/verify-auth-email-templates.mjs
 */

import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_SITE_URL = "https://app.wiskapp.com";
const LOGO_SRC = `${EXPECTED_SITE_URL}/PNG-MAIN-WISK-LOGO-WHITE.png`;
const CALLBACK_CLIENT = `${EXPECTED_SITE_URL}/auth/callback-client`;
const AUTH_CALLBACK = `${EXPECTED_SITE_URL}/auth/callback`;

function loadEnvLocal() {
  const env = {};
  const raw = readFileSync(join(ROOT, ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function plusAddress(baseEmail, tag) {
  const at = baseEmail.indexOf("@");
  if (at < 0) throw new Error("ADMIN_EMAIL is not a valid email");
  const local = baseEmail.slice(0, at).replace(/\+.*/, "");
  return `${local}+${tag}@${baseEmail.slice(at + 1)}`;
}

function hostPath(urlString) {
  try {
    const url = new URL(urlString);
    return `${url.origin}${url.pathname}`;
  } catch {
    return urlString;
  }
}

function readAccessToken(env) {
  if (env.SUPABASE_ACCESS_TOKEN?.trim()) {
    return env.SUPABASE_ACCESS_TOKEN.trim();
  }
  const prefix = "go-keyring-base64:";
  const raw = execFileSync(
    "security",
    ["find-generic-password", "-a", "supabase", "-s", "Supabase CLI", "-w"],
    { encoding: "utf8" }
  ).trim();
  return raw.startsWith(prefix)
    ? Buffer.from(raw.slice(prefix.length), "base64").toString("utf8").trim()
    : raw;
}

async function fetchJson(url, { method, headers, body } = {}) {
  const res = await fetch(url, {
    method: method ?? "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

async function getAuthConfig(env) {
  const token = readAccessToken(env);
  const ref = readFileSync(join(ROOT, "supabase/.temp/project-ref"), "utf8").trim();
  const { ok, status, json } = await fetchJson(
    `https://api.supabase.com/v1/projects/${ref}/config/auth`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": "WISK-auth-email-templates/1.0",
      },
    }
  );
  if (!ok) throw new Error(`GET auth config ${status}`);
  return { token, ref, json };
}

async function ensureCallbackClientAllowed(env) {
  const { token, ref, json } = await getAuthConfig(env);
  const current = (json.uri_allow_list ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (current.includes(CALLBACK_CLIENT)) {
    console.log(`Redirect allow-list already includes ${CALLBACK_CLIENT}`);
    return json;
  }
  const next = [...current, CALLBACK_CLIENT].join(",");
  const patch = await fetchJson(
    `https://api.supabase.com/v1/projects/${ref}/config/auth`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "WISK-auth-email-templates/1.0",
      },
      body: { uri_allow_list: next },
    }
  );
  if (!patch.ok) throw new Error(`PATCH uri_allow_list ${patch.status}`);
  console.log(`Added ${CALLBACK_CLIENT} to redirect allow-list`);
  return patch.json;
}

function renderLiveHtml(templateHtml, actionLink, extras = {}) {
  let html = templateHtml.replaceAll("{{ .ConfirmationURL }}", actionLink);
  if (extras.newEmail) html = html.replaceAll("{{ .NewEmail }}", extras.newEmail);
  if (extras.token) html = html.replaceAll("{{ .Token }}", extras.token);
  return html;
}

function assertBrandedHtml(html, { heading, cta, footer, token = false }) {
  const failures = [];
  if (!html?.includes("background:#0a0a0a")) failures.push("missing dark shell");
  if (!html?.includes(LOGO_SRC)) failures.push("missing production logo URL");
  if (!html?.includes(heading)) failures.push(`missing heading ${heading}`);
  if (token) {
    if (!html?.includes("letter-spacing:4px")) failures.push("missing token block");
    if (html?.includes("{{ .ConfirmationURL }}")) {
      failures.push("reauth still has a ConfirmationURL placeholder");
    }
  } else {
    if (!html?.includes("background:#c3ff32")) failures.push("missing lime CTA");
    if (cta && !html?.includes(cta)) failures.push(`missing CTA ${cta}`);
    if (html?.includes("{{ .ConfirmationURL }}")) {
      failures.push("ConfirmationURL was not interpolated");
    }
  }
  if (footer && !html?.includes(footer)) failures.push("missing footer");
  if (failures.length) {
    throw new Error(`HTML checks failed: ${failures.join("; ")}`);
  }
}

async function inspectActionLink(link) {
  if (!link) throw new Error("No action link from generateLink");
  const url = new URL(link);
  const redirectTo = url.searchParams.get("redirect_to");
  if (!redirectTo) throw new Error("action_link is missing redirect_to");
  if (!redirectTo.startsWith(EXPECTED_SITE_URL)) {
    throw new Error(`redirect_to is not production: ${redirectTo}`);
  }
  if (/localhost|127\.0\.0\.1/.test(redirectTo)) {
    throw new Error(`redirect_to is loopback: ${redirectTo}`);
  }

  const res = await fetch(link, { redirect: "manual" });
  const location = res.headers.get("location");
  if (!location) {
    throw new Error(`Verify endpoint returned ${res.status} with no Location`);
  }
  if (!location.startsWith(EXPECTED_SITE_URL)) {
    throw new Error(`Verify redirected off production: ${hostPath(location)}`);
  }
  return {
    verifyHost: url.host,
    type: url.searchParams.get("type"),
    redirectTo,
    status: res.status,
    locationHost: hostPath(location),
  };
}

async function main() {
  const env = loadEnvLocal();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
  const adminEmail = env.ADMIN_EMAIL;
  if (!supabaseUrl || !serviceRole || !adminEmail) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or ADMIN_EMAIL"
    );
  }

  const logo = await fetch(LOGO_SRC, { method: "HEAD" });
  console.log(`Logo ${LOGO_SRC} → ${logo.status}`);
  if (!logo.ok) throw new Error("Production logo URL did not return OK");

  const liveTemplates = await ensureCallbackClientAllowed(env);
  if (liveTemplates.site_url !== EXPECTED_SITE_URL) {
    throw new Error(`Site URL is ${liveTemplates.site_url}, expected ${EXPECTED_SITE_URL}`);
  }

  const reauthHtml = liveTemplates.mailer_templates_reauthentication_content;
  assertBrandedHtml(reauthHtml, {
    heading: "Verify it's you",
    footer: "This code expires shortly",
    token: true,
  });
  if (reauthHtml.includes("<a href=")) {
    throw new Error("reauthentication template still has a button");
  }
  console.log("Reauthentication template: code block present, no CTA button");

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const stamp = Date.now();
  const password = `${randomBytes(12).toString("base64url")}Aa1!`;
  const signupEmail = plusAddress(adminEmail, `wisk-auth-signup-${stamp}`);
  const memberEmail = plusAddress(adminEmail, `wisk-auth-member-${stamp}`);
  const newEmail = plusAddress(adminEmail, `wisk-auth-newmail-${stamp}`);
  const createdIds = [];
  const checks = [];

  try {
    const { data: member, error: memberError } = await admin.auth.admin.createUser({
      email: memberEmail,
      password,
      email_confirm: true,
    });
    if (memberError) throw memberError;
    createdIds.push(member.user.id);

    const { data: signupUser, error: signupCreateError } =
      await admin.auth.admin.createUser({
        email: signupEmail,
        password,
        email_confirm: false,
      });
    if (signupCreateError) throw signupCreateError;
    createdIds.push(signupUser.user.id);

    const flows = [
      {
        name: "signup",
        templateKey: "mailer_templates_confirmation_content",
        heading: "Confirm your email",
        cta: "Confirm email",
        footer: "If you didn't create a WISK account",
        generate: () =>
          admin.auth.admin.generateLink({
            type: "signup",
            email: signupEmail,
            password,
            options: { redirectTo: AUTH_CALLBACK },
          }),
      },
      {
        name: "magiclink",
        templateKey: "mailer_templates_magic_link_content",
        heading: "Sign in to WISK",
        cta: "Sign in",
        footer: "If you didn't request this, you can safely ignore this email.",
        generate: () =>
          admin.auth.admin.generateLink({
            type: "magiclink",
            email: memberEmail,
            options: { redirectTo: AUTH_CALLBACK },
          }),
      },
      {
        name: "recovery",
        templateKey: "mailer_templates_recovery_content",
        heading: "Reset your password",
        cta: "Reset password",
        footer: "your password won't change",
        generate: () =>
          admin.auth.admin.generateLink({
            type: "recovery",
            email: memberEmail,
            options: { redirectTo: `${CALLBACK_CLIENT}?next=/auth/reset-password` },
          }),
      },
      {
        name: "email_change",
        templateKey: "mailer_templates_email_change_content",
        heading: "Confirm your new email",
        cta: "Confirm new email",
        footer: "If you didn't request this change",
        extras: { newEmail },
        generate: () =>
          admin.auth.admin.generateLink({
            type: "email_change_new",
            email: memberEmail,
            newEmail,
            options: { redirectTo: AUTH_CALLBACK },
          }),
      },
    ];

    for (const flow of flows) {
      const { data, error } = await flow.generate();
      if (error) throw new Error(`${flow.name} generateLink: ${error.message}`);
      const actionLink = data?.properties?.action_link ?? data?.action_link;
      console.log(
        `${flow.name} generateLink ok; ${actionLink ? hostPath(actionLink) : "(none)"}`
      );

      const rendered = renderLiveHtml(
        liveTemplates[flow.templateKey],
        actionLink,
        flow.extras
      );
      assertBrandedHtml(rendered, flow);
      const linkInfo = await inspectActionLink(actionLink);
      checks.push({
        flow: flow.name,
        heading: flow.heading,
        href: hostPath(actionLink),
        ...linkInfo,
      });
      console.log("  branded HTML ok");
      console.log(`  type=${linkInfo.type} redirect_to=${linkInfo.redirectTo}`);
      console.log(`  verify HTTP ${linkInfo.status} → ${linkInfo.locationHost}`);
    }
  } finally {
    for (const id of createdIds) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) console.warn(`Failed to delete test user ${id}: ${error.message}`);
      else console.log(`Deleted test user ${id}`);
    }
  }

  console.log("\nE2E summary:");
  console.log(JSON.stringify(checks, null, 2));
}

await main();
