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

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next();
    if (e.key === 'ArrowUp'   || e.key === 'ArrowLeft')  prev();
  });

  // Arrow buttons
  const btnNext = document.querySelector('.nav-arrow.next');
  const btnPrev = document.querySelector('.nav-arrow.prev');
  if (btnNext) btnNext.addEventListener('click', next);
  if (btnPrev) btnPrev.addEventListener('click', prev);

  // Dot clicks
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => goTo(i));
  });

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

  // Init first slide
  slides[0].classList.add('active');
  if (dots[0]) dots[0].classList.add('active');
  if (counter) counter.textContent = `1 / ${slides.length}`;
})();