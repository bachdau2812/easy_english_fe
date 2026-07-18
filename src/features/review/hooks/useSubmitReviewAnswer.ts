import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../auth/hooks/useAuth";
import { reviewApi } from "../api/reviewApi";
import { SubmitReviewAttemptRequest } from "../types";

export const useSubmitReviewAnswer = () => {
  const { userId } = useAuth();

  return useMutation({
    mutationFn: (payload: Omit<SubmitReviewAttemptRequest, "userId">) => {
      if (!userId) {
        throw new Error("You must be logged in to submit a review answer.");
      }

      return reviewApi.submitReviewAnswer({ ...payload, userId });
    }
  });
};
