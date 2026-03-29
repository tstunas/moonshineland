"use server";

import {
  getArchiveStorage,
  getArchiveStorageProviderName,
  type ArchiveRecord,
  type ArchiveStorageProviderName,
} from "@/features/archive/storage/archiveStorage";

export type ArchiveListItem = ArchiveRecord;

export interface GetArchiveListActionInput {
  query?: string;
  page?: number;
  pageSize?: number;
}

export interface ArchiveListActionResult {
  items: ArchiveListItem[];
  query: string;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  storageProvider: ArchiveStorageProviderName;
}

function normalizePage(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.floor(value));
}

function normalizePageSize(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) {
    return 6;
  }

  return Math.min(20, Math.max(1, Math.floor(value)));
}

function matchesQuery(item: ArchiveListItem, query: string): boolean {
  if (!query) {
    return true;
  }

  const normalizedQuery = query.toLowerCase();
  const haystack = [item.key, item.title, item.description, ...item.tags]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

export async function getArchiveListAction(
  input: GetArchiveListActionInput = {},
): Promise<ArchiveListActionResult> {
  const storage = getArchiveStorage();
  const storageProvider = getArchiveStorageProviderName();
  const query = (input.query ?? "").trim();
  const page = normalizePage(input.page);
  const pageSize = normalizePageSize(input.pageSize);

  const allArchives = await storage.listArchives();
  const filtered = allArchives.filter((item) => matchesQuery(item, query));
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;
  const items = filtered.slice(offset, offset + pageSize);

  return {
    items,
    query,
    page: safePage,
    pageSize,
    totalCount,
    totalPages,
    storageProvider,
  };
}
