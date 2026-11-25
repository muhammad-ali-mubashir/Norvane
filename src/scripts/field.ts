import { gsap } from 'gsap';

/**
 * The bearing field: a canvas of triangles, scattered at the left edge and
 * settled to true north at the right. They settle once on load, then the
 * triangles near the pointer turn to face it and ease back.
 * The area behind the hero text stays clear.
 */
export interface Field {
  settle(instant: boolean): void;
  destroy(): void;
}

interface Tri {
  x: number;
  y: number;
  base: number;
  start: number;
  ang: number;
  a: number;
  o: boolean;
  s: number;
  delay: number;
}

const REEF = 'oklch(65.1% 0.094 210.7)';
const OCHRE = 'oklch(75.8% 0.147 73.2)';

function seeded() {
  let seed = 20261122;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const shortest = (to: number, from: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

export function startField(root: HTMLElement, anim: boolean, fine: boolean): Field | null {
  const cv = root.querySelector<HTMLCanvasElement>('[data-field]');
  const hero = root.querySelector<HTMLElement>('[data-hero]');
  const hole = root.querySelector<HTMLElement>('[data-hole]');
  const g = cv?.getContext('2d');
  if (!cv || !g) return null;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let tris: Tri[] = [];
  let W = 0;
  let H = 0;
  let mx = -9999;
  let my = -9999;
  let t0 = -1;
  let settled = false;
  let visible = true;

  function layout() {
    const r = cv!.getBoundingClientRect();
    W = r.width;
    H = r.height;
    if (!W || !H) return;
    cv!.width = Math.round(W * dpr);
    cv!.height = Math.round(H * dpr);
    g!.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pitch = W < 700 ? 30 : 46;
    const cols = Math.ceil(W / pitch) + 1;
    const rows = Math.ceil(H / pitch) + 1;
    const rnd = seeded();
    const hr = hole?.getBoundingClientRect();
    const box = hr
      ? { l: hr.left - r.left - 28, t: hr.top - r.top - 28, r: hr.right - r.left + 28, b: hr.bottom - r.top + 28 }
      : null;

    tris = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = i * pitch + pitch / 2;
        const y = j * pitch + pitch / 2;
        const a = Math.min(1, Math.max(0, x / W));
        const scatter = (rnd() * 2 - 1) * Math.PI;
        const start = (rnd() * 2 - 1) * Math.PI * 1.15;
        const roll = rnd();
        if (box && x > box.l && x < box.r && y > box.t && y < box.b) continue;
        const base = scatter * Math.pow(1 - a, 1.35);
        tris.push({
          x,
          y,
          base,
          start,
          ang: settled ? base : start,
          a,
          o: a > 0.55 && roll < 0.04,
          s: pitch / 4,
          delay: a * 420 + j * 10,
        });
      }
    }
  }

  function draw(now: number) {
    g!.clearRect(0, 0, W, H);
    for (const p of tris) {
      let target = p.base;
      if (!settled) {
        target = t0 >= 0 ? p.start + (p.base - p.start) * easeOut(Math.min(1, Math.max(0, (now - t0 - p.delay) / 480))) : p.start;
      }
      let boost = 0;
      if (fine && anim && mx > -9000) {
        const dx = mx - p.x;
        const dy = my - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 220) {
          const w = (1 - dist / 220) ** 2;
          const toward = Math.atan2(dy, dx) + Math.PI / 2;
          target += shortest(toward, target) * w * 0.95;
          boost = w * 0.45;
        }
      }
      p.ang += shortest(target, p.ang) * (settled ? 0.14 : 0.5);

      g!.save();
      g!.translate(p.x, p.y);
      g!.rotate(p.ang);
      g!.globalAlpha = p.o ? 1 : Math.min(1, 0.12 + 0.4 * p.a + boost);
      g!.fillStyle = p.o ? OCHRE : REEF;
      g!.beginPath();
      g!.moveTo(0, -p.s);
      g!.lineTo(p.s, p.s);
      g!.lineTo(-p.s, p.s);
      g!.closePath();
      g!.fill();
      g!.restore();
    }
    g!.globalAlpha = 1;
  }

  const tick = () => {
    if (!visible) return;
    const now = performance.now();
    if (t0 >= 0 && !settled && now - t0 > 1400) settled = true;
    draw(now);
  };

  layout();
  draw(performance.now());
  if (anim) gsap.ticker.add(tick);

  const ro = new ResizeObserver(() => {
    layout();
    draw(performance.now());
  });
  ro.observe(cv);
  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
  });
  io.observe(cv);

  const onMove = (e: PointerEvent) => {
    const r = cv.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
  };
  const onLeave = () => {
    mx = -9999;
    my = -9999;
  };
  if (hero && fine && anim) {
    hero.addEventListener('pointermove', onMove);
    hero.addEventListener('pointerleave', onLeave);
  }

  return {
    settle(instant) {
      if (instant) {
        settled = true;
        tris.forEach((p) => (p.ang = p.base));
        draw(performance.now());
        return;
      }
      t0 = performance.now();
    },
    destroy() {
      if (anim) gsap.ticker.remove(tick);
      ro.disconnect();
      io.disconnect();
      hero?.removeEventListener('pointermove', onMove);
      hero?.removeEventListener('pointerleave', onLeave);
    },
  };
}
