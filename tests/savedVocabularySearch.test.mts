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

test("saved vocabulary search response exposes lightweight flat metadata", () => {
  const contract = vocabularyTypesSource.match(
    /export interface UserVocabularySearchResponse\s*\{[\s\S]*?\n\}/
  )?.[0] ?? "";

  assert.match(contract, /userVocabId: UUID;/);
  assert.match(contract, /word: string;/);
  assert.match(contract, /level: number;/);
  assert.match(contract, /pos: string;/);
  assert.doesNotMatch(contract, /userVocabulary|WordResponse/);
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

test("saved vocabulary search query key partitions otherwise identical searches by user", () => {
  const firstUserKey = queryKeys.savedVocabularySearch("user-1", " saved ", true, 0, 20);
  const secondUserKey = queryKeys.savedVocabularySearch("user-2", " saved ", true, 0, 20);

  assert.deepEqual(firstUserKey, ["vocabulary", "saved-search", "user-1", " saved ", true, 0, 20]);
  assert.notDeepEqual(firstUserKey, secondUserKey);
});

test("saved search hook debounces normalized text and gates user-partitioned queries on authentication", () => {
  assert.match(hookSource, /import \{ useAuth \} from "\.\.\/\.\.\/auth\/hooks\/useAuth";/);
  assert.match(hookSource, /const auth = useAuth\(\);/);
  assert.match(hookSource, /useDebounce\(normalizedText, SAVED_VOCABULARY_SEARCH_DEBOUNCE_MS\)/);
  assert.match(hookSource, /debouncedText\.length >= SAVED_VOCABULARY_SEARCH_MIN_LENGTH/);
  assert.match(hookSource, /enabled:\s*Boolean\(auth\.isAuthenticated && auth\.userId && isEligible\)/);
  assert.match(
    hookSource,
    /queryKey:\s*queryKeys\.savedVocabularySearch\(auth\.userId, debouncedText, true, 0, 20\)/
  );
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
  assert.match(componentSource, /onSelect:\s*\(userVocabId: string\) => void/);
  assert.match(componentSource, /onSelect\(result\.userVocabId\)/);
  assert.doesNotMatch(componentSource, /onSelect\(result\.word\)/);
  assert.match(componentSource, /key=\{result\.userVocabId\}/);
  assert.match(componentSource, /<strong>\{result\.word\}<\/strong>/);
  assert.match(componentSource, /<small>\{result\.pos \?\? "word"\}<\/small>/);
  assert.match(componentSource, /Level \{result\.level\}/);
});

test("saved search keeps active options visible with nearest scrolling", () => {
  assert.match(
    componentSource,
    /const optionRefs = useRef<Array<HTMLButtonElement \| null>>\(\[\]\);/
  );
  assert.match(
    componentSource,
    /optionRefs\.current\[activeIndex\]\?\.scrollIntoView\(\{ block: "nearest" \}\);/
  );
  assert.match(
    componentSource,
    /ref=\{\(option\) => \{\s*optionRefs\.current\[index\] = option;\s*\}\}/
  );
});

test("saved search announces loading, empty, and error states", () => {
  assert.equal(componentSource.match(/role="status"/g)?.length, 2);
  assert.equal(componentSource.match(/role="alert"/g)?.length, 1);
});

test("saved search dismissal clears the active option reference", () => {
  assert.match(
    componentSource,
    /const dismissDropdown = \(\) => \{\s*setIsOpen\(false\);\s*setActiveIndex\(-1\);\s*\};/
  );
  assert.match(componentSource, /useClickOutside\(rootRef, dismissDropdown\)/);
  assert.match(componentSource, /if \(event\.key === "Escape"\) \{\s*dismissDropdown\(\)/);
  assert.match(componentSource, /dismissDropdown\(\);\s*onSelect\(result\.userVocabId\)/);
});

test("search selection loads saved-word detail through the existing mutation", () => {
  assert.match(
    pageSource,
    /<SavedVocabularySearch\s+onSelect=\{\(userVocabId\) => openSavedWord\.mutate\(userVocabId\)\}\s*\/>/
  );
  assert.match(
    pageSource,
    /const openSavedWord = useMutation\(\{[\s\S]*?getSavedVocabularyWord\(userVocabId\)[\s\S]*?onSuccess: setSavedModalWord/
  );
  assert.match(pageSource, /word=\{savedModalWord\}/);
  assert.doesNotMatch(pageSource, /<SavedVocabularySearch onSelect=\{setSavedModalWord\}/);
});

test("saved-word detail errors are visible from the level overview", () => {
  const listSection = pageSource.match(
    /\{activeSection === "list" \? \([\s\S]*?\{activeSection === "review"/
  )?.[0] ?? "";

  assert.match(listSection, /openSavedWord\.error/);
  assert.match(listSection, /getSafeErrorMessage\(openSavedWord\.error\)/);
  assert.match(listSection, /\)\}\s*\{openSavedWord\.error \? \(/);
});

test("saved search toolbar aligns total and search and stacks responsively", () => {
  assert.match(cssSource, /\.vocab-saved-level-toolbar\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\) minmax\(/);
  assert.match(cssSource, /\.vocab-saved-search__dropdown\s*\{/);
  assert.match(cssSource, /@media \(max-width: 640px\)[\s\S]*?\.vocab-saved-level-toolbar[\s\S]*?grid-template-columns:\s*1fr/);
});
