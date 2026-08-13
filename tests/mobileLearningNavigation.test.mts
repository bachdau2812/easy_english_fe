import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getLearningCategoryPageClassName,
  getLearningNavigationGroup,
  homeCourseKeys,
  learningNavigationGroups
} from "../src/features/home/learningNavigation.ts";

test("the five existing home cards map to their matching navigation groups", () => {
  assert.deepEqual(homeCourseKeys, [
    "vocabulary",
    "listening",
    "reading",
    "pronunciation",
    "writing"
  ]);

  for (const key of homeCourseKeys) {
    assert.equal(getLearningNavigationGroup(key)?.key, key);
  }
  assert.equal(getLearningNavigationGroup("unknown"), null);
});

test("mobile category pages receive a stable shared category modifier", () => {
  assert.equal(
    getLearningCategoryPageClassName("vocabulary"),
    "learning-category-page learning-category-page--vocabulary"
  );
  assert.equal(
    getLearningCategoryPageClassName("listening"),
    "learning-category-page learning-category-page--listening"
  );
  assert.equal(
    getLearningCategoryPageClassName("reading"),
    "learning-category-page learning-category-page--reading"
  );
  assert.equal(
    getLearningCategoryPageClassName("pronunciation"),
    "learning-category-page learning-category-page--pronunciation"
  );
  assert.equal(
    getLearningCategoryPageClassName("writing"),
    "learning-category-page learning-category-page--writing"
  );
});

test("mobile category presentation keeps the compact geometry contract", () => {
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
  const mobileCategoryBlock = css.slice(css.lastIndexOf("@media (max-width: 760px)"));

  assert.match(
    mobileCategoryBlock,
    /\.learning-category-page\s*\{[^}]*align-content:\s*start;/s
  );
  assert.match(
    mobileCategoryBlock,
    /\.learning-category-page\s*\{[^}]*gap:\s*18px;/s
  );
  assert.match(
    mobileCategoryBlock,
    /\.learning-category-page\s*\{[^}]*grid-template-rows:\s*max-content max-content;/s
  );
  assert.match(
    mobileCategoryBlock,
    /\.learning-category-page__header\s*\{[^}]*height:\s*92px;/s
  );

  for (const contract of [
    "min-height: 92px;",
    "min-height: 72px;",
    "height: 44px;",
    "height: 40px;",
    "gap: 9px;",
    "border-radius: 15px;"
  ]) {
    assert.match(mobileCategoryBlock, new RegExp(contract.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("mobile category groups preserve the current desktop navbar destinations", () => {
  assert.deepEqual(
    learningNavigationGroups.map((group) => ({
      key: group.key,
      labels: group.items.map((item) => item.label),
      destinations: group.items.map((item) => item.to ?? item.href ?? (item.disabled ? "disabled" : null))
    })),
    [
      {
        key: "vocabulary",
        labels: ["Words by topic", "Words by level", "My Vocabulary"],
        destinations: ["/vocabulary/topics", "/vocabulary/levels", "/vocabulary/my"]
      },
      {
        key: "writing",
        labels: ["IELTS Writing Task 1", "IELTS Writing Task 2"],
        destinations: ["/writing/1", "/writing/2"]
      },
      {
        key: "listening",
        labels: ["Listen and Type", "Daily audio", "Dictation drills"],
        destinations: ["/listening/listen-and-type", "#listening", "#listening"]
      },
      {
        key: "pronunciation",
        labels: ["Coming Soon"],
        destinations: ["disabled"]
      },
      {
        key: "reading",
        labels: ["IELTS Resource"],
        destinations: ["/reading/ielts"]
      }
    ]
  );
});

test("mobile search keeps icon, input, and all-meanings control in one centered row", () => {
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
  const mobileSearchRule =
    /@media \(max-width: 760px\)[\s\S]*?\.guest-navbar:not\(\.guest-navbar--route-compact\) \.guest-navbar__search,[\s\S]*?\{([\s\S]*?)\}/g;
  const matches = [...css.matchAll(mobileSearchRule)];
  const lastRule = matches.at(-1)?.[1] ?? "";

  assert.match(lastRule, /align-items:\s*center/);
  assert.match(lastRule, /grid-template-columns:\s*auto minmax\(0, 1fr\) auto/);
  assert.match(lastRule, /height:\s*42px/);
});

test("existing home cards become buttons only in mobile mode and open the category route", () => {
  const heroSource = readFileSync(
    new URL("../src/features/home/components/HomeHero.tsx", import.meta.url),
    "utf8"
  );
  const homeSource = readFileSync(
    new URL("../src/features/home/pages/HomePage.tsx", import.meta.url),
    "utf8"
  );
  const routerSource = readFileSync(new URL("../src/app/router.tsx", import.meta.url), "utf8");

  assert.match(heroSource, /isMobile \? \(/);
  assert.match(heroSource, /<button[\s\S]*?onClick=\{\(\) => onCourseSelect\?\.\(key\)\}/);
  assert.match(heroSource, /\) : \(\s*<article/);
  assert.match(homeSource, /navigate\(ROUTES\.learningCategory\(key\)\)/);
  assert.match(routerSource, /path: ROUTES\.learningCategory\(\)/);
  assert.match(routerSource, /element: <LearningCategoryPage \/>/);
});

test("mobile All Meaning reveal is anchored at the switch left edge", () => {
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
  const revealRule =
    css.match(/\.guest-navbar__search-mode > \.guest-navbar__search-mode-reveal\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const revealKeyframes =
    css.match(/@keyframes mobileAllMeaningReveal\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

  assert.match(revealRule, /right:\s*100%/);
  assert.doesNotMatch(revealKeyframes, /translate\(24px,\s*-50%\)/);
});
