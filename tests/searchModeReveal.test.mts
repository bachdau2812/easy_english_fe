import assert from "node:assert/strict";
import test from "node:test";
import { toggleSearchModeReveal } from "../src/features/search/searchModeReveal.ts";

test("turning All Meaning on starts a new reveal animation", () => {
  assert.deepEqual(
    toggleSearchModeReveal({ isUniqueSearch: false, revealKey: 0 }),
    { isUniqueSearch: true, revealKey: 1 }
  );
});

test("turning All Meaning off keeps the current reveal key", () => {
  assert.deepEqual(
    toggleSearchModeReveal({ isUniqueSearch: true, revealKey: 1 }),
    { isUniqueSearch: false, revealKey: 1 }
  );
});

test("a later Off-to-On transition starts the animation again", () => {
  const disabled = toggleSearchModeReveal({ isUniqueSearch: true, revealKey: 4 });
  assert.deepEqual(toggleSearchModeReveal(disabled), {
    isUniqueSearch: true,
    revealKey: 5
  });
});
