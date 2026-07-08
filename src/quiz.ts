import { saveQuizResult } from "./lib/data";
import type { Question } from "./lib/types";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function renderQuiz(container: HTMLElement, slug: string, questions: Question[]): void {
  if (questions.length === 0) {
    container.innerHTML = `<p class="muted">No questions yet for this topic.</p>`;
    return;
  }

  const order = shuffle(questions.map((_, i) => i));
  let pos = 0;
  let correctCount = 0;
  let answered = false;

  function drawQuestion(): void {
    const q = questions[order[pos]];
    container.innerHTML = `
      <div class="quiz-progress">Question ${pos + 1} of ${order.length} &middot; Correct: ${correctCount}</div>
      <div class="card">
        <div class="quiz-question">${q.q}</div>
        <div class="quiz-options" id="quiz-options"></div>
        <div class="quiz-explanation" id="quiz-explanation" style="display:none"></div>
      </div>
      <div class="flash-nav">
        <button class="btn" id="quiz-next" disabled>Next &rarr;</button>
      </div>
    `;

    const optionsEl = container.querySelector<HTMLElement>("#quiz-options")!;
    q.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "quiz-option";
      btn.textContent = opt;
      btn.addEventListener("click", () => selectAnswer(i));
      optionsEl.appendChild(btn);
    });

    container.querySelector<HTMLButtonElement>("#quiz-next")!.addEventListener("click", next);
  }

  function selectAnswer(i: number): void {
    if (answered) return;
    answered = true;
    const q = questions[order[pos]];
    const buttons = container.querySelectorAll<HTMLButtonElement>(".quiz-option");
    buttons.forEach((b, idx) => {
      b.disabled = true;
      if (idx === q.answer) b.classList.add("correct");
      else if (idx === i) b.classList.add("incorrect");
    });
    if (i === q.answer) correctCount++;

    const explEl = container.querySelector<HTMLElement>("#quiz-explanation")!;
    explEl.style.display = "block";
    explEl.textContent = q.explanation;

    container.querySelector<HTMLButtonElement>("#quiz-next")!.disabled = false;
  }

  function next(): void {
    pos++;
    answered = false;
    if (pos >= order.length) {
      finish();
    } else {
      drawQuestion();
    }
  }

  function finish(): void {
    saveQuizResult({
      slug,
      date: new Date().toISOString(),
      score: correctCount,
      total: order.length,
    });
    const pct = Math.round((correctCount / order.length) * 100);
    container.innerHTML = `
      <div class="card">
        <h3>Score: ${correctCount} / ${order.length} (${pct}%)</h3>
        <p class="muted">${pct >= 80 ? "Great job! You've got this topic down." : "Review the notes and flashcards, then try again."}</p>
      </div>
      <div class="flash-nav">
        <button class="btn primary" id="quiz-retry">Retry Quiz</button>
      </div>
    `;
    container.querySelector<HTMLButtonElement>("#quiz-retry")!.addEventListener("click", () => {
      renderQuiz(container, slug, questions);
    });
  }

  drawQuestion();
}
