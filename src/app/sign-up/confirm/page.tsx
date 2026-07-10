import { SignUpConfirm } from "@/components/auth/sign-up-confirm";

export default async function SignUpConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return <SignUpConfirm email={email ?? null} />;
}
