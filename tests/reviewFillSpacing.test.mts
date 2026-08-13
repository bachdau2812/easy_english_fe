import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

const getRuleBody = (selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]+)\\}`))?.[1] ?? "";
};

test("missing word characters use natural inline spacing", () => {
  const wordFillRule = getRuleBody(".vocab-review-inline-fill--word");
  const slotGroupRule = getRuleBody(".vocab-review-inline-fill--word .vocab-review-slot-input");
  const slotControlRule = getRuleBody(".vocab-review-inline-fill--word .vocab-review-slot-input__control");

  assert.match(wordFillRule, /gap:\s*0;/);
  assert.match(wordFillRule, /letter-spacing:\s*0;/);
  assert.match(slotGroupRule, /gap:\s*0;/);
  assert.match(slotControlRule, /width:\s*0\.68em;/);
});

test("sentence blank characters use compact inline spacing", () => {
  const slotGroupRule = getRuleBody(".vocab-review-slot-input");
  const slotControlRule = getRuleBody(".vocab-review-inline-fill input");

  assert.match(slotGroupRule, /gap:\s*0;/);
  assert.match(slotControlRule, /width:\s*0\.68em;/);
});

test("sentence text wraps normally while the masked word stays together", () => {
  const sentenceRule = getRuleBody(".vocab-review-inline-fill");
  const maskedWordRule = getRuleBody(".vocab-review-inline-fill__word");

  assert.match(sentenceRule, /display:\s*block;/);
  assert.match(maskedWordRule, /display:\s*inline-flex;/);
  assert.match(maskedWordRule, /white-space:\s*nowrap;/);
});
