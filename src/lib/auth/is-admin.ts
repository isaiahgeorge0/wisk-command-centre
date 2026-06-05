export function isAdminEmail(email: string | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || !email) {
    return false;
  }
  return email.trim().toLowerCase() === adminEmail;
}
