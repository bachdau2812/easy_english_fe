import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSafeErrorMessage } from "../../../shared/api/apiError";
import { AuthRequiredNotice } from "../../../shared/components/AuthRequiredNotice";
import { dictionaryApi } from "../../dictionary/api/dictionaryApi";
import { Word } from "../../dictionary/types";
import { useAuth } from "../../auth/hooks/useAuth";
import { HomeIcon } from "./HomeIcon";

export type VocabularyExplorerMode = "levels" | "mine" | "topics";

interface HomeVocabularyExplorerProps {
  mode: VocabularyExplorerMode;
  onOpenWord: (word: Word) => void;
}

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const HomeVocabularyExplorer = ({ mode, onOpenWord }: HomeVocabularyExplorerProps) => {
  const auth = useAuth();
  const [activeLevel, setActiveLevel] = useState("A1");
  const [page, setPage] = useState(0);
  const categories = useQuery({
    enabled: auth.isAuthenticated && mode === "topics",
    queryKey: ["home", "categories"],
    queryFn: dictionaryApi.getCategories
  });
  const levelWords = useQuery({
    enabled: auth.isAuthenticated && mode === "levels",
    queryKey: ["home", "words-by-level", activeLevel, page],
    queryFn: () => dictionaryApi.getWordsByLevel({ level: activeLevel, limit: 9, page })
  });

  if (!auth.isAuthenticated) {
    return (
      <section className="home-vocabulary-explorer">
        <AuthRequiredNotice
          description="Log in or register an account to browse vocabulary collections, saved words, statistics, and review sessions."
          title="Log in to explore vocabulary"
        />
      </section>
    );
  }

  return (
    <section className="home-vocabulary-explorer" id="vocabulary">
      <div className="home-vocabulary-explorer__hero">
        <HomeIcon name={mode === "topics" ? "book" : mode === "levels" ? "chart" : "bookmark"} size={34} />
        <h2>
          {mode === "topics"
            ? "Vocabulary by topic"
            : mode === "levels"
              ? "Vocabulary by level"
              : "My Vocabulary"}
        </h2>
        <p>
          {mode === "topics"
            ? "Browse playful topic cards and pick the words you want to explore next."
            : mode === "levels"
              ? "Start with A1 words, then jump to higher levels when you are ready."
              : "Saved words, statistics, and review tools will appear here."}
        </p>
      </div>

      {mode === "topics" ? (
        <div className="home-topic-grid">
          {categories.isLoading ? <p>Loading topics...</p> : null}
          {categories.error ? <p>{getSafeErrorMessage(categories.error)}</p> : null}
          {(categories.data ?? []).map((category, index) => (
            <article className="home-topic-card" key={category.id ?? category.slug ?? index}>
              <HomeIcon name={index % 3 === 0 ? "book" : index % 3 === 1 ? "brain" : "globe"} size={26} />
              <h3>{category.name ?? category.slug ?? "Topic"}</h3>
              <p>{category.description ?? "Explore words in this topic."}</p>
            </article>
          ))}
        </div>
      ) : null}

      {mode === "levels" ? (
        <div className="home-level-panel">
          <div className="home-level-tabs">
            {levels.map((level) => (
              <button
                className={level === activeLevel ? "home-level-tabs__active" : ""}
                key={level}
                onClick={() => {
                  setActiveLevel(level);
                  setPage(0);
                }}
                type="button"
              >
                {level}
              </button>
            ))}
          </div>
          {levelWords.isLoading ? <p>Loading {activeLevel} words...</p> : null}
          {levelWords.error ? <p>{getSafeErrorMessage(levelWords.error)}</p> : null}
          <div className="home-level-word-list">
            {(levelWords.data?.content ?? []).map((word) => (
              <article key={word.id ?? word.word}>
                <strong>{word.word ?? word.normalizedWord}</strong>
                <span>{[word.pos, word.certLevel].filter(Boolean).join(" / ") || "Word"}</span>
                <button onClick={() => onOpenWord(word)} type="button">
                  See more
                </button>
              </article>
            ))}
          </div>
          {levelWords.data && !levelWords.data.last ? (
            <button className="home-level-load-more" onClick={() => setPage((current) => current + 1)} type="button">
              Load more
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};
