/**
 * publications.js — single source of truth for all publication cards.
 *
 * To add a paper:
 *   1. Create components/publications/pub-N.html
 *   2. Add an entry here with its date (YYYY-MM-DD)
 *   3. Nothing else — both pages pick it up automatically.
 *
 * Adjust RECENT_COUNT to change how many appear on the index page.
 */

const RECENT_COUNT = 2; // ← change this to show more/fewer on the home page

const PUBLICATIONS = [
  { file: 'components/publications/pub-2.html', date: '2026-06-02' },
  { file: 'components/publications/pub-1.html', date: '2025-12-26' },
  // { file: 'components/publications/pub-3.html', date: '2025-03-20' },
];

/**
 * Fetch and render publication cards into a container element.
 *
 * @param {string} containerId  - ID of the target <div>
 * @param {number} [limit]      - Max cards to show. Omit (or pass Infinity) for all.
 */
async function loadPublications(containerId, limit = Infinity) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Sort newest → oldest, then take the requested slice
  const sorted = [...PUBLICATIONS].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
  const toLoad = Number.isFinite(limit) ? sorted.slice(0, limit) : sorted;

  container.innerHTML = '';

  // Fetch all in parallel, then insert in order
  try {
    const htmlChunks = await Promise.all(
      toLoad.map(pub =>
        fetch(pub.file)
          .then(r => {
            if (!r.ok) throw new Error(`Failed to load ${pub.file}`);
            return r.text();
          })
      )
    );
    container.innerHTML = htmlChunks.join('');
  } catch (err) {
    console.error('Error loading publications:', err);
    container.innerHTML = '<p class="text-zinc-400 text-center py-8">Could not load publications.</p>';
  }
}