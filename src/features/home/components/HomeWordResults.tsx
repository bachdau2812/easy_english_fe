import { useEffect, useMemo, useState } from "react";
import { WordResponse } from "../../dictionary/types";
import { HomeWordResult } from "./HomeWordResult";

interface HomeWordResultsProps {
  onRequireAuth: () => void;
  words: WordResponse[];
}

const getWordKey = (word: WordResponse, index: number) =>
  word.wordId ?? `${word.normalizedWord ?? word.word ?? "word"}-${word.pos ?? "unknown"}-${index}`;

export const HomeWordResults = ({ onRequireAuth, words }: HomeWordResultsProps) => {
  const options = useMemo(
    () => words.map((word, index) => ({ key: getWordKey(word, index), word })),
    [words]
  );
  const [activeKey, setActiveKey] = useState(options[0]?.key ?? "");

  useEffect(() => {
    setActiveKey(options[0]?.key ?? "");
  }, [options]);

  const activeWord = options.find((option) => option.key === activeKey)?.word ?? options[0]?.word;

  if (!activeWord) {
    return null;
  }

  return (
    <section className={`home-word-results ${options.length > 1 ? "home-word-results--multiple" : ""}`}>
      {options.length > 1 ? (
        <div aria-label="Parts of speech" className="home-word-results__pos-tabs" role="tablist">
          {options.map((option) => (
            <button
              aria-selected={option.key === activeKey}
              className={option.key === activeKey ? "home-word-results__pos-tab--active" : ""}
              key={option.key}
              onClick={() => setActiveKey(option.key)}
              role="tab"
              type="button"
            >
              <strong>{option.word.pos ?? "word"}</strong>
              {option.word.certLevel ? <small>{option.word.certLevel}</small> : null}
            </button>
          ))}
        </div>
      ) : null}
      <HomeWordResult onRequireAuth={onRequireAuth} word={activeWord} />
    </section>
  );
};
