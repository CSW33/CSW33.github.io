async function showCitations() {
  // Scheduled commits do not trigger branch-based Pages builds. Read the
  // current snapshot from main, with the deployed copy as an offline fallback.
  const sources = [
    'https://raw.githubusercontent.com/CSW33/CSW33.github.io/main/citations.json',
    'citations.json'
  ];
  for (const source of sources) {
    try {
      const response = await fetch(source, {signal: AbortSignal.timeout(5000)});
      if (!response.ok) continue;
      const snapshot = await response.json();
      for (const row of document.querySelectorAll('[data-citation]')) {
        const entry = snapshot[row.dataset.citation];
        if (!entry || !/^W\d+$/.test(entry.id) ||
            !Number.isSafeInteger(entry.count) || entry.count < 0) continue;
        const link = document.createElement('a');
        link.href = 'https://openalex.org/works?filter=cites:' + entry.id;
        link.textContent = 'Cite by ' + entry.count;
        link.title = 'View citing works on OpenAlex';
        row.append(link);
      }
      return;
    } catch {
      // Try the next snapshot if this one is unavailable.
    }
  }
}
showCitations();
