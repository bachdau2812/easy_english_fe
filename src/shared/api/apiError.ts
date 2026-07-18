export class ApiError extends Error {
  readonly status: number;
  readonly code?: number;
  readonly traceId?: string | null;

  constructor(message: string, options: { status: number; code?: number; traceId?: string | null }) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.traceId = options.traceId;
  }
}

export const getSafeErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
};
