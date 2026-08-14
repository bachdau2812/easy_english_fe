# Vocab Review and Topic Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align missing-letter review inputs without clipping wide glyphs and reduce topic-word controls to one full-width search field.

**Architecture:** Preserve the existing one-input-per-character review behavior and correct only its CSS sizing and baseline contract. Remove the unused topic quiz-selection state and markup from the existing page, return its rows to the standard word-row layout, and protect both changes with source-level Node tests that match the repository's current testing style.

**Tech Stack:** React 18, TypeScript 5, CSS, Node test runner, Vite 5

## Global Constraints

- Keep the existing review keyboard, paste, focus, validation, and submission behavior unchanged.
- Use the exact topic search placeholder `Search word by topic`.
- Remove topic selected-word state, row checkboxes, selected-count display, and quiz button.
- Do not change API requests, routes, review answer validation, or unrelated vocabulary code.
- Add no new runtime or development dependencies.

---

### Task 1: Correct Missing-Letter Slot Geometry

**Files:**
- Modify: `tests/reviewFillSpacing.test.mts`
- Modify: `src/index.css:7986-8078`

**Interfaces:**
- Consumes: Existing `.vocab-review-inline-fill`, `.vocab-review-inline-fill--word`, `.vocab-review-inline-fill__word`, `.vocab-review-slot-input`, and `.vocab-review-slot-input__control` selectors.
- Produces: A CSS contract where every input is `1em` wide and all inline word layers use baseline alignment.

- [ ] **Step 1: Update the regression test to describe the corrected geometry**

Replace the first two tests in `tests/reviewFillSpacing.test.mts` with:

```ts
test("missing word characters have room for wide glyphs and share one baseline", () => {
  const wordFillRule = getRuleBody(".vocab-review-inline-fill--word");
  const maskedWordRule = getRuleBody(".vocab-review-inline-fill__word");
  const slotGroupRule = getRuleBody(".vocab-review-slot-input");
  const slotControlRule = getRuleBody(".vocab-review-inline-fill input");

  assert.match(wordFillRule, /align-items:\s*baseline;/);
  assert.match(wordFillRule, /gap:\s*0;/);
  assert.match(wordFillRule, /letter-spacing:\s*0;/);
  assert.match(maskedWordRule, /align-items:\s*baseline;/);
  assert.match(slotGroupRule, /align-items:\s*baseline;/);
  assert.match(slotGroupRule, /gap:\s*0;/);
  assert.match(slotControlRule, /height:\s*1\.2em;/);
  assert.match(slotControlRule, /line-height:\s*1\.2;/);
  assert.match(slotControlRule, /width:\s*1em;/);
});

test("sentence blank characters also have room for wide glyphs", () => {
  const slotControlRule = getRuleBody(".vocab-review-inline-fill input");

  assert.match(slotControlRule, /width:\s*1em;/);
  assert.doesNotMatch(slotControlRule, /width:\s*0\.68em;/);
});
```

- [ ] **Step 2: Run the targeted test and verify the expected failure**

Run: `node --experimental-strip-types --test tests/reviewFillSpacing.test.mts`

Expected: FAIL because the current rules use centered alignment and `width: 0.68em` instead of the new baseline and `1em` contract.

- [ ] **Step 3: Apply the minimal CSS correction**

In `src/index.css`, change only the affected declarations so the rules contain:

```css
.vocab-review-inline-fill--word {
  align-items: baseline;
  /* Retain the other existing declarations. */
}

.vocab-review-inline-fill__word {
  align-items: baseline;
  display: inline-flex;
  vertical-align: baseline;
  white-space: nowrap;
}

.vocab-review-inline-fill input {
  /* Retain appearance, color, font, and reset declarations. */
  height: 1.2em;
  line-height: 1.2;
  width: 1em;
}

.vocab-review-slot-input {
  align-items: baseline;
  display: inline-flex;
  gap: 0;
  max-width: 100%;
  vertical-align: baseline;
}
```

Delete the redundant rule that forces `.vocab-review-inline-fill--word .vocab-review-slot-input__control` back to `width: 0.68em`.

- [ ] **Step 4: Run the targeted test and verify it passes**

Run: `node --experimental-strip-types --test tests/reviewFillSpacing.test.mts`

Expected: 3 tests pass, 0 fail.

- [ ] **Step 5: Commit the review-slot fix**

```bash
git add tests/reviewFillSpacing.test.mts src/index.css
git commit -m "Fix vocab review letter alignment"
```

---

### Task 2: Reduce Topic Words to Search-Only Controls

**Files:**
- Create: `tests/topicWordToolbar.test.mts`
- Modify: `src/features/vocabulary/pages/VocabularyExplorePage.tsx:711-860`
- Modify: `src/index.css:6679-6747`
- Modify: `src/index.css:6883-6932`
- Modify: `src/index.css:6957-6969`
- Modify: `src/index.css:9313-9325`

**Interfaces:**
- Consumes: Existing `wordFilter`, `setWordFilter`, pagination reset, category word queries, and standard `.vocab-word-rows` layout.
- Produces: `VocabularyTopicWordsPage` with one search input whose placeholder is `Search word by topic`, ordinary non-selectable word rows, and no selected-word workflow.

- [ ] **Step 1: Add a failing source-level regression test**

Create `tests/topicWordToolbar.test.mts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(
  new URL("../src/features/vocabulary/pages/VocabularyExplorePage.tsx", import.meta.url),
  "utf8"
);
const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const topicPageSource =
  pageSource.match(/export const VocabularyTopicWordsPage[\s\S]*?\nconst LevelWordBrowser/)?.[0] ?? "";

test("topic words expose only the requested search control", () => {
  assert.match(topicPageSource, /placeholder="Search word by topic"/);
  assert.doesNotMatch(topicPageSource, /selectedWordIds|toggleWordSelection/);
  assert.doesNotMatch(topicPageSource, /vocab-topic-selection-pill/);
  assert.doesNotMatch(topicPageSource, /Build quiz/);
  assert.doesNotMatch(topicPageSource, /type="checkbox"/);
});

test("topic words use the standard row layout and a full-width toolbar", () => {
  const toolbarRule = css.match(/\.vocab-topic-toolbar\s*\{([^}]+)\}/)?.[1] ?? "";

  assert.match(topicPageSource, /className="vocab-word-rows"/);
  assert.doesNotMatch(topicPageSource, /vocab-word-rows--selectable/);
  assert.match(toolbarRule, /grid-template-columns:\s*minmax\(0,\s*1fr\);/);
  assert.doesNotMatch(css, /\.vocab-word-row__select/);
});
```

- [ ] **Step 2: Run the targeted test and verify the expected failure**

Run: `node --experimental-strip-types --test tests/topicWordToolbar.test.mts`

Expected: FAIL because the old placeholder, selection state, checkbox, selected-count pill, quiz button, selectable row modifier, and three-column toolbar still exist.

- [ ] **Step 3: Remove the topic selection workflow from the page**

In `VocabularyTopicWordsPage`:

```tsx
// Delete this state:
// const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);

// Delete toggleWordSelection entirely.

<div className="vocab-topic-toolbar">
  <label>
    <input
      onChange={(event) => {
        setWordFilter(event.target.value);
        setPage(0);
        setWords([]);
      }}
      placeholder="Search word by topic"
      type="search"
      value={wordFilter}
    />
  </label>
</div>

<div className="vocab-word-rows">
  {visibleWords.map((word) => (
    <article key={word.id ?? word.word}>
      <strong>{word.word ?? word.normalizedWord}</strong>
      <span>{word.pos ?? "word"}</span>
      <button disabled={openWord.isPending} onClick={() => openWord.mutate(word)} type="button">
        See more
      </button>
    </article>
  ))}
</div>
```

Keep all existing loading, error, empty, pagination, and modal markup unchanged.

- [ ] **Step 4: Simplify the toolbar CSS and remove selection-only rules**

Change the toolbar grid declaration to:

```css
.vocab-topic-toolbar {
  align-items: end;
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(0, 1fr);
}
```

Delete the complete rule groups for:

```css
.vocab-topic-selection-pill
.vocab-topic-selection-pill strong
.vocab-topic-toolbar > button
.vocab-topic-toolbar > button:disabled
.vocab-word-rows--selectable article
.vocab-word-row__select
.vocab-word-row__select input
.vocab-word-row__select span
.vocab-word-row__select input:checked + span
.vocab-word-row__select input:checked + span::after
.vocab-word-row__select input:focus-visible + span
.vocab-word-rows--selectable .vocab-word-row__select
.vocab-word-rows--selectable strong
.vocab-word-rows--selectable span
.vocab-word-rows--selectable article > button
```

Also delete the mobile `.vocab-word-rows--selectable` overrides at the end of `src/index.css`. Retain all standard `.vocab-word-rows` rules.

- [ ] **Step 5: Run the targeted test and verify it passes**

Run: `node --experimental-strip-types --test tests/topicWordToolbar.test.mts`

Expected: 2 tests pass, 0 fail.

- [ ] **Step 6: Commit the topic toolbar fix**

```bash
git add tests/topicWordToolbar.test.mts src/features/vocabulary/pages/VocabularyExplorePage.tsx src/index.css
git commit -m "Simplify topic word search controls"
```

---

### Task 3: Full Verification and Visual QA

**Files:**
- Verify: `tests/reviewFillSpacing.test.mts`
- Verify: `tests/topicWordToolbar.test.mts`
- Verify: `src/features/vocabulary/pages/VocabularyExplorePage.tsx`
- Verify: `src/index.css`

**Interfaces:**
- Consumes: Completed review-slot and topic-toolbar changes from Tasks 1 and 2.
- Produces: Evidence that all repository tests pass, the production bundle builds, and desktop/mobile rendering matches the approved design.

- [ ] **Step 1: Run the complete automated test suite**

Run: `npm test`

Expected: Every test passes with 0 failures.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: TypeScript project build and Vite production build both finish with exit code 0.

- [ ] **Step 3: Check the patch for whitespace and scope errors**

Run: `git diff --check`

Expected: Exit code 0 with no output.

Run: `git diff -- tests/reviewFillSpacing.test.mts tests/topicWordToolbar.test.mts src/features/vocabulary/pages/VocabularyExplorePage.tsx src/index.css`

Expected: Only the reviewed slot geometry, topic search markup/state, unused selection CSS, and their regression tests differ.

- [ ] **Step 4: Start the Vite server and inspect desktop rendering**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Vite reports a local URL, normally `http://127.0.0.1:5173/`.

In the in-app browser, open a review question of type `VOCAB_FILL_MISSING_WORD_PART`, enter a value containing `m` or `w`, and confirm that no glyph is clipped and all letters form one visual line. Open a concrete vocabulary topic and confirm that only the full-width `Search word by topic` field appears above rows without checkboxes.

- [ ] **Step 5: Inspect the same views at mobile width**

Use a viewport no wider than 390 CSS pixels. Confirm the review word remains readable without overlapping and the topic search field fits its container while each standard word row retains its word, part of speech, and `See more` action.

- [ ] **Step 6: Record final repository status**

Run: `git status --short`

Expected: No uncommitted implementation changes after the task commits; the running Vite process may remain active so the user can inspect the supplied URL.
