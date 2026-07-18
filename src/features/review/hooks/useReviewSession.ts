import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { useAuth } from "../../auth/hooks/useAuth";
import { reviewApi } from "../api/reviewApi";

export const useReviewSession = (totalReviewVocab: 30 | 60 | 90 = 30) => {
  const { userId } = useAuth();

  return useQuery({
    enabled: Boolean(userId),
    queryKey: queryKeys.reviewSession(userId, totalReviewVocab),
    queryFn: () =>
      reviewApi.getReviewSession({
        userId: userId as string,
        totalReviewVocab,
        langCode: "vi"
      })
  });
};
