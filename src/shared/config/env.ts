const DEFAULT_API_BASE_URL = "/vocab-learning";

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
  isDev: import.meta.env.DEV
} as const;
