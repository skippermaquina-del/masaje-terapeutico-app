import { withBase } from "./lib/data";

export function renderAudio(container: HTMLElement, slug: string, hasAudio: boolean): void {
  if (!hasAudio) {
    container.innerHTML = `
      <p class="muted">
        No audio generated yet for this topic. It can be generated with
        <code>scripts/generate-audio.ps1</code> from the English notes.
      </p>
    `;
    return;
  }

  const src = withBase(`audio/${slug}.mp3`);
  container.innerHTML = `
    <div class="card">
      <p class="muted">English narration of this topic — download it to listen while driving.</p>
      <audio controls src="${src}"></audio>
      <p style="margin-top:0.6rem"><a class="btn" href="${src}" download>Download MP3</a></p>
    </div>
  `;
}
