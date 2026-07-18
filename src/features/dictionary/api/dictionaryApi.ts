import { apiClient } from "../../../shared/api/apiClient";
import { PageResponse } from "../../../shared/api/apiResponse";
import {
  Category,
  Word,
  WordExampleResponse,
  WordFormResponse,
  WordIdiomResponse,
  WordRelationResponse,
  WordResponse,
  WordSenseResponse
} from "../types";

export const dictionaryApi = {
  getCategories() {
    return apiClient.get<Category[]>("/word-data/categories");
  },
  getWordsByLevel(params: { level: string; limit?: number; page?: number }) {
    return apiClient.get<PageResponse<Word>>("/word-data/words/by-level", {
      query: { level: params.level, page: params.page ?? 0, limit: params.limit ?? 12 }
    });
  },
  searchWordsByLevel(params: {
    isAutocomplete?: boolean;
    level: string;
    limit?: number;
    page?: number;
    text: string;
  }) {
    return apiClient.get<PageResponse<Word>>("/word-data/words/basic-search/by-level", {
      query: {
        text: params.text,
        level: params.level,
        isAutocomplete: params.isAutocomplete ?? true,
        page: params.page ?? 0,
        limit: params.limit ?? 12
      }
    });
  },
  getWordsByCategory(params: { categoryId: string; limit?: number; page?: number }) {
    return apiClient.get<PageResponse<Word>>("/word-data/words/by-category", {
      query: { categoryId: params.categoryId, page: params.page ?? 0, limit: params.limit ?? 12 }
    });
  },
  searchWordsByCategory(params: {
    categoryId: string;
    isAutocomplete?: boolean;
    limit?: number;
    page?: number;
    text: string;
  }) {
    return apiClient.get<PageResponse<Word>>("/word-data/words/basic-search/by-category", {
      query: {
        text: params.text,
        categoryId: params.categoryId,
        isAutocomplete: params.isAutocomplete ?? true,
        page: params.page ?? 0,
        limit: params.limit ?? 12
      }
    });
  },
  getWordDetail(params: {
    isTrans?: boolean;
    transLangCode?: string;
    userId?: string | null;
    wordId: string;
  }) {
    return apiClient.get<WordResponse>("/word-data/word", {
      query: {
        wordId: params.wordId,
        isTrans: params.isTrans ?? true,
        transLangCode: params.transLangCode,
        userId: params.userId
      }
    });
  },
  getSenses(wordId: string, transLangCode?: string) {
    return apiClient.get<WordSenseResponse[]>("/word-data/senses", {
      query: { wordId, isTrans: Boolean(transLangCode), transLangCode }
    });
  },
  getExamples(wordId: string, transLangCode?: string) {
    return apiClient.get<WordExampleResponse[]>("/word-data/examples", {
      query: { wordId, isTrans: Boolean(transLangCode), transLangCode }
    });
  },
  getIdioms(wordId: string, transLangCode?: string) {
    return apiClient.get<WordIdiomResponse[]>("/word-data/idioms", {
      query: { wordId, isTrans: Boolean(transLangCode), transLangCode }
    });
  },
  getForms(wordId: string) {
    return apiClient.get<WordFormResponse[]>("/word-data/forms", { query: { wordId } });
  },
  getRelations(wordId: string) {
    return apiClient.get<WordRelationResponse[]>("/word-data/relations", { query: { wordId } });
  }
};
