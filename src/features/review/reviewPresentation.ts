import type { ExerciseType, VocabReviewQuizResponse } from "./types";

export interface ReviewMeaningPresentation {
  englishMeaning: string | null;
  hasAnyMeaning: boolean;
  vietnameseMeaning: string | null;
}

export interface ReviewSentenceSegment {
  text: string;
  type: "highlight" | "text" | "blank";
}

export interface ReviewInlineFocus {
  after: string;
  before: string;
  focus: string | null;
}

export interface ReviewResultExamplePresentation {
  extraSentence: string | null;
  extraTranslation: string | null;
  isCompletedSentence: boolean;
  sentence: string | null;
  translation: string | null;
}

const REVIEW_NAMED_BLANK_PATTERN = /\[\s*blank\s*\]|\(\s*blank\s*\)/i;
const REVIEW_UNDERLINE_PATTERN = /<u>([\s\S]*?)<\/u>/gi;

const getFirstText = (...values: Array<string | null | undefined>) =>
  values.find((value) => Boolean(value?.trim()))?.trim() ?? null;

const isReviewSoundChoiceExercise = (exerciseType?: ExerciseType | null) =>
  exerciseType === "VOCAB_MEANING_TO_SOUND" ||
  exerciseType === "VOCAB_SENTENCE_BLANK_TO_SOUND";

export const getReviewResultSoundUrl = (question: VocabReviewQuizResponse) => {
  const correctAnswerIndex = Number(question.correctAnswer);
  const correctMetadataSound = Number.isFinite(correctAnswerIndex)
    ? question.metadata?.[correctAnswerIndex]
    : null;
  const exerciseSound = isReviewSoundChoiceExercise(question.exerciseType)
    ? getFirstText(correctMetadataSound, question.audioUrl)
    : getFirstText(question.audioUrl);

  return getFirstText(exerciseSound, question.sound?.mp3Url, question.sound?.oggUrl);
};

const normalizeComparableText = (value?: string | null) =>
  value
    ?.normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ") ?? "";

const stripReviewMarkup = (value: string) =>
  value.replace(/<[^>]*>/g, "").replace(/<\/?u\b/gi, "");

const normalizeReviewMarkup = (value: string) =>
  value
    .replace(/&lt;(\/?u)&gt;/gi, "<$1>")
    .replace(/\\u003c/gi, "<")
    .replace(/\\u003e/gi, ">");

const getMetadataAnswer = (metadata?: Record<number, string> | null) =>
  Object.entries(metadata ?? {})
    .map(([index, value]) => ({ index: Number(index), value: value?.trim() ?? "" }))
    .filter((entry) => Number.isFinite(entry.index) && entry.value)
    .sort((left, right) => left.index - right.index)
    .map((entry) => entry.value)
    .join("");

const completeReviewSentence = (sentence: string, answer?: string | null) => {
  const cleanAnswer = answer?.trim();

  if (!cleanAnswer) {
    return sentence;
  }

  if (sentence.includes("_")) {
    let answerIndex = 0;
    const answerCharacters = [...cleanAnswer.replace(/\s/g, "")];

    return sentence.replace(/_/g, () => answerCharacters[answerIndex++] ?? "");
  }

  return sentence.replace(REVIEW_NAMED_BLANK_PATTERN, cleanAnswer);
};

export const getReviewMeaningPresentation = (
  question: VocabReviewQuizResponse
): ReviewMeaningPresentation => {
  const senseHasPresentation = Boolean(
    getFirstText(
      question.sense?.shortMeaning,
      question.sense?.definition,
      question.sense?.trans?.shortMeaning,
      question.sense?.trans?.definition
    )
  );
  const selectedSense = senseHasPresentation ? question.sense : question.wordSense;
  const translatedMeanings = [
    selectedSense?.trans?.shortMeaning,
    selectedSense?.trans?.definition
  ].map((value) => value?.trim()).filter((value): value is string => Boolean(value));
  const shortMeaning = getFirstText(selectedSense?.shortMeaning);
  const isShortMeaningTranslated = Boolean(
    shortMeaning &&
      translatedMeanings.some(
        (value) => normalizeComparableText(value) === normalizeComparableText(shortMeaning)
      )
  );
  const englishMeaning = getFirstText(
    selectedSense?.definition,
    isShortMeaningTranslated ? null : shortMeaning
  );
  const vietnameseMeaning = translatedMeanings[0] ?? null;

  return {
    englishMeaning,
    hasAnyMeaning: Boolean(englishMeaning || vietnameseMeaning),
    vietnameseMeaning
  };
};

export const parseReviewSentenceMarkup = (sentence?: string | null): ReviewSentenceSegment[] => {
  const value = sentence ? normalizeReviewMarkup(sentence.trim()) : "";

  if (!value) {
    return [];
  }

  const segments: ReviewSentenceSegment[] = [];
  let lastIndex = 0;

  for (const match of value.matchAll(REVIEW_UNDERLINE_PATTERN)) {
    const matchIndex = match.index ?? 0;
    const precedingText = stripReviewMarkup(value.slice(lastIndex, matchIndex));
    const highlightedText = stripReviewMarkup(match[1] ?? "");

    if (precedingText) {
      segments.push({ text: precedingText, type: "text" });
    }

    if (highlightedText) {
      segments.push({ text: highlightedText, type: "highlight" });
    }

    lastIndex = matchIndex + match[0].length;
  }

  const trailingText = stripReviewMarkup(value.slice(lastIndex));

  if (trailingText) {
    segments.push({ text: trailingText, type: "text" });
  }

  return segments;
};

export const getPlainReviewSentence = (sentence?: string | null) => {
  const text = parseReviewSentenceMarkup(sentence)
    .map((segment) => segment.text)
    .join("");

  return text || null;
};

export const isReviewSentenceExercise = (exerciseType?: ExerciseType | null) =>
  exerciseType === "VOCAB_CHOOSE_WORD_IN_SENTENCE_BLANK" ||
  exerciseType === "VOCAB_FILL_WORD_IN_SENTENCE_BLANK" ||
  exerciseType === "VOCAB_SENTENCE_TO_MEANING" ||
  exerciseType === "VOCAB_SENTENCE_BLANK_TO_SOUND";

const getReviewTargetContext = (question: VocabReviewQuizResponse) => {
  const sentence = question.example?.sentence;
  const spans = question.targetSpans;

  if (!sentence || !spans?.length) {
    return null;
  }

  let previousEnd = 0;
  for (const span of spans) {
    if (
      !Number.isInteger(span.start) || !Number.isInteger(span.end) ||
      span.start < previousEnd || span.end <= span.start || span.end > sentence.length ||
      sentence.slice(span.start, span.end) !== span.text
    ) {
      return null;
    }
    previousEnd = span.end;
  }

  return { sentence, spans };
};

export const getReviewQuestionSentenceSegments = (
  question: VocabReviewQuizResponse
): ReviewSentenceSegment[] => {
  const isBlankChoice = question.exerciseType === "VOCAB_CHOOSE_WORD_IN_SENTENCE_BLANK" ||
    question.exerciseType === "VOCAB_SENTENCE_BLANK_TO_SOUND";
  const isMeaningChoice = question.exerciseType === "VOCAB_SENTENCE_TO_MEANING";
  const context = getReviewTargetContext(question);

  if (context && (isBlankChoice || isMeaningChoice)) {
    const segments: ReviewSentenceSegment[] = [];
    let previousEnd = 0;
    for (const span of context.spans) {
      if (span.start > previousEnd) {
        segments.push({ text: context.sentence.slice(previousEnd, span.start), type: "text" });
      }
      segments.push(isBlankChoice
        ? { text: "", type: "blank" }
        : { text: context.sentence.slice(span.start, span.end), type: "highlight" });
      previousEnd = span.end;
    }
    if (previousEnd < context.sentence.length) {
      segments.push({ text: context.sentence.slice(previousEnd), type: "text" });
    }
    return segments;
  }

  // Legacy responses already contain masking/highlighting. Never show the
  // unmasked example as a fallback for a missing blank-choice prompt.
  const segments = parseReviewSentenceMarkup(question.sentence ?? (isBlankChoice
    ? "Choose the missing word."
    : isMeaningChoice ? question.example?.sentence : question.maskedWord));
  return isBlankChoice ? segments.flatMap((segment) =>
    segment.text.split(/(_+|\[\s*blank\s*\]|\(\s*blank\s*\))/gi)
      .filter((part) => part.length > 0)
      .map((part): ReviewSentenceSegment => /^(_+|\[\s*blank\s*\]|\(\s*blank\s*\))$/i.test(part)
        ? { text: "", type: "blank" }
        : { text: part, type: segment.type })
  ) : segments;
};

export const getReviewResultSentence = (question: VocabReviewQuizResponse) => {
  const context = getReviewTargetContext(question);
  if (context && isReviewSentenceExercise(question.exerciseType)) {
    return context.sentence.trim();
  }

  const sentence = question.sentence?.trim();

  if (!sentence) {
    return null;
  }

  if (question.exerciseType === "VOCAB_SENTENCE_BLANK_TO_SOUND") {
    return completeReviewSentence(sentence, question.word);
  }

  if (question.exerciseType === "VOCAB_FILL_WORD_IN_SENTENCE_BLANK") {
    return completeReviewSentence(sentence, getMetadataAnswer(question.metadata) || question.correctAnswer);
  }

  if (question.exerciseType === "VOCAB_CHOOSE_WORD_IN_SENTENCE_BLANK") {
    return completeReviewSentence(sentence, question.correctAnswer);
  }

  return sentence;
};

export const getReviewResultExamplePresentation = (
  question: VocabReviewQuizResponse
): ReviewResultExamplePresentation => {
  const questionSentence = getReviewResultSentence(question);
  const exampleSentence = getFirstText(question.example?.sentence);
  const isCompletedSentence = Boolean(
    questionSentence && isReviewSentenceExercise(question.exerciseType)
  );
  const sentence = isCompletedSentence
    ? questionSentence
    : exampleSentence ?? questionSentence;
  const translation = isCompletedSentence
    ? getFirstText(question.trans, getReviewTargetContext(question) ? question.example?.trans : null)
    : exampleSentence
      ? getFirstText(question.example?.trans)
      : getFirstText(question.trans);
  const normalizedQuestionSentence = normalizeComparableText(
    parseReviewSentenceMarkup(questionSentence).map((segment) => segment.text).join("")
  );
  const normalizedExampleSentence = normalizeComparableText(
    parseReviewSentenceMarkup(exampleSentence).map((segment) => segment.text).join("")
  );
  const hasDifferentExtraSentence = Boolean(
    isCompletedSentence &&
      exampleSentence &&
      normalizedExampleSentence !== normalizedQuestionSentence
  );

  return {
    extraSentence: hasDifferentExtraSentence ? exampleSentence : null,
    extraTranslation: hasDifferentExtraSentence ? getFirstText(question.example?.trans) : null,
    isCompletedSentence,
    sentence,
    translation
  };
};

export const splitReviewInlineFocus = (
  text: string,
  maskedWord?: string | null
): ReviewInlineFocus => {
  const focus = maskedWord?.trim();
  const focusIndex = focus ? text.indexOf(focus) : -1;

  if (!focus || focusIndex < 0) {
    return { after: text, before: "", focus: null };
  }

  return {
    after: text.slice(focusIndex + focus.length),
    before: text.slice(0, focusIndex),
    focus
  };
};

export const shouldIgnoreReviewResultEnter = (
  defaultPrevented: boolean,
  hasInteractiveTarget: boolean
) => defaultPrevented || hasInteractiveTarget;
