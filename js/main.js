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
    if (!active) {
      window.setTimeout(() => {
        if (!panel.classList.contains("is-visible")) panel.hidden = true;
      }, 560);
    }
  });

  buttons.forEach(button => {
    const active = button.dataset.page === pageName;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });

  if (updateHash) {
    history.replaceState(null, "", `#${pageName}`);
  }

  document.title = {
    home: "VROID DESIGN ARCHIVE",
    background: "皇家大魔法圖書館｜VROID DESIGN",
    character: "VROID角色＆衣服設計｜VROID DESIGN"
  }[pageName] || "VROID DESIGN ARCHIVE";
}

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

const initialPage = location.hash.slice(1);
showPage(panels.some(panel => panel.dataset.pagePanel === initialPage) ? initialPage : "home", false);
