import { getAuthContext } from "@/lib/auth/get-auth-context";

export { UnauthorizedError } from "@/lib/auth/errors";

export async function getActorUserId(): Promise<string> {
  const { user } = await getAuthContext();
  return user.id;
}
