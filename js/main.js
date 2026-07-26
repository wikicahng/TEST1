import { loadWorks, renderCarousel } from "./works-loader.js?v=2.0.0";
import { initCarousel } from "./carousel.js?v=2.0.0";
import { initLightbox } from "./lightbox.js?v=2.0.0";

const buttons = [...document.querySelectorAll("[data-page]")];
const panels = [...document.querySelectorAll("[data-page-panel]")];
const jumpButtons = [...document.querySelectorAll("[data-jump]")];

function showPage(pageName, updateHash = true) {
  const target = panels.find(panel => panel.dataset.pagePanel === pageName);
  if (!target) return;

  panels.forEach(panel => {
    const active = panel === target;
    panel.hidden = !active;
    panel.classList.toggle("is-visible", active);
    panel.setAttribute("aria-hidden", String(!active));
  });

  buttons.forEach(button => {
    const active = button.dataset.page === pageName;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });

  if (updateHash) history.replaceState(null, "", `#${pageName}`);
  window.scrollTo({ top: 0, behavior: "auto" });
}

function initNavigation() {
  buttons.forEach(button => {
    button.addEventListener("click", () => showPage(button.dataset.page));
  });

  jumpButtons.forEach(button => {
    button.addEventListener("click", () => showPage(button.dataset.jump));
  });

  window.addEventListener("hashchange", () => {
    const page = location.hash.slice(1);
    showPage(panels.some(panel => panel.dataset.pagePanel === page) ? page : "home", false);
  });

  const initial = location.hash.slice(1);
  showPage(panels.some(panel => panel.dataset.pagePanel === initial) ? initial : "home", false);
}

async function initWorks() {
  try {
    const data = await loadWorks(`data/works.json?v=${Date.now()}`);

    for (const [key, section] of Object.entries(data)) {
      const container = document.querySelector(`[data-carousel="${key}"]`);
      const loading = document.querySelector(`[data-loading="${key}"]`);
      if (!container) continue;

      renderCarousel(container, section);
      loading?.remove();
      initCarousel(container);
    }
  } catch (error) {
    console.error(error);
    document.querySelectorAll("[data-loading]").forEach(element => {
      element.classList.add("is-error");
      element.textContent = "作品資料載入失敗，請確認 data/works.json 路徑與格式。";
    });
  }
}

initNavigation();
initLightbox();
initWorks();
