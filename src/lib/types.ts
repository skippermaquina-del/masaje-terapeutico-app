export interface TopicMeta {
  slug: string;
  title: string;
  titleEs: string;
  status: "demo" | "ready" | "draft";
  date: string | null;
  questionCount: number;
  hasAudio: boolean;
  hasImages: boolean;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface Question {
  q: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface QuizResult {
  slug: string;
  date: string;
  score: number;
  total: number;
}

export interface ImageCredit {
  file: string;
  title: string;
  source: string;
  author: string;
  license: string;
}
