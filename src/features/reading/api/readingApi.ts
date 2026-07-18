import { PageResponse } from "../../../shared/api/apiResponse";
import { apiClient } from "../../../shared/api/apiClient";
import { IeltsReadingQuizResponse, IeltsReadingSourceResponse } from "../types";

export const readingApi = {
  getIeltsReadingQuiz(params: { readingId: string; userId?: string | null }) {
    return apiClient.get<IeltsReadingQuizResponse>(`/learning-resources/ielts-reading-sources/${params.readingId}/quiz`, {
      query: { userId: params.userId }
    });
  },
  getIeltsReadingCategories() {
    return apiClient.get<string[]>("/learning-resources/ielts-reading-sources/categories", { auth: false });
  },
  getIeltsReadingSources(params: { page?: number; limit?: number } = {}) {
    return apiClient.get<PageResponse<IeltsReadingSourceResponse>>("/learning-resources/ielts-reading-sources", {
      auth: false,
      query: {
        page: params.page ?? 0,
        limit: params.limit ?? 20
      }
    });
  },
  getIeltsReadingSourcesByCategory(params: { limit?: number; name: string; page?: number }) {
    return apiClient.get<PageResponse<IeltsReadingSourceResponse>>(
      "/learning-resources/ielts-reading-sources/by-category",
      {
        auth: false,
        query: {
          limit: params.limit ?? 20,
          name: params.name,
          page: params.page ?? 0
        }
      }
    );
  }
};
