import { ISODateString, UUID } from "../../shared/types/common";

export interface UserLessonRequest {
  userId: UUID;
  lessonId: UUID;
  lessonType: string;
}

export interface UserLessonResponse {
  id?: UUID | null;
  userId?: UUID | null;
  lessonId?: UUID | null;
  lessonType?: string | null;
  createdAt?: ISODateString | null;
  updatedAt?: ISODateString | null;
}

export interface UserLessonProgressResponse {
  userId?: UUID | null;
  lessonId?: UUID | null;
  lessonType?: string | null;
  completedChallengeIds?: string[] | null;
}

export interface ListenAndTypeLessonResponse {
  userId?: UUID | null;
  lessonId?: UUID | null;
  title?: string | null;
  categoryName?: string | null;
  fullDocument?: string | null;
  speechToTextLangCode?: string | null;
  audioUrl?: string | null;
  learningResourceType?: string | null;
  completedChallengeIds?: string[] | null;
  challenges?: ListenAndTypeChallengeResponse[] | null;
}

export interface ListenAndTypeChallengeResponse {
  id?: UUID | null;
  position?: number | null;
  content?: string | null;
  jsonContent?: string | null;
  solution?: string | null;
  translate?: string | null;
  timeStart?: number | null;
  timeEnd?: number | null;
  hints?: string | null;
  audioSrc?: string | null;
  isDone?: boolean | null;
}

export type PublicListenAndTypeChallenge = Omit<ListenAndTypeChallengeResponse, "solution">;

export interface ListeningCategoryResponse {
  id?: UUID | null;
  categoryName?: string | null;
  slug?: string | null;
  description?: string | null;
}

export interface ListenExerciseSummaryResponse {
  id?: UUID | null;
  title?: string | null;
  speechToTextLangCode?: string | null;
  totalPart?: number | null;
  completedPart?: number | null;
}

export interface ListenAndTypeReturnState {
  categoryId?: string | null;
  categoryTitle?: string | null;
  subCategoryName?: string | null;
}
