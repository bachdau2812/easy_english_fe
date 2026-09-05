# Saved Vocabulary Search Detail Fetch Design

## Goal

Adapt saved-vocabulary autocomplete to the backend's lightweight search response. Selecting a result closes the dropdown, fetches the saved word detail by `userVocabId`, and opens the existing word-detail modal.

## Superseded Behavior

This design supersedes the embedded-detail selection flow in `2026-09-05-saved-vocabulary-search-design.md`. Search results no longer contain a nested `userVocabulary` object or an embedded `WordResponse`, so the frontend must not attempt to open the modal directly from the search response.

## Search Response Contract

```ts
interface UserVocabularySearchResponse {
  userVocabId: UUID;
  word: string;
  level: number;
  pos: string;
}
```

The existing search request is unchanged:

```http
GET /user-vocabularies/search
?text=<normalized-prefix>
&isAutocomplete=true
&page=0
&limit=20
```

The user remains derived from the bearer token. `userId` is used only to partition the local React Query cache and is never sent as a search query parameter.

## Component Boundaries

`SavedVocabularySearch` remains responsible for the input, search dropdown, result rendering, pointer/keyboard selection, and immediate dropdown dismissal. Its selection callback changes from `(word: WordResponse) => void` to `(userVocabId: string) => void`.

`MyVocabularyPanel` remains responsible for detail loading and modal state. It reuses the existing `openSavedWord` mutation, which calls `vocabularyApi.getSavedVocabularyWord(userVocabId)` and stores the returned `WordResponse` in `savedModalWord`.

No second detail-loading implementation is added to the search component.

## Interaction and Data Flow

1. The user types at least two normalized characters.
2. The existing debounced saved-vocabulary search returns lightweight result rows.
3. Each row renders `word`, `pos`, and `Level <level>` directly from the flat response.
4. Pointer selection or Enter calls `onSelect(result.userVocabId)`.
5. The dropdown closes immediately and clears its active option.
6. `MyVocabularyPanel` invokes the existing `openSavedWord` mutation.
7. A successful `GET /user-vocabularies/{userVocabId}/word` response opens `HomeWordDetailModal` through `savedModalWord`.

## Loading and Error Behavior

- The dropdown closes immediately; it does not remain open during detail loading.
- While a detail request is pending, result selection and the existing level-detail buttons share the mutation's pending state.
- A detail-load error is rendered in the list section, including when the user is still on the level overview.
- Search loading, empty, and error behavior remains unchanged.
- A failed detail request does not clear the search input or disturb the level list.

## Testing

Update the existing saved-vocabulary search contract tests to verify:

- the flat response fields `userVocabId`, `word`, `level`, and `pos`;
- dropdown keys and labels use the flat response;
- selection passes `result.userVocabId` and never passes `result.word` to the modal;
- the page selection callback invokes `openSavedWord.mutate(userVocabId)`;
- modal state still receives only the `WordResponse` returned by the detail mutation;
- the detail error is visible from the level overview.

Run the focused saved-search test, the complete test suite, and the production build.

## Success Criteria

- Search results render correctly from the lightweight response.
- Selecting a result closes the dropdown immediately.
- Exactly one detail request is made through `/user-vocabularies/{userVocabId}/word` after selection.
- The returned saved meaning opens in the existing detail modal.
- Existing level-detail behavior remains unchanged.
- Tests and production build succeed.
