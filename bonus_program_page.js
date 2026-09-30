(() => {
  'use strict';

  const page = document.querySelector('.bonus-page');
  if (!page) return;

  // Decorative viewport overlay; fade it out before the main content ends.
  const edgeBlur = document.createElement('div');
  edgeBlur.className = 'bonus-edge-blur';
  edgeBlur.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 8; index += 1) {
    edgeBlur.append(document.createElement('span'));
  }
  page.append(edgeBlur);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const heroImage = page.querySelector('.bonus-hero__background');
  const hero = heroImage?.closest('.bonus-hero');
  // Start once the photo is decoded and its section first enters the viewport.
  if (heroImage && !reducedMotion.matches) {
    const revealHero = () => {
      if (reducedMotion.matches) return;
      if (!('IntersectionObserver' in window)) {
        heroImage.classList.add('is-entering');
        return;
      }
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        if (!reducedMotion.matches) heroImage.classList.add('is-entering');
        observer.disconnect();
      });
      observer.observe(heroImage.closest('.bonus-hero'));
    };
    heroImage.decode().then(revealHero).catch(() => {});
  }
  const levels = [...page.querySelectorAll('.bonus-level')];
  const reward = page.querySelector('.bonus-levels__reward');
  const range = page.querySelector('.bonus-levels__range');

  const selectLevel = (selected) => {
    levels.forEach((level) => {
      const active = level === selected;
      level.classList.toggle('is-active', active);
      level.setAttribute('aria-pressed', String(active));
    });
    reward.textContent = `${selected.dataset.level} уровень — ${selected.dataset.rate}% бонусов с покупки`;
    range.textContent = selected.dataset.range;
  };

  levels.forEach((level, index) => {
    level.addEventListener('click', () => selectLevel(level));
    level.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % levels.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + levels.length) % levels.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = levels.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      levels[next].focus();
      selectLevel(levels[next]);
    });
  });

  // Only hide content after a working observer has been created.
  // Step rows are revealed by timeline state, not viewport intersection.
  const revealItems = [...page.querySelectorAll('[data-reveal]')]
    .filter((item) => !item.closest('.bonus-step'));
  let revealObserver;
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    revealObserver = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting);
      visible.sort((a, b) => revealItems.indexOf(a.target) - revealItems.indexOf(b.target));
      visible.forEach((entry, index) => {
        entry.target.style.setProperty('--bonus-reveal-delay', `${Math.min(index, 3) * 90}ms`);
        entry.target.classList.remove('is-reveal-pending');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });

    revealItems.forEach((item) => {
      if (item.getBoundingClientRect().top < window.innerHeight - 24) return;
      item.classList.add('is-reveal-pending', 'is-reveal-ready');
      revealObserver.observe(item);
    });
  }

  page.addEventListener('focusin', (event) => {
    const container = event.target.closest('.is-reveal-pending');
    if (container) {
      container.classList.remove('is-reveal-pending');
      revealObserver?.unobserve(container);
    }
  });

  const timeline = page.querySelector('.bonus-steps');
  const steps = [...page.querySelectorAll('.bonus-step')];
  const benefits = [...page.querySelectorAll('.bonus-benefit')];
  const scrollScale = (progress) => {
    const clamped = Math.max(0, Math.min(1, progress));
    return (0.9 + 0.1 * (1 - Math.pow(1 - clamped, 3))).toFixed(5);
  };
  let frameRequested = false;
  let initialState = true;

  const updateTimeline = () => {
    frameRequested = false;
    if (hero) {
      const heroRect = hero.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -heroRect.top / Math.max(1, heroRect.height * 0.35)));
      // Keep the entrance zoom, then reverse its scale as the hero leaves the viewport.
      heroImage.style.setProperty('--bonus-hero-zoom', reducedMotion.matches ? 1 : 1.1 - progress * 0.1);
    }
    const pageRect = page.getBoundingClientRect();
    const blurHeight = edgeBlur.offsetHeight || 160;
    const blurOpacity = Math.max(0, Math.min(1,
      (pageRect.bottom - window.innerHeight) / blurHeight
    ));
    edgeBlur.style.setProperty('--edge-opacity', blurOpacity);
    edgeBlur.style.left = `${pageRect.left}px`;
    edgeBlur.style.width = `${pageRect.width}px`;
    edgeBlur.style.setProperty('--edge-clip-top', `${Math.max(0, pageRect.top - (window.innerHeight - blurHeight))}px`);
    // Measure the unscaled box so the animation cannot move its own trigger.
    const benefitPositions = benefits.map((card) => {
      const rect = card.getBoundingClientRect();
      const translate = getComputedStyle(card).translate.split(' ');
      const revealOffset = parseFloat(translate[1]) || 0;
      return rect.top - (card.offsetHeight - rect.height) / 2 - revealOffset;
    });
    benefits.forEach((card, index) => {
      const scale = reducedMotion.matches ? 1 : scrollScale(
        (window.innerHeight - benefitPositions[index]) / (window.innerHeight * 0.6)
      );
      card.style.setProperty('--bonus-scroll-scale', scale);
    });
    if (!timeline) return;
    const rect = timeline.getBoundingClientRect();
    const progress = Math.max(0, Math.min(rect.height, window.innerHeight * 0.9 - rect.top));
    const dotPositions = steps.map((step) => {
      const dot = step.querySelector('.bonus-step__dot').getBoundingClientRect();
      return dot.top + dot.height / 2 - rect.top;
    });
    let activeIndex = -1;
    dotPositions.forEach((position, index) => {
      if (progress >= position) activeIndex = index;
    });
    timeline.style.setProperty('--bonus-line-progress', `${progress}px`);
    steps.forEach((step, index) => {
      const scale = reducedMotion.matches ? 1 : scrollScale(
        (window.innerHeight * 0.9 - rect.top - dotPositions[index]) / (window.innerHeight * 0.45)
      );
      step.style.setProperty('--bonus-scroll-scale', scale);
      // Reveal once; timeline states can still change independently on scroll.
      if (index <= activeIndex) step.classList.add('is-revealed');
      step.classList.toggle('is-past', index < activeIndex);
      step.classList.toggle('is-current', index === activeIndex);
      if (index === activeIndex) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
  };

  const scheduleTimeline = () => {
    if (frameRequested) return;
    frameRequested = true;
    window.requestAnimationFrame(updateTimeline);
  };

  window.addEventListener('scroll', scheduleTimeline, { passive: true });
  window.addEventListener('resize', scheduleTimeline);
  window.addEventListener('pageshow', scheduleTimeline);
  document.fonts?.ready.then(scheduleTimeline);
  if ('ResizeObserver' in window && timeline) new ResizeObserver(scheduleTimeline).observe(timeline);
  if ('ResizeObserver' in window) new ResizeObserver(scheduleTimeline).observe(page);
  updateTimeline();
  benefits.forEach((card) => card.classList.add('is-scroll-ready'));
  timeline?.classList.add('is-timeline-ready');

  reducedMotion.addEventListener('change', (event) => {
    scheduleTimeline();
    if (!event.matches) return;
    revealObserver?.disconnect();
    revealItems.forEach((item) => item.classList.remove('is-reveal-pending'));
  });
})();
