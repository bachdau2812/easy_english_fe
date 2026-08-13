import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { recordSuccessfulSearchHistory } from "../src/features/search/searchHistory.ts";

test("search history skips unauthenticated and empty successful searches", async () => {
  const payloads: unknown[] = [];
  const record = async (payload: unknown) => {
    payloads.push(payload);
  };

  assert.equal(await recordSuccessfulSearchHistory({
    userId: null,
    words: [{ wordId: "word-1" }],
    record
  }), false);
  assert.equal(await recordSuccessfulSearchHistory({
    userId: "user-1",
    words: [],
    record
  }), false);
  assert.equal(await recordSuccessfulSearchHistory({
    userId: "user-1",
    words: [{}],
    record
  }), false);
  assert.deepEqual(payloads, []);
});

test("search history records only the first valid displayed result", async () => {
  const payloads: unknown[] = [];
  let invalidations = 0;

  const recorded = await recordSuccessfulSearchHistory({
    userId: "user-1",
    words: [{ wordId: "word-1" }, { wordId: "word-2" }],
    record: async (payload) => {
      payloads.push(payload);
    },
    onRecorded: () => {
      invalidations += 1;
    }
  });

  assert.equal(recorded, true);
  assert.deepEqual(payloads, [{ userId: "user-1", wordId: "word-1" }]);
  assert.equal(invalidations, 1);
});

test("search history failure stays non-blocking and is reported", async () => {
  const expectedError = new Error("history unavailable");
  let reportedError: unknown;

  const recorded = await recordSuccessfulSearchHistory({
    userId: "user-1",
    words: [{ wordId: "word-1" }],
    record: async () => {
      throw expectedError;
    },
    onError: (error) => {
      reportedError = error;
    }
  });

  assert.equal(recorded, false);
  assert.equal(reportedError, expectedError);
});

test("all explicit search surfaces record successful returned words", () => {
  const sources = [
    "../src/features/home/pages/HomePage.tsx",
    "../src/features/home/components/LearningRouteChrome.tsx",
    "../src/features/vocabulary/pages/VocabularyExplorePage.tsx",
    "../src/features/search/components/FloatingVocabularyLookup.tsx"
  ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

  for (const source of sources) {
    assert.match(source, /useRecordSearchHistory/);
    assert.match(source, /recordSearchHistory\((words|\[word\])\)/);
  }
});
