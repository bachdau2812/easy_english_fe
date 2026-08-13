import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  canReuseSavedVocabularyPage,
  normalizeVocabularyLevelQuantities
} from "../src/features/vocabulary/vocabularyInfo.ts";

const apiSource = readFileSync(
  new URL("../src/features/vocabulary/api/vocabularyApi.ts", import.meta.url),
  "utf8"
);
const queryKeysSource = readFileSync(
  new URL("../src/shared/constants/queryKeys.ts", import.meta.url),
  "utf8"
);
const pageSource = readFileSync(
  new URL("../src/features/vocabulary/pages/VocabularyExplorePage.tsx", import.meta.url),
  "utf8"
);
const cssSource = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

test("normalizes vocabulary quantities into levels one through six", () => {
  assert.deepEqual(
    normalizeVocabularyLevelQuantities([
      { level: 3, quantity: 7 },
      { level: 1, quantity: 12 },
      { level: 6, quantity: 2 }
    ]),
    [
      { level: 1, quantity: 12 },
      { level: 2, quantity: 0 },
      { level: 3, quantity: 7 },
      { level: 4, quantity: 0 },
      { level: 5, quantity: 0 },
      { level: 6, quantity: 2 }
    ]
  );
});

test("normalizes missing level quantity data to zero", () => {
  assert.deepEqual(
    normalizeVocabularyLevelQuantities(null),
    [1, 2, 3, 4, 5, 6].map((level) => ({ level, quantity: 0 }))
  );
});

test("reuses a saved page only for the same user, level, and page size", () => {
  const previousKey = ["vocabulary", "saved", "user-a", 3, 0, 20] as const;

  assert.equal(
    canReuseSavedVocabularyPage(previousKey, { userId: "user-a", level: 3, limit: 20 }),
    true
  );
  assert.equal(
    canReuseSavedVocabularyPage(previousKey, { userId: "user-b", level: 3, limit: 20 }),
    false
  );
  assert.equal(
    canReuseSavedVocabularyPage(previousKey, { userId: "user-a", level: 4, limit: 20 }),
    false
  );
  assert.equal(
    canReuseSavedVocabularyPage(previousKey, { userId: "user-a", level: 3, limit: 50 }),
    false
  );
});

test("vocabulary info API sends userId and infoType", () => {
  assert.match(apiSource, /"\/user-vocabularies\/info"/);
  assert.match(apiSource, /userId:\s*params\.userId/);
  assert.match(apiSource, /infoType:\s*params\.infoType/);
});

test("vocabulary info and saved pages have complete query keys", () => {
  assert.match(queryKeysSource, /vocabularyInfo:[\s\S]+infoType/);
  assert.match(queryKeysSource, /savedVocabularies:[\s\S]+page[\s\S]+limit/);
});

test("saved words stay disabled until a level is selected and include pagination", () => {
  assert.match(pageSource, /activeSection === "list" && selectedSavedLevel !== null/);
  assert.match(pageSource, /page:\s*savedPage/);
  assert.match(pageSource, /limit:\s*SAVED_VOCABULARY_PAGE_SIZE/);
  assert.match(pageSource, /setSavedPage\(0\)/);
  assert.match(pageSource, /canReuseSavedVocabularyPage\(previousQuery\?\.queryKey/);
});

test("list vocabulary renders total and per-level quantities", () => {
  assert.match(pageSource, /Total vocabulary/);
  assert.match(pageSource, /levelInfo\.quantity/);
  assert.match(
    pageSource,
    /Page \{saved\.data\.number \+ 1\} \/ \{saved\.data\.totalPages\}/
  );
});

test("level overview and pagination have dedicated responsive styles", () => {
  assert.match(cssSource, /\.vocab-saved-level-row\s*\{/);
  assert.match(cssSource, /\.vocab-saved-pagination\s*\{/);
  assert.match(cssSource, /grid-template-columns:\s*minmax\(0, 1fr\) auto/);
});

test("review requests and renders the ready vocabulary quantity", () => {
  assert.match(pageSource, /infoType:\s*"VOCAB_REVIEW"/);
  assert.match(pageSource, /reviewQuantity\.data\?\.reviewQuantity/);
  assert.match(pageSource, /Ready to review/);
  assert.match(cssSource, /\.vocab-review-ready-count\s*\{/);
});
