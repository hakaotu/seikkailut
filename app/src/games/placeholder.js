// Stands in for all three games until SEI-2 – SEI-4 replace it, one game at a time.
// Implements the game contract (see registry.js) with no game logic.
// Never reports progress.

export function placeholder({ question, area, hint, sample }) {
  return {
    create(ctx) {
      const q = document.createElement('div');
      q.className = 'placeholder-question';
      q.textContent = question;
      ctx.question.append(q);

      const box = document.createElement('div');
      box.className = 'placeholder-area';
      const title = document.createElement('span');
      title.textContent = area;
      const small = document.createElement('small');
      small.textContent = hint;
      box.append(title, small);
      ctx.root.append(box);

      const listen = () => ctx.speech.say(sample);
      return {
        show({ autoRead }) {
          if (autoRead) listen();
        },
        hide() {},
        listen,
      };
    },
  };
}
