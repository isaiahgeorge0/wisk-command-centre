type ResolveDisplayNameInput = {
  displayName?: string | null;
  profileName?: string | null;
  email: string;
};

export function resolveDisplayName({
  displayName,
  profileName,
  email,
}: ResolveDisplayNameInput): string {
  const fromPrefs = displayName?.trim();
  if (fromPrefs) {
    return fromPrefs;
  }

  const fromProfile = profileName?.trim();
  if (fromProfile) {
    return fromProfile;
  }

  return email.split("@")[0] || "User";
}
