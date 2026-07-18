import { Word } from "../types";

interface SearchSuggestionItemProps {
  onSelect: (word: Word) => void;
  word: Word;
}

export const SearchSuggestionItem = ({ onSelect, word }: SearchSuggestionItemProps) => (
  <button className="suggestion-item" onClick={() => onSelect(word)} type="button">
    <strong>{word.word ?? word.normalizedWord ?? "Untitled word"}</strong>
    <small>{[word.pos, word.certLevel].filter(Boolean).join(" • ")}</small>
  </button>
);
