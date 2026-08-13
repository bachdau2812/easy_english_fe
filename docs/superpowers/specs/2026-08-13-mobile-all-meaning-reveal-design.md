# Mobile All Meaning Reveal Animation Design

## Goal

When the mobile search mode changes from Off to On, briefly reveal the text
`All Meaning` to the left of the switch, then retract it back into the switch.
The animation must not resize or shift the search input, icon, navbar, or desktop
layout.

## Scope

- Applies only at viewport widths of 760px or less.
- Runs only for an Off-to-On transition.
- Does not run for an On-to-Off transition.
- Can run again after the user turns the mode Off and then On again.
- Desktop keeps the existing permanently visible `All meanings` label.

## Interaction

The switch receives a short-lived reveal state when it is activated. A separate
mobile-only label is visually anchored to the switch and expands toward the
left. It remains readable briefly, then contracts toward the switch and fades
out. The full sequence lasts 1,000 milliseconds.

The animated label is decorative. The switch retains its existing accessible
name, role, and checked state, and the animated duplicate is hidden from
assistive technology.

## Implementation

`HomeNavbar` tracks a monotonically increasing reveal key. The key increments
only when the current mode is Off and the user activates it. The transient label
is keyed by that value so React recreates it and restarts the CSS animation for
each valid Off-to-On transition.

The label is positioned absolutely inside the existing search-mode button. Its
animation changes opacity, translation, and maximum width without participating
in the search form grid. This prevents the input and the three-column mobile
search layout from moving.

`prefers-reduced-motion: reduce` disables the expanding movement and uses a
short opacity-only reveal.

## Verification

Automated source/style regression tests verify:

- The reveal key increments only during Off-to-On.
- The mobile-only animated label renders with `aria-hidden`.
- The animation expands to the left and retracts.
- The label is hidden outside the mobile media query.
- The existing three-column mobile search layout remains intact.
