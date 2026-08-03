(() => {
  "use strict";

  const DATA_URL = "data/questions.json";
  const BEST_SCORE_KEY = "dermaQuizBestScore";
  const VALID_TYPES = new Set(["multiple-choice", "true-false", "free-text"]);

  const state = {
    allQuestions: [],
    filteredPool: [],
    quiz: [],
    currentIndex: 0,
    score: 0,
    answered: false,
    mistakes: [],
    retryMode: false,
  };

  const elements = {};

  document.addEventListener("DOMContentLoaded", initialize);

  async function initialize() {
    cacheElements();
    bindEvents();
    updateBestScore();

    try {
      const response = await fetch(DATA_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      state.allQuestions = validateClientData(data).filter(
        (question) => question.enabled !== false
      );

      if (!state.allQuestions.length) {
        throw new Error("Δεν υπάρχουν ενεργές ερωτήσεις.");
      }

      populateBrandSelect();
      populateSectionSelect();
      updateStartScreenCounts();
      showScreen("start");
    } catch (error) {
      console.error("Quiz initialization failed:", error);
      elements.errorMessage.textContent =
        "Δεν βρέθηκε η βάση data/questions.json ή περιέχει σφάλμα. " +
        "Βεβαιώσου ότι ανέβηκαν όλα τα αρχεία και άνοιξε το GitHub Pages link.";
      showScreen("error");
    }
  }

  function cacheElements() {
    const ids = [
      "loading-screen",
      "error-screen",
      "start-screen",
      "quiz-screen",
      "result-screen",
      "error-message",
      "reload-button",
      "best-score",
      "question-bank-count",
      "brand-count",
      "review-warning",
      "brand-select",
      "section-select",
      "question-count-select",
      "start-button",
      "question-section",
      "question-counter",
      "progress-bar",
      "question-brand",
      "question-text",
      "answer-area",
      "feedback",
      "next-button",
      "score-ring",
      "score-percent",
      "result-level",
      "result-title",
      "result-message",
      "correct-count",
      "wrong-count",
      "total-count",
      "new-quiz-button",
      "retry-wrong-button",
      "mistake-review",
      "mistake-list",
    ];

    ids.forEach((id) => {
      const key = id.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      elements[key] = document.getElementById(id);
    });
  }

  function bindEvents() {
    elements.reloadButton.addEventListener("click", () => window.location.reload());
    elements.brandSelect.addEventListener("change", populateSectionSelect);
    elements.startButton.addEventListener("click", startNewQuiz);
    elements.nextButton.addEventListener("click", goToNextQuestion);
    elements.newQuizButton.addEventListener("click", returnToStart);
    elements.retryWrongButton.addEventListener("click", retryMistakes);
  }

  function validateClientData(data) {
    if (!Array.isArray(data)) {
      throw new Error("Η βάση ερωτήσεων δεν είναι πίνακας.");
    }

    const ids = new Set();

    return data.map((question, index) => {
      const required = [
        "id",
        "brand",
        "section",
        "type",
        "question",
        "correctAnswer",
        "explanation",
      ];

      required.forEach((field) => {
        if (
          question[field] === undefined ||
          question[field] === null ||
          String(question[field]).trim() === ""
        ) {
          throw new Error(`Λείπει το πεδίο ${field} στην εγγραφή ${index + 1}.`);
        }
      });

      if (ids.has(question.id)) {
        throw new Error(`Διπλό ID: ${question.id}`);
      }
      ids.add(question.id);

      if (!VALID_TYPES.has(question.type)) {
        throw new Error(`Μη έγκυρος τύπος στην ${question.id}.`);
      }

      if (
        question.type !== "free-text" &&
        (!Array.isArray(question.options) ||
          !question.options.includes(question.correctAnswer))
      ) {
        throw new Error(`Μη έγκυρες επιλογές στην ${question.id}.`);
      }

      return question;
    });
  }

  function populateBrandSelect() {
    const brands = uniqueSorted(state.allQuestions.map((q) => q.brand));
    elements.brandSelect.innerHTML = "";

    if (brands.length > 1) {
      addSelectOption(elements.brandSelect, "all", "Όλα τα brands");
    }

    brands.forEach((brand) => addSelectOption(elements.brandSelect, brand, brand));
  }

  function populateSectionSelect() {
    const selectedBrand = elements.brandSelect.value;
    const source =
      selectedBrand && selectedBrand !== "all"
        ? state.allQuestions.filter((q) => q.brand === selectedBrand)
        : state.allQuestions;

    const sections = uniqueSorted(source.map((q) => q.section));
    elements.sectionSelect.innerHTML = "";
    addSelectOption(elements.sectionSelect, "all", "Όλες οι ενότητες");
    sections.forEach((section) =>
      addSelectOption(elements.sectionSelect, section, section)
    );
  }

  function updateStartScreenCounts() {
    const active = state.allQuestions.length;
    const brands = new Set(state.allQuestions.map((q) => q.brand)).size;
    const pending = state.allQuestions.some(
      (q) => q.medicalReviewStatus !== "approved"
    );

    elements.questionBankCount.textContent = String(active);
    elements.brandCount.textContent = `${brands} ${brands === 1 ? "brand" : "brands"}`;
    elements.reviewWarning.classList.toggle("hidden", !pending);
  }

  function startNewQuiz() {
    const selectedBrand = elements.brandSelect.value;
    const selectedSection = elements.sectionSelect.value;
    const requestedCount = elements.questionCountSelect.value;

    state.filteredPool = state.allQuestions.filter((question) => {
      const brandMatch =
        selectedBrand === "all" || question.brand === selectedBrand;
      const sectionMatch =
        selectedSection === "all" || question.section === selectedSection;
      return brandMatch && sectionMatch;
    });

    if (!state.filteredPool.length) {
      showTemporaryStartError("Δεν υπάρχουν ερωτήσεις για αυτή την επιλογή.");
      return;
    }

    const count =
      requestedCount === "all"
        ? state.filteredPool.length
        : Math.min(Number(requestedCount), state.filteredPool.length);

    state.quiz = shuffle(state.filteredPool).slice(0, count);
    state.currentIndex = 0;
    state.score = 0;
    state.answered = false;
    state.mistakes = [];
    state.retryMode = false;

    showScreen("quiz");
    renderQuestion();
    scrollToTop();
  }

  function renderQuestion() {
    const question = state.quiz[state.currentIndex];
    state.answered = false;

    elements.questionSection.textContent = question.section;
    elements.questionCounter.textContent =
      `${state.currentIndex + 1} / ${state.quiz.length}`;
    elements.progressBar.style.width =
      `${(state.currentIndex / state.quiz.length) * 100}%`;
    elements.questionBrand.textContent = `${question.brand}®`;
    elements.questionText.textContent = question.question;
    elements.answerArea.innerHTML = "";
    elements.feedback.innerHTML = "";
    elements.feedback.className = "feedback hidden";
    elements.nextButton.classList.add("hidden");

    if (question.type === "free-text") {
      renderFreeText(question);
    } else {
      renderOptions(question);
    }

    const firstFocusable = elements.answerArea.querySelector("button, input");
    if (firstFocusable) {
      window.setTimeout(() => firstFocusable.focus({ preventScroll: true }), 80);
    }
  }

  function renderOptions(question) {
    const options = shuffle(question.options);

    options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-option";
      button.dataset.value = option;

      const letter = document.createElement("span");
      letter.className = "answer-letter";
      letter.setAttribute("aria-hidden", "true");
      letter.textContent = String.fromCharCode(65 + index);

      const label = document.createElement("span");
      label.textContent = option;

      button.append(letter, label);
      button.addEventListener("click", () =>
        submitOptionAnswer(question, option, button)
      );

      elements.answerArea.appendChild(button);
    });
  }

  function renderFreeText(question) {
    const form = document.createElement("form");
    form.className = "free-text-form";

    const input = document.createElement("input");
    input.className = "free-text-input";
    input.type = "text";
    input.inputMode = "text";
    input.autocomplete = "off";
    input.placeholder = "Γράψε την απάντησή σου";
    input.setAttribute("aria-label", "Η απάντησή σου");

    const button = document.createElement("button");
    button.type = "submit";
    button.className = "button button-primary";
    button.textContent = "Έλεγχος";

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitFreeTextAnswer(question, input, button);
    });

    form.append(input, button);
    elements.answerArea.appendChild(form);
  }

  function submitOptionAnswer(question, selected, selectedButton) {
    if (state.answered) {
      return;
    }

    const isCorrect = selected === question.correctAnswer;
    state.answered = true;

    elements.answerArea.querySelectorAll(".answer-option").forEach((button) => {
      button.disabled = true;
      if (button.dataset.value === question.correctAnswer) {
        button.classList.add("is-correct");
      }
    });

    if (!isCorrect) {
      selectedButton.classList.add("is-wrong");
    }

    finalizeAnswer(question, selected, isCorrect);
  }

  function submitFreeTextAnswer(question, input, button) {
    if (state.answered || !input.value.trim()) {
      return;
    }

    const selected = input.value.trim();
    const accepted = question.acceptedAnswers || [question.correctAnswer];
    const normalizedSelected = normalizeText(selected);

    const isCorrect = accepted.some((answer) => {
      const normalizedAnswer = normalizeText(answer);

      if (normalizedSelected === normalizedAnswer) {
        return true;
      }

      if (normalizedSelected.length >= 5 && normalizedAnswer.length >= 5) {
        return (
          normalizedSelected.includes(normalizedAnswer) ||
          normalizedAnswer.includes(normalizedSelected)
        );
      }

      return false;
    });

    state.answered = true;
    input.disabled = true;
    button.disabled = true;
    input.style.borderColor = isCorrect ? "#68bc8d" : "#ee9992";

    finalizeAnswer(question, selected, isCorrect);
  }

  function finalizeAnswer(question, selected, isCorrect) {
    if (isCorrect) {
      state.score += 1;
    } else {
      state.mistakes.push({
        question,
        selected,
      });
    }

    const sourceText =
      question.source && question.source !== "Source pending verification"
        ? `Πηγή: ${escapeHtml(question.source)}`
        : "Πηγή: προς επιστημονική επιβεβαίωση";

    elements.feedback.className =
      `feedback ${isCorrect ? "is-correct" : "is-wrong"}`;

    elements.feedback.innerHTML = `
      <div class="feedback-title">
        ${isCorrect ? "✓ Σωστή απάντηση" : "✕ Λανθασμένη απάντηση"}
      </div>
      ${
        isCorrect
          ? ""
          : `<div><strong>Σωστή απάντηση:</strong> ${escapeHtml(
              question.correctAnswer
            )}</div>`
      }
      <div>${escapeHtml(question.explanation)}</div>
      <div class="feedback-source">${sourceText}</div>
    `;

    elements.nextButton.textContent =
      state.currentIndex === state.quiz.length - 1
        ? "Δες το σκορ"
        : "Επόμενη ερώτηση";

    elements.nextButton.classList.remove("hidden");
    elements.progressBar.style.width =
      `${((state.currentIndex + 1) / state.quiz.length) * 100}%`;
    elements.nextButton.focus({ preventScroll: true });
  }

  function goToNextQuestion() {
    if (!state.answered) {
      return;
    }

    if (state.currentIndex < state.quiz.length - 1) {
      state.currentIndex += 1;
      renderQuestion();
      scrollToTop();
      return;
    }

    showResults();
  }

  function showResults() {
    const total = state.quiz.length;
    const percent = total ? Math.round((state.score / total) * 100) : 0;
    const result = getResultCopy(percent);

    elements.scorePercent.textContent = `${percent}%`;
    elements.scoreRing.style.background =
      `conic-gradient(var(--blue-600) ${percent * 3.6}deg, #e7ebf4 0deg)`;
    elements.resultLevel.textContent = result.level;
    elements.resultTitle.textContent = result.title;
    elements.resultMessage.textContent = result.message;
    elements.correctCount.textContent = String(state.score);
    elements.wrongCount.textContent = String(total - state.score);
    elements.totalCount.textContent = String(total);

    saveBestScore(percent);
    updateBestScore();

    elements.retryWrongButton.disabled = state.mistakes.length === 0;
    renderMistakeReview();

    showScreen("result");
    scrollToTop();
  }

  function renderMistakeReview() {
    elements.mistakeList.innerHTML = "";
    elements.mistakeReview.open = false;

    if (!state.mistakes.length) {
      elements.mistakeReview.classList.add("hidden");
      return;
    }

    state.mistakes.forEach(({ question }) => {
      const item = document.createElement("article");
      item.className = "mistake-item";

      const prompt = document.createElement("p");
      prompt.className = "mistake-question";
      prompt.textContent = question.question;

      const answer = document.createElement("p");
      answer.className = "mistake-answer";
      answer.textContent = `Σωστή απάντηση: ${question.correctAnswer}`;

      item.append(prompt, answer);
      elements.mistakeList.appendChild(item);
    });

    elements.mistakeReview.classList.remove("hidden");
  }

  function retryMistakes() {
    if (!state.mistakes.length) {
      return;
    }

    state.quiz = shuffle(state.mistakes.map((item) => item.question));
    state.currentIndex = 0;
    state.score = 0;
    state.answered = false;
    state.mistakes = [];
    state.retryMode = true;

    showScreen("quiz");
    renderQuestion();
    scrollToTop();
  }

  function returnToStart() {
    showScreen("start");
    scrollToTop();
  }

  function showScreen(name) {
    const screens = {
      loading: elements.loadingScreen,
      error: elements.errorScreen,
      start: elements.startScreen,
      quiz: elements.quizScreen,
      result: elements.resultScreen,
    };

    Object.entries(screens).forEach(([key, element]) => {
      element.classList.toggle("hidden", key !== name);
    });
  }

  function getResultCopy(percent) {
    if (percent >= 90) {
      return {
        level: "Product Expert",
        title: "Εξαιρετική επίδοση",
        message: "Πολύ ισχυρή γνώση και γρήγορη ανάκληση των βασικών στοιχείων.",
      };
    }

    if (percent >= 75) {
      return {
        level: "Very Good",
        title: "Πολύ καλή επίδοση",
        message: "Μια σύντομη επανάληψη στα λάθη θα σταθεροποιήσει τη γνώση.",
      };
    }

    if (percent >= 60) {
      return {
        level: "Needs Refresh",
        title: "Καλή βάση",
        message: "Χρειάζεται στοχευμένη επανάληψη στις ενότητες όπου υπήρχαν λάθη.",
      };
    }

    return {
      level: "Recommended Review",
      title: "Ώρα για επανάληψη",
      message: "Δες τις σωστές απαντήσεις και δοκίμασε ξανά μόνο τα λάθη.",
    };
  }

  function updateBestScore() {
    const score = safeStorageGet(BEST_SCORE_KEY);
    elements.bestScore.textContent = score ? `${score}%` : "—";
  }

  function saveBestScore(percent) {
    const current = Number(safeStorageGet(BEST_SCORE_KEY) || 0);
    if (percent > current) {
      safeStorageSet(BEST_SCORE_KEY, String(percent));
    }
  }

  function safeStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // localStorage is optional; the quiz continues without it.
    }
  }

  function normalizeText(value) {
    return String(value ?? "")
      .toLocaleLowerCase("el-GR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[≥]/g, "")
      .replace(/[+]/g, " ")
      .replace(/[\/,_().:;!?–—-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function shuffle(values) {
    const result = [...values];

    for (let index = result.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[randomIndex]] = [
        result[randomIndex],
        result[index],
      ];
    }

    return result;
  }

  function uniqueSorted(values) {
    return [...new Set(values)].sort((a, b) =>
      a.localeCompare(b, "el", { sensitivity: "base" })
    );
  }

  function addSelectOption(select, value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }

  function showTemporaryStartError(message) {
    const previous = elements.startButton.textContent;
    elements.startButton.textContent = message;
    elements.startButton.disabled = true;

    window.setTimeout(() => {
      elements.startButton.textContent = previous;
      elements.startButton.disabled = false;
    }, 2200);
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = String(value);
    return element.innerHTML;
  }
})();
