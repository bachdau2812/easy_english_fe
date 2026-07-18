import { EmptyState } from "../../../shared/components/EmptyState";
import { ErrorState } from "../../../shared/components/ErrorState";
import { PageLoading } from "../../../shared/components/PageLoading";
import { SearchSuggestionItem } from "./SearchSuggestionItem";
import { Word } from "../types";

interface SearchSuggestionDropdownProps {
  error?: unknown;
  isLoading?: boolean;
  onSelect: (word: Word) => void;
  words: Word[];
}

export const SearchSuggestionDropdown = ({
  error,
  isLoading = false,
  onSelect,
  words
}: SearchSuggestionDropdownProps) => (
  <div className="suggestion-list">
    {isLoading ? <PageLoading label="Searching..." /> : null}
    {error ? <ErrorState error={error} title="Search failed" /> : null}
    {!isLoading && !error && words.length === 0 ? (
      <EmptyState description="Try another normalized English word." title="No suggestions" />
    ) : null}
    {!isLoading && !error
      ? words.map((word, index) => (
          <SearchSuggestionItem key={word.id ?? index} onSelect={onSelect} word={word} />
        ))
      : null}
  </div>
);
