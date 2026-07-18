import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../../../shared/components/Input";
import { ROUTES } from "../../../shared/constants/routes";
import { useClickOutside } from "../../../shared/hooks/useClickOutside";
import { useAutocomplete } from "../hooks/useAutocomplete";
import { useDefaultSuggestions } from "../hooks/useDefaultSuggestions";
import { Word } from "../types";
import { SearchSuggestionDropdown } from "./SearchSuggestionDropdown";

export const SearchBox = () => {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const suggestions = useAutocomplete(text);
  const defaultSuggestions = useDefaultSuggestions();
  const words = text.trim() ? suggestions.data ?? [] : defaultSuggestions;

  useClickOutside(rootRef, () => setIsOpen(false));

  const handleSelect = (word: Word) => {
    if (!word.id) {
      return;
    }

    setIsOpen(false);
    navigate(ROUTES.wordDetail(word.id));
  };

  return (
    <div className="search-box" ref={rootRef}>
      <Input
        label="Search"
        onChange={(event) => {
          setText(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Type a normalized word"
        value={text}
      />
      {isOpen ? (
        <SearchSuggestionDropdown
          error={suggestions.error}
          isLoading={suggestions.isLoading}
          onSelect={handleSelect}
          words={words}
        />
      ) : null}
    </div>
  );
};
