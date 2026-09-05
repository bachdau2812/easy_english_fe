export const queryKeys = {
  currentUser: (userId?: string | null) => ["auth", "currentUser", userId] as const,
  autocomplete: (text: string, isUniqueSearch = false) =>
    ["search", "autocomplete", text, isUniqueSearch ? "unique" : "pos"] as const,
  defaultSuggestions: () => ["search", "defaultSuggestions"] as const,
  wordDetail: (wordId?: string | null) => ["dictionary", "wordDetail", wordId] as const,
  searchHistory: (userId?: string | null) => ["search", "history", userId] as const,
  savedVocabularies: (userId?: string | null, level?: number, page?: number, limit?: number) =>
    ["vocabulary", "saved", userId, level, page, limit] as const,
  savedVocabularySearch: (text: string, isAutocomplete: boolean, page: number, limit: number) =>
    ["vocabulary", "saved-search", text, isAutocomplete, page, limit] as const,
  vocabularyInfo: (userId?: string | null, infoType?: string | null) =>
    ["vocabulary", "info", userId, infoType] as const,
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
