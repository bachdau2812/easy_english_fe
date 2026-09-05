# Listen and Type Speech Deduplication Design

## Goal

Stop microphone input in Listen and Type from inserting duplicated, cumulative speech-recognition text or starting overlapping recognition sessions.

## Root Cause

The current result handler reads every entry in `event.results` on each event and appends that full text to the existing answer. Web Speech API result lists retain earlier final results, while `event.resultIndex` identifies the first result that changed. Reprocessing the full list therefore duplicates earlier text.

The microphone button also remains actionable while recognition is active. Repeated clicks can create multiple `SpeechRecognition` instances, whose callbacks all write into the same answer.

## Chosen Approach

Use the Web Speech API event boundary rather than trying to deduplicate text afterward:

- Extend the local event type with `resultIndex`.
- Read only results from `resultIndex` onward.
- Accept only results whose `isFinal` flag is true.
- Append each newly finalized segment exactly once, preserving the current typed answer.
- Guard with the recognition ref so a second session cannot start while one is active.
- Disable the microphone button while listening.
- Clear the ref only when the active recognition instance ends or errors.

This preserves multi-segment dictation within one session without guessing whether repeated words were intentionally spoken.

## Alternatives Not Chosen

Replacing the entire answer with the latest transcript would remove duplicates, but it would also erase text the user typed before using the microphone.

Comparing transcript strings and removing repeated prefixes would be heuristic. It could incorrectly delete legitimate phrases such as “very very good.”

## Data Flow

1. The user clicks the microphone while no recognition session is active.
2. The page creates one non-continuous recognition instance using the lesson's `speechToTextLangCode`, falling back to `en-US`.
3. A result event is filtered from `event.resultIndex` through the end of the result list.
4. Only final, non-empty transcripts are joined and appended once to the answer.
5. `onend` or `onerror` clears both the listening state and the active-instance ref.
6. Further clicks are accepted only after cleanup completes.

## Error and Lifecycle Behavior

- Unsupported browsers retain the existing visible message.
- Recognition errors stop the listening state and allow a later retry.
- Component unmount stops the active session and clears the ref.
- No answer text is added for interim or empty results.
- Existing visual fill feedback remains unchanged.

## Testing

Extract a small pure helper that selects new finalized transcripts from a result event. Test cumulative events such as `hello`, followed by an event whose result list contains `hello` and `world` with `resultIndex = 1`; only `world` may be appended on the second event.

Add source-level integration assertions that the microphone button is disabled while listening, recognition creation is guarded, and end/error callbacks clear only the active instance. Run the focused Listen and Type tests and the production build.

## Success Criteria

- Previously finalized recognition results are never appended again.
- Legitimately repeated spoken words are preserved.
- Only one recognition instance can write to the answer at a time.
- The microphone button visibly prevents repeated activation while listening.
- Users can retry after the session ends or errors.
- Existing manual typing, answer checking, and speech-fill animation remain unchanged.
