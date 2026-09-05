# Saved Vocabulary Compact Total Design

## Goal

Simplify the saved-vocabulary toolbar by removing visible search placeholder text and presenting the total as a compact `Total 203` group.

## UI Changes

- Replace the visible `Total vocabulary` label with `Total`.
- Keep the total value immediately after the label with an exact `8px` gap.
- Keep the compact total group on the left and the search field on the right.
- Remove the input's visible `Search saved vocabulary` placeholder.
- Preserve the search icon and the hidden accessible label `Search saved vocabulary`.
- Preserve all search behavior, API integration, dropdown behavior, and responsive layout.

## Implementation

- Update the total label in `VocabularyExplorePage.tsx`.
- Remove the `placeholder` prop from `SavedVocabularySearch.tsx`.
- Change `.vocab-saved-level-total` to an inline-sized flex group with `justify-content: flex-start` and `gap: 8px`.
- Do not modify unrelated files, including the existing user change in `.github/workflows/deploy.yml`.

## Verification

The user explicitly waived new or updated automated tests for this small visual adjustment. Verification consists of a successful `npm.cmd run build` and a committed-diff whitespace check.

## Success Criteria

- No visible text appears inside an empty search input.
- The search input remains accessible by name.
- The total reads `Total <number>` with the number 8px from the label.
- The production build succeeds.
