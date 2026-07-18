import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { useAuth } from "../../auth/hooks/useAuth";
import { vocabularyApi } from "../api/vocabularyApi";

export const useSavedVocabularies = (level = 1) => {
  const { userId } = useAuth();

  return useQuery({
    enabled: Boolean(userId),
    queryKey: queryKeys.savedVocabularies(userId, level),
    queryFn: () =>
      vocabularyApi.getSavedVocabulariesByLevel({
        userId: userId as string,
        level
      })
  });
};
