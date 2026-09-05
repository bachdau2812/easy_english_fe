import { KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { getSafeErrorMessage } from "../../../shared/api/apiError";
import { useClickOutside } from "../../../shared/hooks/useClickOutside";
import { normalizeSearchText } from "../../../shared/utils/normalize";
import { WordResponse } from "../../dictionary/types";
import { HomeIcon } from "../../home/components/HomeIcon";
import { useSavedVocabularySearch } from "../hooks/useSavedVocabularySearch";
import {
  getNextSavedVocabularySearchIndex,
  SAVED_VOCABULARY_SEARCH_MIN_LENGTH
} from "../savedVocabularySearch";
import { UserVocabularySearchResponse } from "../types";

interface SavedVocabularySearchProps {
  onSelect: (word: WordResponse) => void;
}

export const SavedVocabularySearch = ({ onSelect }: SavedVocabularySearchProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = `saved-vocabulary-search-${useId().replace(/:/g, "")}`;
  const [text, setText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const search = useSavedVocabularySearch(text);
  const isEligible = normalizeSearchText(text).length >= SAVED_VOCABULARY_SEARCH_MIN_LENGTH;
  const results = search.isDebouncing
    ? []
    : (search.data?.content ?? []).filter((result) =>
        Boolean(result.word?.word ?? result.word?.normalizedWord)
      );
  const isLoading = search.isDebouncing || search.isFetching;

  const dismissDropdown = () => {
    setIsOpen(false);
    setActiveIndex(-1);
  };

  useClickOutside(rootRef, dismissDropdown);

  useEffect(() => setActiveIndex(-1), [search.data, text]);

  useEffect(() => {
    if (activeIndex < 0 || activeIndex >= results.length) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, results.length]);

  const selectResult = (result: UserVocabularySearchResponse) => {
    onSelect(result.word);
    dismissDropdown();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      dismissDropdown();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(isEligible);
      setActiveIndex((current) =>
        getNextSavedVocabularySearchIndex(current, results.length, event.key === "ArrowDown" ? 1 : -1)
      );
      return;
    }
    if (event.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
      event.preventDefault();
      selectResult(results[activeIndex]);
    }
  };

  return (
    <div className="vocab-saved-search" ref={rootRef}>
      <label className="vocab-saved-search__field">
        <span className="sr-only">Search saved vocabulary</span>
        <HomeIcon name="search" size={18} />
        <input
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen && isEligible}
          onChange={(event) => {
            const nextText = event.target.value;
            setText(nextText);
            setIsOpen(normalizeSearchText(nextText).length >= SAVED_VOCABULARY_SEARCH_MIN_LENGTH);
          }}
          onFocus={() => setIsOpen(isEligible)}
          onKeyDown={handleKeyDown}
          role="combobox"
          type="search"
          value={text}
        />
      </label>
      {isOpen && isEligible ? (
        <div className="vocab-saved-search__dropdown" id={listboxId} role="listbox">
          {isLoading ? (
            <p className="vocab-saved-search__state" role="status">
              Searching saved vocabulary...
            </p>
          ) : null}
          {!isLoading && search.error ? (
            <p className="vocab-saved-search__state vocab-saved-search__state--error" role="alert">
              {getSafeErrorMessage(search.error)}
            </p>
          ) : null}
          {!isLoading && !search.error && search.data && results.length === 0 ? (
            <p className="vocab-saved-search__state" role="status">
              No saved vocabulary found
            </p>
          ) : null}
          {!isLoading && !search.error
            ? results.map((result, index) => (
                <button
                  aria-selected={activeIndex === index}
                  className={activeIndex === index ? "vocab-saved-search__option is-active" : "vocab-saved-search__option"}
                  id={`${listboxId}-option-${index}`}
                  key={result.userVocabulary.id ?? `${result.word.word}-${index}`}
                  onClick={() => selectResult(result)}
                  onMouseEnter={() => setActiveIndex(index)}
                  ref={(option) => {
                    optionRefs.current[index] = option;
                  }}
                  role="option"
                  type="button"
                >
                  <span>
                    <strong>{result.word.word ?? result.word.normalizedWord}</strong>
                    <small>{result.word.pos ?? "word"}</small>
                  </span>
                  {result.userVocabulary.level ? <em>Level {result.userVocabulary.level}</em> : null}
                </button>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
};
