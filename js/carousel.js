/**
 * Lightweight image carousel with touch support
 */
export function initCarousel(container) {
  const track = container.querySelector('.carousel-track');
  const images = track.querySelectorAll('img');
  const prevBtn = container.querySelector('.carousel-prev');
  const nextBtn = container.querySelector('.carousel-next');
  const dotsContainer = container.querySelector('.carousel-dots');
  let currentIndex = 0;
  const total = images.length;

  // Create dots
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('button');
    dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Image ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(dot);
  }

  function goTo(index) {
    currentIndex = Math.max(0, Math.min(index, total - 1));
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    const dots = dotsContainer.querySelectorAll('.carousel-dot');
    dots.forEach((d, i) => d.classList.toggle('active', i === currentIndex));
  }

  prevBtn.addEventListener('click', (e) => {
    e.preventDefault();
    goTo(currentIndex - 1);
  });

  nextBtn.addEventListener('click', (e) => {
    e.preventDefault();
    goTo(currentIndex + 1);
  });

  // Touch swipe support
  let touchStartX = 0;
  let touchEndX = 0;

  track.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  track.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const delta = touchStartX - touchEndX;
    if (Math.abs(delta) > 50) {
      if (delta > 0) goTo(currentIndex + 1);
      else goTo(currentIndex - 1);
    }
  }, { passive: true });
}

export function createCarouselHTML(images) {
  return `
    <div class="carousel">
      <div class="carousel-track">
        ${images.map((src, i) => `<img src="${src}" alt="Property photo ${i + 1}" ${i > 0 ? 'loading="lazy"' : ''}>`).join('')}
      </div>
      <button class="carousel-prev" aria-label="Previous image">&#8249;</button>
      <button class="carousel-next" aria-label="Next image">&#8250;</button>
      <div class="carousel-dots"></div>
    </div>
  `;
}
