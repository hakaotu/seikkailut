import { test, expect } from '@playwright/test';
import { installFakeSpeech, useFakeRegistry, press, speakCalls, GAME_IDS } from './helpers.mjs';

const ADULT = {
  unsupported: 'tämä selain ei osaa lukea ääneen',
  fi: 'puuttuu suomen puheääni',
  es: 'puuttuu espanjan puheääni',
};

const view = (page, id) => page.locator(`.game-view[data-game="${id}"]`);
const listen = (page, id) => view(page, id).locator('.listen');

// ---- (a) no speechSynthesis, (b) only an English voice ----

for (const [label, opts, kind] of [
  ['(a) no speech support', { mode: 'absent' }, 'unsupported'],
  ['(b) only an English voice', { voices: ['en-US'] }, null],
]) {
  for (const id of GAME_IDS) {
    test(`${label}: ${id} shows Ei ääntä and the adult line when opened`, async ({ page }, testInfo) => {
      await installFakeSpeech(page, opts);
      await page.goto('/');
      await press(page.locator(`button.game-card[data-game="${id}"]`), testInfo);
      const expected = kind || (id === 'espanja' ? 'es' : 'fi');
      await expect(view(page, id).locator('.notice')).toBeVisible();
      await expect(view(page, id).locator('.notice')).toContainText('Ääni ei toimi nyt.');
      await expect(view(page, id).locator('.notice')).toContainText('Voit pelata ilman ääntä.');
      await expect(view(page, id).locator('.notice')).toContainText(ADULT[expected]);
      await expect(listen(page, id)).toContainText('Ei ääntä');
      await expect(listen(page, id)).toHaveAccessibleName(/^Ei ääntä\. Kuuntele/);
      // no wrong-language reading, no speak call at all
      expect(await speakCalls(page).catch(() => [])).toEqual([]);

      // everything stays enabled
      await expect(listen(page, id)).toBeEnabled();
      await expect(page.getByRole('button', { name: 'Etusivu' })).toBeEnabled();
      await expect(view(page, id).locator('.ok-btn')).toBeEnabled();

      // Selvä closes the notice and focuses Kuuntele, which stays Ei ääntä
      await press(view(page, id).locator('.ok-btn'), testInfo);
      await expect(view(page, id).locator('.notice')).toBeHidden();
      await expect(listen(page, id)).toBeFocused();
      await expect(listen(page, id)).toContainText('Ei ääntä');

      // tapping it again re-shows the notice
      await press(listen(page, id), testInfo);
      await expect(view(page, id).locator('.notice')).toBeVisible();
    });
  }
}

test('the automatic notice comes once per language per session', async ({ page }, testInfo) => {
  await installFakeSpeech(page, { voices: ['en-US'] });
  await page.goto('/');
  await press(page.locator('button.game-card[data-game="matikka"]'), testInfo);
  await expect(view(page, 'matikka').locator('.notice')).toBeVisible();
  await press(view(page, 'matikka').locator('.ok-btn'), testInfo);
  await press(page.getByRole('button', { name: 'Etusivu' }), testInfo);
  // Sanat is also Finnish: no automatic notice, but the button says Ei ääntä
  await press(page.locator('button.game-card[data-game="sanat"]'), testInfo);
  await expect(listen(page, 'sanat')).toContainText('Ei ääntä');
  await expect(view(page, 'sanat').locator('.notice')).toBeHidden();
  await press(page.getByRole('button', { name: 'Etusivu' }), testInfo);
  // Spanish is another language: notice again
  await press(page.locator('button.game-card[data-game="espanja"]'), testInfo);
  await expect(view(page, 'espanja').locator('.notice')).toBeVisible();
});

test('(b) a language voice that appears later returns the button to ready', async ({ page }, testInfo) => {
  await installFakeSpeech(page, { voices: ['en-US'] });
  await page.goto('/');
  await press(page.locator('button.game-card[data-game="sanat"]'), testInfo);
  await expect(listen(page, 'sanat')).toContainText('Ei ääntä');
  await page.evaluate(() => window.__setVoices(['en-US', 'fi-FI']));
  await expect(listen(page, 'sanat')).toContainText('Kuuntele sana');
  await expect(listen(page, 'sanat')).toHaveAttribute('data-state', 'ready');
  await expect(view(page, 'sanat').locator('.notice')).toBeHidden();
});

// ---- (c) speak accepted but onstart never fires, (d) onstart but onend never ----

async function pausedAt(page, url) {
  await page.clock.install({ time: 0 });
  await page.goto(url);
  await page.clock.pauseAt(1000);
}

test('(c) speech that never starts: Ei ääntä at 2 s, never disabled', async ({ page }, testInfo) => {
  await installFakeSpeech(page, { mode: 'nostart' });
  await pausedAt(page, '/#/sanat');
  await expect(view(page, 'sanat').locator('.notice')).toBeHidden();
  await press(listen(page, 'sanat'), testInfo);
  // part 1 never starts, so it never ends and part 2 is never spoken
  expect((await speakCalls(page)).length).toBe(1);
  await expect(listen(page, 'sanat')).toBeEnabled();

  await page.clock.runFor(1900);
  await expect(listen(page, 'sanat')).toHaveAttribute('data-state', 'ready');
  await page.clock.runFor(200);
  await expect(listen(page, 'sanat')).toHaveAttribute('data-state', 'novoice');
  await expect(listen(page, 'sanat')).toContainText('Ei ääntä');
  await expect(view(page, 'sanat').locator('.notice')).toBeVisible();
  await expect(listen(page, 'sanat')).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Etusivu' })).toBeEnabled();
  await expect(view(page, 'sanat').locator('.ok-btn')).toBeEnabled();

  // tapping in Ei ääntä tries speaking again
  await press(view(page, 'sanat').locator('.ok-btn'), testInfo);
  await press(listen(page, 'sanat'), testInfo);
  expect((await speakCalls(page)).length).toBe(2);
});

test('(d) speech that never ends: button back to ready at 12 s', async ({ page }, testInfo) => {
  await installFakeSpeech(page, { mode: 'noend' });
  await pausedAt(page, '/#/matikka');
  await press(listen(page, 'matikka'), testInfo);
  await page.clock.runFor(100);
  await expect(listen(page, 'matikka')).toHaveAttribute('data-state', 'playing');
  await expect(listen(page, 'matikka')).toBeEnabled();
  await page.clock.runFor(11000);
  await expect(listen(page, 'matikka')).toHaveAttribute('data-state', 'playing');
  await page.clock.runFor(1500);
  await expect(listen(page, 'matikka')).toHaveAttribute('data-state', 'ready');
  await expect(view(page, 'matikka').locator('.notice')).toBeHidden();
});

// ---- a whole round while speech is stuck ----

for (const mode of ['nostart', 'noend']) {
  test(`a round plays to the end while speech is stuck (${mode})`, async ({ page }, testInfo) => {
    await installFakeSpeech(page, { mode });
    await useFakeRegistry(page);
    await page.goto('/');
    await press(page.locator('button.game-card[data-game="matikka"]'), testInfo);
    const v = view(page, 'matikka');
    await press(listen(page, 'matikka'), testInfo);
    for (let i = 0; i < 10; i++) {
      await press(v.getByRole('button', { name: 'Vastaa' }), testInfo);
    }
    await press(v.getByRole('button', { name: 'Valmis' }), testInfo);
    const fake = await page.evaluate(() => ({ done: window.__fake.matikka.done, finished: window.__fake.matikka.finished }));
    expect(fake).toEqual({ done: 10, finished: true });
    await expect(listen(page, 'matikka')).toBeEnabled();
    await press(page.getByRole('button', { name: 'Etusivu' }), testInfo);
    await expect(page.locator('#home')).toBeVisible();
    await expect(page.locator('.badge:visible')).toHaveCount(0);
  });
}
