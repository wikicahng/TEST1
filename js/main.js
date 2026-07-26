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




/* ========================================
   全螢幕圖片／影片檢視器
======================================== */

const lightbox = document.querySelector("#mediaLightbox");
const lightboxStage = lightbox?.querySelector("[data-lightbox-stage]");
const lightboxMedia = lightbox?.querySelector("[data-lightbox-media]");
const scaleDisplay = lightbox?.querySelector("[data-lightbox-scale]");

const zoomInButton = lightbox?.querySelector("[data-lightbox-zoom-in]");
const zoomOutButton = lightbox?.querySelector("[data-lightbox-zoom-out]");
const resetButton = lightbox?.querySelector("[data-lightbox-reset]");
const closeButton = lightbox?.querySelector("[data-lightbox-close]");

let lightboxScale = 1;
let lightboxX = 0;
let lightboxY = 0;

let isLightboxDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;
const SCALE_STEP = 0.25;

/* 更新縮放與移動位置 */
function updateLightboxTransform() {
  if (!lightboxMedia) return;

  lightboxMedia.style.transform =
    `translate3d(${lightboxX}px, ${lightboxY}px, 0) ` +
    `scale(${lightboxScale})`;

  if (scaleDisplay) {
    scaleDisplay.textContent =
      `${Math.round(lightboxScale * 100)}%`;
  }
}

/* 恢復初始狀態 */
function resetLightboxTransform() {
  lightboxScale = 1;
  lightboxX = 0;
  lightboxY = 0;

  updateLightboxTransform();
}

/* 設定縮放 */
function setLightboxScale(nextScale) {
  lightboxScale = Math.min(
    MAX_SCALE,
    Math.max(MIN_SCALE, nextScale)
  );

  /* 縮回 100% 以下時回到畫面中央 */
  if (lightboxScale <= 1) {
    lightboxX = 0;
    lightboxY = 0;
  }

  updateLightboxTransform();
}

/* 開啟圖片或影片 */
function openMediaLightbox(sourceElement) {
  if (!lightbox || !lightboxMedia) return;

  lightboxMedia.replaceChildren();
  resetLightboxTransform();

  let expandedMedia;

  if (sourceElement.tagName === "VIDEO") {
    expandedMedia = document.createElement("video");

    expandedMedia.src =
      sourceElement.currentSrc ||
      sourceElement.querySelector("source")?.src ||
      sourceElement.src;

    expandedMedia.controls = true;
    expandedMedia.autoplay = true;
    expandedMedia.loop = sourceElement.loop;
    expandedMedia.muted = sourceElement.muted;
    expandedMedia.playsInline = true;

    if (sourceElement.poster) {
      expandedMedia.poster = sourceElement.poster;
    }
  } else {
    expandedMedia = document.createElement("img");

    expandedMedia.src =
      sourceElement.currentSrc ||
      sourceElement.src;

    expandedMedia.alt =
      sourceElement.alt ||
      "全螢幕作品圖片";

    expandedMedia.draggable = false;
  }

  lightboxMedia.appendChild(expandedMedia);

  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("lightbox-open");

  closeButton?.focus();
}

/* 關閉 */
function closeMediaLightbox() {
  if (!lightbox || !lightboxMedia) return;

  const video = lightboxMedia.querySelector("video");

  if (video) {
    video.pause();
    video.removeAttribute("src");
    video.load();
  }

  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("lightbox-open");

  lightboxMedia.replaceChildren();
  resetLightboxTransform();
}

/* 點擊作品圖片或影片 */
document
  .querySelectorAll(".project-media > img, .project-media > video")
  .forEach((media) => {
    media.setAttribute("tabindex", "0");
    media.setAttribute("role", "button");
    media.setAttribute("aria-label", "開啟全螢幕作品");

    media.addEventListener("click", (event) => {
      event.stopPropagation();
      openMediaLightbox(media);
    });

    media.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openMediaLightbox(media);
      }
    });
  });

zoomInButton?.addEventListener("click", () => {
  setLightboxScale(lightboxScale + SCALE_STEP);
});

zoomOutButton?.addEventListener("click", () => {
  setLightboxScale(lightboxScale - SCALE_STEP);
});

resetButton?.addEventListener("click", () => {
  resetLightboxTransform();
});

closeButton?.addEventListener("click", () => {
  closeMediaLightbox();
});

/* 點擊黑色外圍關閉 */
lightbox?.addEventListener("click", (event) => {
  if (
    event.target === lightbox ||
    event.target === lightboxStage
  ) {
    closeMediaLightbox();
  }
});

/* ESC 關閉 */
document.addEventListener("keydown", (event) => {
  if (!lightbox?.classList.contains("is-open")) return;

  if (event.key === "Escape") {
    closeMediaLightbox();
  }

  if (event.key === "+" || event.key === "=") {
    setLightboxScale(lightboxScale + SCALE_STEP);
  }

  if (event.key === "-") {
    setLightboxScale(lightboxScale - SCALE_STEP);
  }

  if (event.key === "0") {
    resetLightboxTransform();
  }
});

/* 滑鼠滾輪縮放 */
lightboxStage?.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();

    const direction = event.deltaY < 0 ? 1 : -1;

    setLightboxScale(
      lightboxScale + direction * SCALE_STEP
    );
  },
  { passive: false }
);

/* 放大後拖曳 */
lightboxStage?.addEventListener("pointerdown", (event) => {
  if (lightboxScale <= 1) return;

  /* 操作影片控制列時不啟動拖曳 */
  if (event.target.closest("video")) return;

  isLightboxDragging = true;

  dragStartX = event.clientX;
  dragStartY = event.clientY;

  dragOriginX = lightboxX;
  dragOriginY = lightboxY;

  lightboxStage.classList.add("is-dragging");
  lightboxStage.setPointerCapture?.(event.pointerId);
});

lightboxStage?.addEventListener("pointermove", (event) => {
  if (!isLightboxDragging) return;

  lightboxX =
    dragOriginX + event.clientX - dragStartX;

  lightboxY =
    dragOriginY + event.clientY - dragStartY;

  updateLightboxTransform();
});

function stopLightboxDragging() {
  isLightboxDragging = false;
  lightboxStage?.classList.remove("is-dragging");
}

lightboxStage?.addEventListener(
  "pointerup",
  stopLightboxDragging
);

lightboxStage?.addEventListener(
  "pointercancel",
  stopLightboxDragging
);

/* 雙擊快速放大／恢復 */
lightboxMedia?.addEventListener("dblclick", () => {
  if (lightboxScale > 1) {
    resetLightboxTransform();
  } else {
    setLightboxScale(2);
  }
});
