import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ApiError, getSafeErrorMessage } from "../../../shared/api/apiError";
import { ROUTES } from "../../../shared/constants/routes";
import { dictionaryApi } from "../../dictionary/api/dictionaryApi";
import { Word, WordResponse } from "../../dictionary/types";
import { searchApi } from "../../search/api/searchApi";
import { AccountModal } from "../components/AccountModal";
import { AuthModal } from "../components/AuthModal";
import { HomeFooter } from "../components/HomeFooter";
import { HomeHero } from "../components/HomeHero";
import { HomeIcon } from "../components/HomeIcon";
import { HomeNavbar } from "../components/HomeNavbar";
import { HomeVocabularyExplorer, VocabularyExplorerMode } from "../components/HomeVocabularyExplorer";
import { HomeWordResult } from "../components/HomeWordResult";
import { LearningSwitcher } from "../components/LearningSwitcher";
import { useAuth } from "../../auth/hooks/useAuth";

export const HomePage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [languageCode, setLanguageCode] = useState("vi");
  const [searchedWord, setSearchedWord] = useState<WordResponse | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [vocabularyMode, setVocabularyMode] = useState<VocabularyExplorerMode | null>(null);

  const searchWord = useMutation({
    mutationFn: async ({ text, transLangCode }: { text: string; transLangCode: string }) => {
      const results = await searchApi.fullSearch(text, transLangCode);
      return results[0] ?? null;
    },
    onMutate: () => {
      setHasSearched(true);
      setVocabularyMode(null);
      setSearchedWord(null);
    },
    onSuccess: (word) => setSearchedWord(word)
  });

  const openWord = useMutation({
    mutationFn: ({ transLangCode, word }: { transLangCode: string; word: Word }) => {
      if (!word.id) {
        throw new Error("This suggestion is missing a word id.");
      }

      return dictionaryApi.getWordDetail({
        wordId: word.id,
        isTrans: true,
        transLangCode,
        userId: auth.userId
      });
    },
    onMutate: () => {
      setHasSearched(true);
      setVocabularyMode(null);
      setSearchedWord(null);
    },
    onSuccess: (word) => setSearchedWord(word)
  });

  const activeError = searchWord.error ?? openWord.error;
  const isNotFound =
    activeError instanceof ApiError && (activeError.status === 404 || activeError.code === 2009);
  const isLoading = searchWord.isPending || openWord.isPending;

  return (
    <div className="guest-home">
      <HomeNavbar
        onAuthOpen={() => setIsAuthOpen(true)}
        onHomeClick={() => {
          searchWord.reset();
          openWord.reset();
          setHasSearched(false);
          setSearchedWord(null);
          setVocabularyMode(null);
        }}
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
        onVocabularySelect={(mode) => {
          const nextRoute =
            mode === "topics"
              ? ROUTES.vocabularyTopics
              : mode === "levels"
                ? ROUTES.vocabularyLevels
                : ROUTES.vocabularyMine;
          navigate(nextRoute);
        }}
      />
      <main>
        {hasSearched ? (
          <>
            {isLoading ? (
              <section className="home-word-empty">
                <HomeIcon name="search" size={44} />
                <h2>Searching the dictionary...</h2>
                <p>Looking for meanings, sounds, examples, and relations.</p>
              </section>
            ) : null}
            {!isLoading && activeError ? (
              <section className="home-word-empty">
                <HomeIcon name="search" size={48} />
                <h2>{isNotFound ? "Word not found" : "Search failed"}</h2>
                <p>{isNotFound ? "Try another normalized English word." : getSafeErrorMessage(activeError)}</p>
              </section>
            ) : null}
            {!isLoading && !activeError && !searchedWord ? (
              <section className="home-word-empty">
                <HomeIcon name="search" size={48} />
                <h2>Word not found</h2>
                <p>Try another spelling or pick a suggestion from the search box.</p>
              </section>
            ) : null}
            {!isLoading && !activeError && searchedWord ? (
              <HomeWordResult onRequireAuth={() => setIsAuthOpen(true)} word={searchedWord} />
            ) : null}
          </>
        ) : (
          <>
            <HomeHero />
            {vocabularyMode ? (
              <HomeVocabularyExplorer
                mode={vocabularyMode}
                onOpenWord={(word) => openWord.mutate({ word, transLangCode: languageCode })}
              />
            ) : (
              <LearningSwitcher />
            )}
          </>
        )}
      </main>
      <HomeFooter />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <AccountModal isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} />
    </div>
  );
};
