import type { Flashcard, ImageCredit, Question, QuizResult, TopicMeta } from "./types";

const base = import.meta.env.BASE_URL;

export function withBase(path: string): string {
  return `${base}${path}`.replace(/\/{2,}/g, "/");
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(withBase(path));
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

async function fetchText(path: string): Promise<string> {
  const res = await fetch(withBase(path));
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.text();
}

export function getTopics(): Promise<TopicMeta[]> {
  return fetchJson<TopicMeta[]>("data/topics.json");
}

export function getTopicNotes(slug: string, lang: "en" | "es"): Promise<string> {
  return fetchText(`content/${slug}/${lang}.md`);
}

export function getTopicMindmap(slug: string): Promise<string> {
  return fetchText(`content/${slug}/mindmap.md`);
}

export function getTopicFlashcards(slug: string): Promise<Flashcard[]> {
  return fetchJson<Flashcard[]>(`content/${slug}/flashcards.json`);
}

export function getTopicQuestions(slug: string): Promise<Question[]> {
  return fetchJson<Question[]>(`content/${slug}/questions.json`);
}

export async function getTopicImageCredits(slug: string): Promise<ImageCredit[]> {
  try {
    return await fetchJson<ImageCredit[]>(`content/${slug}/images/credits.json`);
  } catch {
    return [];
  }
}

// --- localStorage progress tracking ---

const PROGRESS_KEY = "mt-progress";
const RESULTS_KEY = "mt-quiz-results";

export function getCompletedTopics(): Set<string> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function markTopicCompleted(slug: string): void {
  const done = getCompletedTopics();
  done.add(slug);
  localStorage.setItem(PROGRESS_KEY, JSON.stringify([...done]));
}

export function getQuizResults(): QuizResult[] {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    return raw ? (JSON.parse(raw) as QuizResult[]) : [];
  } catch {
    return [];
  }
}

export function saveQuizResult(result: QuizResult): void {
  const results = getQuizResults();
  results.push(result);
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
}

export function getBestQuizResult(slug: string): QuizResult | null {
  const results = getQuizResults().filter((r) => r.slug === slug);
  if (results.length === 0) return null;
  return results.reduce((best, r) => (r.score > best.score ? r : best));
}
