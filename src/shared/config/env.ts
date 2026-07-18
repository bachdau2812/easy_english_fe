const DEFAULT_API_BASE_URL = "http://localhost:8080/vocab-learning";

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
  isDev: import.meta.env.DEV
} as const;
