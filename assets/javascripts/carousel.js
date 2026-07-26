/* 3C field-guide hero carousel — progressive enhancement, zero deps.
 * No-JS fallback: the .fg-slide <figure>s render stacked (CSS default).
 * This script adds .fg-carousel--ready and slider behaviour. WCAG 2.2:
 * auto-advance pauses on hover/focus, stops permanently on first manual
 * interaction, and never auto-advances under prefers-reduced-motion. */
(function () {
  "use strict";

  function setupCarousel(root) {
    if (root.dataset.fgReady === "1") return; // idempotent (instant-nav safe)
    root.dataset.fgReady = "1";

    var track = root.querySelector(".fg-carousel-track");
    var slides = Array.prototype.slice.call(root.querySelectorAll(".fg-slide"));
    var dotsWrap = root.querySelector(".fg-carousel-dots");
    if (!track || slides.length < 2 || !dotsWrap) return;

    root.classList.add("fg-carousel--ready");
    var reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    var index = 0;
    var stopped = false; // permanent after first manual interaction
    var timer = null;

    slides.forEach(function (s, i) {
      s.setAttribute("aria-roledescription", "slide");
      s.setAttribute("aria-label", i + 1 + " of " + slides.length);
      var d = document.createElement("button");
      d.type = "button";
      d.className = "fg-dot";
      d.setAttribute("role", "tab");
      d.setAttribute("aria-label", "Slide " + (i + 1));
      d.addEventListener("click", function () {
        halt();
        go(i);
      });
      dotsWrap.appendChild(d);
    });
    var dots = Array.prototype.slice.call(dotsWrap.children);

    function render() {
      track.style.transform = "translateX(" + -index * 100 + "%)";
      slides.forEach(function (s, i) {
        s.setAttribute("aria-hidden", i === index ? "false" : "true");
      });
      dots.forEach(function (d, i) {
        d.setAttribute("aria-selected", i === index ? "true" : "false");
        d.classList.toggle("is-active", i === index);
      });
    }
    function go(i) {
      index = (i + slides.length) % slides.length;
      render();
    }
    function next() {
      go(index + 1);
    }
    function start() {
      if (reduced || stopped || timer) return;
      timer = window.setInterval(next, 5000);
    }
    function pause() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }
    function halt() {
      // permanent: user took control
      stopped = true;
      pause();
    }

    root.addEventListener("mouseenter", pause);
    root.addEventListener("mouseleave", start);
    root.addEventListener("focusin", pause);
    root.addEventListener("focusout", start);

    track.setAttribute("tabindex", "0");
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") {
        halt();
        go(index - 1);
      } else if (e.key === "ArrowRight") {
        halt();
        go(index + 1);
      }
    });

    var x0 = null;
    track.addEventListener("pointerdown", function (e) {
      x0 = e.clientX;
    });
    track.addEventListener("pointerup", function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) < 40) return;
      halt();
      go(index + (dx < 0 ? 1 : -1));
    });

    render();
    start();
  }

  function initCarousels() {
    var nodes = document.querySelectorAll("[data-fg-carousel]");
    Array.prototype.forEach.call(nodes, setupCarousel);
  }

  if (document.readyState !== "loading") {
    initCarousels();
  } else {
    document.addEventListener("DOMContentLoaded", initCarousels);
  }
  // MkDocs Material instant navigation swaps <main> without a full reload.
  if (typeof window.document$ !== "undefined" && window.document$.subscribe) {
    window.document$.subscribe(initCarousels);
  }
})();
