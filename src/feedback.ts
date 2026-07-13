import { submitFeedback } from "./lib/data";

export function renderFeedbackWidget(container: HTMLElement, pageContext: string): void {
  container.innerHTML = `
    <details class="feedback-widget">
      <summary>💬 Send feedback or suggestions</summary>
      <form id="feedback-form">
        <textarea id="feedback-message" placeholder="What's working, what's not, what would you like to see..." rows="3"></textarea>
        <button type="submit" class="btn primary" id="feedback-submit">Send</button>
        <span class="muted" id="feedback-status"></span>
      </form>
    </details>
  `;

  const formEl = container.querySelector<HTMLFormElement>("#feedback-form")!;
  const textEl = container.querySelector<HTMLTextAreaElement>("#feedback-message")!;
  const submitBtn = container.querySelector<HTMLButtonElement>("#feedback-submit")!;
  const statusEl = container.querySelector<HTMLElement>("#feedback-status")!;

  formEl.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = textEl.value.trim();
    if (!message) return;

    submitBtn.disabled = true;
    statusEl.textContent = "Sending...";

    const ok = await submitFeedback(message, pageContext);
    if (ok) {
      textEl.value = "";
      statusEl.textContent = "Thanks! Sent.";
    } else {
      statusEl.textContent = "Couldn't send — try again later.";
    }
    submitBtn.disabled = false;
    setTimeout(() => {
      statusEl.textContent = "";
    }, 4000);
  });
}
