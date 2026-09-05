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

const pageSource = readFileSync(
  new URL("../src/features/vocabulary/pages/VocabularyExplorePage.tsx", import.meta.url),
  "utf8"
);

const cssSource = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

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

test("saved search dismissal clears the active option reference", () => {
  assert.match(
    componentSource,
    /const dismissDropdown = \(\) => \{\s*setIsOpen\(false\);\s*setActiveIndex\(-1\);\s*\};/
  );
  assert.match(componentSource, /useClickOutside\(rootRef, dismissDropdown\)/);
  assert.match(componentSource, /if \(event\.key === "Escape"\) \{\s*dismissDropdown\(\)/);
  assert.match(componentSource, /onSelect\(result\.word\);\s*dismissDropdown\(\)/);
});

test("level overview connects embedded search words to the existing modal", () => {
  assert.match(pageSource, /<SavedVocabularySearch onSelect=\{setSavedModalWord\}/);
  assert.match(pageSource, /word=\{savedModalWord\}/);
});

test("saved search toolbar aligns total and search and stacks responsively", () => {
  assert.match(cssSource, /\.vocab-saved-level-toolbar\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\) minmax\(/);
  assert.match(cssSource, /\.vocab-saved-search__dropdown\s*\{/);
  assert.match(cssSource, /@media \(max-width: 640px\)[\s\S]*?\.vocab-saved-level-toolbar[\s\S]*?grid-template-columns:\s*1fr/);
});
