import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { logger } from "../../../shared/utils/logger";
import { useAuth } from "../../auth/hooks/useAuth";
import { vocabularyApi } from "../../vocabulary/api/vocabularyApi";
import { recordSuccessfulSearchHistory, SearchHistoryWord } from "../searchHistory";

export const useRecordSearchHistory = (userIdOverride?: string | null) => {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const userId = userIdOverride === undefined ? auth.userId : userIdOverride;

  return useCallback((words: readonly SearchHistoryWord[]) => {
    void recordSuccessfulSearchHistory({
      userId,
      words,
      record: vocabularyApi.addSearchHistory,
      onRecorded: () => {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.searchHistory(userId)
        });
      },
      onError: (error) => {
        logger.warn("Unable to save word search history", {
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });
  }, [queryClient, userId]);
};
