const toggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-site-nav]");

if (toggle && nav) {
  const desktop = window.matchMedia("(min-width: 62.001rem)");

  const syncNavigation = () => {
    if (desktop.matches) {
      nav.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
    } else if (!toggle.dataset.touched) {
      nav.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    }
  };

  toggle.addEventListener("click", () => {
    toggle.dataset.touched = "true";
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    nav.hidden = expanded;
  });

  desktop.addEventListener("change", () => {
    delete toggle.dataset.touched;
    syncNavigation();
  });

  syncNavigation();
}

document.querySelectorAll("a[target='_blank']").forEach((link) => {
  link.rel = "noopener noreferrer";
});
