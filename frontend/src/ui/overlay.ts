import type { Visual } from '../tracking/controller';
import type { HandPose } from '../tracking/gestures';

export interface Label { x: number; y: number; cx: number; cy: number; name: string; strong: boolean }

const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];
const TIPS = [4, 8, 12, 16, 20];
const GOLD = '#ffd36b', CYAN = '#38f4ff';

/** 2D layer over the hologram: hand skeleton, gesture cursors and part callouts. */
export class Overlay {
  readonly ctx: CanvasRenderingContext2D;
  private dpr = 1;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    this.dpr = Math.min(devicePixelRatio, 1.25);
    this.canvas.width = Math.round(innerWidth * this.dpr);
    this.canvas.height = Math.round(innerHeight * this.dpr);
  }

  draw(hands: HandPose[], vis: Visual, labels: Label[], labelAlpha: number, t: number) {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawLabels(labels, labelAlpha);
    for (const h of hands) this.drawHand(h);
    this.drawCursors(vis, t);
  }

  private drawHand(h: HandPose) {
    const c = this.ctx, p = h.pts;
    c.save();
    c.shadowColor = 'rgba(56,244,255,0.9)';
    c.shadowBlur = 10;
    c.strokeStyle = 'rgba(255,255,255,0.85)';
    c.lineWidth = 1.6;
    c.beginPath();
    for (const [a, b] of BONES) { c.moveTo(p[a].x, p[a].y); c.lineTo(p[b].x, p[b].y); }
    c.stroke();
    c.fillStyle = '#fff';
    for (let i = 0; i < 21; i++) {
      c.beginPath();
      c.arc(p[i].x, p[i].y, TIPS.includes(i) ? 4 : 2.4, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = CYAN;
    for (const i of TIPS) { c.beginPath(); c.arc(p[i].x, p[i].y, 2, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }

  private drawCursors(v: Visual, t: number) {
    const c = this.ctx;
    c.save();
    c.shadowBlur = 12;
    if (v.reticle) {
      const col = v.reticle.hit ? GOLD : CYAN;
      c.strokeStyle = col; c.shadowColor = col; c.lineWidth = 2;
      c.setLineDash([6, 6]); c.lineDashOffset = -t * 30;
      c.beginPath(); c.arc(v.reticle.x, v.reticle.y, v.reticle.hit ? 26 : 20, 0, Math.PI * 2); c.stroke();
      c.setLineDash([]);
      c.fillStyle = col; c.beginPath(); c.arc(v.reticle.x, v.reticle.y, 3, 0, Math.PI * 2); c.fill();
    }
    if (v.pinch) {
      const col = v.pinch.grab ? GOLD : CYAN;
      c.strokeStyle = col; c.shadowColor = col; c.lineWidth = 2;
      c.beginPath(); c.arc(v.pinch.x, v.pinch.y, 16, 0, Math.PI * 2); c.stroke();
      if (v.pinch.grab) { c.fillStyle = 'rgba(255,211,107,0.25)'; c.fill(); }
    }
    if (v.peace) {
      c.strokeStyle = GOLD; c.shadowColor = GOLD; c.lineWidth = 4; c.lineCap = 'round';
      c.beginPath();
      c.arc(v.peace.x, v.peace.y, 46, -Math.PI / 2, -Math.PI / 2 + v.peace.progress * Math.PI * 2);
      c.stroke();
    }
    c.restore();
  }

  private drawLabels(labels: Label[], alpha: number) {
    if (alpha <= 0.01) return;
    const c = this.ctx;
    c.save();
    c.textBaseline = 'middle';
    for (const l of labels) {
      let dx = l.x - l.cx, dy = l.y - l.cy;
      const len = Math.hypot(dx, dy);
      if (len < 1) { dx = 1; dy = -0.6; } else { dx /= len; dy /= len; }
      const ex = l.x + dx * 46, ey = l.y + dy * 46;
      const side = dx >= 0 ? 1 : -1;
      const tx = ex + side * 30;
      const a = l.strong ? 1 : alpha;
      c.globalAlpha = a;
      c.strokeStyle = l.strong ? GOLD : 'rgba(200,250,255,0.75)';
      c.fillStyle = c.strokeStyle;
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(l.x, l.y); c.lineTo(ex, ey); c.lineTo(tx, ey); c.stroke();
      c.beginPath(); c.arc(l.x, l.y, 2.5, 0, Math.PI * 2); c.fill();
      c.font = `${l.strong ? 600 : 500} ${l.strong ? 14 : 12}px Inter, system-ui, sans-serif`;
      c.textAlign = side > 0 ? 'left' : 'right';
      c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 4;
      c.fillStyle = l.strong ? GOLD : '#e8fbff';
      c.fillText(l.name, tx + side * 6, ey);
      c.shadowBlur = 0;
    }
    c.restore();
  }
}
