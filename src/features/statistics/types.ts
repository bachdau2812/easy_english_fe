import { UUID } from "../../shared/types/common";

export interface WrongVocabResponse {
  userVocabId?: UUID | null;
  word?: string | null;
  wrongCount?: number | null;
}

export interface UserVocabularyStatisticResponse {
  userId?: UUID | null;
  statisticDate?: string | null;
  totalAttempts?: number | null;
  correctQuizAttempt?: number | null;
  wrongQuizAttempt?: number | null;
  totalUniqueVocab?: number | null;
  // Present for daily statistics; omitted for overall statistics.
  correctUniqueVocab?: number | null;
  // Present for daily statistics; omitted for overall statistics.
  wrongUniqueVocab?: number | null;
  // Present for overall statistics; omitted for daily statistics.
  wrongCountVocab?: number | null;
  wrongVocabIds?: WrongVocabResponse[] | null;
  mostWrongVocabIds?: WrongVocabResponse[] | null;
}

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
}
