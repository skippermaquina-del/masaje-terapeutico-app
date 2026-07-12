import { getAllProgress, getTopics } from "./lib/data";

export async function renderProgressDashboard(container: HTMLElement): Promise<void> {
  container.innerHTML = `<p class="muted">Loading...</p>`;

  const [rows, topics] = await Promise.all([getAllProgress(), getTopics()]);

  if (rows.length === 0) {
    container.innerHTML = `<p class="muted">No progress data yet — it'll show up here once someone studies a topic.</p>`;
    return;
  }

  const titleBySlug = new Map(topics.map((t) => [t.slug, t.title]));
  const totalTopics = topics.length;

  const byUser = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byUser.get(row.userName) ?? [];
    list.push(row);
    byUser.set(row.userName, list);
  }

  const users = [...byUser.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  container.innerHTML = users
    .map(([userName, userRows]) => {
      const completedCount = userRows.filter((r) => r.completed).length;
      const lastActive = userRows.reduce((latest, r) => (r.updatedAt > latest ? r.updatedAt : latest), "");
      const lastActiveLabel = lastActive
        ? new Date(lastActive).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
        : "—";

      const topicRows = [...userRows]
        .sort((a, b) => (titleBySlug.get(a.topicSlug) ?? a.topicSlug).localeCompare(titleBySlug.get(b.topicSlug) ?? b.topicSlug))
        .map((r) => {
          const title = titleBySlug.get(r.topicSlug) ?? r.topicSlug;
          const quiz = r.quizScore != null && r.quizTotal != null ? `${r.quizScore}/${r.quizTotal}` : "—";
          return `
            <tr>
              <td>${r.completed ? "✅" : ""} ${title}</td>
              <td>${quiz}</td>
            </tr>
          `;
        })
        .join("");

      return `
        <div class="card">
          <h2 style="margin-top:0">${userName}</h2>
          <p class="muted">${completedCount}/${totalTopics} topics completed &middot; last active ${lastActiveLabel}</p>
          <table class="progress-table">
            <thead><tr><th>Topic</th><th>Best quiz score</th></tr></thead>
            <tbody>${topicRows}</tbody>
          </table>
        </div>
      `;
    })
    .join("");
}
