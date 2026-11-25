import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { startField } from './field';
import { startStatus } from './status';

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * All page motion. Everything here is progressive: without JavaScript, or with
 * reduced motion turned on, the page shows its final state.
 */
export function initMotion() {
  const root = document.querySelector<HTMLElement>('.nv');
  if (!root) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;
  const anim = !reduce;
  const pl = root.querySelector<HTMLElement>('[data-preloader]');

  startStatus(root);

  // Smooth scrolling on mouse and trackpad only. Touch keeps native scrolling.
  if (anim && fine) {
    const lenis = new Lenis({ duration: 1.2, smoothWheel: true, anchors: { offset: -72 } });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const field = startField(root, anim, fine);

  // Preloader: the two wedges of the mark slide in and lock, then the curtain lifts.
  const tl = gsap.timeline();
  if (anim && pl) {
    tl.fromTo('[data-pl-ink]', { x: -46, y: 46, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.8, ease: 'expo.out' })
      .fromTo('[data-pl-tip]', { x: 46, y: -46, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.8, ease: 'expo.out' }, '<0.1')
      .fromTo('[data-pl-word]', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 }, '-=0.35')
      .to(pl, { yPercent: -100, duration: 0.95, ease: 'power4.inOut' }, '+=0.2')
      .set(pl, { display: 'none' });
  } else if (pl) {
    pl.style.display = 'none';
  }

  // Hero: headline lines rise out of masks, the field settles to north.
  const h1 = root.querySelector<HTMLElement>('[data-hero-title]');
  if (anim && h1) {
    const split = SplitText.create(h1, { type: 'lines', mask: 'lines' });
    tl.from(split.lines, { yPercent: 112, duration: 1.15, ease: 'expo.out', stagger: 0.1 }, pl ? '-=0.5' : 0.1);
    tl.from('[data-hero-fade]', { y: 26, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08 }, '-=0.85');
    tl.add(() => field?.settle(false), '-=1.1');
  } else {
    field?.settle(true);
  }

  // Nav: solid once you leave the top, tucks away going down, returns going up.
  const nav = root.querySelector<HTMLElement>('[data-nav]');
  const navBg = root.querySelector<HTMLElement>('[data-nav-bg]');
  let solid = false;
  let hidden = false;
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (s) => {
      const y = s.scroll();
      if (y > 60 !== solid) {
        solid = y > 60;
        gsap.to(navBg, { opacity: solid ? 1 : 0, duration: 0.3 });
      }
      const hide = anim && y > 500 && s.direction === 1;
      if (hide !== hidden) {
        hidden = hide;
        gsap.to(nav, { yPercent: hide ? -100 : 0, duration: 0.4, ease: 'power3.out' });
      }
    },
  });

  if (!anim) return;

  // Marquees: speed up with scroll velocity and run backwards when scrolling up.
  const tweens: gsap.core.Tween[] = [];
  root.querySelectorAll<HTMLElement>('[data-marquee]').forEach((m) => {
    const track = m.querySelector('[data-track]');
    const rev = m.dataset.dir === 'rev';
    tweens.push(
      gsap.fromTo(track, { xPercent: rev ? -50 : 0 }, { xPercent: rev ? 0 : -50, duration: rev ? 46 : 34, ease: 'none', repeat: -1 }),
    );
  });
  let settleTimer: number | undefined;
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (s) => {
      const sign = s.direction === -1 ? -1 : 1;
      const ts = sign * gsap.utils.clamp(1, 7, 1 + Math.abs(s.getVelocity()) / 260);
      tweens.forEach((t) => gsap.to(t, { timeScale: ts, duration: 0.25, overwrite: true }));
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        tweens.forEach((t) => gsap.to(t, { timeScale: sign, duration: 1.2, overwrite: true }));
      }, 140);
    },
  });

  // The problem line lights up word by word as you scroll through it.
  root.querySelectorAll<HTMLElement>('[data-scrub]').forEach((el) => {
    const split = SplitText.create(el, { type: 'words' });
    gsap.fromTo(
      split.words,
      { opacity: 0.13 },
      { opacity: 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 42%', scrub: true } },
    );
  });

  // Section headings rise out of masks.
  root.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    const split = SplitText.create(el, { type: 'lines', mask: 'lines' });
    gsap.from(split.lines, { yPercent: 108, duration: 1.05, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 86%' } });
  });

  // Everything else fades up in batches.
  gsap.set('[data-fade]', { opacity: 0, y: 30 });
  ScrollTrigger.batch('[data-fade]', {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, overwrite: true }),
  });

  // Proof floods in from an inset card to full bleed.
  const takeover = root.querySelector('[data-takeover]');
  if (takeover) {
    gsap.fromTo(
      takeover,
      { clipPath: 'inset(0% 4% 0% 4% round 36px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: takeover, start: 'top 96%', end: 'top 20%', scrub: true } },
    );
  }

  // Count-up.
  root.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const target = parseInt(el.dataset.count ?? '0', 10);
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, {
      v: target,
      duration: 1.8,
      ease: 'power3.out',
      onUpdate: () => (el.textContent = String(Math.round(o.v))),
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });

  // The TESTED stamp lands on the restore promise.
  const stamp = root.querySelector<HTMLElement>('[data-stamp]');
  if (stamp) {
    gsap.fromTo(
      stamp,
      { scale: 2.8, opacity: 0, rotation: -18 },
      {
        scale: 1,
        opacity: 1,
        rotation: 0,
        duration: 0.42,
        ease: 'power4.in',
        delay: 0.3,
        scrollTrigger: { trigger: stamp, start: 'top 82%' },
        onComplete: () => {
          gsap.fromTo(stamp.parentElement, { x: -5 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, 0.28)' });
        },
      },
    );
  }

  // Things we will not do: each line is crossed out as it reaches the middle of the screen.
  // The line is a background on the text itself, so it follows wrapped lines too.
  root.querySelectorAll<HTMLElement>('.strike-wrap').forEach((s) => {
    gsap.fromTo(
      s,
      { backgroundSize: '0% 0.09em' },
      { backgroundSize: '100% 0.09em', ease: 'none', scrollTrigger: { trigger: s, start: 'top 72%', end: 'top 50%', scrub: 0.6 } },
    );
  });

  // The engineer's pen ring and margin note on the sample report.
  const ring = root.querySelector('[data-anno]');
  const note = root.querySelector('[data-anno-note]');
  if (ring) {
    const atl = gsap.timeline({ scrollTrigger: { trigger: ring.closest('.report'), start: 'top 55%' } });
    atl.fromTo(ring, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut' });
    if (note) atl.fromTo(note, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.2');
  }

  // Process: the sticky numeral rolls and the vane turns to north, step by step (desktop only).
  gsap.matchMedia().add('(min-width: 981px)', () => {
    const steps = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('[data-step]'));
    const nums = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('[data-step-num]'));
    const vane = root.querySelector('[data-step-vane]');
    const angles = [-128, 74, -22, 0];
    let cur = 0;
    gsap.set(nums, { yPercent: 100, opacity: 0 });
    gsap.set(nums[0], { yPercent: 0, opacity: 1 });
    gsap.set(vane, { rotation: angles[0] });
    gsap.set(steps, { opacity: 0.3 });
    gsap.set(steps[0], { opacity: 1 });

    const go = (i: number) => {
      if (i === cur) return;
      const down = i > cur;
      gsap.to(nums[cur], { yPercent: down ? -100 : 100, opacity: 0, duration: 0.55, ease: 'power3.inOut', overwrite: true });
      gsap.fromTo(nums[i], { yPercent: down ? 100 : -100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.55, ease: 'power3.inOut', overwrite: true });
      gsap.to(vane, { rotation: angles[i], duration: 0.8, ease: 'back.out(1.7)', overwrite: true });
      gsap.to(steps, { opacity: 0.3, duration: 0.35, overwrite: true });
      gsap.to(steps[i], { opacity: 1, duration: 0.35, overwrite: true });
      cur = i;
    };

    steps.forEach((s, i) => {
      ScrollTrigger.create({ trigger: s, start: 'top 60%', end: 'bottom 60%', onToggle: (st) => st.isActive && go(i) });
    });
    gsap.fromTo(
      root.querySelector('[data-step-bar]'),
      { scaleY: 0 },
      { scaleY: 1, ease: 'none', scrollTrigger: { trigger: root.querySelector('[data-steps]'), start: 'top 60%', end: 'bottom 60%', scrub: true } },
    );
  });
}
