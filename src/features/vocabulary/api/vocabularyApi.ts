import type { PageResponse } from "../../../shared/api/apiResponse";
import { apiClient } from "../../../shared/api/apiClient";
import type { WordResponse } from "../../dictionary/types";
import type {
  UserSearchHistoryRequest,
  UserSearchHistoryResponse,
  UserVocabularyInfoResponse,
  UserVocabularyInfoType,
  UserVocabularyRequest,
  UserVocabularyResponse,
  UserVocabularySearchResponse
} from "../types";

export const vocabularyApi = {
  saveVocabulary(payload: UserVocabularyRequest) {
    return apiClient.post<UserVocabularyResponse>("/user-vocabularies", payload);
  },
  getVocabularyInfo(params: { infoType: UserVocabularyInfoType; userId: string }) {
    return apiClient.get<UserVocabularyInfoResponse>("/user-vocabularies/info", {
      query: {
        userId: params.userId,
        infoType: params.infoType
      }
    });
  },
  getSavedVocabulariesByLevel(params: {
    level: number;
    limit?: number;
    page?: number;
    userId: string;
  }) {
    return apiClient.get<PageResponse<UserVocabularyResponse>>("/user-vocabularies/by-level", {
      query: {
        userId: params.userId,
        level: params.level,
        page: params.page ?? 0,
        limit: params.limit ?? 20
      }
    });
  },
  getSavedVocabularyWord(userVocabId: string) {
    return apiClient.get<WordResponse>(`/user-vocabularies/${userVocabId}/word`);
  },
  searchSavedVocabularies(params: {
    text: string;
    isAutocomplete: boolean;
    page: number;
    limit: number;
    signal?: AbortSignal;
  }) {
    return apiClient.get<PageResponse<UserVocabularySearchResponse>>("/user-vocabularies/search", {
      signal: params.signal,
      query: {
        text: params.text,
        isAutocomplete: params.isAutocomplete,
        page: params.page,
        limit: params.limit
      }
    });
  },
  addSearchHistory(payload: UserSearchHistoryRequest) {
    return apiClient.post<UserSearchHistoryResponse>("/user-vocabularies/search-history", payload);
  },
  getSearchHistory(params: { limit?: number; page?: number; userId: string }) {
    return apiClient.get<PageResponse<UserSearchHistoryResponse>>(
      "/user-vocabularies/search-history",
      {
        query: { userId: params.userId, page: params.page ?? 0, limit: params.limit ?? 20 }
      }
    );
  }
};
