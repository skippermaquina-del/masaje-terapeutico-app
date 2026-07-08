import type { Flashcard } from "./lib/types";

export function renderFlashcards(container: HTMLElement, cards: Flashcard[]): void {
  if (cards.length === 0) {
    container.innerHTML = `<p class="muted">No flashcards yet for this topic.</p>`;
    return;
  }

  let index = 0;
  let showingBack = false;

  function draw(): void {
    const card = cards[index];
    container.innerHTML = `
      <div class="card flashcard-wrap">
        <span class="label">${showingBack ? "Answer" : "Question"} · ${index + 1}/${cards.length}</span>
        <div class="flashcard" id="flip-target">${showingBack ? card.back : card.front}</div>
      </div>
      <div class="flash-nav">
        <button class="btn" id="prev-card">&larr; Prev</button>
        <button class="btn" id="flip-card">Flip</button>
        <button class="btn" id="next-card">Next &rarr;</button>
      </div>
    `;

    container.querySelector<HTMLElement>("#flip-target")?.addEventListener("click", flip);
    container.querySelector<HTMLButtonElement>("#flip-card")?.addEventListener("click", flip);
    container.querySelector<HTMLButtonElement>("#prev-card")?.addEventListener("click", () => {
      index = (index - 1 + cards.length) % cards.length;
      showingBack = false;
      draw();
    });
    container.querySelector<HTMLButtonElement>("#next-card")?.addEventListener("click", () => {
      index = (index + 1) % cards.length;
      showingBack = false;
      draw();
    });
  }

  function flip(): void {
    showingBack = !showingBack;
    draw();
  }

  draw();
}
