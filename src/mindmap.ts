import { Transformer } from "markmap-lib";
import { Markmap } from "markmap-view";

const transformer = new Transformer();

export function renderMindmap(container: HTMLElement, markdown: string): void {
  if (!markdown.trim()) {
    container.innerHTML = `<p class="muted">No mind map yet for this topic.</p>`;
    return;
  }

  container.innerHTML = `<svg class="mindmap-svg" id="mindmap-svg"></svg>`;
  const svg = container.querySelector<SVGSVGElement>("#mindmap-svg")!;

  const { root } = transformer.transform(markdown);
  const mm = Markmap.create(svg, undefined, root);
  requestAnimationFrame(() => mm.fit());
}
