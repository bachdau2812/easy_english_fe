import { apiClient } from "../../../shared/api/apiClient";
import {
  SubmitReviewAttemptRequest,
  UserVocabAttemptResponse,
  VocabReviewQuizResponse
} from "../types";

export const reviewApi = {
  getReviewSession(params: { langCode?: string; totalReviewVocab?: 30 | 60 | 90; userId: string }) {
    return apiClient.get<VocabReviewQuizResponse[]>("/exercises/vocab-review", {
      query: {
        userId: params.userId,
        totalReviewVocab: params.totalReviewVocab ?? 30,
        langCode: params.langCode ?? "vi"
      }
    });
  },
  getReviewQuestionForWord(params: { langCode?: string; userId: string; userVocabId: string }) {
    return apiClient.get<unknown>("/exercises/vocab-review/word", {
      query: {
        userId: params.userId,
        userVocabId: params.userVocabId,
        langCode: params.langCode ?? "vi"
      }
    });
  },
  submitReviewAnswer(payload: SubmitReviewAttemptRequest) {
    return apiClient.post<UserVocabAttemptResponse>("/user-vocabularies/review-attempts", payload);
  }
};
