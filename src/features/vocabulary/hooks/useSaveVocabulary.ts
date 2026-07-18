import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { useAuth } from "../../auth/hooks/useAuth";
import { vocabularyApi } from "../api/vocabularyApi";
import { UserVocabularyRequest } from "../types";

export const useSaveVocabulary = () => {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Omit<UserVocabularyRequest, "userId">) => {
      if (!userId) {
        throw new Error("You must be logged in to save vocabulary.");
      }

      return vocabularyApi.saveVocabulary({ ...payload, userId });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.savedVocabularies(userId) });
    }
  });
};
