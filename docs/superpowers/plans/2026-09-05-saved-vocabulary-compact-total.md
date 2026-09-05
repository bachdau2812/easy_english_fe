# Saved Vocabulary Compact Total Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the separate label text next to saved-vocabulary search and render the total as a compact `Total 203` group.

**Architecture:** Make one copy change in the existing page, one attribute removal in the existing search component, and one narrowly scoped CSS override. Preserve all search behavior and responsive layout.

**Tech Stack:** React 18, TypeScript 5.5, CSS, Vite 5.

## Global Constraints

- The visible total label is exactly `Total`.
- The total number is exactly `8px` after the label.
- The search input keeps the visible placeholder `Search saved vocabulary`.
- The search icon remains, while the separate sibling label text is removed.
- The input has `aria-label="Search saved vocabulary"`.
- The user explicitly waived new and updated automated tests for this visual adjustment; verification is `npm.cmd run build` plus `git diff --check`.

---

### Task 1: Compact total and empty search input

**Files:**
- Modify: `src/features/vocabulary/pages/VocabularyExplorePage.tsx`
- Modify: `src/features/vocabulary/components/SavedVocabularySearch.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: existing `vocabularyQuantity.data.totalQuantity`, `SavedVocabularySearch`, and `.vocab-saved-level-toolbar` layout.
- Produces: a visible `Total <number>` group and a search field whose placeholder remains inside the input without a separate label next to the icon.

- [ ] **Step 1: Update the visible total copy**

Replace only the visible label while retaining a descriptive accessible name:

```tsx
<div aria-label="Total vocabulary" className="vocab-saved-level-total">
  <span>Total</span>
  <strong>{formatStatNumber(vocabularyQuantity.data.totalQuantity)}</strong>
</div>
```

- [ ] **Step 2: Remove the separate search label and keep the placeholder**

Delete this sibling text node:

```tsx
<span className="sr-only">Search saved vocabulary</span>
```

Keep the placeholder and put the accessible name directly on the input:

```tsx
aria-label="Search saved vocabulary"
placeholder="Search saved vocabulary"
```

- [ ] **Step 3: Keep the total label and value together**

Extend the existing toolbar-specific total rule to exactly:

```css
.vocab-saved-level-toolbar .vocab-saved-level-total {
  background: transparent;
  border: 0;
  border-radius: 0;
  display: flex;
  gap: 8px;
  justify-content: flex-start;
  padding: 6px 0;
  width: max-content;
}
```

- [ ] **Step 4: Verify production compilation and whitespace**

Run: `npm.cmd run build`

Expected: TypeScript compilation and Vite production build exit with code `0`.

Run: `git diff --check`

Expected: exit code `0` with no whitespace errors.

- [ ] **Step 5: Commit the scoped change**

```bash
git add src/features/vocabulary/pages/VocabularyExplorePage.tsx src/features/vocabulary/components/SavedVocabularySearch.tsx src/index.css
git add -f docs/superpowers/plans/2026-09-05-saved-vocabulary-compact-total.md
git commit -m "Compact saved vocabulary total"
```
