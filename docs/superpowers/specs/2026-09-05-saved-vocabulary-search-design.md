# Saved Vocabulary Search Design

## Goal

Add an authenticated autocomplete search to the saved-vocabulary level overview. The total count remains on the left, the search control appears on the right, and selecting a result opens the already-filtered saved meaning from the search response without another detail request.

## Scope

- Add `GET /user-vocabularies/search` to the frontend vocabulary API.
- Search all vocabulary saved by the authenticated user, independently of review level.
- Start autocomplete only after the normalized query contains at least two characters.
- Show a searchable dropdown on the level-overview screen next to `Total vocabulary`.
- Open the existing word-detail modal from the `WordResponse` embedded in the selected result.
- Preserve the existing level browsing and saved-word detail behavior.

The feature does not add exact-search mode, search pagination controls, server changes, search-history writes, or search within an already selected level.

## API Contract

Request:

```http
GET /vocab-learning/user-vocabularies/search
Authorization: Bearer <token>

?text=app
&isAutocomplete=true
&page=0
&limit=20
```

The frontend API method sends only `text`, `isAutocomplete`, `page`, and `limit`. It must not send `userId`; the backend resolves the user from the bearer token.

Response content items have this shape:

```ts
interface UserVocabularySearchResponse {
  userVocabulary: UserVocabularyResponse;
  word: WordResponse;
}
```

`word` contains only the sense or localized sense previously saved by the user. It is therefore the source for the modal and must not be replaced with a second request to `/user-vocabularies/{userVocabId}/word`.

## Architecture

### API and types

Extend the vocabulary types with `UserVocabularySearchResponse`. Add a focused API method that returns `PageResponse<UserVocabularySearchResponse>` and constructs the exact search query described above.

Add a dedicated React Query key that includes normalized text, autocomplete mode, page, and limit. This prevents unrelated vocabulary queries from sharing cache entries.

### Search hook

Create a saved-vocabulary search hook responsible for:

- trimming and normalizing the entered text;
- applying a 300 ms debounce;
- enabling the query only when the user is authenticated and the debounced query has at least two characters;
- requesting page `0`, limit `20`, and `isAutocomplete=true`;
- retaining React Query's normal stale-request isolation and cache behavior.

Authentication remains the responsibility of the existing `apiClient`, which attaches the bearer token. The hook may use authentication state to avoid an invalid request, but it must not pass the user ID to the endpoint.

### UI component

Create a focused saved-vocabulary search component rather than adding all search state and keyboard behavior directly to the already large page component. The component receives a callback that supplies the selected `WordResponse` to its parent.

The parent retains ownership of the existing `savedModalWord` state and `HomeWordDetailModal`. Selecting a dropdown result calls the callback, closes the dropdown, and opens that modal with `result.word`.

## Layout and Visual Behavior

On the saved-level overview, convert the blue total row into a toolbar:

- `Total vocabulary` and its count remain grouped on the left.
- The search input sits on the right on desktop.
- On narrow screens, the two groups wrap or stack so the count and input remain readable and touch-friendly.

The search input uses the existing visual language: rounded border, blue focus state, search icon, and the placeholder `Search saved vocabulary`.

The dropdown is anchored below the input and overlays the level rows without changing their vertical position. Each result shows:

- the saved word as the primary label;
- part of speech from `word.pos`, with a neutral fallback when absent;
- `Level n` from `userVocabulary.level` when available.

At most the 20 results returned by the first page are displayed. The dropdown itself may scroll when its contents exceed the available height.

## Interaction

- Zero or one normalized character: no API request and no dropdown.
- Two or more normalized characters: after 300 ms, request autocomplete results.
- Further typing resets the debounce and searches the latest normalized prefix.
- Loading: show a compact `Searching saved vocabulary...` status in the dropdown.
- Empty success: show `No saved vocabulary found`.
- Error: show a compact error message in the dropdown without replacing the total or level list.
- Mouse or touch selection: open the selected saved meaning in the modal.
- `ArrowDown` and `ArrowUp`: move the active result.
- `Enter`: select the active result.
- `Escape`, clicking outside, or clearing the query: close the dropdown.
- Refocusing a valid query reopens the available result/status panel.

The selected result is not written to general dictionary search history because this feature browses the user's saved collection.

## Data Flow

1. The authenticated user enters text in the search input.
2. The search component normalizes and debounces the value.
3. The hook calls `vocabularyApi.searchSavedVocabularies` with `isAutocomplete=true`, `page=0`, and `limit=20`.
4. The API client supplies the bearer token; no user identifier appears in the query string.
5. The dropdown renders `PageResponse.content`.
6. Selecting a result passes its embedded `word` to `MyVocabularyPanel`.
7. `HomeWordDetailModal` renders that filtered `WordResponse`; no additional network request is made.

## Accessibility

- The text field has a visible or accessible label.
- The input exposes combobox state with `aria-expanded`, `aria-controls`, and `aria-activedescendant` when applicable.
- The dropdown uses listbox semantics and each result uses option semantics.
- Active keyboard selection has a visible highlight.
- Existing modal semantics and close behavior remain unchanged.

## Error and Edge Cases

- Missing optional word metadata uses safe labels and never prevents selection.
- A result without a usable embedded `word` is rendered disabled or omitted, so it cannot open an empty modal.
- Late responses cannot replace the latest query's visible results because each normalized query has a distinct React Query key.
- Search errors remain local to the dropdown; users can still open a level and browse saved words.
- Closing the modal does not clear the search query, allowing the user to inspect another result.
- Leaving the list section clears transient open-dropdown state through component unmounting.

## Testing Strategy

The repository's Node test suite currently validates source-level contracts and isolated pure helpers. Add tests consistent with that setup for:

- the API path and exact query keys, including the absence of `userId`;
- the response type containing both saved metadata and `WordResponse`;
- the minimum two-character threshold and 300 ms debounce contract;
- query-key isolation by search text and paging values;
- listbox keyboard semantics and selection flow;
- passing the embedded `result.word` to the existing modal without calling the saved-word detail endpoint;
- desktop alignment and responsive stacking rules for the total/search toolbar.

Final verification runs `npm test` and `npm run build`.

## Success Criteria

- The total appears on the left and saved-vocabulary search appears on the right at desktop widths.
- No search request is made before two normalized characters are present.
- Autocomplete sends `text`, `isAutocomplete=true`, `page=0`, and `limit=20`, and never sends `userId`.
- Loading, empty, error, pointer, and keyboard states work without disrupting the level list.
- Selecting a result immediately opens the meaning already embedded in the search response.
- Selecting a search result does not trigger `/user-vocabularies/{userVocabId}/word`.
- Existing tests pass and the production build succeeds.
