import { getTopicNotes } from "./lib/data";
import { renderMarkdown } from "./lib/markdown";
import { supabase } from "./lib/supabase";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function renderChat(container: HTMLElement, slug: string, topicTitle: string): void {
  if (!supabase) {
    container.innerHTML = `
      <p class="muted">
        AI chat isn't configured for this deployment (missing Supabase connection).
      </p>
    `;
    return;
  }

  const history: ChatMessage[] = [];
  let notesContext = "";
  let sending = false;

  container.innerHTML = `
    <div class="card chat-card">
      <div class="chat-log" id="chat-log">
        <p class="muted">Ask anything about this topic — the assistant has your notes as context.</p>
      </div>
      <form class="chat-form" id="chat-form">
        <input type="text" id="chat-input" placeholder="Ask a question..." autocomplete="off" />
        <button type="submit" class="btn primary" id="chat-send">Send</button>
      </form>
    </div>
  `;

  const logEl = container.querySelector<HTMLDivElement>("#chat-log")!;
  const formEl = container.querySelector<HTMLFormElement>("#chat-form")!;
  const inputEl = container.querySelector<HTMLInputElement>("#chat-input")!;
  const sendBtn = container.querySelector<HTMLButtonElement>("#chat-send")!;

  function appendMessage(role: "user" | "assistant" | "error", text: string): void {
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble chat-bubble-${role}`;
    if (role === "assistant") {
      bubble.innerHTML = renderMarkdown(text);
    } else {
      bubble.textContent = text;
    }
    logEl.appendChild(bubble);
    logEl.scrollTop = logEl.scrollHeight;
  }

  getTopicNotes(slug, "en")
    .then((md) => {
      notesContext = md;
    })
    .catch(() => {
      notesContext = "";
    });

  formEl.addEventListener("submit", async (e) => {
    e.preventDefault();
    const question = inputEl.value.trim();
    if (!question || sending) return;

    inputEl.value = "";
    appendMessage("user", question);
    history.push({ role: "user", content: question });

    sending = true;
    sendBtn.disabled = true;
    sendBtn.textContent = "...";

    try {
      const { data, error } = await supabase!.functions.invoke("ai-chat", {
        body: { topicTitle, notesContext, messages: history },
      });
      if (error) throw error;
      const reply = data?.reply || "(no response)";
      appendMessage("assistant", reply);
      history.push({ role: "assistant", content: reply });
    } catch {
      appendMessage("error", "Couldn't reach the AI assistant. Try again in a moment.");
    } finally {
      sending = false;
      sendBtn.disabled = false;
      sendBtn.textContent = "Send";
      inputEl.focus();
    }
  });
}
