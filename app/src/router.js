// Pure routing helpers, no DOM. Hashes: #/ , #/matikka , #/sanat , #/espanja.

const HOME = { view: 'home' };

export function parseRoute(hash, knownIds) {
  const m = /^#\/([^/]+)$/.exec(hash || '');
  if (m && knownIds.includes(m[1])) return { view: 'game', id: m[1] };
  return { ...HOME };
}

export function routeToHash(route) {
  return route.view === 'game' ? `#/${route.id}` : '#/';
}

export function titleFor(route, games) {
  if (route.view === 'game') {
    const game = games.find((g) => g.id === route.id);
    if (game) return `${game.name} – Seikkailut`;
  }
  return 'Seikkailut';
}
