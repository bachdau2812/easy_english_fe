import { ReactNode, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getSafeErrorMessage } from "../../../shared/api/apiError";
import { ROUTES } from "../../../shared/constants/routes";
import { useAuth } from "../../auth/hooks/useAuth";
import { dictionaryApi } from "../../dictionary/api/dictionaryApi";
import { Word, WordResponse } from "../../dictionary/types";
import { searchApi } from "../../search/api/searchApi";
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
  const auth = useAuth();
  const navigate = useNavigate();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [, setLanguageCode] = useState("vi");
  const [modalWord, setModalWord] = useState<WordResponse | null>(null);
  const [wordError, setWordError] = useState<string | null>(null);

  const openWord = useMutation({
    mutationFn: ({ transLangCode, word }: { transLangCode: string; word: Word }) => {
      if (!word.id) {
        throw new Error("This word is missing an id.");
      }

      return dictionaryApi.getWordDetail({
        wordId: word.id,
        isTrans: true,
        transLangCode,
        userId: auth.userId
      });
    },
    onMutate: () => setWordError(null),
    onSuccess: setModalWord,
    onError: (error) => setWordError(getSafeErrorMessage(error))
  });

  const searchWord = useMutation({
    mutationFn: async ({ text, transLangCode }: { text: string; transLangCode: string }) => {
      const results = await searchApi.fullSearch(text, transLangCode);
      return results[0] ?? null;
    },
    onMutate: () => setWordError(null),
    onSuccess: (word) => {
      if (word) {
        setModalWord(word);
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
        onSearchSubmit={(text, nextLanguageCode) => {
          setLanguageCode(nextLanguageCode);
          searchWord.mutate({ text, transLangCode: nextLanguageCode });
        }}
        onSuggestionSelect={(word, nextLanguageCode) => {
          setLanguageCode(nextLanguageCode);
          openWord.mutate({ word, transLangCode: nextLanguageCode });
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
        onClose={() => setModalWord(null)}
        onRequireAuth={() => setIsAuthOpen(true)}
        word={modalWord}
      />
    </div>
  );
};
