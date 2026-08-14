import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const vocabularyPageSource = readFileSync(
  new URL("../src/features/vocabulary/pages/VocabularyExplorePage.tsx", import.meta.url),
  "utf8"
);

const getRuleBody = (selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]+)\\}`))?.[1] ?? "";
};

test("review slots paint entered characters in a baseline-aligned glyph layer", () => {
  const slotRule = getRuleBody(".vocab-review-slot");
  const glyphRule = getRuleBody(".vocab-review-slot__glyph");
  const slotControlRule = getRuleBody(".vocab-review-slot-input__control");

  assert.match(vocabularyPageSource, /className="vocab-review-slot"/);
  assert.match(vocabularyPageSource, /aria-hidden="true"/);
  assert.match(vocabularyPageSource, /vocab-review-slot__glyph/);
  assert.match(vocabularyPageSource, /safeValue\[globalIndex\]\s*\?\?\s*"_"/);
  assert.match(slotRule, /position:\s*relative;/);
  assert.match(slotRule, /width:\s*1em;/);
  assert.match(glyphRule, /font:\s*inherit;/);
  assert.match(glyphRule, /line-height:\s*inherit;/);
  assert.match(slotControlRule, /position:\s*absolute;/);
  assert.match(slotControlRule, /opacity:\s*0;/);
});

test("missing word characters have room for wide glyphs and share one baseline", () => {
  const wordFillRule = getRuleBody(".vocab-review-inline-fill--word");
  const maskedWordRule = getRuleBody(".vocab-review-inline-fill__word");
  const slotGroupRule = getRuleBody(".vocab-review-slot-input");
  const slotControlRule = getRuleBody(".vocab-review-inline-fill input");

  assert.match(wordFillRule, /align-items:\s*baseline;/);
  assert.match(wordFillRule, /gap:\s*0;/);
  assert.match(wordFillRule, /letter-spacing:\s*0;/);
  assert.match(maskedWordRule, /align-items:\s*baseline;/);
  assert.match(slotGroupRule, /align-items:\s*baseline;/);
  assert.match(slotGroupRule, /gap:\s*0;/);
  assert.match(slotControlRule, /height:\s*1\.2em;/);
  assert.match(slotControlRule, /line-height:\s*1\.2;/);
  assert.match(slotControlRule, /width:\s*1em;/);
});

test("sentence blank characters also have room for wide glyphs", () => {
  const slotControlRule = getRuleBody(".vocab-review-inline-fill input");

  assert.match(slotControlRule, /width:\s*1em;/);
  assert.doesNotMatch(slotControlRule, /width:\s*0\.68em;/);
});

test("sentence text wraps normally while the masked word stays together", () => {
  const sentenceRule = getRuleBody(".vocab-review-inline-fill");
  const maskedWordRule = getRuleBody(".vocab-review-inline-fill__word");

  assert.match(sentenceRule, /display:\s*block;/);
  assert.match(maskedWordRule, /display:\s*inline-flex;/);
  assert.match(maskedWordRule, /white-space:\s*nowrap;/);
});
