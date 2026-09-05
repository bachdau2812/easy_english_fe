export const SAVED_VOCABULARY_SEARCH_MIN_LENGTH = 2;
export const SAVED_VOCABULARY_SEARCH_DEBOUNCE_MS = 300;

export const getNextSavedVocabularySearchIndex = (
  currentIndex: number,
  itemCount: number,
  direction: -1 | 1
) => {
  if (itemCount <= 0) return -1;
  if (currentIndex < 0) return direction === 1 ? 0 : itemCount - 1;
  return (currentIndex + direction + itemCount) % itemCount;
};
