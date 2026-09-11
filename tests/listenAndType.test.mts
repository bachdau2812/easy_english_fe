import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getDictationMask,
  getInitialChallengeIndex,
  getNewFinalSpeechTranscript,
  normalizeDictationAnswer
} from "../src/features/listening/listenAndType.ts";
import * as dictation from "../src/features/listening/listenAndType.ts";

const listeningDetailPageSource = readFileSync(
  new URL("../src/features/listening/pages/ListeningDetailPage.tsx", import.meta.url),
  "utf8"
);

const listeningTypesSource = readFileSync(
  new URL("../src/features/listening/types.ts", import.meta.url),
  "utf8"
);

const cssSource = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

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

test("masks whole words including internal punctuation while preserving spaces and boundary punctuation", () => {
  assert.equal(getDictationMask("an"), "**");
  assert.equal(getDictationMask("well-known,"), "**********,");
  assert.equal(getDictationMask("it's"), "****");
  assert.equal(getDictationMask("it’s?"), "****?");
  assert.equal(getDictationMask("\"it's\""), "\"****\"");
  assert.equal(getDictationMask("a b"), "* *");
  assert.equal(getDictationMask("are you?"), "*** ***?");
  assert.equal(getDictationMask("a\u200Bb"), "**");
});

test("accepts optional attached or separated question marks on either side", () => {
  assert.equal(typeof dictation.getDictationMatchResult, "function");
  for (const solution of [ [["Are"], ["you"], ["ready?"]], [["Are"], ["you"], ["ready"], ["?"]] ]) {
    for (const answer of ["Are you ready", "Are you ready?", "Are you ready ?"]) {
      assert.equal(dictation.getDictationMatchResult(answer, solution).isCorrect, true, answer);
    }
    assert.equal(dictation.getDictationMatchResult("Are you read?", solution).isCorrect, false);
    assert.equal(dictation.getDictationMatchResult("Are you ready now?", solution).isCorrect, false);
  }
});

test("keeps contraction alternatives working next to punctuation", () => {
  assert.equal(typeof dictation.getDictationMatchResult, "function");
  assert.equal(dictation.getDictationMatchResult("We are ready ?", [["We're"], ["ready?"]]).isCorrect, true);
  assert.equal(dictation.getDictationMatchResult("They cannot", [["They"], ["can't?"]]).isCorrect, true);
  assert.equal(dictation.getDictationMatchResult(" ? ", [["ready?"]]).isCorrect, false);
});

test("incorrect hints preserve spaces within phrase alternatives and do not mask question marks", () => {
  assert.equal(typeof dictation.getHintTokens, "function");
  assert.deepEqual(dictation.getHintTokens("wrong", [["Are"], ["you"], ["at home"], ["?"]]), [
    { isCorrect: false, text: "Are" },
    { isCorrect: false, text: "you" },
    { isCorrect: false, text: "** ****" },
    { isCorrect: false, text: "?" }
  ]);
});

test("speech input reads only newly finalized cumulative results", () => {
  const results = [
    { 0: { transcript: "hello" }, isFinal: true },
    { 0: { transcript: "world" }, isFinal: true }
  ];

  assert.equal(getNewFinalSpeechTranscript(results, 1), "world");
});

test("speech input ignores interim text and preserves intentional repeated words", () => {
  const results = [
    { 0: { transcript: "temporary guess" }, isFinal: false },
    { 0: { transcript: "very very good" }, isFinal: true }
  ];

  assert.equal(getNewFinalSpeechTranscript(results, 0), "very very good");
});

test("the lesson page wires resume, exact masks, completed navigation, and input focus", () => {
  assert.match(listeningDetailPageSource, /getInitialChallengeIndex\(/);
  assert.match(listeningDetailPageSource, /getHintTokens\(answer, currentSolutionAlternatives\)/);
  assert.match(listeningDetailPageSource, /ref=\{dictationInputRef\}/);
  assert.match(listeningDetailPageSource, /dictationInputRef\.current\?\.focus\(\)/);
  assert.match(listeningDetailPageSource, />\s*Next\s*</);
});

test("the lesson page consumes only new final speech results", () => {
  assert.match(listeningDetailPageSource, /resultIndex: number;/);
  assert.match(
    listeningDetailPageSource,
    /getNewFinalSpeechTranscript\(event\.results, event\.resultIndex\)/
  );
  assert.doesNotMatch(
    listeningDetailPageSource,
    /Array\.from\(event\.results\)[\s\S]*?\.join\(" "\)/
  );
});

test("the lesson page permits only one active microphone session", () => {
  assert.match(
    listeningDetailPageSource,
    /if \(speechRecognitionRef\.current\) \{\s*return;\s*\}/
  );
  assert.match(listeningDetailPageSource, /disabled=\{isListening\}/);
  assert.match(
    listeningDetailPageSource,
    /if \(speechRecognitionRef\.current === recognition\) \{\s*speechRecognitionRef\.current = null;\s*setIsListening\(false\);\s*\}/
  );
});

test("listen challenges expose an optional nullable translation", () => {
  const challengeContract = listeningTypesSource.match(
    /export interface ListenAndTypeChallengeResponse\s*\{[\s\S]*?\n\}/
  )?.[0] ?? "";

  assert.match(challengeContract, /translate\?: string \| null;/);
});

test("the Correct popup conditionally shows the trimmed Vietnamese meaning", () => {
  assert.match(
    listeningDetailPageSource,
    /const currentTranslation = currentChallenge\?\.translate\?\.trim\(\) \?\? "";/
  );
  assert.match(
    listeningDetailPageSource,
    /\{currentTranslation \? \([\s\S]*?className="listen-correct-popup__translation"[\s\S]*?<small>Vietnamese meaning<\/small>[\s\S]*?<p>\{currentTranslation\}<\/p>[\s\S]*?\) : null\}/
  );
});

test("the transcript card shows the current Vietnamese translation below the English sentence", () => {
  assert.match(
    listeningDetailPageSource,
    /const transcriptTranslation = transcriptChallenge\?\.translate\?\.trim\(\) \?\? "";/
  );
  assert.match(
    listeningDetailPageSource,
    /className="listen-transcript-current"[\s\S]*?<p>\{transcriptChallenge\?\.content[\s\S]*?\{transcriptTranslation \? \([\s\S]*?className="listen-transcript-current__translation"[\s\S]*?\{transcriptTranslation\}[\s\S]*?\) : null\}/
  );
  assert.match(
    cssSource,
    /\.listen-transcript-current__translation\s*\{[\s\S]*?color:\s*#64748b;[\s\S]*?font-size:/
  );
});

test("the Vietnamese meaning has dedicated secondary styling", () => {
  assert.match(
    cssSource,
    /\.listen-correct-popup__translation\s*\{[\s\S]*?width:\s*100%/
  );
  assert.match(cssSource, /\.listen-correct-popup__translation small\s*\{/);
  assert.match(cssSource, /\.listen-correct-popup__translation p\s*\{/);
});

test("the Vietnamese meaning inherits the English answer typography", () => {
  const translationBodyStyle = cssSource.match(
    /\.listen-correct-popup__translation p\s*\{[\s\S]*?\n\}/
  )?.[0] ?? "";

  assert.doesNotMatch(translationBodyStyle, /font-family|font-size|line-height/);
  assert.match(
    cssSource,
    /\.listen-correct-popup p\s*\{[\s\S]*?font-size:\s*clamp\([\s\S]*?line-height:\s*1\.55/
  );
});
