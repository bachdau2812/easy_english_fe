import type { UserVocabularyLevelQuantityResponse } from "./types";

export const canReuseSavedVocabularyPage = (
  previousQueryKey: readonly unknown[] | undefined,
  current: { level: number | null; limit: number; userId?: string | null }
) =>
  previousQueryKey?.[0] === "vocabulary" &&
  previousQueryKey[1] === "saved" &&
  previousQueryKey[2] === current.userId &&
  previousQueryKey[3] === current.level &&
  previousQueryKey[5] === current.limit;

export const normalizeVocabularyLevelQuantities = (
  items?: UserVocabularyLevelQuantityResponse[] | null
): UserVocabularyLevelQuantityResponse[] => {
  const quantities = new Map(
    (items ?? [])
      .filter((item) => Number.isInteger(item.level) && item.level >= 1 && item.level <= 6)
      .map((item) => [item.level, item.quantity] as const)
  );

  return Array.from({ length: 6 }, (_, index) => ({
    level: index + 1,
    quantity: quantities.get(index + 1) ?? 0
  }));
};
