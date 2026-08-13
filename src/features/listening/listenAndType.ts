export interface ChallengeCompletionState {
  id?: string | null;
  isDone?: boolean | null;
}

const normalizeDictationWord = (word: string) =>
  word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

export const normalizeDictationAnswer = (value?: string | null) =>
  (value ?? "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(normalizeDictationWord)
    .filter(Boolean)
    .join(" ");

export const getInitialChallengeIndex = (
  challenges: ChallengeCompletionState[],
  completedChallengeIds: readonly string[] = []
) => {
  const completedIds = new Set(completedChallengeIds);
  const unfinishedIndex = challenges.findIndex(
    (challenge) => !challenge.isDone && !(challenge.id && completedIds.has(challenge.id))
  );

  return unfinishedIndex >= 0 ? unfinishedIndex : 0;
};

export const getDictationMask = (word: string) =>
  "*".repeat(Array.from(word).filter((character) => !/\s/u.test(character)).length);
