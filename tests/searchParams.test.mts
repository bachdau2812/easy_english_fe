import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAutocompleteQuery,
  selectFullSearchResults
} from "../src/features/search/api/searchParams.ts";

test("omits isUniqueSearch in the default autocomplete mode", () => {
  assert.deepEqual(buildAutocompleteQuery("cost", false), {
    text: "cost",
    isAutocomplete: true
  });
});

test("sends isUniqueSearch only when all meanings mode is enabled", () => {
  assert.deepEqual(buildAutocompleteQuery("cost", true), {
    text: "cost",
    isAutocomplete: true,
    isUniqueSearch: true
  });
});

test("keeps one POS in default mode and every POS in all meanings mode", () => {
  const results = [{ wordId: "noun", pos: "noun" }, { wordId: "verb", pos: "verb" }];

  assert.deepEqual(selectFullSearchResults(results, false), [results[0]]);
  assert.deepEqual(selectFullSearchResults(results, true), results);
});
