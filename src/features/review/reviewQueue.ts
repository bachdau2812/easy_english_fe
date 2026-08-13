import type { ExerciseType, VocabReviewQuizResponse } from "./types";

const supportedReviewExerciseTypes: ReadonlySet<ExerciseType> = new Set([
  "VOCAB_WORD_TO_MEANING",
  "VOCAB_FILL_MISSING_WORD_PART",
  "VOCAB_LISTEN_AND_TYPE_WORD",
  "VOCAB_CHOOSE_WORD_IN_SENTENCE_BLANK",
  "VOCAB_FILL_WORD_IN_SENTENCE_BLANK",
  "VOCAB_MEANING_TO_SOUND",
  "VOCAB_SENTENCE_TO_MEANING",
  "VOCAB_SENTENCE_BLANK_TO_SOUND"
]);

const isReviewQuestion = (value: unknown): value is VocabReviewQuizResponse => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const exerciseType = (value as { exerciseType?: unknown }).exerciseType;

  return (
    typeof exerciseType === "string" &&
    supportedReviewExerciseTypes.has(exerciseType as ExerciseType)
  );
};

export const pickGeneratedReviewQuestion = (value: unknown): VocabReviewQuizResponse | null => {
  if (Array.isArray(value)) {
    return value.find(isReviewQuestion) ?? null;
  }

  return isReviewQuestion(value) ? value : null;
};

export const appendGeneratedReviewQuestion = (
  current: VocabReviewQuizResponse[],
  response: unknown
): VocabReviewQuizResponse[] => {
  const generatedQuestion = pickGeneratedReviewQuestion(response);

  return generatedQuestion ? [...current, generatedQuestion] : current;
};

interface GeneratedReviewSessionContext {
  activeRequestId: number;
  isOpen: boolean;
  requestId: number;
}

export const appendGeneratedReviewQuestionForSession = (
  current: VocabReviewQuizResponse[],
  response: unknown,
  context: GeneratedReviewSessionContext
): VocabReviewQuizResponse[] => {
  if (!context.isOpen || context.requestId !== context.activeRequestId) {
    return current;
  }

  return appendGeneratedReviewQuestion(current, response);
};
