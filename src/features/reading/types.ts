import { ISODateString, UUID } from "../../shared/types/common";

export interface IeltsReadingSourceResponse {
  id?: UUID | null;
  name?: string | null;
  title?: string | null;
  categoryId?: UUID | null;
  content?: string | null;
  createdAt?: ISODateString | null;
  updatedAt?: ISODateString | null;
}

export interface IeltsReadingQuizResponse {
  completed_question_ids?: string[] | null;
  id?: UUID | null;
  quiz?: IeltsReadingQuiz | null;
}

export interface IeltsReadingQuiz {
  id?: UUID | null;
  module?: string | null;
  passage_analysis?: IeltsReadingPassageAnalysis | null;
  question_groups?: IeltsReadingQuestionGroup[] | null;
  title?: string | null;
}

export interface IeltsReadingPassageAnalysis {
  multi_entity_present?: boolean | null;
  paragraph_count?: number | null;
  process_present?: boolean | null;
  selected_question_types?: Array<IeltsReadingQuestionType | string> | null;
  text_type?: string | null;
  writer_view_present?: boolean | null;
}

export type IeltsReadingQuestionType =
  | "matching_features"
  | "matching_headings"
  | "matching_information"
  | "multiple_choice_multiple"
  | "multiple_choice_single"
  | "sentence_completion"
  | "short_answer"
  | "summary_completion"
  | "true_false_not_given"
  | "yes_no_not_given";

export interface IeltsReadingQuestionGroup {
  allow_option_reuse?: boolean | null;
  context?: string | null;
  group_id?: UUID | null;
  instruction?: string | null;
  question_number_end?: number | null;
  question_number_start?: number | null;
  question_type?: IeltsReadingQuestionType | string | null;
  questions?: IeltsReadingQuestion[] | null;
  shared_options?: string[] | null;
  source_paragraph_ids?: string[] | null;
  word_limit?: string | null;
}

export interface IeltsReadingQuestion {
  answer?: string[] | null;
  difficulty?: string | null;
  evidence_quote?: string | null;
  explanation?: string | null;
  number?: number | null;
  options?: string[] | null;
  question_id?: UUID | null;
  skill?: string | null;
  source_paragraph_id?: string | null;
  stem?: string | null;
}

