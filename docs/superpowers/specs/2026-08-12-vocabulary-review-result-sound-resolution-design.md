# Vocabulary Review Result Sound Resolution Design

## Goal

Ensure every vocabulary review result popup uses the best playable sound already present in its quiz response, while hiding sound controls only when no exercise-level or word-level source exists.

## Evidence and Root Cause

The supplied response contains 90 review quizzes across eight exercise types. The current popup resolver checks `sound.mp3Url`, then `sound.oggUrl`, then `audioUrl`. It never reads the correct sound option stored in `metadata[correctAnswer]`.

This loses playable audio for at least two concrete response entries:

- `mainland` in `VOCAB_SENTENCE_BLANK_TO_SOUND`
- `arrogant` in `VOCAB_MEANING_TO_SOUND`

Both entries have a playable URL in `metadata[correctAnswer]` and no playable URL in `sound.mp3Url` or `sound.oggUrl`. Across the complete response, 83 quizzes have a resolvable source under the rules below; the remaining seven have no playable source in either the exercise data or the `sound` property.

## Resolution Rules

For `VOCAB_MEANING_TO_SOUND` and `VOCAB_SENTENCE_BLANK_TO_SOUND`, resolve the first non-empty value in this order:

1. `metadata[correctAnswer]`
2. `audioUrl`
3. `sound.mp3Url`
4. `sound.oggUrl`

For every other review exercise type, resolve the first non-empty value in this order:

1. `audioUrl`
2. `sound.mp3Url`
3. `sound.oggUrl`

All values are trimmed. Missing values and strings containing only whitespace are ignored. Metadata is interpreted as audio only for the two sound-choice exercise types, preventing meaning choices or missing-letter metadata from being mistaken for audio URLs.

## Architecture

Move result-sound selection out of `VocabularyExplorePage.tsx` into a pure exported resolver in `src/features/review/reviewPresentation.ts`. The resolver accepts a `VocabReviewQuizResponse` and returns a trimmed string or `null`.

`VocabularyExplorePage.tsx` will use the resolver once to derive `reviewResultSoundUrl`. That same resolved value continues to drive all three existing behaviors:

- automatic playback when the result popup opens;
- visibility of the popup sound button;
- manual replay when the sound button is pressed.

URL construction remains unchanged: absolute HTTP(S) URLs are used directly, while relative Mochi filenames receive the existing Mochi audio prefix.

## Error and Empty-State Behavior

- If playback is rejected by the browser, the existing silent `play().catch()` handling remains unchanged.
- If no source resolves, no `Audio` object is created and the sound button is not rendered.
- IPA display remains independent from playable audio and continues to use the `sound` property.

## Verification

Add pure Node tests covering:

- correct metadata sound for `mainland` and `arrogant`-shaped sound-choice quizzes;
- `audioUrl` priority for listen-and-type word quizzes;
- fallback from missing exercise audio to `sound.mp3Url`, then `sound.oggUrl`;
- whitespace trimming;
- `null` when every candidate is absent;
- protection against treating metadata from non-sound exercise types as audio.

Run the focused test, the complete `npm test` suite, and the production build.
