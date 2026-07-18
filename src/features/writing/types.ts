import { ISODateString, UUID } from "../../shared/types/common";

export type WritingTaskType = 1 | 2;

export interface IeltsWritingProblemSummaryResponse {
  id?: UUID | null;
  problem?: string | null;
  isDone?: boolean | null;
}

export interface IeltsWritingExercise {
  id?: UUID | null;
  problem?: string | null;
  problemTopic?: string | null;
  taskType?: number | null;
  evaluationPrompt?: string | null;
  imageUrl?: string | null;
  imageDescription?: string | null;
  createdAt?: ISODateString | null;
  updatedAt?: ISODateString | null;
}

export interface IeltsWritingReference {
  id?: UUID | null;
  ieltsWritingExerciseId?: UUID | null;
  essay?: string | null;
  band?: string | null;
  createdAt?: ISODateString | null;
  updatedAt?: ISODateString | null;
}

export interface IeltsWritingReviewRequest {
  exerciseId: UUID;
  userId: UUID;
  userAnswer: string;
}

export interface IeltsWritingAttemptHistoryResponse {
  id?: UUID | null;
  attemptId?: UUID | null;
  attempt_id?: UUID | null;
  userId?: UUID | null;
  user_id?: UUID | null;
  exerciseId?: UUID | null;
  exercise_id?: UUID | null;
  userAnswer?: string | null;
  user_answer?: string | null;
  review?: string | null;
  createdAt?: ISODateString | null;
  created_at?: ISODateString | null;
}

export interface IeltsWritingAttemptHistoryPageResponse {
  content?: IeltsWritingAttemptHistoryResponse[] | null;
}
