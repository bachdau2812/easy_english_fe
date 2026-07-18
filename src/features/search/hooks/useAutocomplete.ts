import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { useDebounce } from "../../../shared/hooks/useDebounce";
import { normalizeSearchText } from "../../../shared/utils/normalize";
import { searchApi } from "../api/searchApi";

export const useAutocomplete = (text: string) => {
  const normalizedText = normalizeSearchText(text);
  const debouncedText = useDebounce(normalizedText, 250);

  return useQuery({
    enabled: debouncedText.length > 0,
    queryKey: queryKeys.autocomplete(debouncedText),
    queryFn: ({ signal }) => searchApi.autocomplete(debouncedText, signal)
  });
};
