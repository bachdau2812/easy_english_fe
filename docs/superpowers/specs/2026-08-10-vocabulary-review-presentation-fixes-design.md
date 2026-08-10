# Vocabulary Review Presentation Fixes Design

## Goal

Correct vocabulary review rendering across all supported exercise types, with focused fixes for meanings, translated meanings, highlighted sentence words, result examples, and inline fill wrapping.

## Data Normalization

- Move reusable result-presentation decisions into pure helpers under the review feature.
- Read English meaning from non-translated `sense` fields, falling back to `wordSense`.
- Read Vietnamese meaning from `sense.trans`, falling back to `wordSense.trans`.
- Treat equal normalized English and Vietnamese values as duplicates and show them only once.
- Preserve the existing interaction: Vietnamese meaning is hidden initially and shown through `Show translation`; the button changes to `Hide translation` while expanded.

## Highlighted Sentences

- Parse the backend's supported `<u>...</u>` marker into plain text segments and highlighted segments.
- Render segments as React elements without `dangerouslySetInnerHTML`.
- Apply the renderer to `VOCAB_SENTENCE_TO_MEANING` while answering and to any sentence displayed in the result popup.
- If markup is malformed or absent, display safe plain text with markup tags removed.

## Result Popup Examples

- Treat `VOCAB_CHOOSE_WORD_IN_SENTENCE_BLANK`, `VOCAB_FILL_WORD_IN_SENTENCE_BLANK`, `VOCAB_SENTENCE_TO_MEANING`, and `VOCAB_SENTENCE_BLANK_TO_SOUND` as sentence-based exercises.
- For sentence-based exercises, show the completed question sentence before `example.sentence`.
- For `VOCAB_SENTENCE_BLANK_TO_SOUND`, fill the blank with `question.word`; `correctAnswer` is an option key and must not be inserted into the sentence.
- Preserve a different `example.sentence` behind the existing `Show another example` interaction.
- Use the question's `trans` as the translation of the completed question sentence and `example.trans` for the additional example.

## Inline Fill Wrapping

- Render sentence fill content using normal inline text flow instead of flex items for each fragment.
- Group the partially masked word and its character inputs into a no-wrap unit.
- Continue allowing the surrounding sentence to wrap at normal whitespace boundaries.
- Preserve the compact character spacing used by standalone missing-word exercises.

## Exercise Coverage

Review the shared result popup behavior for:

- `VOCAB_MEANING_TO_SOUND`
- `VOCAB_WORD_TO_MEANING`
- `VOCAB_CHOOSE_WORD_IN_SENTENCE_BLANK`
- `VOCAB_FILL_WORD_IN_SENTENCE_BLANK`
- `VOCAB_SENTENCE_TO_MEANING`
- `VOCAB_SENTENCE_BLANK_TO_SOUND`
- `VOCAB_FILL_MISSING_WORD_PART`
- `VOCAB_LISTEN_AND_TYPE_WORD`

No backend request or response contract changes are required.

## Verification

- Add pure helper regression coverage using representative response shapes for `liquid`, `mainland` or `passive`, and `enthusiasm`.
- Run the focused review tests, the complete test suite, the production build, and a scoped diff check.
