export type DashboardSearchParams = Record<string, string | string[] | undefined>;

const TRANSIENT_QUERY_KEYS = new Set([
  "confirmAction",
  "confirmIds",
  "confirmValue",
  "toast",
  "toastType",
]);

export function toPersistentParams(params: DashboardSearchParams): URLSearchParams {
  const result = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (TRANSIENT_QUERY_KEYS.has(key)) {
      return;
    }

    const single = toSingleParam(value);
    if (!single) {
      return;
    }

    result.set(key, single);
  });

  return result;
}

export function toSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export function parsePositiveInt(value: string, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function parseIdsCsv(value: string): number[] {
  return value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
}

export function sanitizeReturnTo(raw: FormDataEntryValue | null, basePath: string): string {
  if (typeof raw !== "string") {
    return basePath;
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith(basePath)) {
    return basePath;
  }

  return trimmed;
}

export function buildHref(
  pathname: string,
  baseParams: URLSearchParams,
  updates: Record<string, string | number | undefined>,
): string {
  const next = new URLSearchParams(baseParams);

  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      next.delete(key);
      return;
    }

    next.set(key, String(value));
  });

  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function clearConfirmQuery(returnTo: string): string {
  const url = new URL(returnTo, "http://localhost");
  url.searchParams.delete("confirmAction");
  url.searchParams.delete("confirmIds");
  url.searchParams.delete("confirmValue");

  const query = url.searchParams.toString();
  return query ? `${url.pathname}?${query}` : url.pathname;
}

export function withToastQuery(
  returnTo: string,
  message: string,
  type: "success" | "error" = "success",
): string {
  const url = new URL(returnTo, "http://localhost");
  url.searchParams.set("toast", message);
  url.searchParams.set("toastType", type);

  const query = url.searchParams.toString();
  return query ? `${url.pathname}?${query}` : url.pathname;
}

export function buildConfirmHref(
  returnTo: string,
  action: string,
  ids: number[],
  value?: string,
): string {
  const url = new URL(returnTo, "http://localhost");
  url.searchParams.set("confirmAction", action);
  url.searchParams.set("confirmIds", ids.join(","));

  if (value) {
    url.searchParams.set("confirmValue", value);
  } else {
    url.searchParams.delete("confirmValue");
  }

  const query = url.searchParams.toString();
  return query ? `${url.pathname}?${query}` : url.pathname;
}

export function getIdsFromFormData(formData: FormData, key: string): number[] {
  const fromList = formData
    .getAll(key)
    .map((value) => Number(value))
    .filter((id) => Number.isInteger(id) && id > 0);

  if (fromList.length > 0) {
    return Array.from(new Set(fromList));
  }

  const csv = formData.get(`${key}Csv`);
  if (typeof csv !== "string") {
    return [];
  }

  return Array.from(new Set(parseIdsCsv(csv)));
}

export function formatDateTime(value: Date): string {
  return value.toLocaleString("ko-KR", {
    hour12: false,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function getPageSize(value: string, fallback: number, allowed: number[]): number {
  const parsed = parsePositiveInt(value, fallback);
  return allowed.includes(parsed) ? parsed : fallback;
}
