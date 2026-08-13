import { apiClient } from "../../../shared/api/apiClient";
import { Word, WordResponse } from "../../dictionary/types";
import { buildAutocompleteQuery } from "./searchParams";

export const searchApi = {
  autocomplete(text: string, isUniqueSearch = false, signal?: AbortSignal) {
    return apiClient.get<Word[]>("/word-data/words/basic-search", {
      auth: false,
      query: buildAutocompleteQuery(text, isUniqueSearch),
      signal
    });
  },
  basicSearch(text: string) {
    return apiClient.get<Word[]>("/word-data/words/basic-search", {
      auth: false,
      query: { text, isAutocomplete: false }
    });
  },
  fullSearch(text: string, transLangCode = "vi") {
    return apiClient.get<WordResponse[]>("/word-data/words/search", {
      auth: false,
      query: { text, isTrans: true, transLangCode }
    });
  }
};
