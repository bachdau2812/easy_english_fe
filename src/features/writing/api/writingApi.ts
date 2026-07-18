import { apiClient } from "../../../shared/api/apiClient";
import {
  IeltsWritingAttemptHistoryResponse,
  IeltsWritingAttemptHistoryPageResponse,
  IeltsWritingExercise,
  IeltsWritingProblemSummaryResponse,
  IeltsWritingReference,
  IeltsWritingReviewRequest,
  WritingTaskType
} from "../types";

export const writingApi = {
  getTopics(taskType: WritingTaskType) {
    return apiClient.get<string[]>("/learning-resources/ielts-writing/topics", { query: { taskType } });
  },
  getProblems(topicName: string, userId?: string | null) {
    return apiClient.get<IeltsWritingProblemSummaryResponse[]>("/learning-resources/ielts-writing/problems", {
      query: { topicName, userId }
    });
  },
  getProblem(problemId: string) {
    return apiClient.get<IeltsWritingExercise>(`/learning-resources/ielts-writing/problems/${problemId}`);
  },
  getBands(problemId: string) {
    return apiClient.get<string[]>(`/learning-resources/ielts-writing/problems/${problemId}/bands`);
  },
  getReferences(problemId: string, band: string) {
    return apiClient.get<IeltsWritingReference[]>(`/learning-resources/ielts-writing/problems/${problemId}/references`, {
      query: { band }
    });
  },
  review(payload: IeltsWritingReviewRequest) {
    return apiClient.post<string>("/learning-resources/ielts-writing/reviews", payload);
  },
  getAttemptHistory(params: { exerciseId: string; userId: string }) {
    return apiClient.get<IeltsWritingAttemptHistoryResponse[] | IeltsWritingAttemptHistoryPageResponse>(
      "/learning-resources/ielts-writing/attempt-history",
      {
      query: { exerciseId: params.exerciseId, userId: params.userId }
      }
    );
  }
};
