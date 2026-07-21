import { withBase } from "./lib/data";

export function renderAudioPlayer(slug: string, hasAudio: boolean): string {
  if (!hasAudio) {
    return "";
  }

  const src = withBase(`audio/${slug}.mp3`);
  return `
    <div class="card audio-inline">
      <p class="muted">English narration of this topic — listen while you read, or download it for the road.</p>
      <audio controls src="${src}"></audio>
      <p style="margin-top:0.6rem"><a class="btn" href="${src}" download>Download MP3</a></p>
    </div>
  `;
}
