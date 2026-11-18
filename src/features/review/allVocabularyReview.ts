import type { AllUserVocabularyResponse } from "../vocabulary/types";

export const allVocabularyColumnKeys = [
  "meaning_practice",
  "word",
  "pos",
  "word_sense",
  "word_practice",
  "level",
  "langcode",
  "examples"
] as const;

export type AllVocabularyColumnKey = (typeof allVocabularyColumnKeys)[number];
export type AllVocabularyPracticeMode = "word-to-meaning" | "meaning-to-word";
export type AllVocabularySessionStatus = "draft" | "submitted";

export const defaultAllVocabularyColumnWidths: Record<AllVocabularyColumnKey, number> = {
  meaning_practice: 190,
  word: 160,
  pos: 90,
  word_sense: 280,
  word_practice: 190,
  level: 76,
  langcode: 90,
  examples: 520
};

export interface AllVocabularyPracticeAnswers {
  meaning_practice: string;
  word_practice: string;
}

export interface AllVocabularyReviewItem extends AllUserVocabularyResponse {
  localId: string;
}

export interface AllVocabularyWrongItem {
  localId: string;
  word: string;
  pos: string;
  expectedAnswer: string;
  userAnswer: string;
  level: number | null;
}

export interface AllVocabularyReviewResult {
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  wrongItems: AllVocabularyWrongItem[];
}

export interface AllVocabularyReviewSession {
  userId: string;
  status: AllVocabularySessionStatus;
  items: AllVocabularyReviewItem[];
  order: string[];
  answers: Record<string, AllVocabularyPracticeAnswers>;
  mode: AllVocabularyPracticeMode;
  visibleColumns: Record<AllVocabularyColumnKey, boolean>;
  columnWidths: Record<AllVocabularyColumnKey, number>;
  result?: AllVocabularyReviewResult;
  updatedAt: string;
}

const createVisibleColumns = (
  hiddenColumn: AllVocabularyColumnKey
): Record<AllVocabularyColumnKey, boolean> =>
  Object.fromEntries(
    allVocabularyColumnKeys.map((column) => [column, column !== hiddenColumn])
  ) as Record<AllVocabularyColumnKey, boolean>;

export const createAllVocabularyReviewSession = (
  userId: string,
  items: AllUserVocabularyResponse[]
): AllVocabularyReviewSession => {
  const sessionItems = items.map((item, index) => ({ ...item, localId: `row-${index}` }));

  return {
    userId,
    status: "draft",
    items: sessionItems,
    order: sessionItems.map((item) => item.localId),
    answers: Object.fromEntries(
      sessionItems.map((item) => [item.localId, { meaning_practice: "", word_practice: "" }])
    ),
    mode: "word-to-meaning",
    visibleColumns: createVisibleColumns("word_sense"),
    columnWidths: { ...defaultAllVocabularyColumnWidths },
    updatedAt: new Date().toISOString()
  };
};

export const shuffleAllVocabularyOrder = (order: string[]): string[] => {
  const shuffled = [...order];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
};

export const setAllVocabularyPracticeMode = (
  session: AllVocabularyReviewSession,
  mode: AllVocabularyPracticeMode
): AllVocabularyReviewSession => ({
  ...session,
  mode,
  visibleColumns: {
    ...session.visibleColumns,
    word: mode === "word-to-meaning",
    word_sense: mode === "meaning-to-word",
    meaning_practice: mode === "word-to-meaning" || session.visibleColumns.meaning_practice,
    word_practice: mode === "meaning-to-word" || session.visibleColumns.word_practice
  },
  updatedAt: new Date().toISOString()
});

export const countAllVocabularyUnanswered = (
  session: AllVocabularyReviewSession
): number =>
  session.items.filter((item) =>
    !normalizeAllVocabularyAnswer(
      getAllVocabularyUserAnswer(session.answers[item.localId], session.mode)
    )
  ).length;

export const normalizeAllVocabularyAnswer = (value: string): string =>
  value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");

export const getExpectedAllVocabularyAnswer = (
  item: AllVocabularyReviewItem,
  mode: AllVocabularyPracticeMode
): string => (mode === "word-to-meaning" ? item.word_sense ?? "" : item.word ?? "");

export const getAllVocabularyUserAnswer = (
  answers: AllVocabularyPracticeAnswers | undefined,
  mode: AllVocabularyPracticeMode
): string =>
  mode === "word-to-meaning"
    ? answers?.meaning_practice ?? ""
    : answers?.word_practice ?? "";

export const calculateAllVocabularyReviewResult = (
  session: AllVocabularyReviewSession
): AllVocabularyReviewResult => {
  let correctCount = 0;
  let unansweredCount = 0;
  const wrongItems: AllVocabularyWrongItem[] = [];

  session.items.forEach((item) => {
    const expectedAnswer = getExpectedAllVocabularyAnswer(item, session.mode);
    const userAnswer = getAllVocabularyUserAnswer(session.answers[item.localId], session.mode);
    const normalizedAnswer = normalizeAllVocabularyAnswer(userAnswer);
    const isCorrect = Boolean(normalizedAnswer) &&
      normalizedAnswer === normalizeAllVocabularyAnswer(expectedAnswer);

    if (isCorrect) {
      correctCount += 1;
      return;
    }

    if (!normalizedAnswer) {
      unansweredCount += 1;
    }

    wrongItems.push({
      localId: item.localId,
      word: item.word ?? "",
      pos: item.pos ?? "",
      expectedAnswer,
      userAnswer,
      level: item.level
    });
  });

  return {
    correctCount,
    wrongCount: wrongItems.length,
    unansweredCount,
    wrongItems
  };
};
