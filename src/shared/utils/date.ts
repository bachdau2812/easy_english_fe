export const formatDate = (value?: string | null): string => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(date);
};

export const toBackendDate = (date: Date): string => date.toISOString().slice(0, 10);
