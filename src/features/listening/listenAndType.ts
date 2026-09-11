export interface ChallengeCompletionState {
  id?: string | null;
  isDone?: boolean | null;
}

export interface SpeechRecognitionResultLike {
  0?: { transcript?: string };
  isFinal: boolean;
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
  word.normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\p{L}\p{N}\p{M}](?:\S*[\p{L}\p{N}\p{M}])?/gu,
      (token) => "*".repeat(Array.from(token).length));

export const getNewFinalSpeechTranscript = (
  results: ArrayLike<SpeechRecognitionResultLike>,
  resultIndex: number
) =>
  Array.from(results)
    .slice(Math.max(resultIndex, 0))
    .filter((result) => result.isFinal)
    .map((result) => result[0]?.transcript?.trim())
    .filter(Boolean)
    .join(" ")
    .trim();

export interface DictationHintToken {
  isCorrect: boolean;
  text: string;
}

const splitDictationWords = (value?: string | null) => value?.trim().split(/\s+/).filter(Boolean) ?? [];

const getContractionExpandedPhrases = (value: string) => {
  const normalizedValue = normalizeDictationAnswer(value);
  const lowerValue = normalizedValue.toLowerCase();
  const specialContractions: Record<string, string[]> = {
    "aren't": ["are not"],
    "can't": ["can not", "cannot"],
    "couldn't": ["could not"],
    "didn't": ["did not"],
    "doesn't": ["does not"],
    "don't": ["do not"],
    "hadn't": ["had not"],
    "hasn't": ["has not"],
    "haven't": ["have not"],
    "isn't": ["is not"],
    "mightn't": ["might not"],
    "mustn't": ["must not"],
    "needn't": ["need not"],
    "shan't": ["shall not"],
    "shouldn't": ["should not"],
    "wasn't": ["was not"],
    "weren't": ["were not"],
    "won't": ["will not"],
    "wouldn't": ["would not"]
  };

  if (specialContractions[lowerValue]) {
    return specialContractions[lowerValue];
  }

  const contractionMatch = normalizedValue.match(/^(.+)'(re|m|ll|ve|s|d)$/i);

  if (!contractionMatch) {
    return [];
  }

  const base = contractionMatch[1];
  const suffix = contractionMatch[2].toLowerCase();
  const expansionsBySuffix: Record<string, string[]> = {
    d: ["would", "had"],
    ll: ["will"],
    m: ["am"],
    re: ["are"],
    s: ["is", "has"],
    ve: ["have"]
  };

  return (expansionsBySuffix[suffix] ?? []).map((expansion) => `${base} ${expansion}`);
};

const getAlternativeMatchCandidates = (alternative: string) => {
  const candidates = [alternative, ...getContractionExpandedPhrases(alternative)];
  const uniqueCandidates = new Map<string, string>();

  candidates.forEach((candidate) => {
    const normalizedCandidate = normalizeDictationAnswer(candidate);
    if (normalizedCandidate && !uniqueCandidates.has(normalizedCandidate)) {
      uniqueCandidates.set(normalizedCandidate, candidate);
    }
  });

  return [...uniqueCandidates.values()];
};

const getMatchedAlternativeWordCount = (
  answerWords: string[],
  startIndex: number,
  alternatives: string[]
) => {
  for (const alternative of alternatives) {
    for (const candidate of getAlternativeMatchCandidates(alternative)) {
      const candidateWords = splitDictationWords(normalizeDictationAnswer(candidate));
      const wordCount = Math.max(candidateWords.length, 1);
      const answerSegment = answerWords.slice(startIndex, startIndex + wordCount).join(" ");
      const normalizedAnswerSegment = normalizeDictationAnswer(answerSegment);
      const normalizedCandidate = normalizeDictationAnswer(candidate);

      if (normalizedAnswerSegment && normalizedAnswerSegment === normalizedCandidate) {
        return wordCount;
      }
    }
  }

  return null;
};

export const getDictationMatchResult = (answer: string, solutionAlternatives: string[][]) => {
  const answerWords = splitDictationWords(normalizeDictationAnswer(answer));
  const canonicalWords = solutionAlternatives.map((entry) => entry[0]);
  let answerWordIndex = 0;
  let correctPrefix = 0;

  for (const alternatives of solutionAlternatives) {
    // Punctuation-only solution entries require no typed word.
    if (alternatives.length > 0 && alternatives.every((value) => !normalizeDictationAnswer(value))) {
      correctPrefix += 1;
      continue;
    }
    const matchedWordCount = getMatchedAlternativeWordCount(answerWords, answerWordIndex, alternatives);

    if (!matchedWordCount) {
      break;
    }

    answerWordIndex += matchedWordCount;
    correctPrefix += 1;
  }

  return {
    canonicalAnswer: canonicalWords.join(" ").trim(),
    correctPrefix,
    isCorrect: answerWords.length > 0 && correctPrefix === solutionAlternatives.length && answerWordIndex === answerWords.length
  };
};

export const getHintTokens = (answer: string, solutionAlternatives: string[][]): DictationHintToken[] => {
  const solutionWords = solutionAlternatives.map((entry) => entry[0]);
  const { correctPrefix } = getDictationMatchResult(answer, solutionAlternatives);

  const visibleCount = correctPrefix < 2 ? 2 : Math.min(correctPrefix + 1, solutionWords.length);
  return solutionWords
    .map((word, index) => ({
      isCorrect: index < correctPrefix,
      text: index < visibleCount ? word : getDictationMask(word)
    }));
};
