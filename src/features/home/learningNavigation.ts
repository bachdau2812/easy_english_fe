import type { VocabularyExplorerMode } from "./components/HomeVocabularyExplorer";

export type LearningNavigationKey =
  | "vocabulary"
  | "writing"
  | "listening"
  | "pronunciation"
  | "reading";

export type LearningNavigationIcon =
  | "book"
  | "bookmark"
  | "brain"
  | "chart"
  | "headphones"
  | "pen"
  | "reading"
  | "volume";

export type LearningNavigationItem = {
  description: string;
  disabled?: boolean;
  href?: string;
  icon: LearningNavigationIcon;
  label: string;
  to?: string;
  vocabularyMode?: VocabularyExplorerMode;
};

export type LearningNavigationGroup = {
  description: string;
  icon: LearningNavigationIcon;
  items: readonly LearningNavigationItem[];
  key: LearningNavigationKey;
  label: string;
};

export const learningNavigationGroups: readonly LearningNavigationGroup[] = [
  {
    description: "Learn English vocabulary",
    icon: "book",
    key: "vocabulary",
    label: "Vocabulary",
    items: [
      {
        description: "Explore categories in a friendly grid.",
        icon: "book",
        label: "Words by topic",
        to: "/vocabulary/topics",
        vocabularyMode: "topics"
      },
      {
        description: "Browse A1 to C2 with paged word lists.",
        icon: "chart",
        label: "Words by level",
        to: "/vocabulary/levels",
        vocabularyMode: "levels"
      },
      {
        description: "Saved words, stats, and review entry points.",
        icon: "bookmark",
        label: "My Vocabulary",
        to: "/vocabulary/my",
        vocabularyMode: "mine"
      }
    ]
  },
  {
    description: "Practice clear English writing",
    icon: "pen",
    key: "writing",
    label: "Writing",
    items: [
      {
        description: "Charts, maps, processes, and visual reports.",
        icon: "book",
        label: "IELTS Writing Task 1",
        to: "/writing/1"
      },
      {
        description: "Essay prompts by topic and opinion type.",
        icon: "brain",
        label: "IELTS Writing Task 2",
        to: "/writing/2"
      }
    ]
  },
  {
    description: "Practice with audio lessons",
    icon: "headphones",
    key: "listening",
    label: "Listening",
    items: [
      {
        description: "Audio challenges with focused replay.",
        icon: "book",
        label: "Listen and Type",
        to: "/listening/listen-and-type"
      },
      {
        description: "Short clips for building a listening habit.",
        href: "#listening",
        icon: "brain",
        label: "Daily audio"
      },
      {
        description: "Catch spelling, rhythm, and word endings.",
        href: "#listening",
        icon: "chart",
        label: "Dictation drills"
      }
    ]
  },
  {
    description: "Listen, repeat, and speak clearer",
    icon: "volume",
    key: "pronunciation",
    label: "Pronunciation",
    items: [
      {
        description: "Pronunciation practice is being prepared.",
        disabled: true,
        icon: "book",
        label: "Coming Soon"
      }
    ]
  },
  {
    description: "Practice reading comprehension",
    icon: "reading",
    key: "reading",
    label: "Reading",
    items: [
      {
        description: "Browse IELTS reading sources by category.",
        icon: "book",
        label: "IELTS Resource",
        to: "/reading/ielts"
      }
    ]
  }
] as const;

export const homeCourseKeys: readonly LearningNavigationKey[] = [
  "vocabulary",
  "listening",
  "reading",
  "pronunciation",
  "writing"
];

export const getLearningNavigationGroup = (key?: string | null) =>
  learningNavigationGroups.find((group) => group.key === key) ?? null;

export const getLearningCategoryPageClassName = (key: LearningNavigationKey) =>
  `learning-category-page learning-category-page--${key}`;
