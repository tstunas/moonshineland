import { getCurrentUser } from "@/features/auth/queries";
import prisma from "@/lib/prisma";

export async function canManageThread(threadOwnerUserId: number | null): Promise<boolean> {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return false;
  }

  const userId = Number(currentUser.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return false;
  }

  if (threadOwnerUserId === userId) {
    return true;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });

  return Boolean(user?.isAdmin);
}
