import { readFile } from "node:fs/promises";
import process from "node:process";

const FILE_PATH = new URL("../data/questions.json", import.meta.url);
const ALLOWED_TYPES = new Set([
  "multiple-choice",
  "true-false",
  "free-text",
]);
const ALLOWED_REVIEW_STATUSES = new Set([
  "pending-review",
  "approved",
  "retired",
]);

function normalized(value) {
  return String(value ?? "")
    .toLocaleLowerCase("el-GR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

let questions;

try {
  const content = await readFile(FILE_PATH, "utf8");
  questions = JSON.parse(content);
} catch (error) {
  console.error("❌ Το data/questions.json δεν είναι έγκυρο JSON.");
  console.error(error.message);
  process.exit(1);
}

if (!Array.isArray(questions)) {
  console.error("❌ Η ρίζα του questions.json πρέπει να είναι array.");
  process.exit(1);
}

const ids = new Set();
const prompts = new Set();
const requiredFields = [
  "id",
  "brand",
  "section",
  "type",
  "question",
  "correctAnswer",
  "explanation",
  "source",
  "medicalReviewStatus",
  "enabled",
];

for (const [index, question] of questions.entries()) {
  const label = question.id || `εγγραφή ${index + 1}`;

  for (const field of requiredFields) {
    const value = question[field];
    const missing =
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "");

    if (missing) {
      fail(`${label}: λείπει το υποχρεωτικό πεδίο "${field}".`);
    }
  }

  if (!/^([A-Z0-9]+)-\d{3,}$/.test(String(question.id))) {
    fail(`${label}: το ID πρέπει να έχει μορφή BRAND-001.`);
  }

  if (ids.has(question.id)) {
    fail(`${label}: διπλό ID.`);
  }
  ids.add(question.id);

  const promptKey = normalized(question.question);
  if (prompts.has(promptKey)) {
    fail(`${label}: υπάρχει δεύτερη ερώτηση με ίδιο κείμενο.`);
  }
  prompts.add(promptKey);

  if (!ALLOWED_TYPES.has(question.type)) {
    fail(`${label}: μη επιτρεπτός τύπος "${question.type}".`);
  }

  if (!ALLOWED_REVIEW_STATUSES.has(question.medicalReviewStatus)) {
    fail(
      `${label}: μη επιτρεπτό medicalReviewStatus ` +
        `"${question.medicalReviewStatus}".`
    );
  }

  if (typeof question.enabled !== "boolean") {
    fail(`${label}: το enabled πρέπει να είναι true ή false.`);
  }

  if (
    question.type === "multiple-choice" ||
    question.type === "true-false"
  ) {
    if (!Array.isArray(question.options) || question.options.length < 2) {
      fail(`${label}: απαιτούνται τουλάχιστον 2 επιλογές.`);
    } else {
      const optionSet = new Set(question.options.map(String));
      if (optionSet.size !== question.options.length) {
        fail(`${label}: υπάρχουν διπλές επιλογές.`);
      }

      if (!question.options.includes(question.correctAnswer)) {
        fail(
          `${label}: η correctAnswer δεν υπάρχει μέσα στις επιλογές.`
        );
      }
    }
  }

  if (question.type === "true-false") {
    const expected = new Set(["Σωστό", "Λάθος"]);
    const actual = new Set(question.options || []);
    if (
      expected.size !== actual.size ||
      [...expected].some((value) => !actual.has(value))
    ) {
      fail(`${label}: οι επιλογές true/false πρέπει να είναι Σωστό και Λάθος.`);
    }
  }

  if (question.type === "free-text") {
    if (
      !Array.isArray(question.acceptedAnswers) ||
      question.acceptedAnswers.length === 0
    ) {
      fail(`${label}: απαιτείται acceptedAnswers για free-text ερώτηση.`);
    } else if (
      !question.acceptedAnswers.some(
        (answer) => normalized(answer) === normalized(question.correctAnswer)
      )
    ) {
      fail(`${label}: η correctAnswer πρέπει να υπάρχει στα acceptedAnswers.`);
    }
  }

  if (String(question.explanation).trim().length < 8) {
    fail(`${label}: η επεξήγηση είναι υπερβολικά σύντομη.`);
  }

  if (
    question.medicalReviewStatus === "approved" &&
    !question.medicalReviewDate
  ) {
    fail(`${label}: approved ερώτηση χωρίς medicalReviewDate.`);
  }
}

if (process.exitCode) {
  console.error("\nΗ επικύρωση απέτυχε. Διόρθωσε τα παραπάνω σφάλματα.");
  process.exit(process.exitCode);
}

const active = questions.filter((q) => q.enabled).length;
const approved = questions.filter(
  (q) => q.medicalReviewStatus === "approved"
).length;
const pending = questions.filter(
  (q) => q.medicalReviewStatus === "pending-review"
).length;

console.log(`✅ ${questions.length} ερωτήσεις πέρασαν τον έλεγχο.`);
console.log(`   Ενεργές: ${active}`);
console.log(`   Approved: ${approved}`);
console.log(`   Pending review: ${pending}`);
