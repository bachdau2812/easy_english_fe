# Saved Vocabulary Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-character, debounced autocomplete to the saved-vocabulary overview and open the selected result's embedded saved meaning in the existing word modal.

**Architecture:** Extend the vocabulary API contract, isolate query eligibility and keyboard navigation in a small pure module, and wrap React Query in a dedicated hook. A focused combobox component owns input/dropdown interaction while `MyVocabularyPanel` continues to own the existing modal state.

**Tech Stack:** React 18, TypeScript 5.5, TanStack React Query 5, Vite 5, Node test runner.

## Global Constraints

- Search begins only when normalized text contains at least 2 characters.
- Debounce duration is exactly 300 ms.
- Requests use `isAutocomplete=true`, `page=0`, and `limit=20`.
- The search request never sends `userId`; authentication comes from the bearer token attached by `apiClient`.
- Selecting a result opens `result.word` directly and never calls `/user-vocabularies/{userVocabId}/word`.
- Preserve the user's existing `.github/workflows/deploy.yml` modification.

---

## File Structure

- `src/features/vocabulary/types.ts`: declares the new search response DTO.
- `src/features/vocabulary/api/vocabularyApi.ts`: sends the authenticated saved-vocabulary search request.
- `src/shared/constants/queryKeys.ts`: isolates search cache entries.
- `src/features/vocabulary/savedVocabularySearch.ts`: owns constants and pure keyboard/eligibility helpers.
- `src/features/vocabulary/hooks/useSavedVocabularySearch.ts`: applies normalization, debounce, and React Query orchestration.
- `src/features/vocabulary/components/SavedVocabularySearch.tsx`: renders the accessible combobox and dropdown.
- `src/features/vocabulary/pages/VocabularyExplorePage.tsx`: positions the component and connects selection to the existing modal.
- `src/index.css`: styles desktop, dropdown, states, and mobile stacking.
- `tests/savedVocabularySearch.test.mts`: tests pure behavior and integration contracts.

### Task 1: Search contract and pure behavior

**Files:**
- Create: `src/features/vocabulary/savedVocabularySearch.ts`
- Modify: `src/features/vocabulary/types.ts`
- Modify: `src/features/vocabulary/api/vocabularyApi.ts`
- Modify: `src/shared/constants/queryKeys.ts`
- Test: `tests/savedVocabularySearch.test.mts`

**Interfaces:**
- Produces: `UserVocabularySearchResponse`, `vocabularyApi.searchSavedVocabularies(params)`, `queryKeys.savedVocabularySearch(text, isAutocomplete, page, limit)`, `SAVED_VOCABULARY_SEARCH_MIN_LENGTH`, `SAVED_VOCABULARY_SEARCH_DEBOUNCE_MS`, and `getNextSavedVocabularySearchIndex(currentIndex, itemCount, direction)`.

- [ ] **Step 1: Write failing contract and helper tests**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getNextSavedVocabularySearchIndex,
  SAVED_VOCABULARY_SEARCH_DEBOUNCE_MS,
  SAVED_VOCABULARY_SEARCH_MIN_LENGTH
} from "../src/features/vocabulary/savedVocabularySearch.ts";

const apiSource = readFileSync(new URL("../src/features/vocabulary/api/vocabularyApi.ts", import.meta.url), "utf8");
const typesSource = readFileSync(new URL("../src/features/vocabulary/types.ts", import.meta.url), "utf8");
const queryKeysSource = readFileSync(new URL("../src/shared/constants/queryKeys.ts", import.meta.url), "utf8");

test("saved vocabulary search uses the agreed threshold and debounce", () => {
  assert.equal(SAVED_VOCABULARY_SEARCH_MIN_LENGTH, 2);
  assert.equal(SAVED_VOCABULARY_SEARCH_DEBOUNCE_MS, 300);
});

test("keyboard selection wraps through available search results", () => {
  assert.equal(getNextSavedVocabularySearchIndex(-1, 3, 1), 0);
  assert.equal(getNextSavedVocabularySearchIndex(2, 3, 1), 0);
  assert.equal(getNextSavedVocabularySearchIndex(0, 3, -1), 2);
  assert.equal(getNextSavedVocabularySearchIndex(0, 0, 1), -1);
});

test("search response contains saved metadata and its filtered word", () => {
  assert.match(typesSource, /interface UserVocabularySearchResponse[\s\S]+userVocabulary[\s\S]+word/);
});

test("saved vocabulary search omits userId and sends exact endpoint parameters", () => {
  const method = apiSource.match(/searchSavedVocabularies[\s\S]*?\n  },/)?.[0] ?? "";
  assert.match(method, /"\/user-vocabularies\/search"/);
  assert.match(method, /text:\s*params\.text/);
  assert.match(method, /isAutocomplete:\s*params\.isAutocomplete/);
  assert.match(method, /page:\s*params\.page/);
  assert.match(method, /limit:\s*params\.limit/);
  assert.doesNotMatch(method, /userId/);
});

test("saved vocabulary search has a complete cache key", () => {
  assert.match(queryKeysSource, /savedVocabularySearch:[\s\S]+text[\s\S]+isAutocomplete[\s\S]+page[\s\S]+limit/);
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run: `node --experimental-strip-types --test tests/savedVocabularySearch.test.mts`

Expected: FAIL because `savedVocabularySearch.ts` and its exports do not exist.

- [ ] **Step 3: Implement minimal contracts and helpers**

```ts
// src/features/vocabulary/savedVocabularySearch.ts
export const SAVED_VOCABULARY_SEARCH_MIN_LENGTH = 2;
export const SAVED_VOCABULARY_SEARCH_DEBOUNCE_MS = 300;

export const getNextSavedVocabularySearchIndex = (
  currentIndex: number,
  itemCount: number,
  direction: -1 | 1
) => {
  if (itemCount <= 0) return -1;
  if (currentIndex < 0) return direction === 1 ? 0 : itemCount - 1;
  return (currentIndex + direction + itemCount) % itemCount;
};
```

Add to `types.ts`:

```ts
export interface UserVocabularySearchResponse {
  userVocabulary: UserVocabularyResponse;
  word: WordResponse;
}
```

Add to `vocabularyApi.ts`:

```ts
searchSavedVocabularies(params: {
  text: string;
  isAutocomplete: boolean;
  page: number;
  limit: number;
  signal?: AbortSignal;
}) {
  return apiClient.get<PageResponse<UserVocabularySearchResponse>>("/user-vocabularies/search", {
    signal: params.signal,
    query: {
      text: params.text,
      isAutocomplete: params.isAutocomplete,
      page: params.page,
      limit: params.limit
    }
  });
},
```

Add to `queryKeys.ts`:

```ts
savedVocabularySearch: (text: string, isAutocomplete: boolean, page: number, limit: number) =>
  ["vocabulary", "saved-search", text, isAutocomplete, page, limit] as const,
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --experimental-strip-types --test tests/savedVocabularySearch.test.mts`

Expected: all Task 1 tests PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add tests/savedVocabularySearch.test.mts src/features/vocabulary/savedVocabularySearch.ts src/features/vocabulary/types.ts src/features/vocabulary/api/vocabularyApi.ts src/shared/constants/queryKeys.ts
git commit -m "Add saved vocabulary search contract"
```

### Task 2: Debounced query hook and accessible dropdown

**Files:**
- Create: `src/features/vocabulary/hooks/useSavedVocabularySearch.ts`
- Create: `src/features/vocabulary/components/SavedVocabularySearch.tsx`
- Modify: `tests/savedVocabularySearch.test.mts`

**Interfaces:**
- Consumes: Task 1 constants, query key, API method, keyboard helper, and `UserVocabularySearchResponse`.
- Produces: `useSavedVocabularySearch(text)` and `<SavedVocabularySearch onSelect={(word: WordResponse) => void} />`.

- [ ] **Step 1: Add failing hook and component contract tests**

```ts
const hookSource = readFileSync(
  new URL("../src/features/vocabulary/hooks/useSavedVocabularySearch.ts", import.meta.url),
  "utf8"
);
const componentSource = readFileSync(
  new URL("../src/features/vocabulary/components/SavedVocabularySearch.tsx", import.meta.url),
  "utf8"
);

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
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --experimental-strip-types --test tests/savedVocabularySearch.test.mts`

Expected: FAIL because the hook and component files do not exist.

- [ ] **Step 3: Implement the hook**

```ts
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { useDebounce } from "../../../shared/hooks/useDebounce";
import { normalizeSearchText } from "../../../shared/utils/normalize";
import { vocabularyApi } from "../api/vocabularyApi";
import {
  SAVED_VOCABULARY_SEARCH_DEBOUNCE_MS,
  SAVED_VOCABULARY_SEARCH_MIN_LENGTH
} from "../savedVocabularySearch";

export const useSavedVocabularySearch = (text: string) => {
  const normalizedText = normalizeSearchText(text);
  const debouncedText = useDebounce(normalizedText, SAVED_VOCABULARY_SEARCH_DEBOUNCE_MS);
  const isEligible = debouncedText.length >= SAVED_VOCABULARY_SEARCH_MIN_LENGTH;

  const query = useQuery({
    enabled: isEligible,
    queryKey: queryKeys.savedVocabularySearch(debouncedText, true, 0, 20),
    queryFn: ({ signal }) => vocabularyApi.searchSavedVocabularies({
      text: debouncedText,
      isAutocomplete: true,
      page: 0,
      limit: 20,
      signal
    })
  });

  return {
    ...query,
    isDebouncing:
      normalizedText.length >= SAVED_VOCABULARY_SEARCH_MIN_LENGTH && normalizedText !== debouncedText
  };
};
```

- [ ] **Step 4: Implement the dropdown component**

Create `SavedVocabularySearch.tsx` with a controlled input, local dropdown state, keyboard navigation, click-outside dismissal, and direct selection of the embedded word:

```tsx
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

  useClickOutside(rootRef, () => setIsOpen(false));

  useEffect(() => setActiveIndex(-1), [search.data, text]);

  const selectResult = (result: UserVocabularySearchResponse) => {
    onSelect(result.word);
    setIsOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false);
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
          placeholder="Search saved vocabulary"
          role="combobox"
          type="search"
          value={text}
        />
      </label>
      {isOpen && isEligible ? (
        <div className="vocab-saved-search__dropdown" id={listboxId} role="listbox">
          {isLoading ? <p className="vocab-saved-search__state">Searching saved vocabulary...</p> : null}
          {!isLoading && search.error ? (
            <p className="vocab-saved-search__state vocab-saved-search__state--error">
              {getSafeErrorMessage(search.error)}
            </p>
          ) : null}
          {!isLoading && !search.error && search.data && results.length === 0 ? (
            <p className="vocab-saved-search__state">No saved vocabulary found</p>
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
```

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `node --experimental-strip-types --test tests/savedVocabularySearch.test.mts`

Expected: all Task 1 and Task 2 tests PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add tests/savedVocabularySearch.test.mts src/features/vocabulary/hooks/useSavedVocabularySearch.ts src/features/vocabulary/components/SavedVocabularySearch.tsx
git commit -m "Add saved vocabulary autocomplete"
```

### Task 3: Page integration and responsive styling

**Files:**
- Modify: `src/features/vocabulary/pages/VocabularyExplorePage.tsx`
- Modify: `src/index.css`
- Modify: `tests/savedVocabularySearch.test.mts`

**Interfaces:**
- Consumes: `<SavedVocabularySearch onSelect={setSavedModalWord} />` and existing `<HomeWordDetailModal word={savedModalWord} />`.
- Produces: desktop left/right toolbar, dropdown visuals, and mobile stacking.

- [ ] **Step 1: Add failing integration and CSS tests**

```ts
const pageSource = readFileSync(
  new URL("../src/features/vocabulary/pages/VocabularyExplorePage.tsx", import.meta.url),
  "utf8"
);
const cssSource = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

test("level overview connects embedded search words to the existing modal", () => {
  assert.match(pageSource, /<SavedVocabularySearch onSelect=\{setSavedModalWord\}/);
  assert.match(pageSource, /word=\{savedModalWord\}/);
});

test("saved search toolbar aligns total and search and stacks responsively", () => {
  assert.match(cssSource, /\.vocab-saved-level-toolbar\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\) minmax\(/);
  assert.match(cssSource, /\.vocab-saved-search__dropdown\s*\{/);
  assert.match(cssSource, /@media \(max-width: 640px\)[\s\S]*?\.vocab-saved-level-toolbar[\s\S]*?grid-template-columns:\s*1fr/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --experimental-strip-types --test tests/savedVocabularySearch.test.mts`

Expected: FAIL because page integration and CSS selectors are absent.

- [ ] **Step 3: Integrate the component**

Import `SavedVocabularySearch`. Replace the current total row with:

```tsx
<div className="vocab-saved-level-toolbar">
  <div className="vocab-saved-level-total">
    <span>Total vocabulary</span>
    <strong>{formatStatNumber(vocabularyQuantity.data.totalQuantity)}</strong>
  </div>
  <SavedVocabularySearch onSelect={setSavedModalWord} />
</div>
```

Keep the existing `HomeWordDetailModal` at list-section scope so search selection and level-row selection share one modal without changing the detail-request mutation.

- [ ] **Step 4: Add responsive styles**

Add these rules near the existing saved-level styles:

```css
.vocab-saved-level-toolbar {
  align-items: center;
  background: #eff6ff;
  border: 1px solid #dbeafe;
  border-radius: 18px;
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 360px);
  padding: 10px 12px 10px 18px;
}

.vocab-saved-level-toolbar .vocab-saved-level-total {
  background: transparent;
  border: 0;
  border-radius: 0;
  padding: 6px 0;
}

.vocab-saved-search {
  min-width: 0;
  position: relative;
}

.vocab-saved-search__field {
  align-items: center;
  background: #ffffff;
  border: 1px solid #bfdbfe;
  border-radius: 13px;
  color: #64748b;
  display: flex;
  gap: 9px;
  min-height: 44px;
  padding: 0 13px;
}

.vocab-saved-search__field:focus-within {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
}

.vocab-saved-search__field input {
  background: transparent;
  border: 0;
  color: #172033;
  font: inherit;
  min-width: 0;
  outline: 0;
  width: 100%;
}

.vocab-saved-search__dropdown {
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 14px;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.16);
  display: grid;
  left: 0;
  max-height: 320px;
  overflow-y: auto;
  padding: 6px;
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  z-index: 20;
}

.vocab-saved-search__state {
  color: #64748b;
  margin: 0;
  padding: 13px 12px;
}

.vocab-saved-search__state--error {
  color: #b91c1c;
}

.vocab-saved-search__option {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 10px;
  color: #172033;
  cursor: pointer;
  display: flex;
  font: inherit;
  justify-content: space-between;
  padding: 10px 11px;
  text-align: left;
  width: 100%;
}

.vocab-saved-search__option:hover,
.vocab-saved-search__option.is-active {
  background: #eff6ff;
}

.vocab-saved-search__option:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: -2px;
}

.vocab-saved-search__option > span {
  display: grid;
  gap: 2px;
}

.vocab-saved-search__option small {
  color: #64748b;
}

.vocab-saved-search__option em {
  color: #1d4ed8;
  font-size: 0.78rem;
  font-style: normal;
  font-weight: 800;
}
```

Add inside the existing `@media (max-width: 640px)` block:

```css
.vocab-saved-level-toolbar {
  align-items: stretch;
  grid-template-columns: 1fr;
  padding: 12px;
}
```

- [ ] **Step 5: Run focused and full tests**

Run: `node --experimental-strip-types --test tests/savedVocabularySearch.test.mts`

Expected: all saved-search tests PASS.

Run: `npm test`

Expected: the complete Node test suite PASS with no failures.

- [ ] **Step 6: Run production verification**

Run: `npm run build`

Expected: TypeScript compilation and Vite production build both succeed.

- [ ] **Step 7: Commit Task 3**

```bash
git add src/features/vocabulary/pages/VocabularyExplorePage.tsx src/index.css tests/savedVocabularySearch.test.mts docs/superpowers/plans/2026-09-05-saved-vocabulary-search.md
git commit -m "Integrate saved vocabulary search"
```
