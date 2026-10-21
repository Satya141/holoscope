const MIME_TYPES = [
  'video/mp4;codecs=avc1.640028', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm',
];
const MAX_SIDE = 1920;

function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

/**
 * Composites the WebGL frame (camera + hologram) and the 2D overlay into one canvas for screenshots
 * and MP4/WebM recording. `tick()` must run right after the WebGL render in the same frame.
 */
export class Capture {
  private canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d')!;
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private shotPending: ((ok: boolean) => void) | null = null;
  startedAt = 0;

  constructor(private gl: HTMLCanvasElement, private overlay: HTMLCanvasElement) {}

  get recording() { return this.rec !== null; }

  private compose() {
    const s = Math.min(1, MAX_SIDE / Math.max(this.gl.width, this.gl.height));
    const w = Math.round((this.gl.width * s) / 2) * 2, h = Math.round((this.gl.height * s) / 2) * 2;
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    const c = this.ctx;
    c.drawImage(this.gl, 0, 0, w, h);
    c.drawImage(this.overlay, 0, 0, w, h);
    c.font = `600 ${Math.round(h * 0.018)}px Inter, system-ui, sans-serif`;
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.textAlign = 'right';
    c.fillText('HOLOSCOPE  ·  reach in, see how it works', w - h * 0.03, h - h * 0.03);
  }

  /** Saved on the next rendered frame (the WebGL buffer is only readable right after rendering). */
  screenshot(): Promise<boolean> {
    return new Promise((resolve) => (this.shotPending = resolve));
  }

  start(): string {
    this.compose();
    const mime = MIME_TYPES.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
    const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
    this.chunks = [];
    this.rec = new MediaRecorder(this.canvas.captureStream(30), { mimeType: mime || undefined, videoBitsPerSecond: 12_000_000 });
    this.rec.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    this.rec.onstop = () => download(new Blob(this.chunks, { type: mime || 'video/webm' }), `holoscope-${stamp()}.${ext}`);
    this.rec.start(250);
    this.startedAt = performance.now();
    return ext;
  }

  stop() {
    this.rec?.stop();
    this.rec = null;
  }

  tick() {
    if (!this.rec && !this.shotPending) return;
    this.compose();
    const done = this.shotPending;
    if (done) {
      this.shotPending = null;
      this.canvas.toBlob((b) => { if (b) download(b, `holoscope-${stamp()}.png`); done(!!b); }, 'image/png');
    }
  }
}
