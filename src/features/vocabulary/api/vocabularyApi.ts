import { PageResponse } from "../../../shared/api/apiResponse";
import { apiClient } from "../../../shared/api/apiClient";
import { WordResponse } from "../../dictionary/types";
import {
  UserSearchHistoryRequest,
  UserSearchHistoryResponse,
  UserVocabularyInfoResponse,
  UserVocabularyInfoType,
  UserVocabularyRequest,
  UserVocabularyResponse
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
