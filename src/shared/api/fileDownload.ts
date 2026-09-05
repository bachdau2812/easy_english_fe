export interface DownloadFileResponse {
  blob: Blob;
  filename: string | null;
}

export const getDownloadFilename = (contentDisposition: string | null): string | null => {
  if (!contentDisposition) {
    return null;
  }

  const encodedFilename = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];

  if (encodedFilename) {
    try {
      return decodeURIComponent(encodedFilename.trim());
    } catch {
      return null;
    }
  }

  return contentDisposition.match(/filename="?([^";]+)"?/i)?.[1]?.trim() ?? null;
};

export const triggerBlobDownload = (blob: Blob, filename: string): void => {
  const objectUrl = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};
