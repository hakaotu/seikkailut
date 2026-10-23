// Entry point. boot() wires the shell; the bottom of the file calls it with the real
// game registry and the real speech service.

import { createShell } from './shell.js';
import { createSpeech } from './speech.js';
import { GAMES } from './games/registry.js';

export function boot({ games, document, window, speech }) {
  const shell = createShell({ games, document, window, speech });
  shell.start();
  // iPad Safari shows :active only if the page listens for touchstart.
  document.addEventListener('touchstart', () => {}, { passive: true });
  // Last: the boot-error block in index.html stays hidden only once this is set.
  document.documentElement.dataset.booted = '';
  return shell;
}

if (typeof document !== 'undefined') {
  boot({
    games: GAMES,
    document,
    window,
    speech: createSpeech({
      synth: window.speechSynthesis,
      Utterance: window.SpeechSynthesisUtterance,
    }),
  });
}
