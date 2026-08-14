# Vocab Review and Topic Toolbar Fixes

## Scope

Fix two presentation issues in the vocabulary experience:

1. Missing-letter inputs in vocabulary review must align with the visible letters and must not clip wide characters such as `m` or `w`.
2. A selected vocabulary topic must show only a topic word search control above the word list. Quiz-selection controls and row checkboxes must be removed.

## Review Fill Design

Keep the existing one-input-per-character interaction and its current keyboard, paste, focus, and submission behavior. Change only the slot layout:

- Give each character input enough inline width for wide glyphs.
- Use consistent input height and line-height so entered characters share the same visual baseline as the surrounding masked-word text.
- Preserve zero spacing between adjacent letters so the reconstructed word reads naturally.
- Apply the sizing consistently to missing word parts and sentence blanks.

The existing CSS regression test will be updated first so it fails against the narrow `0.68em` slots, then passes with the corrected dimensions and alignment rules.

## Topic Words Design

Remove the unused quiz-selection workflow from `VocabularyTopicWordsPage`:

- Remove selected-word state and the selection toggle helper.
- Remove row checkboxes.
- Remove the selected-count pill and disabled quiz button.
- Keep one full-width search input with placeholder `Search word by topic`.
- Render ordinary word rows containing the word, part of speech, and `See more` action.

No API request or route behavior changes. Search continues to reset pagination and query the existing category search endpoint.

## Verification

- Add source-level regression coverage for the topic toolbar and selection-control removal.
- Run the targeted tests in red before changing production code.
- Run the full test suite and production build after implementation.
- Inspect the affected desktop and mobile layouts in the browser to confirm alignment, non-clipping text, and a full-width topic search field.

## Non-Goals

- Building a topic quiz flow.
- Changing review answer validation or review navigation.
- Refactoring unrelated vocabulary page code.
