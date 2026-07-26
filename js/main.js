const buttons = [...document.querySelectorAll("[data-page]")];
const panels = [...document.querySelectorAll("[data-page-panel]")];
const jumpButtons = [...document.querySelectorAll("[data-jump]")];

function showPage(pageName, updateHash = true) {
  const targetPanel = panels.find(panel => panel.dataset.pagePanel === pageName);
  if (!targetPanel) return;

  panels.forEach(panel => {
    const active = panel === targetPanel;
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.toggle("is-visible", active));
    panel.setAttribute("aria-hidden", String(!active));
    if (!active) setTimeout(() => {
      if (!panel.classList.contains("is-visible")) panel.hidden = true;
    }, 560);
  });

  buttons.forEach(button => {
    const active = button.dataset.page === pageName;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });

  if (updateHash) history.replaceState(null, "", `#${pageName}`);
}

buttons.forEach(button => button.addEventListener("click", () => showPage(button.dataset.page)));
jumpButtons.forEach(button => button.addEventListener("click", () => showPage(button.dataset.jump)));
window.addEventListener("hashchange", () => {
  const page = location.hash.slice(1);
  showPage(panels.some(panel => panel.dataset.pagePanel === page) ? page : "home", false);
});
const initialPage = location.hash.slice(1);
showPage(panels.some(panel => panel.dataset.pagePanel === initialPage) ? initialPage : "home", false);

document.querySelectorAll("[data-carousel]").forEach((carousel) => {
  const track = carousel.querySelector(".carousel-track");
  const slides = [...carousel.querySelectorAll(".carousel-slide")];
  const prevButton = carousel.querySelector(".carousel-prev");
  const nextButton = carousel.querySelector(".carousel-next");
  const counter = carousel.querySelector(".carousel-counter");
  const dotsContainer = carousel.querySelector(".carousel-dots");

  let currentIndex = 0;
  let startX = 0;
  let currentX = 0;
  let isDragging = false;

  const dots = slides.map((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "carousel-dot";
    dot.setAttribute("aria-label", `切換到第 ${index + 1} 件作品`);
    dot.addEventListener("click", () => goTo(index));
    dotsContainer.appendChild(dot);
    return dot;
  });

  function update() {
    track.style.transform = `translate3d(-${currentIndex * 100}%,0,0)`;
    counter.textContent = `${String(currentIndex + 1).padStart(2,"0")} / ${String(slides.length).padStart(2,"0")}`;
    dots.forEach((dot, index) => dot.classList.toggle("is-active", index === currentIndex));
    prevButton.disabled = currentIndex === 0;
    nextButton.disabled = currentIndex === slides.length - 1;
  }

  function goTo(index) {
    currentIndex = Math.max(0, Math.min(index, slides.length - 1));
    update();
  }

  prevButton.addEventListener("click", () => goTo(currentIndex - 1));
  nextButton.addEventListener("click", () => goTo(currentIndex + 1));

  carousel.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button, a")) return;
    isDragging = true;
    startX = currentX = event.clientX;
    carousel.setPointerCapture?.(event.pointerId);
  });
  carousel.addEventListener("pointermove", (event) => {
    if (isDragging) currentX = event.clientX;
  });
  carousel.addEventListener("pointerup", () => {
    if (!isDragging) return;
    const distance = currentX - startX;
    if (Math.abs(distance) > 55) goTo(currentIndex + (distance < 0 ? 1 : -1));
    isDragging = false;
  });
  carousel.addEventListener("pointercancel", () => { isDragging = false; });

  carousel.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") goTo(currentIndex - 1);
    if (event.key === "ArrowRight") goTo(currentIndex + 1);
  });
  carousel.tabIndex = 0;
  update();
});
