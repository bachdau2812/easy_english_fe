import { ApiError } from "./apiError";
import { ApiResponse } from "./apiResponse";
import { env } from "../config/env";

type QueryValue = string | number | boolean | null | undefined;

interface RequestOptions extends Omit<RequestInit, "body"> {
  auth?: boolean;
  body?: unknown;
  query?: Record<string, QueryValue>;
}

const AUTH_TOKEN_STORAGE_KEY = "vocab.auth.token";
export const AUTH_REQUIRED_EVENT = "vocab.auth.required";

export const authTokenStorage = {
  get(): string | null {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  },
  set(token: string): void {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  },
  clear(): void {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
};

const buildUrl = (path: string, query?: Record<string, QueryValue>): string => {
  const url = new URL(`${env.apiBaseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
};

const parseResponseBody = async <T>(response: Response): Promise<ApiResponse<T> | null> => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    throw new ApiError("The server returned an invalid response.", {
      status: response.status
    });
  }
};

const isUnauthenticatedResponse = (status: number, code?: number): boolean =>
  status === 401 || code === 1001 || code === 2008;

const emitAuthRequired = (error: ApiError): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(AUTH_REQUIRED_EVENT, {
      detail: {
        code: error.code,
        message: error.message,
        status: error.status,
        traceId: error.traceId
      }
    })
  );
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const headers = new Headers(options.headers);
  const token = authTokenStorage.get();

  headers.set("Accept", "application/json");

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth !== false && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path, options.query), {
    ...options,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers
  });

  const payload = await parseResponseBody<T>(response);

  if (!response.ok || (payload && payload.code >= 3000)) {
    const error = new ApiError(payload?.message ?? "The request could not be completed.", {
      status: response.status,
      code: payload?.code,
      traceId: payload?.traceId
    });

    if (
      isUnauthenticatedResponse(response.status, payload?.code) &&
      (options.auth !== false || payload?.code === 1001 || payload?.code === 2008)
    ) {
      emitAuthRequired(error);
    }

    throw error;
  }

  return payload?.result as T;
};

export const apiClient = {
  get<T>(path: string, options?: RequestOptions) {
    return request<T>(path, { ...options, method: "GET" });
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>(path, { ...options, body, method: "POST" });
  },
  put<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>(path, { ...options, body, method: "PUT" });
  },
  delete<T>(path: string, options?: RequestOptions) {
    return request<T>(path, { ...options, method: "DELETE" });
  }
};
