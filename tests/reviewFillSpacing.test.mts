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

const renderSlotInputStart = vocabularyPageSource.indexOf("const renderSlotInput");
const renderSlotInputEnd = vocabularyPageSource.indexOf("\n  let consumedBlankCount", renderSlotInputStart);
const renderSlotInputSource = vocabularyPageSource.slice(renderSlotInputStart, renderSlotInputEnd);

test("review slots paint entered characters in a baseline-aligned glyph layer", () => {
  const slotRule = getRuleBody(".vocab-review-slot");
  const glyphRule = getRuleBody(".vocab-review-slot__glyph");
  const focusedGlyphRule = getRuleBody(".vocab-review-slot:focus-within .vocab-review-slot__glyph");
  const slotControlRule = getRuleBody(".vocab-review-slot-input__control");

  assert.match(renderSlotInputSource, /className="vocab-review-slot"/);
  assert.match(renderSlotInputSource, /aria-hidden="true"/);
  assert.match(renderSlotInputSource, /vocab-review-slot__glyph/);
  assert.match(renderSlotInputSource, /safeValue\[globalIndex\]\s*\?\?\s*"_"/);
  assert.match(renderSlotInputSource, /aria-label=\{`\$\{ariaLabel\} \$\{globalIndex \+ 1\}`\}/);
  assert.match(renderSlotInputSource, /disabled=\{disabled\}/);
  assert.match(renderSlotInputSource, /maxLength=\{1\}/);
  assert.match(renderSlotInputSource, /onChange=\{/);
  assert.match(renderSlotInputSource, /onFocus=\{/);
  assert.match(renderSlotInputSource, /onKeyDown=\{/);
  assert.match(renderSlotInputSource, /onPaste=\{/);
  assert.match(renderSlotInputSource, /ref=\{/);
  assert.match(renderSlotInputSource, /value=\{safeValue\[globalIndex\] \?\? ""\}/);
  assert.match(slotRule, /position:\s*relative;/);
  assert.doesNotMatch(slotRule, /width:\s*1em;/);
  assert.match(glyphRule, /display:\s*inline-block;/);
  assert.match(glyphRule, /font:\s*inherit;/);
  assert.match(glyphRule, /line-height:\s*inherit;/);
  assert.match(glyphRule, /vertical-align:\s*baseline;/);
  assert.doesNotMatch(glyphRule, /width:\s*(?:1em|100%);/);
  assert.match(focusedGlyphRule, /text-shadow:\s*0 8px 18px rgba\(15, 23, 42, 0\.16\);/);
  assert.match(slotControlRule, /position:\s*absolute;/);
  assert.match(slotControlRule, /opacity:\s*0;/);
  assert.match(slotControlRule, /width:\s*100%;/);
});

test("missing word characters use natural glyph spacing and share one baseline", () => {
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
});

test("sentence blank characters also have room for wide glyphs", () => {
  const slotControlRule = getRuleBody(".vocab-review-slot-input__control");

  assert.match(slotControlRule, /width:\s*100%;/);
  assert.doesNotMatch(slotControlRule, /width:\s*0\.68em;/);
});

test("sentence text wraps normally while the masked word stays together", () => {
  const sentenceRule = getRuleBody(".vocab-review-inline-fill");
  const maskedWordRule = getRuleBody(".vocab-review-inline-fill__word");

  assert.match(sentenceRule, /display:\s*block;/);
  assert.match(maskedWordRule, /display:\s*inline-flex;/);
  assert.match(maskedWordRule, /white-space:\s*nowrap;/);
});
