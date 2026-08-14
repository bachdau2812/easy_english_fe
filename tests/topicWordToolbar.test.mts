import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(
  new URL("../src/features/vocabulary/pages/VocabularyExplorePage.tsx", import.meta.url),
  "utf8"
);
const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const topicPageSource =
  pageSource.match(/export const VocabularyTopicWordsPage[\s\S]*?\nconst LevelWordBrowser/)?.[0] ?? "";

test("topic words expose only the requested search control", () => {
  assert.match(topicPageSource, /placeholder="Search word by topic"/);
  assert.doesNotMatch(topicPageSource, /selectedWordIds|toggleWordSelection/);
  assert.doesNotMatch(topicPageSource, /vocab-topic-selection-pill/);
  assert.doesNotMatch(topicPageSource, /Build quiz/);
  assert.doesNotMatch(topicPageSource, /type="checkbox"/);
});

test("topic words use the standard row layout and a full-width toolbar", () => {
  const toolbarRule = css.match(/\.vocab-topic-toolbar\s*\{([^}]+)\}/)?.[1] ?? "";

  assert.match(topicPageSource, /className="vocab-word-rows"/);
  assert.doesNotMatch(topicPageSource, /vocab-word-rows--selectable/);
  assert.match(toolbarRule, /grid-template-columns:\s*minmax\(0,\s*1fr\);/);
  assert.doesNotMatch(css, /\.vocab-word-row__select/);
});
