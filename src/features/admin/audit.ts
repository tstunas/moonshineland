import prisma from "@/lib/prisma";

interface RecordAdminAuditInput {
  adminUserId: number;
  action: string;
  targetType: "user" | "board" | "thread" | "post";
  targetIds: number[];
  summary: string;
  details?: Record<string, unknown>;
}

export async function recordAdminAudit(input: RecordAdminAuditInput) {
  await prisma.adminAuditLog.create({
    data: {
      adminUserId: input.adminUserId,
      action: input.action,
      targetType: input.targetType,
      targetIds: input.targetIds,
      summary: input.summary,
      details: input.details as unknown as NonNullable<unknown>,
    },
  });
}
