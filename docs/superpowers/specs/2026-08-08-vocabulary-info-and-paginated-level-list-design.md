# Vocabulary Info and Paginated Level List Design

## Goal

Integrate the new user-vocabulary information API into the existing My Vocabulary experience without changing its top-level navigation:

1. Replace the expanded List Vocabulary content with a level-quantity overview and an on-demand paginated word list.
2. Show the number of saved vocabularies currently ready for review in the expanded Review content.

## Backend Contract

Both information views use:

`GET /user-vocabularies/info?userId=<userId>&infoType=<infoType>`

- `VOCAB_QUANTITY` returns `totalQuantity` and `quantityByLevels` for levels 1 through 6. `reviewQuantity` is `null`.
- `VOCAB_REVIEW` returns `reviewQuantity`. Quantity fields not used by this type are `null`.

The selected level word list continues to use:

`GET /user-vocabularies/by-level?userId=<userId>&level=<1-6>&page=<zero-based-page>&limit=20`

The response is a Spring `Page<UserVocabularyResponse>` and supplies `content`, `number`, `totalPages`, `first`, `last`, and the other standard page fields already modeled by `PageResponse`.

## User Experience

### My Vocabulary navigation

The existing collapsed My Vocabulary view remains unchanged. Daily statistic, Overall statistic, List vocabulary, and Review remain available as the same four actions.

### List Vocabulary: level overview

Opening List Vocabulary initially displays the total saved vocabulary quantity followed by six level rows. No `/by-level` request is made yet.

Each row displays:

- `Level 1` through `Level 6` on the left.
- The saved vocabulary quantity for that level on the right.

The frontend normalizes the response into all six levels in numeric order. A missing level or missing quantity is displayed as `0`. A compact summary above the rows displays `Total vocabulary` with `totalQuantity`, defaulting to zero when it is null.

Loading and error states belong to the level overview. An information API failure shows an inline error with a Retry button that calls the query refetch function while preserving the rest of the My Vocabulary navigation.

### List Vocabulary: selected level

Selecting a row switches the same panel to a detail view for that level and starts the first `/by-level` request with `page=0` and `limit=20`.

The detail view includes:

- A back action returning to the six-level overview.
- The selected level title and its known quantity.
- Existing saved-word rows and word-detail behavior.
- An empty state when the backend page contains no words.
- Previous and Next controls plus `Page X / Y`.

Previous is disabled on the first page; Next is disabled on the last page. Page state is zero-based internally and one-based in display text. Selecting a different level always resets the page to zero. Page changes keep the current page visible while the next page loads, using the existing TanStack Query `keepPreviousData` pattern.

Returning to the level overview does not call `/by-level`. Reopening a recently viewed level may use TanStack Query cache for the same `userId`, level, page, and limit.

### Review quantity

Opening Review requests `VOCAB_REVIEW`. The start view shows `reviewQuantity` near "Ready for a focused review?" as informational text. It does not alter the existing 30/60/90 controls, reminder behavior, or review-generation rules.

The ready quantity has its own loading and inline error state. It is not shown inside an active standalone review session.

## Frontend Architecture

Add the backend DTO types to the vocabulary feature:

- `UserVocabularyInfoType`
- `UserVocabularyLevelQuantityResponse`
- `UserVocabularyInfoResponse`

Add `vocabularyApi.getVocabularyInfo({ userId, infoType })` and a query key containing both values. The existing `getSavedVocabulariesByLevel` API accepts its existing `page` and `limit` parameters and will be called only after a level is selected.

Keep the integration local to `MyVocabularyPanel`. Use separate queries for quantity information, review information, and the selected level page so each area has independent caching, loading, and errors.

Extract a small pure normalization helper for level quantities. It accepts nullable backend data and returns exactly six ordered entries, which keeps rendering and regression tests deterministic.

## Error and Edge-Case Behavior

- Do not invent fallback API fields or endpoints.
- Missing `quantityByLevels`, missing individual levels, and null quantities render as zero.
- A quantity request failure does not trigger a `/by-level` request.
- A selected-level request failure keeps the detail shell, selected level, pagination state, and an inline Retry button that refetches the same page.
- A page with `totalPages=0` displays `Page 0 / 0` or omits the page label; the implementation will omit the label and disable both navigation buttons.
- Review quantity failures do not block starting a review session.
- Queries remain disabled without an authenticated `userId`.

## Testing and Verification

Add regression tests without adding a new testing dependency:

- API source contract verifies `/user-vocabularies/info`, `userId`, and `infoType` query parameters.
- Level normalization returns exactly levels 1-6 in order and fills missing quantities with zero.
- UI source contract verifies the total quantity is rendered, `/by-level` is enabled only after a level is selected, page resets on level selection, and review info uses `VOCAB_REVIEW`.
- Existing review queue and fill-spacing tests remain green.
- Run the complete Node test suite, TypeScript/Vite production build, and scoped diff check.

## Scope

Only vocabulary info types/API/query keys, the List Vocabulary and Review expanded content, focused styling, and related tests are in scope. The top-level My Vocabulary action layout, Daily/Overall statistics, review session behavior, and unrelated uncommitted home/search/API/Docker work remain unchanged.
