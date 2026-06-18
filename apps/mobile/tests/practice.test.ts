import assert from "node:assert/strict";
import { test } from "node:test";
import {
  allAnswered,
  answeredCount,
  formatScore,
  practiceKindBlurb,
  practiceKindLabel,
  setAnswer,
  xpAwardNote
} from "../src/utils/practice";

test("practiceKindLabel maps known kinds and falls back gracefully", () => {
  assert.equal(practiceKindLabel("scam_red_flag_practice"), "Scam red flags");
  assert.equal(practiceKindLabel("review_recent"), "Review recent");
  assert.equal(practiceKindLabel("something_new"), "something new");
});

test("practiceKindBlurb returns a blurb for known kinds", () => {
  assert.match(practiceKindBlurb("scenario_practice"), /money situations/i);
  assert.equal(practiceKindBlurb("unknown"), "Practise money decisions.");
});

test("setAnswer records a chosen answer immutably", () => {
  const a = setAnswer({}, 1, "A");
  const b = setAnswer(a, 2, "B");
  assert.deepEqual(a, { "1": "A" });
  assert.deepEqual(b, { "1": "A", "2": "B" });
});

test("allAnswered requires every question answered", () => {
  assert.equal(allAnswered([1, 2], { "1": "A" }), false);
  assert.equal(allAnswered([1, 2], { "1": "A", "2": "B" }), true);
  assert.equal(allAnswered([], {}), false);
});

test("answeredCount counts non-empty answers", () => {
  assert.equal(answeredCount({ "1": "A", "2": "", "3": "C" }), 2);
});

test("formatScore rounds to a whole percent", () => {
  assert.equal(formatScore(66.6), "67%");
  assert.equal(formatScore(100), "100%");
});

test("xpAwardNote never implies a financial reward", () => {
  assert.match(xpAwardNote(25), /learning XP/);
  assert.match(xpAwardNote(0), /already earned/i);
});
