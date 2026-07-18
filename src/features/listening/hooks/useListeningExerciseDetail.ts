import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { useAuth } from "../../auth/hooks/useAuth";
import { listeningApi } from "../api/listeningApi";

export const useListeningExerciseDetail = (lessonId?: string) => {
  const { userId } = useAuth();

  return useQuery({
    enabled: Boolean(userId && lessonId),
    queryKey: queryKeys.listeningLessonDetail(lessonId, userId),
    queryFn: () =>
      listeningApi.getLessonDetail({
        lessonId: lessonId as string,
        userId: userId as string
      })
  });
};
