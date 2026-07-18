import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { useAuth } from "../../auth/hooks/useAuth";
import { dictionaryApi } from "../api/dictionaryApi";

export const useWordDetail = (wordId?: string) => {
  const { userId } = useAuth();

  return useQuery({
    enabled: Boolean(wordId),
    queryKey: queryKeys.wordDetail(wordId),
    queryFn: () =>
      dictionaryApi.getWordDetail({
        wordId: wordId as string,
        isTrans: true,
        transLangCode: "vi",
        userId
      })
  });
};
