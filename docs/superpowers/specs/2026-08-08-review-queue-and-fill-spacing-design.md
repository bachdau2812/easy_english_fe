# Review Queue and Fill Spacing Design

## Goal

Fix two vocabulary-review regressions:

1. Missing-character and missing-word inputs must use compact, natural spacing.
2. A replacement exercise generated after a wrong answer must be appended to the queue without changing the question currently being answered.

## Current Behavior and Root Cause

`InlineReviewAnswer` renders both missing characters inside a word and a missing word inside an example sentence. The word-only modifier has already been tightened, but the shared sentence-fill rules still apply non-zero gaps between character slots, so the spacing fix is incomplete.

When the result popup for a wrong answer is closed, `generateWrongReviewQuestion` requests another exercise. Its success callback calls `goToNextReviewQuestion`, which combines queue mutation, index movement, and answer resets. Because the callback is asynchronous, the response can change the active question and clear its in-progress state.

## Design

### Review queue flow

Closing a result popup always advances the review exactly once, immediately:

- Clear the completed attempt state and popup state.
- Increment the active index to the next existing question.
- Reset only the state that belongs to the completed question.

For a wrong answer with a `userVocabId`, start replacement generation independently. When it completes:

- Extract the generated question from either an object or array response.
- Append a valid generated question to the end of `reviewQuestions` with a functional state update.
- Do not change `reviewIndex`, `reviewAnswer`, replay count, attempt state, popup state, or reveal state.
- If generation fails or returns no valid question, leave the current queue and active question unchanged.

This keeps the original question order stable and ensures a late response cannot skip the question currently being answered.

### Fill-input spacing

Use compact character spacing for every `InlineReviewAnswer` slot group:

- Remove the non-zero flex gap between adjacent character inputs.
- Keep each input narrow enough to read as one continuous word while preserving an individual focus target.
- Keep normal sentence whitespace in the text spans so the blank remains naturally separated from surrounding words.
- Retain the word-only modifier for typography and centering, not for a separate spacing behavior.

## Testing

Add regression coverage without introducing a new test dependency:

- A pure queue helper test proves that appending a generated question preserves the active index and current answer state.
- CSS regression checks cover both the general sentence-fill slot group and the word-only variant.
- Run the complete Node test suite and production build.

## Scope

Only the vocabulary review queue, its focused helper/test code, and relevant fill-input CSS are in scope. Existing unrelated home, search, API, Docker, and configuration changes remain untouched.
