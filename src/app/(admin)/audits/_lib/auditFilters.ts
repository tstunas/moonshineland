import type { Prisma } from "@/generated/prisma/client";

function parseDateInput(value: string, endOfDay: boolean): Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }

  return parsed;
}

export function buildAuditWhere(input: {
  query: string;
  targetType: string;
  action: string;
  fromDate: string;
  toDate: string;
}): Prisma.AdminAuditLogWhereInput {
  const from = parseDateInput(input.fromDate, false);
  const to = parseDateInput(input.toDate, true);

  return {
    ...(input.targetType !== "all" ? { targetType: input.targetType } : {}),
    ...(input.action ? { action: { contains: input.action } } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
    ...(input.query
      ? {
          OR: [
            { summary: { contains: input.query } },
            { adminUser: { username: { contains: input.query } } },
            { adminUser: { email: { contains: input.query } } },
          ],
        }
      : {}),
  };
}
