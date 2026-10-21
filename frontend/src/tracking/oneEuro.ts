/** One Euro filter: smooth when still, responsive when moving fast. */
export class OneEuro {
  private x: number | null = null;
  /** Filtered velocity (units per second), usable for prediction. */
  dx = 0;
  private t = 0;

  constructor(private minCutoff = 2.2, private beta = 0.04, private dCutoff = 1.5) {}

  filter(value: number, tMs: number): number {
    if (this.x === null) { this.x = value; this.t = tMs; return value; }
    const dt = Math.max(1e-3, (tMs - this.t) / 1000);
    this.t = tMs;
    const alpha = (cutoff: number) => 1 / (1 + 1 / (2 * Math.PI * cutoff * dt));
    this.dx += alpha(this.dCutoff) * ((value - this.x) / dt - this.dx);
    this.x += alpha(this.minCutoff + this.beta * Math.abs(this.dx)) * (value - this.x);
    return this.x;
  }
}
