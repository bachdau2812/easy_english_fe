import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  appendGeneratedReviewQuestion,
  appendGeneratedReviewQuestionForSession
} from "../src/features/review/reviewQueue.ts";

const reviewPageSource = readFileSync(
  new URL("../src/features/vocabulary/pages/VocabularyExplorePage.tsx", import.meta.url),
  "utf8"
);

test("a generated question is appended without replacing the existing order", () => {
  const first = { exerciseType: "VOCAB_WORD_TO_MEANING", word: "first" } as const;
  const current = { exerciseType: "VOCAB_FILL_WORD_IN_SENTENCE_BLANK", word: "current" } as const;
  const generated = { exerciseType: "VOCAB_LISTEN_AND_TYPE_WORD", word: "retry" } as const;

  const next = appendGeneratedReviewQuestion([first, current], generated);

  assert.deepEqual(next, [first, current, generated]);
});

test("an invalid generated response leaves the queue unchanged", () => {
  const questions = [
    { exerciseType: "VOCAB_WORD_TO_MEANING", word: "first" }
  ] as Array<{ exerciseType: "VOCAB_WORD_TO_MEANING"; word: string }>;

  assert.equal(appendGeneratedReviewQuestion(questions, { data: null }), questions);
});

test("the first supported question is selected from an array response", () => {
  const questions = [{ exerciseType: "VOCAB_WORD_TO_MEANING", word: "first" }] as const;
  const generated = { exerciseType: "VOCAB_FILL_MISSING_WORD_PART", word: "retry" } as const;

  assert.deepEqual(
    appendGeneratedReviewQuestion([...questions], [null, { exerciseType: "UNKNOWN" }, generated]),
    [questions[0], generated]
  );
});

test("an unsupported exercise type is not appended", () => {
  const questions = [{ exerciseType: "VOCAB_WORD_TO_MEANING", word: "first" }] as const;
  const current = [...questions];

  assert.equal(appendGeneratedReviewQuestion(current, { exerciseType: "UNKNOWN" }), current);
});

test("a generated response from an older review session is ignored", () => {
  const questions = [{ exerciseType: "VOCAB_WORD_TO_MEANING", word: "current" }] as const;
  const current = [...questions];

  assert.equal(
    appendGeneratedReviewQuestionForSession(
      current,
      { exerciseType: "VOCAB_FILL_MISSING_WORD_PART", word: "stale retry" },
      { activeRequestId: 8, isOpen: true, requestId: 7 }
    ),
    current
  );
});

test("a generated response is ignored after the review screen closes", () => {
  const questions = [{ exerciseType: "VOCAB_WORD_TO_MEANING", word: "current" }] as const;
  const current = [...questions];

  assert.equal(
    appendGeneratedReviewQuestionForSession(
      current,
      { exerciseType: "VOCAB_FILL_MISSING_WORD_PART", word: "stale retry" },
      { activeRequestId: 7, isOpen: false, requestId: 7 }
    ),
    current
  );
});

test("background retry generation does not gate later result popups", () => {
  assert.doesNotMatch(reviewPageSource, /generateWrongReviewQuestion\.isPending/);
  assert.match(reviewPageSource, /generateWrongReviewQuestion\s*\.mutateAsync/);
});
