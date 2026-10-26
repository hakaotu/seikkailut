// Automatic advance (SEI-46, SEI-47). Design: docs/design/sei-46.md. One controller for every game,
// so the games wait the same time and end the wait for the same reasons.
//
// The game decides when the wait starts (in the handler that makes an answer right) and what
// "advance" means (its own Seuraava function). The controller owns the timer, the button's
// look while waiting (the `aa-counting` class, styled in app.css) and the two document listeners
// that end the wait. Those listeners exist only while a wait runs, so registry.js rule 2 holds.
//
// Nothing here touches `document` at import, so Node can import it.

export const AUTO_ADVANCE_MS = 4000;

const escapeAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// The fill layer and the reduced-motion ticks, to be put inside the game's Seuraava button once.
// The label is generated content (data-label), not a text node, so the button's text and
// accessible name stay what they were.
export function fillMarkup(label, iconSvg) {
  return (
    `<span class="aa-fill" aria-hidden="true" data-label="${escapeAttr(label)}">${iconSvg}</span>` +
    '<span class="aa-ticks" aria-hidden="true"><i></i><i></i><i></i></span>'
  );
}

export function createAutoAdvance({
  button,
  onAdvance,
  delayMs = AUTO_ADVANCE_MS,
  doc = globalThis.document,
  setTimer = (...args) => globalThis.setTimeout(...args),
  clearTimer = (...args) => globalThis.clearTimeout(...args),
}) {
  let timer = null;

  // Focus moving to anything but the waiting button means someone is exploring the screen
  // (Tab, Selvä, Kuuntele). The game's own focus on the button does not end the wait.
  function onFocusIn(e) {
    if (e.target !== button) cancel();
  }

  function onVisibility() {
    if (doc.visibilityState === 'hidden') cancel();
  }

  function cancel() {
    if (timer !== null) clearTimer(timer);
    timer = null;
    button.classList.remove('aa-counting');
    doc.removeEventListener('focusin', onFocusIn);
    doc.removeEventListener('visibilitychange', onVisibility);
  }

  function start() {
    cancel();
    button.style.setProperty('--aa-ms', `${delayMs}ms`);
    // Reading the width makes the browser apply the removal above, so the CSS animation restarts.
    button.classList.remove('aa-counting');
    void button.offsetWidth;
    button.classList.add('aa-counting');
    doc.addEventListener('focusin', onFocusIn);
    doc.addEventListener('visibilitychange', onVisibility);
    timer = setTimer(() => {
      // Cancel first: onAdvance moves focus to the new item, and the listener must be gone by then.
      cancel();
      onAdvance();
    }, delayMs);
  }

  return { start, cancel, running: () => timer !== null };
}
