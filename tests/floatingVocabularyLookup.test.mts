import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  clampFloatingLookupPosition,
  getFloatingLookupDefaultPosition,
  selectFloatingLookupResults
} from "../src/features/search/floatingVocabularyLookup.ts";

const lookupComponentSource = readFileSync(
  new URL("../src/features/search/components/FloatingVocabularyLookup.tsx", import.meta.url),
  "utf8"
);
const appCssSource = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const readingPageSource = readFileSync(
  new URL("../src/features/reading/pages/IeltsReadingPage.tsx", import.meta.url),
  "utf8"
);
const reviewPageSource = readFileSync(
  new URL("../src/features/vocabulary/pages/VocabularyExplorePage.tsx", import.meta.url),
  "utf8"
);

test("clamps a lookup control inside the viewport margin", () => {
  assert.deepEqual(
    clampFloatingLookupPosition(
      { left: 980, top: -20 },
      { height: 700, width: 1000 },
      { height: 48, width: 330 }
    ),
    { left: 658, top: 12 }
  );
});

test("places the default lookup inside the anchor's upper-right edge", () => {
  assert.deepEqual(
    getFloatingLookupDefaultPosition(
      { bottom: 600, left: 100, right: 900, top: 80 },
      { height: 700, width: 1000 }
    ),
    { left: 836, top: 98 }
  );
});

test("default mode prefers one Mochi result", () => {
  const results = [
    { id: "a", otherSource: "Oxford" },
    { id: "b", otherSource: "MOCHI" },
    { id: "c", otherSource: null }
  ];

  assert.deepEqual(selectFloatingLookupResults(results, false), [results[1]]);
  assert.deepEqual(selectFloatingLookupResults([], false), []);
});

test("all meanings mode preserves every result in backend order", () => {
  const results = [{ id: "a" }, { id: "b", otherSource: "MOCHI" }, { id: "c" }];

  assert.deepEqual(selectFloatingLookupResults(results, true), results);
});

test("shared lookup wires search modes, result modal, and pointer dragging", () => {
  assert.match(lookupComponentSource, /useAutocomplete\(searchText, isAllMeanings\)/);
  assert.match(lookupComponentSource, /selectFloatingLookupResults\(/);
  assert.match(lookupComponentSource, /<HomeWordDetailModal/);
  assert.match(lookupComponentSource, /All meanings/);
  assert.match(lookupComponentSource, /setPointerCapture\(event\.pointerId\)/);
  assert.match(lookupComponentSource, /releasePointerCapture\(event\.pointerId\)/);
});

test("floating lookup stays above review results and below word details", () => {
  const lookupZIndex = Number(
    appCssSource.match(/\.floating-vocab-lookup\s*\{[\s\S]*?z-index:\s*(\d+);[\s\S]*?\}/)?.[1]
  );
  const suggestionsZIndex = Number(
    appCssSource.match(/\.floating-vocab-lookup__suggestions\s*\{[\s\S]*?z-index:\s*(\d+);[\s\S]*?\}/)?.[1]
  );
  const resultZIndex = Number(
    appCssSource.match(/\.vocab-review-result-backdrop\s*\{[\s\S]*?z-index:\s*(\d+);[\s\S]*?\}/)?.[1]
  );
  const wordModalZIndex = Number(
    appCssSource.match(/\.home-word-modal-backdrop\s*\{[\s\S]*?z-index:\s*(\d+);[\s\S]*?\}/)?.[1]
  );

  assert.ok(resultZIndex < lookupZIndex);
  assert.ok(lookupZIndex < suggestionsZIndex);
  assert.ok(suggestionsZIndex < wordModalZIndex);
});

test("Reading uses the shared lookup without its former local search state", () => {
  assert.match(readingPageSource, /import \{ FloatingVocabularyLookup \}/);
  assert.match(readingPageSource, /<FloatingVocabularyLookup/);
  assert.match(readingPageSource, /anchorRef=\{readingContentBodyRef\}/);
  assert.match(readingPageSource, /userId=\{auth\.userId\}/);
  assert.doesNotMatch(readingPageSource, /readingSearchDragRef/);
  assert.doesNotMatch(readingPageSource, /handleReadingSearchPointerMove/);
  assert.doesNotMatch(readingPageSource, /const readingAutocomplete/);
});

test("Reading keeps its separate click-a-passage-word popup", () => {
  assert.match(readingPageSource, /const handleReadingWordClick/);
  assert.match(readingPageSource, /<ReadingWordPopup/);
  assert.match(readingPageSource, /className="reading-word-token"/);
});

test("active Vocab Review mounts the shared lookup outside question conditionals", () => {
  assert.match(reviewPageSource, /const reviewScreenRef = useRef<HTMLDivElement>\(null\)/);
  assert.match(reviewPageSource, /ref=\{reviewScreenRef\}/);
  assert.match(reviewPageSource, /isReviewStandaloneVisible \? \(\s*<FloatingVocabularyLookup/);
  assert.match(reviewPageSource, /anchorRef=\{reviewScreenRef\}/);
  assert.match(reviewPageSource, /userId=\{auth\.userId\}/);
});

test("Review result Enter ignores lookup and other interactive elements", () => {
  assert.match(
    reviewPageSource,
    /target\.closest\("input, textarea, select, button, form, \[contenteditable='true'\]"\)/
  );
  assert.match(reviewPageSource, /shouldIgnoreReviewResultEnter\(/);
});
