# AI Writing Review Disclaimer Design

## Goal

Clarify that feedback generated during the AI writing review is advisory and should not be treated as definitive.

## User Interface

- In the pending review state, keep the existing status text unchanged.
- Add `AI feedback is for reference only.` as a separate line immediately below `AI feedback can take a little while. Please keep this window open.`
- Center the disclaimer within the existing loading panel.
- Reuse the loading panel's supporting-text typography so the disclaimer remains visually secondary.

## Scope

- Change only the pending AI writing review display.
- Do not change review submission, API behavior, results, errors, references, or other writing screens.

## Verification

- Add a source-level regression test that checks the disclaimer text, placement after the waiting message, and centered loading-panel styling.
- Run the focused test, the full test suite, and the production build.
