"use strict";

(function () {
  const btn = document.querySelector(".nav-burger");
  const nav = document.querySelector(".header-nav");
  if (!nav) return;

  const path = window.location.pathname.replace(/\\/g, "/").toLowerCase();
  nav.querySelectorAll("a").forEach((a) => a.removeAttribute("aria-current"));
  if (path.includes("/pledge/")) {
    const link = nav.querySelector('a[href*="pledge"]');
    if (link) link.setAttribute("aria-current", "page");
  } else if (path.includes("blog.html")) {
    const link = nav.querySelector('a[href*="blog"]');
    if (link) link.setAttribute("aria-current", "page");
  } else if (path.includes("organizations.html")) {
    const link = nav.querySelector('a[href*="organizations"]');
    if (link) link.setAttribute("aria-current", "page");
  }

  if (!btn) return;

  function setOpen(open) {
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    nav.classList.toggle("is-open", open);
  }

  btn.addEventListener("click", () => {
    setOpen(btn.getAttribute("aria-expanded") !== "true");
  });

  nav.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
})();
