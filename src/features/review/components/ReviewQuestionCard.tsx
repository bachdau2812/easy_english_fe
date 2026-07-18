import { VocabReviewQuizResponse } from "../types";

export const ReviewQuestionCard = ({ question }: { question: VocabReviewQuizResponse }) => (
  <article className="panel">
    <strong>{question.exerciseType ?? "Review question"}</strong>
    <p>{question.sentence ?? question.maskedWord ?? "Question renderer placeholder"}</p>
  </article>
);
