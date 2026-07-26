export function initCarousel(carousel) {
  const track = carousel.querySelector(".carousel-track");
  const slides = [...carousel.querySelectorAll(".carousel-slide")];
  const prevButton = carousel.querySelector(".carousel-prev");
  const nextButton = carousel.querySelector(".carousel-next");
  const counter = carousel.querySelector(".carousel-counter");
  const dotsContainer = carousel.querySelector(".carousel-dots");

  if (!track || !slides.length) return;

  let currentIndex = 0;
  let startX = 0;
  let currentX = 0;
  let startY = 0;
  let currentY = 0;
  let pointerId = null;
  let isDragging = false;

  const dots = slides.map((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "carousel-dot";
    dot.setAttribute("aria-label", `切換到第 ${index + 1} 件作品`);
    dot.addEventListener("click", () => goTo(index));
    dotsContainer?.append(dot);
    return dot;
  });

  function pauseHiddenVideos() {
    slides.forEach((slide, index) => {
      const video = slide.querySelector("video");
      if (!video) return;
      if (index === currentIndex && video.autoplay) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }

  function update() {
    track.style.transform = `translate3d(-${currentIndex * 100}%, 0, 0)`;
    if (counter) {
      counter.textContent =
        `${String(currentIndex + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
    }
    dots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === currentIndex);
      dot.setAttribute("aria-current", index === currentIndex ? "true" : "false");
    });
    if (prevButton) prevButton.disabled = currentIndex === 0;
    if (nextButton) nextButton.disabled = currentIndex === slides.length - 1;
    pauseHiddenVideos();
  }

  function goTo(index) {
    currentIndex = Math.max(0, Math.min(index, slides.length - 1));
    update();
  }

  prevButton?.addEventListener("click", () => goTo(currentIndex - 1));
  nextButton?.addEventListener("click", () => goTo(currentIndex + 1));

  carousel.addEventListener("pointerdown", event => {
    if (event.target.closest("button, a, video[controls]")) return;
    pointerId = event.pointerId;
    startX = currentX = event.clientX;
    startY = currentY = event.clientY;
    isDragging = true;
  });

  carousel.addEventListener("pointermove", event => {
    if (!isDragging || event.pointerId !== pointerId) return;
    currentX = event.clientX;
    currentY = event.clientY;
  });

  function finishSwipe(event) {
    if (!isDragging || event.pointerId !== pointerId) return;
    const distanceX = currentX - startX;
    const distanceY = currentY - startY;

    if (Math.abs(distanceX) > 55 && Math.abs(distanceX) > Math.abs(distanceY) * 1.15) {
      goTo(currentIndex + (distanceX < 0 ? 1 : -1));
    }

    isDragging = false;
    pointerId = null;
  }

  carousel.addEventListener("pointerup", finishSwipe);
  carousel.addEventListener("pointercancel", () => {
    isDragging = false;
    pointerId = null;
  });

  carousel.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft") goTo(currentIndex - 1);
    if (event.key === "ArrowRight") goTo(currentIndex + 1);
  });

  carousel.tabIndex = 0;
  update();

  return { goTo, update };
}
