# Saved Vocabulary Compact Total Design

## Goal

Simplify the saved-vocabulary toolbar by removing the separate search label next to the icon and presenting the total as a compact `Total 203` group.

## UI Changes

- Replace the visible `Total vocabulary` label with `Total`.
- Keep the total value immediately after the label with an exact `8px` gap.
- Keep the compact total group on the left and the search field on the right.
- Remove the separate `Search saved vocabulary` text node next to the search icon.
- Preserve the input placeholder `Search saved vocabulary`.
- Give the input the accessible name `Search saved vocabulary` directly through `aria-label`.
- Preserve all search behavior, API integration, dropdown behavior, and responsive layout.

## Implementation

- Update the total label in `VocabularyExplorePage.tsx`.
- Remove the sibling label text from `SavedVocabularySearch.tsx`, keep its placeholder, and move the accessible name to the input.
- Change `.vocab-saved-level-total` to an inline-sized flex group with `justify-content: flex-start` and `gap: 8px`.
- Do not modify unrelated files, including the existing user change in `.github/workflows/deploy.yml`.

## Verification

The user explicitly waived new or updated automated tests for this small visual adjustment. Verification consists of a successful `npm.cmd run build` and a committed-diff whitespace check.

## Success Criteria

- The empty search input displays its placeholder, with no separate text next to the icon.
- The search input remains accessible by name.
- The total reads `Total <number>` with the number 8px from the label.
- The production build succeeds.
