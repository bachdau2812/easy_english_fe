export const buildAutocompleteQuery = (text: string, isUniqueSearch: boolean) => ({
  text,
  isAutocomplete: true,
  ...(isUniqueSearch ? { isUniqueSearch: true } : {})
});

export const selectFullSearchResults = <T>(results: T[], isUniqueSearch: boolean): T[] =>
  isUniqueSearch ? results : results.slice(0, 1);
