# Mobile Category Header Fixed Height Design

## Goal

Keep the learning-category header compact at the top of every mobile category page instead of allowing it to stretch into unused vertical space.

## Scope

- Apply only at viewport widths of 760 pixels or less.
- Apply to the shared category page used by Vocabulary, Listening, Reading, Pronunciation, and Writing.
- Preserve the existing desktop layout, category accents, routing, card geometry, and disabled behavior.

## Design

The shared route `<main>` is a growing grid container. Its single category-page child stretches by default, and the category page's two implicit grid rows then absorb the available height. The fix belongs on the mobile category-page grid rather than on the shared route shell, because changing the shell could affect unrelated pages.

On mobile, the category page will:

- align its grid content to the start;
- define two content-sized rows for the header and function list;
- keep an 18-pixel gap between the header and function-list rows;
- give the header an exact border-box height of 92 pixels and prevent grid stretching.

The list remains below the header with 18 pixels of separation and continues to grow naturally with its cards. The existing 9-pixel gap between function cards remains unchanged.

## Testing

Extend the existing mobile navigation CSS regression test so it verifies the page grid uses start alignment and content-sized rows, and the header has an exact 92-pixel height. Run the focused test red before implementation, then run the full frontend tests, TypeScript build, whitespace check, and Vite production build.
