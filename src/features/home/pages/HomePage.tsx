import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ApiError, getSafeErrorMessage } from "../../../shared/api/apiError";
import { ROUTES } from "../../../shared/constants/routes";
import { normalizeSearchText } from "../../../shared/utils/normalize";
import { dictionaryApi } from "../../dictionary/api/dictionaryApi";
import { Word, WordResponse } from "../../dictionary/types";
import { searchApi } from "../../search/api/searchApi";
import { selectFullSearchResults } from "../../search/api/searchParams";
import { useRecordSearchHistory } from "../../search/hooks/useRecordSearchHistory";
import { AccountModal } from "../components/AccountModal";
import { AuthModal } from "../components/AuthModal";
import { HomeFooter } from "../components/HomeFooter";
import { HomeHero } from "../components/HomeHero";
import { HomeIcon } from "../components/HomeIcon";
import { HomeNavbar } from "../components/HomeNavbar";
import { HomeVocabularyExplorer, VocabularyExplorerMode } from "../components/HomeVocabularyExplorer";
import { HomeWordResults } from "../components/HomeWordResults";
import { LearningSwitcher } from "../components/LearningSwitcher";

export const HomePage = () => {
  const navigate = useNavigate();
  const recordSearchHistory = useRecordSearchHistory();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [languageCode, setLanguageCode] = useState("vi");
  const [searchedWords, setSearchedWords] = useState<WordResponse[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [vocabularyMode, setVocabularyMode] = useState<VocabularyExplorerMode | null>(null);

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
    onMutate: () => {
      setHasSearched(true);
      setVocabularyMode(null);
      setSearchedWords([]);
    },
    onSuccess: (words) => {
      setSearchedWords(words);
      recordSearchHistory(words);
    }
  });

  const openWord = useMutation({
    mutationFn: ({ transLangCode, word }: { transLangCode: string; word: Word }) => {
      if (!word.id) {
        throw new Error("This suggestion is missing a word id.");
      }

      return dictionaryApi.getWordDetail({
        wordId: word.id,
        isTrans: true,
        transLangCode
      });
    },
    onMutate: () => {
      setHasSearched(true);
      setVocabularyMode(null);
      setSearchedWords([]);
    },
    onSuccess: (word) => {
      setSearchedWords([word]);
      recordSearchHistory([word]);
    }
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
          setSearchedWords([]);
          setVocabularyMode(null);
        }}
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
            {!isLoading && !activeError && searchedWords.length === 0 ? (
              <section className="home-word-empty">
                <HomeIcon name="search" size={48} />
                <h2>Word not found</h2>
                <p>Try another spelling or pick a suggestion from the search box.</p>
              </section>
            ) : null}
            {!isLoading && !activeError && searchedWords.length > 0 ? (
              <HomeWordResults onRequireAuth={() => setIsAuthOpen(true)} words={searchedWords} />
            ) : null}
          </>
        ) : (
          <>
            <HomeHero onCourseSelect={(key) => navigate(ROUTES.learningCategory(key))} />
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
