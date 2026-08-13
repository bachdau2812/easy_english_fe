import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getDictationMask,
  getInitialChallengeIndex,
  normalizeDictationAnswer
} from "../src/features/listening/listenAndType.ts";

const listeningDetailPageSource = readFileSync(
  new URL("../src/features/listening/pages/ListeningDetailPage.tsx", import.meta.url),
  "utf8"
);

test("normalizes casing, repeated whitespace, and special characters at word boundaries", () => {
  assert.equal(normalizeDictationAnswer("  (Hello),   WORLD!  "), "hello world");
  assert.equal(normalizeDictationAnswer("[CAN'T!]"), "can't");
});

test("keeps letters and internal special characters significant", () => {
  assert.notEqual(normalizeDictationAnswer("can't"), normalizeDictationAnswer("cant"));
  assert.notEqual(normalizeDictationAnswer("well-known"), normalizeDictationAnswer("wellknown"));
  assert.notEqual(normalizeDictationAnswer("because"), normalizeDictationAnswer("becaus"));
});

test("selects the earliest unfinished challenge from challenge and lesson progress", () => {
  assert.equal(
    getInitialChallengeIndex(
      [
        { id: "first", isDone: true },
        { id: "second", isDone: false },
        { id: "third", isDone: false }
      ],
      []
    ),
    1
  );

  assert.equal(
    getInitialChallengeIndex(
      [
        { id: "first", isDone: false },
        { id: "second", isDone: false },
        { id: "third", isDone: false }
      ],
      ["first", "second"]
    ),
    2
  );
});

test("falls back to the first challenge when every challenge is complete", () => {
  assert.equal(
    getInitialChallengeIndex(
      [
        { id: "first", isDone: true },
        { id: "second", isDone: true }
      ],
      ["first", "second"]
    ),
    0
  );
  assert.equal(getInitialChallengeIndex([], []), 0);
});

test("uses one star per non-space character including punctuation", () => {
  assert.equal(getDictationMask("an"), "**");
  assert.equal(getDictationMask("well-known,"), "***********");
  assert.equal(getDictationMask("a b"), "**");
});

test("the lesson page wires resume, exact masks, completed navigation, and input focus", () => {
  assert.match(listeningDetailPageSource, /getInitialChallengeIndex\(/);
  assert.match(listeningDetailPageSource, /getDictationMask\(word\)/);
  assert.match(listeningDetailPageSource, /ref=\{dictationInputRef\}/);
  assert.match(listeningDetailPageSource, /dictationInputRef\.current\?\.focus\(\)/);
  assert.match(listeningDetailPageSource, />\s*Next\s*</);
});
