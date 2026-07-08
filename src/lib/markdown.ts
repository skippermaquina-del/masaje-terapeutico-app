import { marked } from "marked";

marked.setOptions({ breaks: false });

export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string;
}
