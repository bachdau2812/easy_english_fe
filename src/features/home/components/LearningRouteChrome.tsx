import { ReactNode, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getSafeErrorMessage } from "../../../shared/api/apiError";
import { ROUTES } from "../../../shared/constants/routes";
import { normalizeSearchText } from "../../../shared/utils/normalize";
import { dictionaryApi } from "../../dictionary/api/dictionaryApi";
import { Word, WordResponse } from "../../dictionary/types";
import { searchApi } from "../../search/api/searchApi";
import { selectFullSearchResults } from "../../search/api/searchParams";
import { useRecordSearchHistory } from "../../search/hooks/useRecordSearchHistory";
import { AccountModal } from "./AccountModal";
import { AuthModal } from "./AuthModal";
import { HomeNavbar } from "./HomeNavbar";
import type { VocabularyExplorerMode } from "./HomeVocabularyExplorer";
import { HomeWordDetailModal } from "./HomeWordDetailModal";

export const LearningRouteChrome = ({
  children,
  compactTitle
}: {
  children: ReactNode;
  compactTitle: string;
}) => {
  const navigate = useNavigate();
  const recordSearchHistory = useRecordSearchHistory();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [, setLanguageCode] = useState("vi");
  const [modalWords, setModalWords] = useState<WordResponse[]>([]);
  const [wordError, setWordError] = useState<string | null>(null);

  const openWord = useMutation({
    mutationFn: ({ transLangCode, word }: { transLangCode: string; word: Word }) => {
      if (!word.id) {
        throw new Error("This word is missing an id.");
      }

      return dictionaryApi.getWordDetail({
        wordId: word.id,
        isTrans: true,
        transLangCode
      });
    },
    onMutate: () => setWordError(null),
    onSuccess: (word) => {
      setModalWords([word]);
      recordSearchHistory([word]);
    },
    onError: (error) => setWordError(getSafeErrorMessage(error))
  });

  const searchWord = useMutation({
    mutationFn: async ({
      isUniqueSearch,
      text,
      transLangCode
    }: {
      isUniqueSearch: boolean;
      text: string;
      transLangCode: string;
    }) => {
      const results = await searchApi.fullSearch(text, transLangCode);
      return selectFullSearchResults(results, isUniqueSearch);
    },
    onMutate: () => setWordError(null),
    onSuccess: (words) => {
      if (words.length > 0) {
        setModalWords(words);
        recordSearchHistory(words);
      } else {
        setWordError("Word not found.");
      }
    },
    onError: (error) => setWordError(getSafeErrorMessage(error))
  });

  const openVocabularyRoute = (mode: VocabularyExplorerMode) => {
    navigate(
      mode === "topics"
        ? ROUTES.vocabularyTopics
        : mode === "levels"
          ? ROUTES.vocabularyLevels
          : ROUTES.vocabularyMine
    );
  };

  return (
    <div className="guest-home">
      <HomeNavbar
        compactTitle={compactTitle}
        onAuthOpen={() => setIsAuthOpen(true)}
        onHomeClick={() => navigate(ROUTES.home)}
        onLanguageChange={setLanguageCode}
        onProfileOpen={() => setIsAccountOpen(true)}
        onSearchSubmit={(text, nextLanguageCode, isUniqueSearch) => {
          setLanguageCode(nextLanguageCode);
          searchWord.mutate({ text, transLangCode: nextLanguageCode, isUniqueSearch });
        }}
        onSuggestionSelect={(word, nextLanguageCode, isUniqueSearch) => {
          setLanguageCode(nextLanguageCode);

          if (isUniqueSearch) {
            const text = normalizeSearchText(word.normalizedWord ?? word.word ?? "");

            if (text) {
              searchWord.mutate({ text, transLangCode: nextLanguageCode, isUniqueSearch: true });
            }
          } else {
            openWord.mutate({ word, transLangCode: nextLanguageCode });
          }
        }}
        onVocabularySelect={openVocabularyRoute}
      />
      <main>
        {wordError ? (
          <div className="home-word-save-message" role="alert">
            {wordError}
          </div>
        ) : null}
        {children}
      </main>
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <AccountModal isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} />
      <HomeWordDetailModal
        onClose={() => setModalWords([])}
        onRequireAuth={() => setIsAuthOpen(true)}
        words={modalWords}
      />
    </div>
  );
};
