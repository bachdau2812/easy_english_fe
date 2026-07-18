import { useMemo } from "react";
import { Word } from "../types";

export const useDefaultSuggestions = (): Word[] => {
  // TODO: Backend has search history, but no default suggestion endpoint. Replace this
  // with recent searches or curated words when the desired source is confirmed.
  return useMemo(() => [], []);
};
