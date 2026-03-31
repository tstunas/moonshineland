import type { Prisma } from "@/generated/prisma/client";

import { buildAuditWhere } from "@/app/(admin)/audits/_lib/auditFilters";
import prisma from "@/lib/prisma";

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

export const AUDIT_PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

export interface AuditFilters {
  query: string;
  targetType: string;
  action: string;
  fromDate: string;
  toDate: string;
}

export interface AuditsPageData {
  filters: AuditFilters;
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  logs: Array<{
    id: number;
    action: string;
    targetType: string;
    targetIds: Prisma.JsonValue;
    summary: string;
    createdAt: Date | string;
    details: Prisma.JsonValue | null;
    adminUser: {
      id: number;
      username: string;
      email: string;
    };
  }>;
}

function getParam(source: ParamSource, key: string): string {
  if (source instanceof URLSearchParams) {
    return source.get(key) ?? "";
  }

  const value = source[key];
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parsePositiveInt(value: string, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function getPageSize(value: string, fallback = 20): number {
  const parsed = parsePositiveInt(value, fallback);
  return AUDIT_PAGE_SIZE_OPTIONS.includes(parsed as (typeof AUDIT_PAGE_SIZE_OPTIONS)[number])
    ? parsed
    : fallback;
}

export function parseAuditsQuery(source: ParamSource) {
  return {
    query: getParam(source, "query").trim(),
    targetType: getParam(source, "targetType") || "all",
    action: getParam(source, "action").trim(),
    fromDate: getParam(source, "fromDate").trim(),
    toDate: getParam(source, "toDate").trim(),
    page: parsePositiveInt(getParam(source, "page"), 1),
    pageSize: getPageSize(getParam(source, "pageSize"), 20),
  };
}

export async function getAuditsPageData(
  input: ReturnType<typeof parseAuditsQuery>,
): Promise<AuditsPageData> {
  const where: Prisma.AdminAuditLogWhereInput = buildAuditWhere({
    query: input.query,
    targetType: input.targetType,
    action: input.action,
    fromDate: input.fromDate,
    toDate: input.toDate,
  });

  const total = await prisma.adminAuditLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / input.pageSize));
  const page = Math.min(input.page, totalPages);
  const skip = (page - 1) * input.pageSize;

  const logs = await prisma.adminAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: input.pageSize,
    select: {
      id: true,
      action: true,
      targetType: true,
      targetIds: true,
      summary: true,
      createdAt: true,
      details: true,
      adminUser: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });

  return {
    filters: {
      query: input.query,
      targetType: input.targetType,
      action: input.action,
      fromDate: input.fromDate,
      toDate: input.toDate,
    },
    page,
    pageSize: input.pageSize,
    totalPages,
    total,
    logs,
  };
}