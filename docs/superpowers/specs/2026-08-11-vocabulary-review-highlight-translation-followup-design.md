# Vocabulary Review Highlight and Translation Follow-up Design

## Goal

Remove underline markup from the rendered DOM, provide a real visual highlight for marked vocabulary, and make translation availability consistent when the backend does not return an English meaning.

## Root Causes

- The sentence parser converts backend `<u>...</u>` markers into highlight segments, but the React renderer turns those segments back into `<u>` elements. The DOM therefore still contains underline tags and no dedicated highlight styling exists.
- In the supplied 90-question response, 69 questions have no English `definition`. Their root `shortMeaning` is identical to the Vietnamese `trans.shortMeaning`. Treating that duplicated localized value as English both exposes Vietnamese before the user asks for it and can remove the translation toggle through deduplication.

## Highlight Rendering

- Normalize actual `<u>...</u>` markers and safely supported escaped equivalents before parsing.
- Produce plain-text and highlighted segments without using `dangerouslySetInnerHTML`.
- Render highlighted segments as `<mark className="vocab-review-highlight">` in question sentences and result examples.
- Add a dedicated highlight style with readable foreground/background colors and no inherited default marker padding that disrupts sentence flow.
- Malformed or unsupported markup is stripped and displayed as safe plain text.

## Meaning and Translation Presentation

- Select one `sense` source first, falling back as a complete unit to `wordSense`.
- Prefer a non-translated `definition` for the English meaning.
- Use a non-translated `shortMeaning` as English only when it differs from every available translated value.
- Select Vietnamese from `trans.shortMeaning`, falling back to `trans.definition`.
- Keep Vietnamese hidden initially and reveal it with `Show translation`; the expanded control reads `Hide translation`.
- When no English meaning is available, render no placeholder meaning text. Display only the `Show translation` control until the user expands it.
- If neither English nor Vietnamese meaning is available, retain the existing unavailable fallback so the popup does not become an empty unlabeled section.

## Verification

- Add regressions for `liquid`, where the localized root short meaning duplicates `trans.shortMeaning`, and `mainland`, where English and Vietnamese definitions are both present.
- Assert that the page maps highlight segments to `<mark>` and no longer maps them to `<u>`.
- Assert that an absent English meaning produces a hidden Vietnamese translation with no placeholder text.
- Run focused review tests, the complete test suite, the production build, and a scoped diff check.
