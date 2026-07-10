import { getTopicImageCredits, withBase } from "./lib/data";

export async function renderImages(container: HTMLElement, slug: string, hasImages: boolean): Promise<void> {
  if (!hasImages) {
    container.innerHTML = `<p class="muted">No images added yet for this topic.</p>`;
    return;
  }

  container.innerHTML = `<p class="muted">Loading...</p>`;
  const credits = await getTopicImageCredits(slug);

  if (credits.length === 0) {
    container.innerHTML = `<p class="muted">No images added yet for this topic.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="image-gallery">
      ${credits
        .map(
          (c) => `
        <figure class="card image-card">
          <img src="${withBase(`content/${slug}/images/${c.file}`)}" alt="${c.title}" loading="lazy" />
          <figcaption>
            <div>${c.title}</div>
            <div class="muted">${c.author} &middot; ${c.license} &middot; <a href="${c.source}" target="_blank" rel="noopener">source</a></div>
          </figcaption>
        </figure>
      `
        )
        .join("")}
    </div>
  `;
}
