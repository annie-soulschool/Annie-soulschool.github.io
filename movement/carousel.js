/* carousel.js — Soul School slide navigation */

(function () {
  'use strict';

  const slides = Array.from(document.querySelectorAll('.slide'));
  const dots   = Array.from(document.querySelectorAll('.nav-dot'));
  const counter = document.getElementById('slide-counter');
  let current  = 0;
  let animating = false;

  function goTo(idx) {
    if (animating || idx === current) return;
    animating = true;

    const prev = slides[current];
    prev.classList.add('exit');
    prev.classList.remove('active');
    dots[current].classList.remove('active');

    setTimeout(() => {
      prev.classList.remove('exit');
    }, 450);

    current = ((idx % slides.length) + slides.length) % slides.length;

    slides[current].classList.add('active');
    dots[current].classList.add('active');

    if (counter) {
      counter.textContent = `${current + 1} / ${slides.length}`;
    }

    setTimeout(() => { animating = false; }, 700);
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  // Arrow buttons (wired with resetAuto below)
  const btnNext = document.querySelector('.nav-arrow.next');
  const btnPrev = document.querySelector('.nav-arrow.prev');

  // Touch / swipe
  let touchStartY = null;
  let touchStartX = null;

  document.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (touchStartY === null) return;
    const dy = touchStartY - e.changedTouches[0].clientY;
    const dx = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 40) {
      dy > 0 ? next() : prev();
    }
    touchStartY = null;
    touchStartX = null;
  }, { passive: true });

  // Wheel scroll
  let wheelTimer = null;
  document.addEventListener('wheel', (e) => {
    if (wheelTimer) return;
    e.deltaY > 0 ? next() : prev();
    wheelTimer = setTimeout(() => { wheelTimer = null; }, 900);
  }, { passive: true });

  // Council card expand
  document.querySelectorAll('.council-card').forEach((card) => {
    card.addEventListener('click', () => {
      card.classList.toggle('expanded');
    });
  });

  // ── Auto-advance every 8 seconds ──
  const AUTO_DELAY = 8000;
  const PAUSE_AFTER_INTERACTION = 14000; // pause longer after manual nav
  let autoTimer = null;

  function startAuto(delay = AUTO_DELAY) {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => {
      next();
      startAuto(); // keep looping
    }, delay);
  }

  function resetAuto() {
    // User interacted — pause a bit longer before resuming
    startAuto(PAUSE_AFTER_INTERACTION);
  }

  // Pause auto-advance while the tab is hidden, resume when visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearTimeout(autoTimer);
    } else {
      startAuto();
    }
  });

  // Wrap user-triggered navigation so it resets the timer
  const _origGoTo = goTo;
  function goToManual(idx) {
    _origGoTo(idx);
    resetAuto();
  }

  if (btnNext) btnNext.addEventListener('click', () => { next(); resetAuto(); });
  if (btnPrev) btnPrev.addEventListener('click', () => { prev(); resetAuto(); });
  dots.forEach((dot, i) => dot.addEventListener('click', () => { goTo(i); resetAuto(); }));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { next(); resetAuto(); }
    if (e.key === 'ArrowUp'   || e.key === 'ArrowLeft')  { prev(); resetAuto(); }
  });

  document.addEventListener('touchend', () => resetAuto(), { passive: true });

  // Init first slide
  slides[0].classList.add('active');
  if (dots[0]) dots[0].classList.add('active');
  if (counter) counter.textContent = `1 / ${slides.length}`;

  startAuto();
})();