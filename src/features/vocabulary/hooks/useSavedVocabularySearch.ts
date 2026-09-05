import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { useDebounce } from "../../../shared/hooks/useDebounce";
import { normalizeSearchText } from "../../../shared/utils/normalize";
import { vocabularyApi } from "../api/vocabularyApi";
import {
  SAVED_VOCABULARY_SEARCH_DEBOUNCE_MS,
  SAVED_VOCABULARY_SEARCH_MIN_LENGTH
} from "../savedVocabularySearch";

export const useSavedVocabularySearch = (text: string) => {
  const normalizedText = normalizeSearchText(text);
  const debouncedText = useDebounce(normalizedText, SAVED_VOCABULARY_SEARCH_DEBOUNCE_MS);
  const isEligible = debouncedText.length >= SAVED_VOCABULARY_SEARCH_MIN_LENGTH;

  const query = useQuery({
    enabled: isEligible,
    queryKey: queryKeys.savedVocabularySearch(debouncedText, true, 0, 20),
    queryFn: ({ signal }) => vocabularyApi.searchSavedVocabularies({
      text: debouncedText,
      isAutocomplete: true,
      page: 0,
      limit: 20,
      signal
    })
  });

  return {
    ...query,
    isDebouncing:
      normalizedText.length >= SAVED_VOCABULARY_SEARCH_MIN_LENGTH && normalizedText !== debouncedText
  };
};
