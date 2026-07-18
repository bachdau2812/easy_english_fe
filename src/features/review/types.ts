import { ISODateString, UUID } from "../../shared/types/common";
import { WordExampleResponse, WordSenseResponse, WordSoundResponse } from "../dictionary/types";

export type ExerciseType =
  | "VOCAB_WORD_TO_MEANING"
  | "VOCAB_FILL_MISSING_WORD_PART"
  | "VOCAB_LISTEN_AND_TYPE_WORD"
  | "VOCAB_CHOOSE_WORD_IN_SENTENCE_BLANK"
  | "VOCAB_FILL_WORD_IN_SENTENCE_BLANK"
  | "VOCAB_MEANING_TO_SOUND"
  | "VOCAB_SENTENCE_TO_MEANING"
  | "VOCAB_SENTENCE_BLANK_TO_SOUND"
  | "LAT_LISTEN_AND_TYPE";

export interface VocabReviewQuizResponse {
  wordId?: UUID | null;
  userVocabId?: UUID | null;
  word?: string | null;
  pos?: string | null;
  sound?: WordSoundResponse | null;
  wordSense?: WordSenseResponse | null;
  example?: WordExampleResponse | null;
  sense?: WordSenseResponse | null;
  exerciseType?: ExerciseType | null;
  correctAnswer?: string | null;
  listAnswers?: string[] | null;
  metadata?: Record<number, string> | null;
  maskedWord?: string | null;
  audioUrl?: string | null;
  missIndex?: number | null;
  sentence?: string | null;
  trans?: string | null;
}

export interface SubmitReviewAttemptRequest {
  attemptId?: string | null;
  userId: UUID;
  userVocabId?: UUID | null;
  exerciseType: ExerciseType;
  userAnswer?: string | null;
  correct: boolean;
  replayCount?: number | null;
}

export interface UserVocabAttemptResponse {
  id?: UUID | null;
  attemptId?: string | null;
  userId?: UUID | null;
  userVocabId?: UUID | null;
  exerciseType?: ExerciseType | null;
  userAnswer?: string | null;
  correct?: boolean | null;
  replayCount?: number | null;
  createdAt?: ISODateString | null;
}
