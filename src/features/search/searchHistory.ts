export type SearchHistoryWord = {
  wordId?: string | null;
};

type SearchHistoryPayload = {
  userId: string;
  wordId: string;
};

type RecordSuccessfulSearchHistoryOptions = {
  userId?: string | null;
  words?: readonly SearchHistoryWord[] | null;
  record: (payload: SearchHistoryPayload) => Promise<unknown>;
  onRecorded?: () => void;
  onError?: (error: unknown) => void;
};

export const recordSuccessfulSearchHistory = async ({
  userId,
  words,
  record,
  onRecorded,
  onError
}: RecordSuccessfulSearchHistoryOptions): Promise<boolean> => {
  const wordId = words?.find((word) => Boolean(word.wordId?.trim()))?.wordId?.trim();
  if (!userId?.trim() || !wordId) {
    return false;
  }

  try {
    await record({ userId, wordId });
    onRecorded?.();
    return true;
  } catch (error) {
    onError?.(error);
    return false;
  }
};
