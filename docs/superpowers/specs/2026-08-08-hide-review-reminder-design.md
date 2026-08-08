# Hide Review Reminder Design

## Goal

Temporarily hide the Review reminder card in the expanded Review section without changing the ready-to-review quantity or review-session controls.

## Design

- Add a local boolean display flag for the Review reminder feature.
- Set the flag to `false` so React does not render the reminder card or picker.
- Keep the existing reminder JSX and state in place so the feature can be restored by changing one flag.
- Do not change Review API calls, the ready vocabulary count, or the 30/60/90 review options.

## Verification

Run the production build only, as requested by the user.
