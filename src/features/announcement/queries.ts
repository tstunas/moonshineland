import type { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

const announcementInclude = {
  user: {
    select: {
      id: true,
      username: true,
    },
  },
  announcementImages: {
    orderBy: {
      sortOrder: "asc",
    },
    select: {
      id: true,
      imageUrl: true,
      sortOrder: true,
    },
  },
} as const;

export type AnnouncementWithRelations = Prisma.AnnouncementGetPayload<{
  include: typeof announcementInclude;
}>;

export async function getAnnouncementsForPublic(options?: {
  isAdultVerified?: boolean;
  limit?: number;
}): Promise<AnnouncementWithRelations[]> {
  const isAdultVerified = Boolean(options?.isAdultVerified);
  const limit = Math.max(1, Math.min(options?.limit ?? 30, 100));

  return prisma.announcement.findMany({
    where: {
      isHidden: false,
      ...(isAdultVerified ? {} : { isAdultOnly: false }),
    },
    include: announcementInclude,
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}

export async function getLatestAnnouncementForPublic(options?: {
  isAdultVerified?: boolean;
}): Promise<AnnouncementWithRelations | null> {
  const list = await getAnnouncementsForPublic({
    isAdultVerified: options?.isAdultVerified,
    limit: 1,
  });

  return list[0] ?? null;
}

export async function getAnnouncementsForAdmin(options?: {
  limit?: number;
}): Promise<AnnouncementWithRelations[]> {
  const limit = Math.max(1, Math.min(options?.limit ?? 100, 200));

  return prisma.announcement.findMany({
    include: announcementInclude,
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}
