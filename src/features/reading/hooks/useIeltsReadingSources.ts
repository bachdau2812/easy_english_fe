import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { readingApi } from "../api/readingApi";

export const useIeltsReadingCategories = () =>
  useQuery({
    queryKey: queryKeys.ieltsReadingCategories(),
    queryFn: readingApi.getIeltsReadingCategories
  });

export const useIeltsReadingSourcesByCategory = (name?: string | null, page = 0, limit = 20) =>
  useQuery({
    enabled: Boolean(name),
    queryKey: queryKeys.ieltsReadingSourcesByCategory(name, page, limit),
    queryFn: () =>
      readingApi.getIeltsReadingSourcesByCategory({
        limit,
        name: name as string,
        page
      })
  });

export const useIeltsReadingSources = (page = 0, limit = 100) =>
  useQuery({
    queryKey: queryKeys.ieltsReadingSources(page, limit),
    queryFn: () => readingApi.getIeltsReadingSources({ limit, page })
  });
