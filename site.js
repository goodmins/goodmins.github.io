// Small enhancements: reveal on scroll, nav backdrop, phone tilt, tile glow, points calculator.
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Phone menu: the header button opens a panel of links; a link, Escape or a tap outside closes it.
  const menuBtn = document.querySelector('.menu-btn'), menu = document.getElementById('menu');
  if (menuBtn && menu) {
    const header = menuBtn.closest('.top');
    const setOpen = (open) => {
      menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); header.classList.toggle('open', open);
    };
    menuBtn.addEventListener('click', () => setOpen(menu.hidden));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    document.addEventListener('click', (e) => { if (!menu.hidden && !header.contains(e.target)) setOpen(false); });
    addEventListener('resize', () => { if (innerWidth > 960) setOpen(false); });
  }

  // Features page: filter features as you type; sections with no match hide.
  const q = document.getElementById('fx-q');
  if (q) {
    const items = [...document.querySelectorAll('.fx-item, .fx-table tbody tr:not(.grp)')];
    items.forEach((el) => { el.dataset.text = el.textContent.toLowerCase(); });
    const empty = document.getElementById('fx-empty');
    const filter = () => {
      const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
      let any = false;
      for (const el of items) {
        const hit = words.every((w) => el.dataset.text.includes(w));
        el.hidden = !hit; el.classList.toggle('hide', !hit);
        if (hit && words.length && el.tagName === 'DETAILS') el.open = true;
      }
      document.querySelectorAll('.fx-sec').forEach((s) => {
        const shown = [...s.querySelectorAll('.fx-item, tbody tr:not(.grp)')].some((el) => !el.hidden);
        s.hidden = !shown; any = any || shown;
        s.querySelectorAll('tr.grp').forEach((g) => {
          let r = g.nextElementSibling, has = false;
          while (r && !r.classList.contains('grp')) { has = has || !r.hidden; r = r.nextElementSibling; }
          g.hidden = !has;
        });
      });
      empty.hidden = any;
    };
    q.addEventListener('input', filter);
    if (location.hash.startsWith('#q=')) { q.value = decodeURIComponent(location.hash.slice(3)); filter(); }
  }

  // The hero always shows on load; older browsers without IntersectionObserver show everything.
  setTimeout(() => document.querySelectorAll('.hero .reveal').forEach((el) => el.classList.add('in')), 60);
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal, .tile, .final').forEach((el) => el.classList.add('in'));
    return;
  }

  // Reveal sections as they enter the viewport.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal, .tile, .final').forEach((el) => io.observe(el));

  // Nav gets a backdrop once the page scrolls.
  const top = document.getElementById('top');
  const onScroll = () => top && top.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Features page: highlight the section in view; on narrow screens keep its chip visible.
  const toc = document.querySelector('.fx-toc');
  if (toc) {
    const links = new Map([...toc.querySelectorAll('a')].map((a) => [a.hash.slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((a) => a.classList.remove('on'));
        const a = links.get(e.target.id);
        if (a) { a.classList.add('on'); if (toc.scrollWidth > toc.clientWidth) toc.scrollTo({ left: a.offsetLeft - 16, behavior: still ? 'auto' : 'smooth' }); }
      }
    }, { rootMargin: '-30% 0px -60% 0px' });
    document.querySelectorAll('.fx-sec').forEach((s) => spy.observe(s));
  }

  // Phone tilts toward the pointer (desktop only).
  const phone = document.getElementById('tilt');
  if (phone && !still && matchMedia('(pointer: fine)').matches) {
    const stage = phone.parentElement;
    stage.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      phone.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 10}deg)`;
    });
    stage.addEventListener('pointerleave', () => { phone.style.transform = ''; });
  }

  // Bento tiles: a soft light follows the pointer.
  document.querySelectorAll('.tile').forEach((t) => t.addEventListener('pointermove', (e) => {
    const r = t.getBoundingClientRect();
    t.style.setProperty('--mx', `${e.clientX - r.left}px`); t.style.setProperty('--my', `${e.clientY - r.top}px`);
  }));

  // Screens gallery: arrows show only when the row overflows and grey out at either end.
  const gal = document.querySelector('.gallery'), gnav = document.querySelector('.gallery-nav');
  if (gal && gnav) {
    const [prev, next] = gnav.querySelectorAll('.arrow');
    const sync = () => {
      const max = gal.scrollWidth - gal.clientWidth;
      gnav.hidden = max < 4;
      prev.disabled = gal.scrollLeft <= 4; next.disabled = gal.scrollLeft >= max - 4;
    };
    gnav.addEventListener('click', (e) => {
      const b = e.target.closest('.arrow'); if (!b) return;
      const step = gal.querySelector('figure').getBoundingClientRect().width + 24;
      gal.scrollBy({ left: step * Number(b.dataset.dir), behavior: still ? 'auto' : 'smooth' });
    });
    gal.addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', sync); addEventListener('load', sync); sync();
  }

  // Points calculator: daily habits cap at 120, 1 point = 1 minute.
  const boxes = [...document.querySelectorAll('#habits input')];
  const pts = document.getElementById('pts'), meter = document.getElementById('meter');
  const s1 = document.getElementById('s1'), s2 = document.getElementById('s2'), cap = document.getElementById('cap');
  const CAP = 120;
  let shown = 0, raf = 0;
  const hm = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
  const update = () => {
    const raw = boxes.filter((b) => b.checked).reduce((s, b) => s + Number(b.value), 0);
    const total = Math.min(raw, CAP);
    meter.style.width = `${(total / CAP) * 100}%`;
    s1.textContent = hm(total);
    const slots = Math.floor(total / 30);
    s2.textContent = slots === 1 ? '1 slot' : `${slots} slots`;
    cap.textContent = raw > CAP ? `Capped at ${CAP} a day; the extra ${raw - CAP} go to Rewards.` : 'Daily habits add up to 120 points; extra goes to Rewards.';
    cancelAnimationFrame(raf);
    if (still) { shown = total; pts.textContent = total; return; }
    const from = shown, start = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - start) / 500), v = Math.round(from + (total - from) * (1 - Math.pow(1 - k, 3)));
      pts.textContent = v; shown = v;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };
  boxes.forEach((b) => b.addEventListener('change', update));
  if (boxes.length) update();
})();
