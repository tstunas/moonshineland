import { getCurrentUser } from "@/features/auth/queries";

export async function getAdminUserId(): Promise<number | null> {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isAdmin) {
    return null;
  }

  const userId = Number(currentUser.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  return userId;
}