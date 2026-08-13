import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getPlainReviewSentence,
  getReviewMeaningPresentation,
  getReviewResultSoundUrl,
  getReviewResultExamplePresentation,
  getReviewResultSentence,
  isReviewSentenceExercise,
  parseReviewSentenceMarkup,
  shouldIgnoreReviewResultEnter,
  splitReviewInlineFocus
} from "../src/features/review/reviewPresentation.ts";

const reviewPageSource = readFileSync(
  new URL("../src/features/vocabulary/pages/VocabularyExplorePage.tsx", import.meta.url),
  "utf8"
);
const reviewCssSource = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

test("prefers the correct metadata sound for sound-choice exercises", () => {
  assert.equal(
    getReviewResultSoundUrl({
      audioUrl: "fallback.mp3",
      correctAnswer: "2",
      exerciseType: "VOCAB_SENTENCE_BLANK_TO_SOUND",
      metadata: { 1: "wrong.mp3", 2: " https://audio.example/mainland.mp3 " },
      sound: { mp3Url: "word.mp3", oggUrl: "word.ogg" }
    }),
    "https://audio.example/mainland.mp3"
  );

  assert.equal(
    getReviewResultSoundUrl({
      correctAnswer: "4",
      exerciseType: "VOCAB_MEANING_TO_SOUND",
      metadata: { 4: " https://audio.example/arrogant.mp3 " },
      sound: { mp3Url: null, oggUrl: null }
    }),
    "https://audio.example/arrogant.mp3"
  );
});

test("uses exercise audio before the word sound for non-choice exercises", () => {
  assert.equal(
    getReviewResultSoundUrl({
      audioUrl: " Nearby.mp3 ",
      exerciseType: "VOCAB_LISTEN_AND_TYPE_WORD",
      sound: { mp3Url: "nearby-word.mp3" }
    }),
    "Nearby.mp3"
  );
});

test("falls back from missing exercise audio to mp3 then ogg", () => {
  assert.equal(
    getReviewResultSoundUrl({ sound: { mp3Url: " word.mp3 ", oggUrl: "word.ogg" } }),
    "word.mp3"
  );
  assert.equal(
    getReviewResultSoundUrl({ sound: { mp3Url: " ", oggUrl: " word.ogg " } }),
    "word.ogg"
  );
});

test("does not interpret non-sound metadata as audio", () => {
  assert.equal(
    getReviewResultSoundUrl({
      correctAnswer: "1",
      exerciseType: "VOCAB_WORD_TO_MEANING",
      metadata: { 1: "Vietnamese meaning" },
      sound: null
    }),
    null
  );
});

test("returns null when no playable source exists", () => {
  assert.equal(
    getReviewResultSoundUrl({ audioUrl: " ", sound: { mp3Url: null, oggUrl: "" } }),
    null
  );
});

test("exposes Vietnamese and English meanings with explicit localized fields", () => {
  const presentation = getReviewMeaningPresentation({
    exerciseType: "VOCAB_WORD_TO_MEANING",
    sense: {
      definition: "A soft material that becomes hard when baked.",
      trans: { definition: "Một loại đất mềm, trở nên cứng khi nung." }
    },
    word: "clay"
  });

  assert.deepEqual(presentation, {
    englishMeaning: "A soft material that becomes hard when baked.",
    hasAnyMeaning: true,
    vietnameseMeaning: "Một loại đất mềm, trở nên cứng khi nung."
  });
});

test("treats a duplicated localized short meaning as hidden translation only", () => {
  const presentation = getReviewMeaningPresentation({
    sense: {
      shortMeaning: "chất lỏng",
      trans: {
        shortMeaning: "chất lỏng",
        definition: "Một chất không rắn và có thể chảy."
      }
    },
    word: "liquid"
  });

  assert.deepEqual(presentation, {
    englishMeaning: null,
    hasAnyMeaning: true,
    vietnameseMeaning: "chất lỏng"
  });
});

test("falls back to wordSense when sense meaning data is absent", () => {
  const presentation = getReviewMeaningPresentation({
    wordSense: {
      definition: "Taking no active part.",
      trans: { definition: "Không chủ động tham gia." }
    }
  });

  assert.deepEqual(presentation, {
    englishMeaning: "Taking no active part.",
    hasAnyMeaning: true,
    vietnameseMeaning: "Không chủ động tham gia."
  });
});

test("uses the complete sense presentation before falling back to wordSense", () => {
  const presentation = getReviewMeaningPresentation({
    sense: {
      definition: "A definition from the selected sense.",
      trans: { definition: "Bản dịch của nghĩa đã chọn." }
    },
    wordSense: {
      shortMeaning: "A short meaning from a different fallback sense.",
      trans: { shortMeaning: "Bản dịch từ nghĩa dự phòng khác." }
    }
  });

  assert.deepEqual(presentation, {
    englishMeaning: "A definition from the selected sense.",
    hasAnyMeaning: true,
    vietnameseMeaning: "Bản dịch của nghĩa đã chọn."
  });
});

test("keeps translation separate when no English meaning exists", () => {
  assert.deepEqual(
    getReviewMeaningPresentation({
      sense: { trans: { definition: "Nghĩa duy nhất backend trả về." } }
    }),
    {
      englishMeaning: null,
      hasAnyMeaning: true,
      vietnameseMeaning: "Nghĩa duy nhất backend trả về."
    }
  );
});

test("reports that no meaning exists when both language fields are absent", () => {
  assert.deepEqual(getReviewMeaningPresentation({ word: "unknown" }), {
    englishMeaning: null,
    hasAnyMeaning: false,
    vietnameseMeaning: null
  });
});

test("converts a marked review sentence to plain popup text", () => {
  assert.equal(
    getPlainReviewSentence("The <u>liquid</u> in the tube was clear."),
    "The liquid in the tube was clear."
  );
  assert.equal(
    getPlainReviewSentence("The &lt;u&gt;liquid&lt;/u&gt; was clear."),
    "The liquid was clear."
  );
  assert.equal(getPlainReviewSentence(null), null);
});

test("parses supported underline markup into safe sentence segments", () => {
  assert.deepEqual(
    parseReviewSentenceMarkup(
      "The <u>liquid</u> in the test tube was clear and <strong>colorless</strong>."
    ),
    [
      { text: "The ", type: "text" },
      { text: "liquid", type: "highlight" },
      { text: " in the test tube was clear and colorless.", type: "text" }
    ]
  );
});

test("strips malformed markup instead of displaying raw tags", () => {
  assert.deepEqual(parseReviewSentenceMarkup("The <u>liquid is clear."), [
    { text: "The liquid is clear.", type: "text" }
  ]);
  assert.deepEqual(parseReviewSentenceMarkup("The <u>liquid</u is clear."), [
    { text: "The liquid is clear.", type: "text" }
  ]);
});

test("parses escaped underline markers into highlight segments", () => {
  assert.deepEqual(
    parseReviewSentenceMarkup("The &lt;u&gt;liquid&lt;/u&gt; remains clear."),
    [
      { text: "The ", type: "text" },
      { text: "liquid", type: "highlight" },
      { text: " remains clear.", type: "text" }
    ]
  );
  assert.deepEqual(
    parseReviewSentenceMarkup("The \\u003cu\\u003eliquid\\u003c/u\\u003e remains clear."),
    [
      { text: "The ", type: "text" },
      { text: "liquid", type: "highlight" },
      { text: " remains clear.", type: "text" }
    ]
  );
});

test("completes a sentence-to-sound blank with the vocabulary word", () => {
  assert.equal(
    getReviewResultSentence({
      correctAnswer: "2",
      exerciseType: "VOCAB_SENTENCE_BLANK_TO_SOUND",
      sentence: "You may use the term ________ Europe.",
      word: "mainland"
    }),
    "You may use the term mainland Europe."
  );
});

test("completes a fill sentence with the hidden metadata letters", () => {
  assert.equal(
    getReviewResultSentence({
      correctAnswer: "enthusiasm",
      exerciseType: "VOCAB_FILL_WORD_IN_SENTENCE_BLANK",
      metadata: { 3: "h", 5: "s" },
      sentence: "She showed great ent_u_iasm for the project."
    }),
    "She showed great enthusiasm for the project."
  );
});

test("does not attach an additional example translation to the completed question sentence", () => {
  assert.deepEqual(
    getReviewResultExamplePresentation({
      correctAnswer: "mainland",
      example: {
        sentence: "The island lies close to the mainland.",
        trans: "Hòn đảo nằm gần đất liền."
      },
      exerciseType: "VOCAB_CHOOSE_WORD_IN_SENTENCE_BLANK",
      sentence: "They crossed the ________ by train.",
      trans: null
    }),
    {
      extraSentence: "The island lies close to the mainland.",
      extraTranslation: "Hòn đảo nằm gần đất liền.",
      isCompletedSentence: true,
      sentence: "They crossed the mainland by train.",
      translation: null
    }
  );
});

test("recognizes every exercise whose result should prioritize its question sentence", () => {
  for (const exerciseType of [
    "VOCAB_CHOOSE_WORD_IN_SENTENCE_BLANK",
    "VOCAB_FILL_WORD_IN_SENTENCE_BLANK",
    "VOCAB_SENTENCE_TO_MEANING",
    "VOCAB_SENTENCE_BLANK_TO_SOUND"
  ] as const) {
    assert.equal(isReviewSentenceExercise(exerciseType), true);
  }

  assert.equal(isReviewSentenceExercise("VOCAB_WORD_TO_MEANING"), false);
});

test("isolates the masked word so its character inputs can stay together", () => {
  assert.deepEqual(
    splitReviewInlineFocus(
      "She showed great ent_u_iasm for the project.",
      "ent_u_iasm"
    ),
    {
      after: " for the project.",
      before: "She showed great ",
      focus: "ent_u_iasm"
    }
  );
});

test("the review page uses normalized meaning and safe sentence presentation", () => {
  assert.match(reviewPageSource, /getReviewMeaningPresentation\(reviewResultPopup\.question\)/);
  assert.match(
    reviewPageSource,
    /getReviewResultExamplePresentation\(reviewResultPopup\.question\)/
  );
  assert.match(reviewPageSource, /renderReviewSentence\(/);
  assert.match(reviewPageSource, /<mark className="vocab-review-highlight"/);
  assert.doesNotMatch(reviewPageSource, /<u(?:\s|>)/);
  assert.doesNotMatch(
    reviewPageSource,
    /<p className="vocab-review-prompt">\{currentReviewQuestion\.sentence/
  );
});

test("the result popup renders Vietnamese first and exposes English on demand", () => {
  assert.match(
    reviewPageSource,
    /reviewResultPrimaryMeaning \? <p>\{reviewResultPrimaryMeaning\}<\/p> : null/
  );
  assert.match(
    reviewPageSource,
    /canToggleReviewEnglishMeaning \? \(/
  );
  assert.match(reviewPageSource, /English meaning/);
  assert.match(reviewPageSource, /isReviewEnglishMeaningOpen && reviewResultEnglishMeaning/);
  assert.doesNotMatch(reviewPageSource, /Show translation|Hide translation/);
});

test("the result popup renders completed and extra examples without emphasis", () => {
  assert.match(reviewPageSource, /getPlainReviewSentence\(reviewResultExample\)/);
  assert.match(reviewPageSource, /getPlainReviewSentence\(reviewResultExtraExample\)/);
});

test("the result popup attempts sound once without counting an answer replay", () => {
  const autoplayEffect =
    reviewPageSource.match(
      /useEffect\(\(\) => \{\s*if \(!reviewResultPopup \|\| !reviewResultSoundUrl\)[\s\S]*?\}, \[reviewResultPopup, reviewResultSoundUrl\]\);/
    )?.[0] ?? "";

  assert.match(reviewPageSource, /lastAutoPlayedReviewPopupRef/);
  assert.match(reviewPageSource, /reviewAudioPoolRef/);
  assert.match(autoplayEffect, /lastAutoPlayedReviewPopupRef\.current === reviewResultPopup/);
  assert.match(autoplayEffect, /reviewAudioPoolRef\.current\?\.play\(reviewResultSoundUrl\)/);
  assert.doesNotMatch(autoplayEffect, /setReviewReplayCount/);
});

test("the result popup uses the shared exercise-first sound resolver", () => {
  assert.match(
    reviewPageSource,
    /getReviewResultSoundUrl\(reviewResultPopup\.question\)/
  );
  assert.doesNotMatch(reviewPageSource, /const getReviewSoundUrl\s*=/);
});

test("highlighted review vocabulary has a dedicated marker style", () => {
  const highlightRule = reviewCssSource.match(/\.vocab-review-highlight\s*\{([^}]+)\}/)?.[1] ?? "";

  assert.match(highlightRule, /background:/);
  assert.match(highlightRule, /color:/);
  assert.match(highlightRule, /padding:\s*0;/);
});

test("the sentence fill passes its masked word into the grouped renderer", () => {
  assert.match(reviewPageSource, /maskedWord=\{currentReviewQuestion\.maskedWord\}/);
});

test("review result Enter ignores prevented and interactive lookup events", () => {
  assert.equal(shouldIgnoreReviewResultEnter(true, false), true);
  assert.equal(shouldIgnoreReviewResultEnter(false, true), true);
  assert.equal(shouldIgnoreReviewResultEnter(false, false), false);
});
