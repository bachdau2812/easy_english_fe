import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { useAuth } from "../../auth/hooks/useAuth";
import { listeningApi } from "../api/listeningApi";

export const useListeningCategories = () =>
  useQuery({
    queryKey: queryKeys.listeningCategories(),
    queryFn: listeningApi.getCategories
  });

export const useListeningSubCategories = (categoryId?: string | null) =>
  useQuery({
    enabled: Boolean(categoryId),
    queryKey: queryKeys.listeningSubCategories(categoryId),
    queryFn: () => listeningApi.getSubCategories(categoryId as string)
  });

export const useListeningExercises = (subCategoryName?: string | null) => {
  const { userId } = useAuth();

  return useQuery({
    enabled: Boolean(subCategoryName && userId),
    queryKey: queryKeys.listeningLessons(subCategoryName, userId),
    queryFn: () =>
      listeningApi.getLessons({
        subCategoryName: subCategoryName as string,
        userId: userId as string
      })
  });
};
