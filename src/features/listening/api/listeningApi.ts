import { apiClient } from "../../../shared/api/apiClient";
import {
  ListenAndTypeLessonResponse,
  ListenExerciseSummaryResponse,
  ListeningCategoryResponse,
  UserLessonProgressResponse,
  UserLessonRequest,
  UserLessonResponse
} from "../types";

export const listeningApi = {
  getCategories() {
    return apiClient.get<ListeningCategoryResponse[]>("/exercises/listen-and-type/categories");
  },
  getSubCategories(categoryId: string) {
    return apiClient.get<string[]>("/exercises/listen-and-type/sub-categories", {
      query: { categoryId }
    });
  },
  getLessons(params: { subCategoryName: string; userId: string }) {
    return apiClient.get<ListenExerciseSummaryResponse[]>("/exercises/listen-and-type/lessons", {
      query: { subCategoryName: params.subCategoryName, userId: params.userId }
    });
  },
  getLessonDetail(params: { lessonId: string; userId: string }) {
    return apiClient.get<ListenAndTypeLessonResponse>("/exercises/listen-and-type/lesson", {
      query: { userId: params.userId, lessonId: params.lessonId }
    });
  },
  createUserLesson(payload: UserLessonRequest) {
    return apiClient.post<UserLessonResponse>("/exercises/user-lessons", payload);
  },
  getProgress(params: { lessonId: string; lessonType: string; userId: string }) {
    return apiClient.get<UserLessonProgressResponse>("/exercises/user-lessons/progress", {
      query: params
    });
  }
};
