# Listen and Type Correct Answer Translation Design

## Goal

Show the Vietnamese translation returned with a Listen and Type challenge in the existing Correct popup after the user submits a correct answer.

## API Contract

Each `ListenAndTypeChallengeResponse` may now include:

```json
{
  "solution": "Hello.",
  "translate": "Xin chào."
}
```

The frontend models `translate` as optional and nullable because the backend deliberately returns `null` when translation fails or has not yet been stored.

## Chosen Approach

Read the translation directly from `currentChallenge.translate`. The lesson-detail request already provides it, and the current challenge remains stable until the user closes the Correct popup. No additional request or popup translation state is needed.

The popup continues to open immediately after the local answer check succeeds. It does not wait for the review-attempt submission, because that API is not the translation source.

## Presentation

- Keep the existing English/canonical answer block unchanged.
- When `currentChallenge.translate` contains non-whitespace text, render a second block immediately below it.
- The second block has the exact label **Vietnamese meaning** followed by the trimmed translation.
- Use the same inherited font family, font size, and line height as the English answer. Keep only color and background as the secondary visual treatment.
- When `translate` is `null`, missing, empty, or whitespace-only, render no translation label or empty container.

## Scope

Do not change answer matching, attempt submission, popup timing, challenge navigation, lesson loading, or backend API parameters.

## Testing and Verification

Add focused coverage that verifies:

- `ListenAndTypeChallengeResponse` includes `translate?: string | null`;
- the popup trims and conditionally renders the translation;
- the exact label is **Vietnamese meaning**;
- the translation block follows the existing answer block and has dedicated styling;
- no submit-success dependency or extra translation API call is introduced.

Run the focused Listen and Type tests, the complete test suite, and the production build.

## Success Criteria

- A challenge with a translation displays the Vietnamese meaning in the Correct popup.
- A challenge without a translation behaves exactly as before and shows no empty meaning section.
- The popup still opens immediately when the answer is correct.
- Continue advances to the next challenge exactly as before.
