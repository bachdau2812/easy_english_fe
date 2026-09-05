import type { PageResponse } from "../../shared/api/apiResponse";
import type { ISODateString, UUID } from "../../shared/types/common";
import type { WordResponse } from "../dictionary/types";

export interface UserVocabularyResponse {
  id?: UUID | null;
  userId?: UUID | null;
  wordId?: UUID | null;
  word?: string | null;
  senseId?: UUID | null;
  senseLocalizedId?: UUID | null;
  level?: number | null;
  currentLevelCorrectTurns?: number | null;
  nextReviewAt?: ISODateString | null;
  createdAt?: ISODateString | null;
  updatedAt?: ISODateString | null;
}

export interface UserVocabularyRequest {
  userId: UUID;
  wordId: UUID;
  senseId?: UUID | null;
  senseLocalizedId?: UUID | null;
  level?: number | null;
}

export type UserVocabularyInfoType = "VOCAB_QUANTITY" | "VOCAB_REVIEW";

export interface UserVocabularyLevelQuantityResponse {
  level: number;
  quantity: number;
}

export interface UserVocabularyInfoResponse {
  userId: UUID;
  infoType: UserVocabularyInfoType;
  totalQuantity: number | null;
  quantityByLevels: UserVocabularyLevelQuantityResponse[] | null;
  reviewQuantity: number | null;
}

export interface UserSearchHistoryResponse {
  id?: UUID | null;
  userId?: UUID | null;
  wordId?: UUID | null;
  word?: string | null;
  searchedAt?: ISODateString | null;
}

export interface UserSearchHistoryRequest {
  userId: UUID;
  wordId: UUID;
}

export interface UserVocabularySearchResponse {
  userVocabulary: UserVocabularyResponse;
  word: WordResponse;
}

export type SavedVocabularyPageResponse = PageResponse<UserVocabularyResponse>;
export type SavedVocabularyWordResponse = WordResponse;
