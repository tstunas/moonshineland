import type { Prisma } from "@/generated/prisma/client";

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
