import { apiClient } from "../../../shared/api/apiClient";
import { UserVocabularyStatisticResponse } from "../types";

export const statisticsApi = {
  getDaily(userId: string) {
    return apiClient.get<UserVocabularyStatisticResponse>("/user-vocabularies/statistics/daily", {
      query: { userId }
    });
  },
  getOverall(userId: string) {
    return apiClient.get<UserVocabularyStatisticResponse>("/user-vocabularies/statistics/overall", {
      query: { userId }
    });
  }
  // TODO: backend_context.md says streak API is not implemented in current backend code.
};
