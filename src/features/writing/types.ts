import { ISODateString, UUID } from "../../shared/types/common";

export type WritingTaskType = 1 | 2;

export interface WritingReviewCriterion {
  band: number;
  justificationVi: string;
  strengthsVi: string[];
  weaknessesVi: string[];
  whyNotHigherVi: string;
  improvementsVi: string[];
}

export interface WritingReviewCommon {
  criteria: {
    task: WritingReviewCriterion;
    coherenceCohesion: WritingReviewCriterion;
    lexicalResource: WritingReviewCriterion;
    grammaticalRangeAccuracy: WritingReviewCriterion;
  };
  grammarErrors: Array<{
    original: string;
    corrected: string;
    errorType: string;
    explanationVi: string;
    pattern: string;
  }>;
  lexicalIssues: Array<{
    original: string;
    suggestion: string;
    issueType: string;
    explanationVi: string;
  }>;
  successfulGrammar: Array<{ excerpt: string; feature: string; commentVi: string }>;
  priorityImprovementsVi: string[];
  summaryVi: string;
}

export interface WritingTask1Review extends WritingReviewCommon {
  task1Analysis: {
    overviewPresent: boolean;
    overviewAssessmentVi: string;
    keyFeaturesCoveredVi: string[];
    missingOrWeakKeyFeaturesVi: string[];
    factualErrors: Array<{
      learnerClaim: string;
      correctedFact: string;
      severity: string;
      explanationVi: string;
    }>;
  };
}

export interface WritingTask2Review extends WritingReviewCommon {
  task2Analysis: {
    questionType: string;
    taskRequirementsVi: string[];
    addressedRequirementsVi: string[];
    missingOrWeakRequirementsVi: string[];
    positionRequired: boolean;
    positionAssessmentVi: string;
    ideaDevelopmentAssessmentVi: string;
    relevanceAssessmentVi: string;
  };
}

export type IeltsWritingReview = WritingTask1Review | WritingTask2Review;

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
  review?: string | IeltsWritingReview | null;
  createdAt?: ISODateString | null;
  created_at?: ISODateString | null;
}

export interface IeltsWritingAttemptHistoryPageResponse {
  content?: IeltsWritingAttemptHistoryResponse[] | null;
}
