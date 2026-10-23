// The shared Kuuntele button. States: ready | playing | novoice (design 3.4).
// It is never disabled: tapping works in every state.

const SVG_NS = 'http://www.w3.org/2000/svg';

function speakerIcon() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'listen-icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    '<path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor"/>' +
    '<path class="icon-arcs" d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path class="icon-cross" d="M16 9l6 6M22 9l-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>';
  return svg;
}

export function createListenButton({ label, onTap }) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = 'listen';
  element.dataset.state = 'ready';

  const waves = document.createElement('span');
  waves.className = 'waves';
  waves.setAttribute('aria-hidden', 'true');
  waves.append(document.createElement('i'), document.createElement('i'), document.createElement('i'));

  const text = document.createElement('span');
  text.className = 'listen-label';
  text.textContent = label;

  element.append(speakerIcon(), waves, text);
  element.addEventListener('click', () => onTap());

  function setState(state) {
    element.dataset.state = state;
    if (state === 'novoice') {
      text.textContent = 'Ei ääntä';
      element.setAttribute('aria-label', `Ei ääntä. ${label}`);
    } else {
      text.textContent = label;
      element.removeAttribute('aria-label');
    }
  }

  return { element, setState };
}
