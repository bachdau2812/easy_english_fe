import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
after(() => server.close());
const { ReadingQuizGroup } = await server.ssrLoadModule("/src/features/reading/components/ReadingQuiz.tsx");
const { ReadingQuizPanel } = await server.ssrLoadModule("/src/features/reading/components/ReadingQuizPanel.tsx");
const quizCss = await readFile(new URL("../src/features/reading/components/ReadingQuiz.css", import.meta.url), "utf8");

const renderGroup = (questionType: string, review = false, extra = {}) => renderToStaticMarkup(createElement(ReadingQuizGroup, {
  group: {
    group_id: "group-1", question_type: questionType,
    instruction: "Choose TWO answers.", word_limit: "NO MORE THAN THREE WORDS AND/OR A NUMBER",
    shared_options: ["A. First option", "B. Second option"], source_paragraph_ids: ["A", "B"],
    context: "The result was {{Q1}} in the study.",
    questions: [{ question_id: "q1", number: 1, stem: "What did the study find?", options: ["A. First option", "B. Second option"], answer: ["secret-answer"], explanation: "secret-explanation" }],
    ...extra
  },
  answers: { q1: "A" }, mode: review ? "review" : "attempt", onChange() {}
}));

test("word limit preserves the permission to include a number", () => {
  assert.match(renderGroup("short_answer"), /NO MORE THAN THREE WORDS AND\/OR A NUMBER/);
});

test("single choice uses a named native radio group with selected answer", () => {
  const html = renderGroup("multiple_choice_single");
  assert.match(html, /role="radiogroup"/);
  assert.match(html, /type="radio"/);
  assert.match(html, /checked=""/);
});

test("focusing a question does not draw an outline around the whole question", () => {
  assert.doesNotMatch(quizCss, /\.ielts-quiz-question:focus(?:-visible)?\s*\{[^}]*outline\s*:/s);
  assert.doesNotMatch(quizCss, /\.ielts-quiz-(?:panel|group)\s+:focus-visible\s*[,\{]/);
  assert.match(quizCss, /:focus-visible:not\(\.ielts-quiz-question\)/);
  assert.match(quizCss, /\.ielts-quiz-option:focus-within\s*\{[^}]*outline\s*:/s);
});

test("all ten types keep answers hidden until review and render answer controls", () => {
  for (const type of ["matching_features", "matching_headings", "matching_information", "multiple_choice_multiple", "multiple_choice_single", "sentence_completion", "short_answer", "summary_completion", "true_false_not_given", "yes_no_not_given"]) {
    const html = renderGroup(type);
    assert.doesNotMatch(html, /secret-answer|secret-explanation/, type);
    assert.match(html, /<(input|select)\b/, type);
    const review = renderGroup(type, true);
    assert.match(review, /secret-answer/, type);
    assert.match(review, /secret-explanation/, type);
    assert.match(review, /disabled=""/, type);
  }
});

test("matching banks only mark options used when reuse is forbidden", () => {
  assert.doesNotMatch(renderGroup("matching_features", false, { allow_option_reuse: true }), /Already used/);
  assert.match(renderGroup("matching_features", false, { allow_option_reuse: false }), /Already used/);
});

test("summary keeps every question answerable when context has no placeholders", () => {
  const html = renderGroup("summary_completion", false, { context: "Complete this summary." });
  assert.match(html, /<(input|select)\b/);
});

test("a long quiz keeps all questions rendered and limits the visible navigation page", () => {
  const questions = Array.from({ length: 40 }, (_, index) => ({ question_id: `q${index + 1}`, number: index + 1, stem: "Enter the answer" }));
  const html = renderToStaticMarkup(createElement(ReadingQuizPanel, {
    answers: { q1: "example" }, groups: [{ question_type: "short_answer", questions }],
    onAnswerChange() {}, onClose() {}, onSubmit() {}
  }));
  assert.equal((html.match(/data-question-key=/g) ?? []).length, 40);
  const navigator = html.match(/<nav\b[\s\S]*?<\/nav>/)?.[0] ?? "";
  assert.equal((navigator.match(/aria-label="Question \d+,/g) ?? []).length, 8);
  assert.match(navigator, /Next question numbers/);
  assert.match(html, /<strong>39<\/strong> unanswered/);
  assert.match(html, /<footer[\s\S]*Submit quiz[\s\S]*<\/footer>/);
});

test("checkbox selection limit keeps selected choices available to uncheck", () => {
  const html = renderToStaticMarkup(createElement(ReadingQuizGroup, {
    group: { question_type: "multiple_choice_multiple", instruction: "Choose TWO answers.", questions: [{ question_id: "q1", number: 1, stem: "Choose findings", options: ["A. First", "B. Second", "C. Third"], answer: ["A", "C"] }] },
    answers: { q1: ["A", "B"] }, onChange() {}
  }));
  const inputs = html.match(/<input\b[^>]*>/g) ?? [];
  assert.equal(inputs.length, 3);
  assert.doesNotMatch(inputs[0], /disabled/);
  assert.doesNotMatch(inputs[1], /disabled/);
  assert.match(inputs[2], /disabled/);
  assert.match(html, /Selection limit reached/);
  assert.doesNotMatch(html, /is-correct|is-incorrect/);
});
