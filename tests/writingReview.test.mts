import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { isIeltsWritingReview } from "../src/features/writing/writingReview.ts";

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
after(() => server.close());
const { WritingReview, WritingReviewResult } = await server.ssrLoadModule("/src/features/writing/components/WritingReview.tsx");
const writingPageSource = readFileSync(
  new URL("../src/features/writing/pages/WritingPage.tsx", import.meta.url),
  "utf8",
);
const appCssSource = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

interface Schema {
  type: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  enum?: string[];
}

const schemas: Schema[] = [1, 2].map((task) => JSON.parse(readFileSync(new URL(`../schemas/ielts-writing-task-${task}-review.schema.json`, import.meta.url), "utf8")));

// Generate representative responses from the actual backend schemas so new fields cannot silently disappear.
const fixture = (schema: Schema, path = "review"): any => {
  if (schema.enum) return schema.enum[0];
  if (schema.type === "object") return Object.fromEntries(Object.entries(schema.properties ?? {}).map(([key, child]) => [key, fixture(child, `${path}.${key}`)]));
  if (schema.type === "array") return [fixture(schema.items!, `${path}.item`)];
  if (schema.type === "boolean") return false;
  if (schema.type === "integer") return 0;
  return `${path} sample text`;
};

const expectedText = (schema: Schema, value: any): string[] => {
  if (schema.enum) return [];
  if (schema.type === "string") return [value];
  if (schema.type === "array") return value.flatMap((item: any) => expectedText(schema.items!, item));
  if (schema.type === "object") return Object.entries(schema.properties ?? {}).flatMap(([key, child]) => expectedText(child, value[key]));
  return [];
};

for (const [index, schema] of schemas.entries()) {
  test(`Task ${index + 1} renders every textual schema field and all four zero bands`, () => {
    const review = fixture(schema);
    assert.equal(isIeltsWritingReview(review), true);
    const html = renderToStaticMarkup(createElement(WritingReview, { review }));
    for (const value of expectedText(schema, review)) assert.ok(html.includes(value), `Missing ${value}`);
    assert.equal((html.match(/Band 0/g) ?? []).length, 4);
    assert.match(html, index === 0 ? /Task Achievement/ : /Task Response/);
    assert.doesNotMatch(html, index === 0 ? /Task Response|Phân tích Task 2/ : /Task Achievement|Phân tích Task 1/);
    assert.match(html, index === 0 ? /Chưa có/ : /<strong>Không<\/strong>/);
    assert.doesNotMatch(html, /Overall band/);
  });
}

test("malformed nested data cannot enter the typed renderer", () => {
  for (const schema of schemas) {
    const review = fixture(schema);
    for (const key of Object.keys(review)) {
      const missing = structuredClone(review);
      delete missing[key];
      assert.equal(isIeltsWritingReview(missing), false, `Accepted missing ${key}`);
    }
    for (const band of [-1, 10, 6.5, "6", null]) {
      const invalid = structuredClone(review);
      invalid.criteria.task.band = band;
      assert.equal(isIeltsWritingReview(invalid), false);
    }
    review.criteria.lexicalResource.strengthsVi = [null];
    assert.equal(isIeltsWritingReview(review), false);
  }
  for (const value of [null, [], "invalid JSON", { criteria: {} }, { overall_band: 6 }]) assert.equal(isIeltsWritingReview(value), false);
});

test("task-specific booleans and error tags remain visible", () => {
  const review = fixture(schemas[0]);
  review.task1Analysis.overviewPresent = true;
  review.task1Analysis.factualErrors[0].severity = "major";
  review.grammarErrors[0].pattern = "recurring";
  const html = renderToStaticMarkup(createElement(WritingReview, { review }));
  assert.match(html, /Đã có/);
  assert.match(html, /Nghiêm trọng/);
  assert.match(html, /Lặp lại/);
});

test("empty findings show explicit empty states without inventing corrections", () => {
  const review = fixture(schemas[1]);
  review.grammarErrors = [];
  review.lexicalIssues = [];
  review.successfulGrammar = [];
  review.priorityImprovementsVi = [];
  assert.equal(isIeltsWritingReview(review), true);
  const html = renderToStaticMarkup(createElement(WritingReview, { review }));
  assert.match(html, /Không ghi nhận lỗi ngữ pháp/);
  assert.match(html, /Không ghi nhận vấn đề từ vựng/);
  assert.match(html, /Chưa có đề xuất ưu tiên/);
});

test("AI-provided text is escaped instead of rendered as HTML", () => {
  const review = fixture(schemas[1]);
  review.summaryVi = "<script>alert(1)</script>";
  const html = renderToStaticMarkup(createElement(WritingReview, { review }));
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("free-form classification labels keep the review layout without inventing classifications", () => {
  const review = fixture(schemas[0]);
  review.grammarErrors[0].pattern = "systematic";
  review.task1Analysis.factualErrors[0].severity = "high";
  assert.equal(isIeltsWritingReview(review), true);
  const html = renderToStaticMarkup(createElement(WritingReview, { review }));
  assert.match(html, />systematic</);
  assert.match(html, />high</);
  assert.doesNotMatch(html, /writing-ai-review__tag--high/);
});

test("classification labels remain escaped and cannot add CSS classes", () => {
  const review = fixture(schemas[0]);
  review.grammarErrors[0].pattern = "<script>alert(1)</script>";
  review.task1Analysis.factualErrors[0].severity = "major injected-class";
  assert.equal(isIeltsWritingReview(review), true);
  const html = renderToStaticMarkup(createElement(WritingReview, { review }));
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|class="[^"]*injected-class/);
});

test("incomplete reviews show an explicit message instead of raw JSON or fabricated scores", () => {
  for (const schema of schemas) {
    const review = fixture(schema);
    delete review.criteria.task.band;
    const html = renderToStaticMarkup(createElement(WritingReviewResult, { value: review }));
    assert.match(html, /Review chưa đầy đủ/);
    assert.doesNotMatch(html, /Band |writing-review-popup__nested|Justification Vi/);
  }
});

test("the result boundary keeps the task-specific layout for current and enriched responses", () => {
  for (const [index, schema] of schemas.entries()) {
    const review = { ...fixture(schema), taskType: index + 1, wordCount: 200, overallBand: 0, scores: {} };
    const html = renderToStaticMarkup(createElement(WritingReviewResult, { value: review }));
    assert.match(html, new RegExp(`IELTS Writing Task ${index + 1}`));
    assert.match(html, index === 0 ? /Task Achievement/ : /Task Response/);
    assert.doesNotMatch(html, /Review chưa đầy đủ/);
  }
});

test("pending writing review shows a centered AI feedback disclaimer below the wait message", () => {
  assert.match(
    writingPageSource,
    /AI feedback can take a little while\. Please keep this window open\.<\/p>\s*<p>AI feedback is for reference only\.<\/p>/,
  );
  assert.match(
    appCssSource,
    /\.writing-review-popup__loading\s*\{[^}]*justify-items:\s*center;[^}]*text-align:\s*center;/s,
  );
});
