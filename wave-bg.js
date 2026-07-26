// #164 — Vanta DOTS init. Loaded as a plain <script> AFTER
// three.min.js + vanta.dots.min.js (which set window.THREE /
// window.VANTA). Skips on reduced-motion or no WebGL → white shows.
// #236 — recoloured to the deck palette (indigo dots on white).
(function () {
  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gl = false;
  try {
    var c = document.createElement("canvas");
    gl = !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch (e) {
    gl = false;
  }
  if (!reduce && gl && window.VANTA && window.VANTA.DOTS) {
    window.VANTA.DOTS({
      el: "#wave-bg",
      THREE: window.THREE,
      backgroundColor: 0xffffff,
      color: 0x6366f1,
      color2: 0xc7d2fe,
      showLines: false,
      mouseControls: false,
      touchControls: false,
      gyroControls: false,
      size: 3.0,
      spacing: 28.0,
    });
  }
})();
