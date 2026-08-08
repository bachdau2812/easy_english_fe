# Writing Editor Typography Design

## Goal

Allow users to choose the font family and font size used in the IELTS Writing answer textarea. Remember both choices in the browser and restore them whenever Writing is opened again.

## User Interface

- Add two native select controls to the existing answer toolbar.
- Keep the word count and timer controls unchanged.
- Font choices: Arial, Georgia, Times New Roman, Verdana, and monospace.
- Font-size choices: 14, 16, 18, 20, 22, and 24 pixels.
- Use Arial at 16 pixels as the default.
- Allow the toolbar controls to wrap cleanly on narrow screens.

## State and Persistence

- Keep the selected font and size in `WritingFocusPage` state.
- Initialize the state from dedicated `localStorage` keys.
- Validate stored values against the supported option lists and fall back to the defaults when a value is absent or invalid.
- Save each valid selection immediately when the user changes it.

## Application Scope

- Apply the selected values only to the Writing answer textarea through its style.
- Do not modify the answer text, word count, timer, review request, history, or reference essays.
- Disable the typography controls whenever the textarea is disabled.

## Verification

Run `npm run build` only, as requested by the user. Do not run the test suite.
