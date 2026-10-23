// Served in place of app/src/games/registry.js by tests (see helpers.mjs useFakeRegistry).
import { fakeGame } from './fake-game.js';

export const GAMES = [
  { id: 'matikka', name: 'Matikka', lang: 'fi-FI', listenLabel: 'Kuuntele lasku', module: fakeGame('matikka') },
  { id: 'sanat', name: 'Sanat', lang: 'fi-FI', listenLabel: 'Kuuntele sana', module: fakeGame('sanat') },
  { id: 'espanja', name: 'Espanja', lang: 'es-ES', listenLabel: 'Kuuntele', module: fakeGame('espanja') },
];
