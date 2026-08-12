# Mobile Navigation, Search History, and Review Audio Design

## Goal

Improve mobile navigation and search layout, make vocabulary-review sounds respond promptly, and record successful authenticated searches consistently.

The work spans the React frontend and the Spring Boot backend. Desktop navigation and the existing learning flows remain visually and behaviorally unchanged unless explicitly described below.

## Current-State Findings

### Review audio delay

Vocabulary review currently constructs a new `Audio` object only after each sound button is pressed. The browser therefore starts connection, download, and decoding work after the interaction. Sound-choice questions can repeat this cost for every click. The listening flow is faster because it keeps mounted audio elements and reuses them through refs.

### Mobile search layout

The search form now contains three children: search icon, input, and `All meanings`. A later mobile rule still forces the form to two grid columns, so the third child wraps beneath the input. This also causes vertical misalignment inside the search background.

### Mobile learning navigation

On viewports up to `760px`, the logo currently opens a compact dropdown containing the five navbar groups. The existing large Home cards already show the same five names: Vocabulary, Writing, Listening, Pronunciation, and Reading. They are presentational articles and do not navigate.

### Search history inconsistency

Selecting a single autocomplete result calls `GET /word-data/word` with `userId`; that backend path records or refreshes history. Submitting the search form calls `GET /word-data/words/search`, which has no `userId` and does not record history. The frontend already exposes `vocabularyApi.addSearchHistory`, but no successful search flow calls it. The explicit POST endpoint always inserts and is not currently idempotent.

## Shared Learning Navigation Model

Create one shared navigation model for the five learning groups. Both the existing desktop navbar dropdowns and the new mobile category hub consume this model so labels and destinations cannot drift.

The groups and current child behavior are:

- Vocabulary
  - Words by topic -> `/vocabulary/topics`
  - Words by level -> `/vocabulary/levels`
  - My Vocabulary -> `/vocabulary/my`
- Writing
  - IELTS Writing Task 1 -> `/writing/1`
  - IELTS Writing Task 2 -> `/writing/2`
- Listening
  - Listen and Type -> `/listening/listen-and-type`
  - Daily audio -> preserve the current unavailable/home-anchor behavior
  - Dictation drills -> preserve the current unavailable/home-anchor behavior
- Pronunciation
  - Coming Soon -> disabled, matching the current desktop dropdown
- Reading
  - IELTS Resource -> `/reading/ielts`

Each child entry describes its label, description, icon, destination or action, and availability. The desktop navbar retains its current dropdown UI and interaction.

## Mobile Card Navigation and Category Hub

Only on viewports up to `760px`:

1. Clicking the logo navigates Home and no longer opens the compact category dropdown.
2. The existing `HomeHero` course cards become the entry points for the five matching learning groups. No extra Home card, category strip, drawer, or hamburger menu is introduced.
3. Selecting a course card opens one reusable category-hub route for that group.
4. The hub renders the shared child entries as category choices.
5. Selecting a category executes the same destination/action as the corresponding desktop dropdown item.

The Home cards keep their existing colors, content, order, and large mobile layout. Add only clear tap/focus feedback and accessible button/link semantics. On desktop the cards remain presentational and the navbar dropdown continues to be the navigation entry point.

An unknown or malformed category key produces the existing not-found experience instead of silently selecting another group.

## Mobile Search Layout

At the final `max-width: 760px` cascade layer, the open search form uses three columns:

1. Fixed-width search icon
2. Flexible input
3. Fixed-width `All meanings` control

All three children align vertically at the center of the same `42px` search pill. The control stays inside the pill and does not wrap or overflow. Its visible text may remain hidden at narrow widths while the switch remains accessible through its label. Desktop rules do not change.

## Review Audio Pool

Replace per-click `new Audio(url)` calls in the vocabulary review screen with a small, lifecycle-bound audio pool.

### Source collection

For the current question, collect only playable sources that the UI can invoke:

- `audioUrl` for listen-and-type questions;
- metadata option values for the two sound-choice exercise types;
- the resolved result sound for the current word.

Also collect the next question's playable sources. Normalize relative Mochi paths through the existing URL builder, trim values, remove empty entries, and deduplicate URLs.

### Preloading and playback

- When the current review index changes, preload the current and next question sources with `preload="auto"` and `load()`.
- Keep one reusable `HTMLAudioElement` per cached URL.
- On play, stop any currently active review audio, reset the selected element to `currentTime = 0`, and call `play()`.
- If a source was not preloaded, create and cache it as a safe fallback.
- Evict and pause sources that no longer belong to the current/next window.
- Clear and pause the entire pool when the review session closes or the component unmounts.
- Preserve replay-count behavior and the existing result-popup autoplay attempt.
- Playback rejection must be handled without an unhandled promise or blocking the review flow.

This bounds bandwidth to at most the current and next question rather than preloading all 30, 60, or 90 questions.

## Successful Search History Recording

### Recording rule

For an authenticated user, every explicit word search records history only after dictionary data resolves successfully and at least one result has a valid word ID. Autocomplete requests issued while typing never record history. Failed or empty searches never record history.

For `All meanings`, record only the first displayed result's word ID so one search does not create several visually duplicated history rows for multiple parts of speech.

Apply the rule to:

- Home navbar form submissions and suggestion selections;
- navbar search on learning routes;
- the floating vocabulary lookup;
- clicks on an existing recent-search entry, which refresh its timestamp after the word resolves.

Unauthenticated searches skip history recording because the API requires a user ID.

### Frontend orchestration

Create one search-history recording helper that:

1. resolves the first valid word ID from a successful result set;
2. calls `POST /user-vocabularies/search-history` with `userId` and `wordId`;
3. invalidates the shared search-history query key after success;
4. treats recording as a non-blocking secondary operation, so a history failure does not hide an already successful dictionary result;
5. handles failures explicitly without an unhandled promise.

Search-triggered detail requests should use this explicit helper rather than relying on the hidden `GET /word-data/word?userId=...` side effect. Other existing consumers of that backend API keep their current behavior.

### Backend idempotency

Change `POST /user-vocabularies/search-history` to match the existing automatic recording semantics:

- validate the user and word;
- if `userId + wordId` exists, refresh `searched_at` and return the existing logical history entry;
- otherwise insert a new row;
- never create another row merely because the same word was searched again.

Move the shared record-or-refresh behavior into one focused backend service used by both the explicit POST endpoint and `GET /word-data/word` automatic recording, avoiding two implementations that can diverge.

## Error Handling

- Category-hub route errors use the existing not-found/error presentation.
- Unavailable learning items are visibly disabled or preserve their current non-route behavior; no fake endpoint is invented.
- Audio load/play failures do not interrupt answering or advancing review questions.
- Search history failures do not replace successful word results, but are caught and remain observable through the app's safe logging/error utilities.
- Backend validation continues to use `AppException` and existing `ErrorCode` values for missing users or words.

## Testing and Verification

### Frontend automated tests

- Shared navigation model maps all five Home cards to the same child labels and destinations used by desktop navigation.
- Unknown category keys do not resolve to another group.
- Audio source collection includes only valid current/next playable sources and deduplicates normalized URLs.
- Audio-pool tests with an injected fake audio factory verify preload, reuse, restart, active-audio stopping, eviction, and cleanup.
- Search-history helper records only authenticated successful searches, chooses the first valid result for `All meanings`, invalidates history after success, and does not reject successful search presentation when recording fails.
- Existing search result selection tests continue to pass.

### Backend automated tests

- First POST inserts a history row.
- Repeated POST for the same user and word refreshes the timestamp without increasing row count.
- Missing user and missing word retain their current business errors.
- Automatic recording through `GET /word-data/word` and explicit POST use the same record-or-refresh behavior.

### Build and responsive verification

- Run frontend tests and production build.
- Run focused backend tests and the Maven suite.
- At widths below and above `760px`, verify the search pill, logo behavior, Home-card behavior, desktop dropdown preservation, and all five category-hub mappings.
- Confirm repeated sound clicks begin from the start without overlapping previously active review audio.
- Inspect both repositories' final diffs so unrelated uncommitted work remains untouched.
