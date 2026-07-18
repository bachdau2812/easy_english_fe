import { ApiError, getSafeErrorMessage } from "../api/apiError";

interface ErrorStateProps {
  error?: unknown;
  title?: string;
}

export const ErrorState = ({ error, title = "Something went wrong" }: ErrorStateProps) => {
  const traceId = error instanceof ApiError ? error.traceId : null;

  return (
    <div className="state" role="alert">
      <strong>{title}</strong>
      <span>{getSafeErrorMessage(error)}</span>
      {traceId ? <small>Trace ID: {traceId}</small> : null}
    </div>
  );
};
