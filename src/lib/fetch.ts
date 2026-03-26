/**
 * Fetch Wrapper
 * API 호출의 일관성과 에러 처리를 제공합니다
 */

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
  timeout?: number;
}

interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  status: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

/**
 * URL에 쿼리 파라미터를 추가합니다
 */
function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean>,
): string {
  const url = new URL(endpoint, API_BASE_URL || "http://localhost:3000");

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }

  return url.toString();
}

/**
 * 에러 메시지를 추출합니다
 */
async function getErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.message || data.error || response.statusText;
  } catch {
    return response.statusText;
  }
}

/**
 * Fetch Wrapper - GET, POST, PUT, DELETE 등을 지원합니다
 */
export async function apiCall<T = unknown>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<ApiResponse<T>> {
  const { params, timeout = 10000, ...fetchOptions } = options;

  const url = buildUrl(endpoint, params);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await getErrorMessage(response);
      return {
        ok: false,
        error,
        status: response.status,
      };
    }

    const data = await response.json();

    return {
      ok: true,
      data: data as T,
      status: response.status,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        error: "Request timeout",
        status: 408,
      };
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      ok: false,
      error: errorMessage,
      status: 0,
    };
  }
}

/**
 * GET 요청
 */
export async function apiGet<T = unknown>(
  endpoint: string,
  options?: Omit<FetchOptions, "method" | "body">,
): Promise<ApiResponse<T>> {
  return apiCall<T>(endpoint, {
    ...options,
    method: "GET",
  });
}

/**
 * POST 요청
 */
export async function apiPost<T = unknown>(
  endpoint: string,
  body?: unknown,
  options?: Omit<FetchOptions, "method" | "body">,
): Promise<ApiResponse<T>> {
  return apiCall<T>(endpoint, {
    ...options,
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT 요청
 */
export async function apiPut<T = unknown>(
  endpoint: string,
  body?: unknown,
  options?: Omit<FetchOptions, "method" | "body">,
): Promise<ApiResponse<T>> {
  return apiCall<T>(endpoint, {
    ...options,
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE 요청
 */
export async function apiDelete<T = unknown>(
  endpoint: string,
  options?: Omit<FetchOptions, "method" | "body">,
): Promise<ApiResponse<T>> {
  return apiCall<T>(endpoint, {
    ...options,
    method: "DELETE",
  });
}

/**
 * PATCH 요청
 */
export async function apiPatch<T = unknown>(
  endpoint: string,
  body?: unknown,
  options?: Omit<FetchOptions, "method" | "body">,
): Promise<ApiResponse<T>> {
  return apiCall<T>(endpoint, {
    ...options,
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
}
