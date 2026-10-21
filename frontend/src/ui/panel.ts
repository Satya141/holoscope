import type { ModelDef } from '../models/types';
import type { GestureId } from '../tracking/controller';

const GESTURES: { id: GestureId; icon: string; title: string; sub: string }[] = [
  { id: 'open', icon: '🖐️', title: 'Spread your fingers', sub: 'break it into parts' },
  { id: 'fist', icon: '✊', title: 'Make a fist', sub: 'snap it back · drag it around' },
  { id: 'twist', icon: '👋', title: 'Swipe your palm', sub: 'spin and tilt' },
  { id: 'point', icon: '☝️', title: 'Point a finger', sub: 'see what a part does' },
  { id: 'pinch', icon: '🤏', title: 'Pinch', sub: 'grab a piece and pull' },
  { id: 'two', icon: '🙌', title: 'Use both hands', sub: 'stretch to zoom · turn to roll' },
  { id: 'peace', icon: '✌️', title: 'Show a V sign', sub: 'switch model' },
];

export type TrackState = 'on' | 'search' | 'off' | 'loading';
const TRACK_TEXT: Record<TrackState, string> = { on: 'Hands on', search: 'Show a hand', off: 'Camera off', loading: 'Starting…' };

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

/** Glass side panel, model dock and toasts. */
export class Panel {
  onExplode: (v: number) => void = () => {};
  onIntensity: (v: number) => void = () => {};
  onModel: (i: number) => void = () => {};
  private exRange = $<HTMLInputElement>('exRange');
  private inRange = $<HTMLInputElement>('inRange');
  private sliding = false;
  private gestureEls = new Map<GestureId, HTMLElement>();
  private toastTimer = 0;

  constructor() {
    const list = $('gestures');
    for (const g of GESTURES) {
      const li = document.createElement('li');
      li.innerHTML = `<span class="gi">${g.icon}</span><span><b>${g.title}</b><small>${g.sub}</small></span>`;
      list.append(li);
      this.gestureEls.set(g.id, li);
    }
    this.exRange.addEventListener('input', () => {
      $('exVal').textContent = `${this.exRange.value}%`;
      this.onExplode(+this.exRange.value / 100);
    });
    this.exRange.addEventListener('pointerdown', () => (this.sliding = true));
    addEventListener('pointerup', () => (this.sliding = false));
    this.inRange.addEventListener('input', () => {
      $('inVal').textContent = `${this.inRange.value}%`;
      this.onIntensity(+this.inRange.value / 100);
    });
  }

  setModels(models: ModelDef[]) {
    const dock = $('models');
    dock.innerHTML = '';
    models.forEach((m, i) => {
      const b = document.createElement('button');
      b.innerHTML = `<span>${m.icon}</span>${m.name}`;
      b.onclick = () => this.onModel(i);
      dock.append(b);
    });
  }

  setModel(i: number, m: ModelDef) {
    $('chipCat').textContent = m.category;
    $('chipParts').textContent = '…';
    $('modelName').textContent = m.name;
    $('modelDesc').textContent = m.desc;
    [...$('models').children].forEach((b, j) => b.classList.toggle('on', i === j));
  }

  setPartCount(n: number) { $('chipParts').textContent = `${n} parts`; }

  setTracking(state: TrackState, hands: number, fps: number, diag = '') {
    const el = $('stTrack');
    el.textContent = TRACK_TEXT[state];
    el.className = state;
    $('stHands').textContent = `${hands} hand${hands === 1 ? '' : 's'}`;
    $('stFps').textContent = fps ? fps.toFixed(0) : '–';
    $('diag').textContent = diag;
  }

  setExplode(v: number) {
    if (this.sliding) return;
    const pct = Math.round(v * 100);
    this.exRange.value = String(pct);
    $('exVal').textContent = `${pct}%`;
  }

  /** Highlights the active gesture and shows a one-line hint for it. */
  setActive(id: GestureId | null, state: TrackState) {
    for (const [gid, el] of this.gestureEls) el.classList.toggle('on', gid === id);
    const g = GESTURES.find((x) => x.id === id);
    const hint = $('hint');
    const html = g ? `${g.icon} <b>${g.title}</b> — ${g.sub}`
      : state === 'search' ? '✋ Raise your open hand to start' : '';
    if (hint.innerHTML !== html) hint.innerHTML = html;
  }

  setPart(p: { name: string; desc: string } | null) {
    const card = $('partCard');
    card.classList.toggle('hidden', !p);
    if (p) { $('partName').textContent = p.name; $('partDesc').textContent = p.desc; }
  }

  toast(msg: string) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => t.classList.remove('show'), 2200);
  }
}
