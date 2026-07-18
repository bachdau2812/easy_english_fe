import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { useAuth } from "../../auth/hooks/useAuth";
import { statisticsApi } from "../api/statisticsApi";

export const useStatistics = (scope: "daily" | "overall") => {
  const { userId } = useAuth();

  return useQuery({
    enabled: Boolean(userId),
    queryKey: queryKeys.statistics(userId, scope),
    queryFn: () =>
      scope === "daily"
        ? statisticsApi.getDaily(userId as string)
        : statisticsApi.getOverall(userId as string)
  });
};
