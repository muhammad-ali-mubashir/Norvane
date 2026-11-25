import { office } from '../config';

/**
 * Live office status, worked out in the office's own time zone:
 * "It is 8:04 pm in Sydney. We are back at 8:30 am tomorrow."
 */
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  return h * 60 + m;
};

const to12h = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h >= 12 ? 'pm' : 'am';
  return `${h % 12 || 12}:${m < 10 ? '0' : ''}${m} ${suffix}`;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export function startStatus(root: HTMLElement): () => void {
  const lines = root.querySelectorAll<HTMLElement>('[data-status]');
  const dots = root.querySelectorAll<HTMLElement>('[data-status-dot]');
  if (!lines.length) return () => {};

  const openM = toMinutes(office.opens);
  const closeM = toMinutes(office.closes);
  const fmt = new Intl.DateTimeFormat('en-AU', {
    timeZone: office.timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  function update() {
    const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
    const now = parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10);
    const day = parts.weekday;
    const weekday = WEEKDAYS.includes(day);
    const isOpen = weekday && now >= openM && now < closeM;

    let text: string;
    if (isOpen) {
      text = `It is ${to12h(now)} in ${office.city}. The phones are on, and an engineer will reply today.`;
    } else {
      let back: string;
      if (weekday && now < openM) back = `at ${to12h(openM)} this morning`;
      else if (day === 'Fri' || day === 'Sat' || day === 'Sun') back = `on Monday at ${to12h(openM)}`;
      else back = `at ${to12h(openM)} tomorrow`;
      text = `It is ${to12h(now)} in ${office.city}. We are back ${back}. Email still reaches a person.`;
    }

    lines.forEach((el) => (el.textContent = text));
    dots.forEach((d) => d.classList.toggle('is-open', isOpen));
  }

  update();
  const timer = window.setInterval(update, 30_000);
  return () => window.clearInterval(timer);
}
