import "./style.css";
import { renderAudio } from "./audio";
import { renderChat } from "./chat";
import { renderFlashcards } from "./flashcards";
import { renderImages } from "./images";
import {
  getCompletedTopics,
  getTopicFlashcards,
  getTopicMindmap,
  getTopicNotes,
  getTopicQuestions,
  getTopics,
  markTopicCompleted,
} from "./lib/data";
import { renderMarkdown } from "./lib/markdown";
import type { TopicMeta } from "./lib/types";
import { renderMindmap } from "./mindmap";
import { renderQuiz } from "./quiz";

const app = document.querySelector<HTMLDivElement>("#app")!;

const USER_NAME_KEY = "mt-user-name";
if (!localStorage.getItem(USER_NAME_KEY)) {
  const name = prompt("¿Cómo te llamás?");
  if (name?.trim()) {
    localStorage.setItem(USER_NAME_KEY, name.trim());
  }
}

type Tab = "notes" | "flashcards" | "quiz" | "mindmap" | "images" | "audio" | "chat";
const TABS: { id: Tab; label: string }[] = [
  { id: "notes", label: "Notes" },
  { id: "flashcards", label: "Flashcards" },
  { id: "quiz", label: "Quiz" },
  { id: "mindmap", label: "Mind Map" },
  { id: "images", label: "Images" },
  { id: "audio", label: "Audio" },
  { id: "chat", label: "Ask AI" },
];

function parseHash(): { slug: string | null; tab: Tab } {
  const hash = location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/").filter(Boolean);
  if (parts[0] === "topic" && parts[1]) {
    const tab = (parts[2] as Tab) || "notes";
    return { slug: parts[1], tab: TABS.some((t) => t.id === tab) ? tab : "notes" };
  }
  return { slug: null, tab: "notes" };
}

async function render(): Promise<void> {
  const { slug, tab } = parseHash();
  if (slug) {
    await renderTopicView(slug, tab);
  } else {
    await renderDashboard();
  }
}

async function renderDashboard(): Promise<void> {
  app.innerHTML = `
    <header class="topbar">
      <h1>Therapeutic Massage</h1>
    </header>
    <p class="muted">Exam prep — one topic a day.</p>
    <div class="topic-list" id="topic-list"></div>
  `;

  const topics = await getTopics();
  const completed = await getCompletedTopics();
  const listEl = app.querySelector<HTMLElement>("#topic-list")!;

  if (topics.length === 0) {
    listEl.innerHTML = `<p class="muted">No topics yet. Send material to get started.</p>`;
    return;
  }

  listEl.innerHTML = topics
    .map((t: TopicMeta) => {
      const done = completed.has(t.slug);
      return `
        <a class="topic-row" href="#/topic/${t.slug}">
          <span>${done ? "✅ " : ""}${t.title}</span>
          <span class="status">${t.status === "demo" ? "demo" : t.status} · ${t.questionCount} questions</span>
        </a>
      `;
    })
    .join("");
}

async function renderTopicView(slug: string, tab: Tab): Promise<void> {
  const topics = await getTopics();
  const topic = topics.find((t) => t.slug === slug);

  if (!topic) {
    app.innerHTML = `<p class="muted">Topic not found. <a href="#/">Back</a></p>`;
    return;
  }

  app.innerHTML = `
    <header class="topbar">
      <div>
        <a class="muted" href="#/">&larr; Topics</a>
        <h1>${topic.title}</h1>
      </div>
      <div class="lang-toggle" id="lang-toggle"></div>
    </header>
    <div class="tabs" id="tabs"></div>
    <div id="tab-content"></div>
  `;

  const tabsEl = app.querySelector<HTMLElement>("#tabs")!;
  tabsEl.innerHTML = TABS.map(
    (t) => `<button class="btn${t.id === tab ? " active" : ""}" data-tab="${t.id}">${t.label}</button>`
  ).join("");
  tabsEl.querySelectorAll<HTMLButtonElement>("button[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      location.hash = `#/topic/${slug}/${btn.dataset.tab}`;
    });
  });

  const contentEl = app.querySelector<HTMLElement>("#tab-content")!;
  const langToggleEl = app.querySelector<HTMLElement>("#lang-toggle")!;

  if (tab === "notes") {
    const LANGS: { code: "en" | "es" | "ru"; label: string }[] = [
      { code: "en", label: "EN" },
      { code: "es", label: "ES" },
      { code: "ru", label: "RU" },
    ];
    let lang: "en" | "es" | "ru" = "en";
    const drawLangToggle = () => {
      langToggleEl.innerHTML = LANGS.map(
        (l) => `<button class="btn${lang === l.code ? " active" : ""}" data-lang="${l.code}">${l.label}</button>`
      ).join("");
      langToggleEl.querySelectorAll<HTMLButtonElement>("button[data-lang]").forEach((btn) => {
        btn.addEventListener("click", () => {
          lang = btn.dataset.lang as "en" | "es" | "ru";
          drawLangToggle();
          loadNotes();
        });
      });
    };
    const loadNotes = async () => {
      contentEl.innerHTML = `<p class="muted">Loading...</p>`;
      const md = await getTopicNotes(slug, lang);
      contentEl.innerHTML = `<div class="card notes">${renderMarkdown(md)}</div>
        <button class="btn primary" id="mark-done">Mark topic as completed</button>`;
      contentEl.querySelector<HTMLButtonElement>("#mark-done")?.addEventListener("click", () => {
        markTopicCompleted(slug);
        contentEl.querySelector<HTMLButtonElement>("#mark-done")!.textContent = "✅ Completed";
      });
    };
    drawLangToggle();
    await loadNotes();
  } else {
    langToggleEl.innerHTML = "";
    if (tab === "flashcards") {
      const cards = await getTopicFlashcards(slug);
      renderFlashcards(contentEl, cards);
    } else if (tab === "quiz") {
      const questions = await getTopicQuestions(slug);
      renderQuiz(contentEl, slug, questions);
    } else if (tab === "mindmap") {
      const md = await getTopicMindmap(slug);
      renderMindmap(contentEl, md);
    } else if (tab === "images") {
      await renderImages(contentEl, slug, topic.hasImages);
    } else if (tab === "audio") {
      renderAudio(contentEl, slug, topic.hasAudio);
    } else if (tab === "chat") {
      renderChat(contentEl, slug, topic.title);
    }
  }
}

window.addEventListener("hashchange", render);
render();
