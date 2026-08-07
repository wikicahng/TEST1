import { loadWorks, renderCarousel } from "./works-loader.js?v=2.2.0";
import { initCarousel } from "./carousel.js?v=2.2.0";
import { initLightbox } from "./lightbox.js?v=2.2.0";
import {
  collectPreloadManifest,
  preloadInitialAssets,
  startBackgroundVideoPreload
} from "./preloader.js?v=2.2.0";

const buttons = [...document.querySelectorAll("[data-page]")];
const panels = [...document.querySelectorAll("[data-page-panel]")];
const jumpButtons = [...document.querySelectorAll("[data-jump]")];

function createLoaderController() {
  const root = document.querySelector("#siteLoader");
  const bar = root?.querySelector("[data-loader-bar]");
  const percent = root?.querySelector("[data-loader-percent]");
  const count = root?.querySelector("[data-loader-count]");
  const status = root?.querySelector("[data-loader-status]");
  const detail = root?.querySelector("[data-loader-detail]");
  const skip = root?.querySelector("[data-loader-skip]");

  let skipResolve;
  let finished = false;

  const skipPromise = new Promise(resolve => {
    skipResolve = resolve;
  });

  function setProgress({ completed = 0, total = 0, percent: value = 0, phase, src, failed = 0 }) {
    const safePercent = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

    if (bar) bar.style.width = `${safePercent}%`;
    if (percent) percent.textContent = `${safePercent}%`;
    if (count) count.textContent = `${completed} / ${total}`;

    if (status) {
      if (phase === "image") status.textContent = "Preloading image assets...";
      else if (phase === "video") status.textContent = "Preparing video playback...";
      else if (phase === "ready") status.textContent = "Archive ready";
      else status.textContent = "Loading archive assets...";
    }

    if (detail) {
      const filename = src ? src.split("/").pop() : "";
      detail.textContent = failed
        ? `${filename || "Media"} · ${failed} skipped/failed`
        : (filename || "Preparing media index");
    }
  }

  function setManifest(total) {
    if (count) count.textContent = `0 / ${total}`;
    if (detail) detail.textContent = `${total} media items queued`;
  }

  function allowSkip(delay = 4500) {
    window.setTimeout(() => {
      if (finished || !skip) return;
      skip.hidden = false;
      root?.classList.add("is-skippable");
    }, delay);
  }

  skip?.addEventListener("click", () => {
    if (finished) return;
    skipResolve?.("skipped");
  });

  async function waitForSkip() {
    return skipPromise;
  }

  async function finish(message = "ARCHIVE READY") {
    if (finished) return;
    finished = true;

    if (status) status.textContent = message;
    if (detail) detail.textContent = "Entering visual archive";
    if (bar) bar.style.width = "100%";
    if (percent) percent.textContent = "100%";
    if (skip) skip.hidden = true;

    root?.classList.add("is-complete");
    root?.setAttribute("aria-busy", "false");
    document.body.classList.remove("site-loading");

    await new Promise(resolve => window.setTimeout(resolve, 520));
    root?.remove();
  }

  function fail(message) {
    if (status) status.textContent = "ARCHIVE LOAD ERROR";
    if (detail) detail.textContent = message;
    root?.classList.add("has-error");
    if (skip) {
      skip.hidden = false;
      skip.textContent = "OPEN SITE";
    }
  }

  return { setProgress, setManifest, allowSkip, waitForSkip, finish, fail };
}

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

function renderWorks(data) {
  for (const [key, section] of Object.entries(data)) {
    const container = document.querySelector(`[data-carousel="${key}"]`);
    const loading = document.querySelector(`[data-loading="${key}"]`);
    if (!container) continue;

    renderCarousel(container, section);
    loading?.remove();
    initCarousel(container);
  }
}

function showWorksError() {
  document.querySelectorAll("[data-loading]").forEach(element => {
    element.classList.add("is-error");
    element.textContent = "作品資料載入失敗，請確認 data/works.json 路徑與格式。";
  });
}

async function bootstrap() {
  const loader = createLoaderController();

  initNavigation();
  initLightbox();

  try {
    loader.setProgress({
      completed: 0,
      total: 0,
      percent: 0,
      phase: "manifest"
    });

    const data = await loadWorks("data/works.json?v=2.2.0");
    const manifest = collectPreloadManifest(data, ["assets/solar-system.png"]);
    const total = manifest.images.length + manifest.videos.length;

    loader.setManifest(total);
    loader.allowSkip();

    const criticalPreload = preloadInitialAssets(manifest, {
      onProgress: progress => loader.setProgress(progress)
    });

    const gate = await Promise.race([
      criticalPreload.then(result => ({ type: "ready", result })),
      loader.waitForSkip().then(() => ({ type: "skipped" }))
    ]);

    renderWorks(data);

    if (gate.type === "skipped") {
      await loader.finish("ARCHIVE READY · LOADING CONTINUES");
    } else {
      await loader.finish("ARCHIVE READY");
    }

    // Continue any unfinished initial work first, then warm larger MP4 files
    // one at a time in the background.
    criticalPreload
      .catch(error => console.warn("Initial preload warning:", error))
      .finally(() => {
        startBackgroundVideoPreload(manifest, {
          onProgress: progress => {
            if (!progress?.skipped) {
              console.debug("Background video preload:", progress);
            }
          }
        }).catch(error => console.warn("Background preload warning:", error));
      });

  } catch (error) {
    console.error(error);
    showWorksError();
    loader.fail("Unable to load works.json");

    // Let the user enter the shell instead of trapping them on an error screen.
    const action = loader.waitForSkip();
    await action;
    await loader.finish("OPENING ARCHIVE");
  }
}

bootstrap();
