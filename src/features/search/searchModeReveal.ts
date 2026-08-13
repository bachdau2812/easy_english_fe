export interface SearchModeRevealState {
  isUniqueSearch: boolean;
  revealKey: number;
}

export const toggleSearchModeReveal = (
  state: SearchModeRevealState
): SearchModeRevealState => ({
  isUniqueSearch: !state.isUniqueSearch,
  revealKey: state.revealKey + (state.isUniqueSearch ? 0 : 1)
});
