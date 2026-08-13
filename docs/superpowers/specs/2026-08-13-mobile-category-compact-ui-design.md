# Mobile Category Compact UI Design

## Goal

Redesign all five mobile learning-category pages—Vocabulary, Listening,
Reading, Pronunciation, and Writing—into one compact, clean, modern interface
inspired by learning applications and SaaS products. Desktop rendering remains
unchanged.

## Shared Structure

All category pages continue using `LearningCategoryPage` and the existing
shared navigation model. Each page receives a category-key modifier class so
the layout remains identical while its accent color changes.

Category accents:

- Vocabulary: blue.
- Listening: violet.
- Reading: teal.
- Pronunciation: amber.
- Writing: rose.

Accent color is limited to the header icon, item icons, and restrained focus or
hover states. Page surfaces remain white or near-white.

## Mobile Header

At viewport widths of 760px or less:

- The header uses a compact horizontal layout with a 92-pixel minimum height.
- The icon container is 44 by 44 pixels with a 13-pixel radius.
- The `Learning category` eyebrow is hidden on mobile.
- The category title is the strongest text element at 1.35rem.
- The description uses muted text, a compact line height, and at most two
  visible lines.
- Padding is 14 to 16 pixels and the border radius is 18 pixels.
- Border and shadow remain subtle and use the category accent only as a faint
  background tint.

## Mobile Function Cards

At viewport widths of 760px or less:

- The list begins 12 pixels below the header.
- Cards use the same three-column layout: icon, copy, and chevron.
- Each card has a minimum height of 72 pixels and grows only when its two-line
  description requires more space.
- Vertical gap between cards is 9 pixels.
- The icon container is 40 by 40 pixels with a 12-pixel radius.
- Card padding is 11 pixels horizontally and vertically.
- Border radius is 15 pixels.
- The title uses a compact semibold style.
- The description is muted, uses a tight line height, and is clamped to two
  lines.
- Border and shadow are light; touch feedback uses a small scale or background
  change without moving surrounding content.

Disabled items keep the same geometry, use reduced contrast, do not render a
chevron, and remain non-interactive.

## Desktop Preservation

All compact sizing, hidden eyebrow behavior, category accent variables, and
touch feedback are placed inside the existing `max-width: 760px` media query.
The current desktop category page structure and sizing are not changed.

## Accessibility

- Existing links, buttons, disabled state, and route behavior remain intact.
- Text retains sufficient contrast against white and tinted backgrounds.
- Focus-visible styles use the current category accent without relying only on
  shadow.
- Motion-sensitive users receive no new continuous animation.

## Verification

Automated tests verify:

- All five category keys produce their matching modifier class.
- The shared page still renders every navigation item from the common model.
- Disabled items remain buttons without chevrons.
- Mobile CSS defines compact header/card sizing and all five accent variants.
- Desktop base rules are not replaced by mobile values.

The full frontend test suite, TypeScript project build, and Vite production
bundle must pass.
