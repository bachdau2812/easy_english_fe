import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { queryKeys } from "../src/shared/constants/queryKeys.ts";
import {
  SAVED_VOCABULARY_SEARCH_DEBOUNCE_MS,
  SAVED_VOCABULARY_SEARCH_MIN_LENGTH,
  getNextSavedVocabularySearchIndex
} from "../src/features/vocabulary/savedVocabularySearch.ts";

const vocabularyTypesSource = readFileSync(
  new URL("../src/features/vocabulary/types.ts", import.meta.url),
  "utf8"
);

const vocabularyApiSource = readFileSync(
  new URL("../src/features/vocabulary/api/vocabularyApi.ts", import.meta.url),
  "utf8"
);

const hookSource = readFileSync(
  new URL("../src/features/vocabulary/hooks/useSavedVocabularySearch.ts", import.meta.url),
  "utf8"
);

const componentSource = readFileSync(
  new URL("../src/features/vocabulary/components/SavedVocabularySearch.tsx", import.meta.url),
  "utf8"
);

test("saved vocabulary search constants and keyboard wrapping stay fixed", () => {
  assert.equal(SAVED_VOCABULARY_SEARCH_MIN_LENGTH, 2);
  assert.equal(SAVED_VOCABULARY_SEARCH_DEBOUNCE_MS, 300);

  assert.equal(getNextSavedVocabularySearchIndex(0, 0, 1), -1);
  assert.equal(getNextSavedVocabularySearchIndex(3, 0, -1), -1);
  assert.equal(getNextSavedVocabularySearchIndex(-1, 4, 1), 0);
  assert.equal(getNextSavedVocabularySearchIndex(-1, 4, -1), 3);
  assert.equal(getNextSavedVocabularySearchIndex(3, 4, 1), 0);
  assert.equal(getNextSavedVocabularySearchIndex(0, 4, -1), 3);
});

test("saved vocabulary search response contract includes userVocabulary and word", () => {
  assert.match(vocabularyTypesSource, /export interface UserVocabularySearchResponse\s*{/);
  assert.match(vocabularyTypesSource, /userVocabulary: UserVocabularyResponse;/);
  assert.match(vocabularyTypesSource, /word: WordResponse;/);
});

test("saved vocabulary search api method sends query params without userId", async () => {
  const methodMatch = vocabularyApiSource.match(
    /searchSavedVocabularies\(params: \{[\s\S]*?\n  \},\n  addSearchHistory/
  );

  assert.ok(methodMatch);

  const methodSource = methodMatch?.[0] ?? "";

  assert.match(methodSource, /"\/user-vocabularies\/search"/);
  assert.match(methodSource, /text: params\.text/);
  assert.match(methodSource, /isAutocomplete: params\.isAutocomplete/);
  assert.match(methodSource, /page: params\.page/);
  assert.match(methodSource, /limit: params\.limit/);
  assert.doesNotMatch(methodSource, /\buserId\b/);
});

test("saved vocabulary search query key includes text, autocomplete mode, page, and limit", () => {
  assert.deepEqual(
    queryKeys.savedVocabularySearch(" saved ", true, 0, 20),
    ["vocabulary", "saved-search", " saved ", true, 0, 20]
  );
});

test("saved search hook debounces normalized text and enables at two characters", () => {
  assert.match(hookSource, /useDebounce\(normalizedText, SAVED_VOCABULARY_SEARCH_DEBOUNCE_MS\)/);
  assert.match(hookSource, /debouncedText\.length >= SAVED_VOCABULARY_SEARCH_MIN_LENGTH/);
  assert.match(hookSource, /isAutocomplete:\s*true/);
  assert.match(hookSource, /page:\s*0/);
  assert.match(hookSource, /limit:\s*20/);
  assert.doesNotMatch(hookSource, /userId:/);
});

test("saved search component exposes accessible listbox keyboard behavior", () => {
  assert.match(componentSource, /role="combobox"/);
  assert.match(componentSource, /role="listbox"/);
  assert.match(componentSource, /role="option"/);
  assert.match(componentSource, /ArrowDown/);
  assert.match(componentSource, /ArrowUp/);
  assert.match(componentSource, /event\.key === "Enter"/);
  assert.match(componentSource, /event\.key === "Escape"/);
  assert.match(componentSource, /onSelect\(result\.word\)/);
});
