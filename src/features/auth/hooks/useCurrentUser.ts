import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { authApi } from "../api/authApi";
import { useAuth } from "./useAuth";

export const useCurrentUser = () => {
  const { userId } = useAuth();

  return useQuery({
    enabled: Boolean(userId),
    queryKey: queryKeys.currentUser(userId),
    queryFn: () => authApi.getUserInfo(userId as string)
  });
};
