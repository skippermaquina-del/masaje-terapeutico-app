import { supabase } from "./supabase";
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

// --- progress tracking: localStorage is the source of truth for offline use;
// Supabase is synced in the background (writes) and preferred on read when reachable. ---

const PROGRESS_KEY = "mt-progress";
const RESULTS_KEY = "mt-quiz-results";
const USER_NAME_KEY = "mt-user-name";

function getUserName(): string | null {
  return localStorage.getItem(USER_NAME_KEY);
}

function readLocalCompleted(): Set<string> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function readLocalResults(): QuizResult[] {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    return raw ? (JSON.parse(raw) as QuizResult[]) : [];
  } catch {
    return [];
  }
}

// Fire-and-forget upsert — local write already happened, so a failed/slow
// network call here must never surface to the caller or block the UI.
async function upsertProgress(payload: Record<string, unknown>): Promise<void> {
  if (!supabase) return;
  const userName = getUserName();
  if (!userName) return;
  try {
    await supabase
      .from("progress")
      .upsert({ user_name: userName, ...payload }, { onConflict: "user_name,topic_slug" });
  } catch {
    // offline or unreachable — local write already succeeded, nothing to do
  }
}

export async function getCompletedTopics(): Promise<Set<string>> {
  const userName = getUserName();
  if (supabase && userName) {
    try {
      const { data, error } = await supabase
        .from("progress")
        .select("topic_slug")
        .eq("user_name", userName)
        .eq("completed", true);
      if (!error && data) return new Set(data.map((r) => r.topic_slug as string));
    } catch {
      // offline or unreachable — fall back to localStorage below
    }
  }
  return readLocalCompleted();
}

export function markTopicCompleted(slug: string): void {
  const done = readLocalCompleted();
  done.add(slug);
  localStorage.setItem(PROGRESS_KEY, JSON.stringify([...done]));

  upsertProgress({ topic_slug: slug, completed: true, updated_at: new Date().toISOString() });
}

// Remote only keeps one row per (user_name, topic_slug), i.e. the latest
// attempt — unlike localStorage, which keeps every attempt ever made.
export async function getQuizResults(): Promise<QuizResult[]> {
  const userName = getUserName();
  if (supabase && userName) {
    try {
      const { data, error } = await supabase
        .from("progress")
        .select("topic_slug, quiz_score, quiz_total, updated_at")
        .eq("user_name", userName)
        .not("quiz_score", "is", null);
      if (!error && data) {
        return data.map((r) => ({
          slug: r.topic_slug as string,
          date: r.updated_at as string,
          score: r.quiz_score as number,
          total: r.quiz_total as number,
        }));
      }
    } catch {
      // offline or unreachable — fall back to localStorage below
    }
  }
  return readLocalResults();
}

export function saveQuizResult(result: QuizResult): void {
  const results = readLocalResults();
  results.push(result);
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));

  upsertProgress({
    topic_slug: result.slug,
    quiz_score: result.score,
    quiz_total: result.total,
    updated_at: result.date,
  });
}

export async function getBestQuizResult(slug: string): Promise<QuizResult | null> {
  const results = (await getQuizResults()).filter((r) => r.slug === slug);
  if (results.length === 0) return null;
  return results.reduce((best, r) => (r.score > best.score ? r : best));
}
