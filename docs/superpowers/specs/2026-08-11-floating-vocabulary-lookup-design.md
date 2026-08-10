# Floating Vocabulary Lookup Design

## Goal

Provide a movable vocabulary lookup throughout an active Vocab Review session, matching the floating lookup experience in an IELTS Reading detail page and adding an `All meanings` search mode to both screens.

## Scope

- Show the lookup for the entire active Vocab Review session, including before an answer is submitted and while a result popup is open.
- Do not render it on the review start/configuration screen or after the session exits.
- Preserve all review question, answer, progress, result-popup, and generated-question state while lookup is used.
- Replace the Reading page's local floating-search implementation with the same shared component.
- Add `All meanings` to both Reading and Vocab Review lookup instances.
- Do not persist lookup position, query, open state, or search mode in browser storage.

## Shared Component

Create `FloatingVocabularyLookup` under the Search feature. It owns:

- collapsed/open state;
- query text and `All meanings` state;
- autocomplete and full-search requests;
- loading, empty, and error presentation;
- drag state and viewport-constrained positioning;
- selected word results displayed through `HomeWordDetailModal`.

Each consuming screen supplies a reference to the visual area used for default placement. The default position is near the upper-right edge of that area. Positioning uses `position: fixed`, and movement is clamped to the browser viewport.

The component is draggable only while collapsed. A movement threshold distinguishes dragging from clicking. Clicking without crossing the threshold opens the search; opening the search disables dragging so pointer gestures do not interfere with typing or controls.

Because the component is mounted only while its owning Reading detail page or Review session exists, all local state resets naturally after unmount. A new Review session therefore starts at the default position.

## Search Modes and API Flow

The component uses the existing `useAutocomplete(query, isAllMeanings)` hook. When `All meanings` is active, autocomplete includes `isUniqueSearch=true`; otherwise it keeps the default request shape.

Submitting typed text normalizes the query and calls `searchApi.fullSearch(query, "vi")`.

- Default mode selects one preferred result, retaining Reading's preference for a Mochi result when present and otherwise choosing the first response.
- `All meanings` mode keeps every returned word result and passes the complete list to `HomeWordDetailModal` through its `words` prop.

When a suggestion is selected:

- default mode loads the selected dictionary word by ID through `dictionaryApi.getWordDetail` when an ID exists; otherwise it runs full search and displays the single preferred result;
- `All meanings` mode searches the suggestion's normalized text so every matching part of speech and meaning is returned.

Changing `All meanings` refreshes autocomplete through its query key. The selected mode remains active while the component stays mounted, including after the search field is closed and reopened, but is not persisted to a later page/session.

## Review Integration

Render the shared lookup inside the active `vocab-review-screen` branch. Attach its default-position reference to the review screen container so it initially appears near the top-right outside the question card.

Layering order is:

1. Review content and result backdrop.
2. Floating lookup and its suggestions.
3. `HomeWordDetailModal`.

This keeps lookup reachable while the result popup is visible, while ensuring dictionary detail remains the topmost interactive layer.

The review result's global Enter shortcut must ignore keyboard events from inputs, textareas, selects, buttons, forms, and content-editable elements, as well as already-prevented events. Pressing Enter in lookup submits only the lookup form and must not close the result popup or advance the review queue. Enter outside interactive lookup controls keeps the current review behavior.

## Reading Integration

Replace Reading-specific search state, drag handlers, autocomplete, detail-search mutation, and search markup with `FloatingVocabularyLookup`. Retain the existing click-a-word `ReadingWordPopup`; that inline passage-word behavior is separate and remains unchanged.

The Reading lookup uses the reading content body as its default-position reference and receives the same Vietnamese language code and modal behavior as today.

## UI Behavior

- Collapsed state is a circular search button with reduced opacity until hover/focus.
- Expanded state contains the search input, `All meanings` toggle, and close control.
- Suggestions appear below the expanded control, limited to seven visible result rows before scrolling.
- The close control clears the query and closes the field but retains the current `All meanings` selection for the current mount.
- Search loading, autocomplete error, no suggestions, full-search error, and no full-search results are communicated within the lookup panel.
- Closing the word-detail modal returns focus and state to the unchanged Reading or Review screen.
- Mobile width is constrained to the viewport; all draggable coordinates remain within a 12-pixel viewport margin.

## Error Handling

- Empty normalized queries do not call the backend and show a concise prompt.
- Request errors use `getSafeErrorMessage` and do not modify the current review state.
- An empty full-search response shows a not-found state rather than opening an empty modal.
- Stale autocomplete results are handled by the existing query hook and query keys.
- No lookup error closes or exits a review session.

## Verification

- Unit-test pure position clamping and single/all-result selection helpers.
- Verify autocomplete receives `isUniqueSearch=true` only when `All meanings` is enabled.
- Verify default mode produces one preferred result and `All meanings` preserves all results.
- Verify the Review Enter shortcut excludes lookup and other interactive targets.
- Add source-level integration assertions for shared-component use in Reading and active Vocab Review.
- Run the complete Node test suite.
- Run the TypeScript/Vite production build.
