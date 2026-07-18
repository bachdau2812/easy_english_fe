import { env } from "../config/env";

type LogValue = string | number | boolean | null | undefined | object;

const redact = (value: LogValue): LogValue => {
  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      const sensitive = /password|token|cookie|authorization/i.test(key);
      return [key, sensitive ? "[redacted]" : entry];
    })
  );
};

export const logger = {
  debug(message: string, context?: LogValue) {
    if (env.isDev) {
      console.debug(message, redact(context));
    }
  },
  warn(message: string, context?: LogValue) {
    if (env.isDev) {
      console.warn(message, redact(context));
    }
  },
  error(message: string, context?: LogValue) {
    if (env.isDev) {
      console.error(message, redact(context));
    }
  }
};
