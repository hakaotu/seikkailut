// A game that reports progress and exposes window.__fake[id] to the tests.
// window.__failCreate = { matikka: true } makes create() throw for that game.
export function fakeGame(id) {
  return {
    create(ctx) {
      window.__fake ??= {};
      const fake = (window.__fake[id] ??= { creates: 0, shows: [], hides: 0 });
      fake.creates += 1;
      if (window.__failCreate && window.__failCreate[id]) throw new Error(`fake ${id} failed to open`);

      fake.done = 0;
      fake.finished = false;
      const report = () => ctx.reportProgress({ done: fake.done, total: 10, finished: fake.finished });

      fake.answer = () => {
        fake.done += 1;
        report();
      };
      // A reading the game starts by itself. Called from page.evaluate, which runs outside any
      // listener, so the fake speech records it as not from a tap (docs/plans/sei-3.md D2).
      fake.sayAuto = () => ctx.speech.say([{ text: id }], { auto: true });
      fake.finish = () => {
        fake.finished = true;
        report();
      };

      const mk = (label, fn) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.style.cssText = 'min-width:56px;min-height:56px;margin:0 12px 12px 0;font-size:20px';
        b.addEventListener('click', fn);
        ctx.root.append(b);
        return b;
      };
      report(); // a new round reports done: 0
      mk('Vastaa', fake.answer);
      mk('Valmis', fake.finish);
      ctx.question.textContent = `Kysymys ${id}`;

      const listen = () => ctx.speech.say([{ text: id }]);
      return {
        show({ autoRead }) {
          fake.shows.push(autoRead);
          if (autoRead) listen();
        },
        hide() {
          fake.hides += 1;
        },
        listen,
      };
    },
  };
}
