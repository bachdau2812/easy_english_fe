export const queryKeys = {
  currentUser: (userId?: string | null) => ["auth", "currentUser", userId] as const,
  autocomplete: (text: string) => ["search", "autocomplete", text] as const,
  defaultSuggestions: () => ["search", "defaultSuggestions"] as const,
  wordDetail: (wordId?: string | null) => ["dictionary", "wordDetail", wordId] as const,
  savedVocabularies: (userId?: string | null, level?: number) =>
    ["vocabulary", "saved", userId, level] as const,
  reviewSession: (userId?: string | null, totalReviewVocab?: number) =>
    ["review", "session", userId, totalReviewVocab] as const,
  listeningCategories: () => ["listening", "categories"] as const,
  listeningSubCategories: (categoryId?: string | null) =>
    ["listening", "subCategories", categoryId] as const,
  listeningLessons: (subCategoryName?: string | null, userId?: string | null) =>
    ["listening", "lessons", subCategoryName, userId] as const,
  listeningLessonDetail: (lessonId?: string | null, userId?: string | null) =>
    ["listening", "lesson", lessonId, userId] as const,
  ieltsReadingCategories: () => ["reading", "ielts", "categories"] as const,
  ieltsReadingSources: (page?: number, limit?: number) =>
    ["reading", "ielts", "sources", page, limit] as const,
  ieltsReadingSourcesByCategory: (name?: string | null, page?: number, limit?: number) =>
    ["reading", "ielts", "sources", "category", name, page, limit] as const,
  statistics: (userId?: string | null, scope?: "daily" | "overall") =>
    ["statistics", scope, userId] as const,
  streak: (userId?: string | null) => ["statistics", "streak", userId] as const
};
