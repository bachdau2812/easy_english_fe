import type { IeltsWritingReview } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === "string";
const isStringList = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString);
const hasStrings = (value: Record<string, unknown>, keys: string[]) => keys.every((key) => isString(value[key]));
const hasLists = (value: Record<string, unknown>, keys: string[]) => keys.every((key) => isStringList(value[key]));
const hasRows = (value: unknown, keys: string[]) =>
  Array.isArray(value) && value.every((row) => isRecord(row) && hasStrings(row, keys));

// Check AI output before the typed renderer accesses nested fields.
export const isIeltsWritingReview = (value: unknown): value is IeltsWritingReview => {
  if (!isRecord(value) || !isRecord(value.criteria)) return false;
  const criteria = value.criteria;
  const validCriteria = ["task", "coherenceCohesion", "lexicalResource", "grammaticalRangeAccuracy"].every((key) => {
    const criterion = criteria[key];
    // The backend's score enrichment still enforces the IELTS band range.
    return isRecord(criterion) && typeof criterion.band === "number" && Number.isInteger(criterion.band) &&
      criterion.band >= 0 && criterion.band <= 9 && hasStrings(criterion, ["justificationVi", "whyNotHigherVi"]) &&
      hasLists(criterion, ["strengthsVi", "weaknessesVi", "improvementsVi"]);
  });
  if (!validCriteria || !isString(value.summaryVi) || !isStringList(value.priorityImprovementsVi) ||
    !hasRows(value.grammarErrors, ["original", "corrected", "errorType", "explanationVi", "pattern"]) ||
    !hasRows(value.lexicalIssues, ["original", "suggestion", "issueType", "explanationVi"]) ||
    !hasRows(value.successfulGrammar, ["excerpt", "feature", "commentVi"])) return false;

  const task1 = value.task1Analysis;
  const task2 = value.task2Analysis;
  if (isRecord(task1) && task2 === undefined) {
    return typeof task1.overviewPresent === "boolean" && isString(task1.overviewAssessmentVi) &&
      hasLists(task1, ["keyFeaturesCoveredVi", "missingOrWeakKeyFeaturesVi"]) &&
      hasRows(task1.factualErrors, ["learnerClaim", "correctedFact", "explanationVi", "severity"]);
  }
  return task1 === undefined && isRecord(task2) && typeof task2.positionRequired === "boolean" &&
    hasStrings(task2, ["questionType", "positionAssessmentVi", "ideaDevelopmentAssessmentVi", "relevanceAssessmentVi"]) &&
    hasLists(task2, ["taskRequirementsVi", "addressedRequirementsVi", "missingOrWeakRequirementsVi"]);
};
