// Tiny canvas confetti for the podium.
(function () {
  'use strict';

  const COLORS = ['#c6ff00', '#00d4ff', '#ff3860', '#ffb800', '#16c172', '#ffffff'];
  let canvas, ctx, pieces = [], raf = 0, spawnUntil = 0;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(n) {
    for (let i = 0; i < n; i++) {
      pieces.push({
        x: Math.random() * innerWidth,
        y: -20 - Math.random() * 100,
        w: 6 + Math.random() * 8,
        h: 8 + Math.random() * 10,
        vx: -2 + Math.random() * 4,
        vy: 2 + Math.random() * 4,
        rot: Math.random() * Math.PI,
        vr: -0.2 + Math.random() * 0.4,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        wobble: Math.random() * 10,
      });
    }
  }

  function frame(now) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (now < spawnUntil) spawn(4);
    pieces = pieces.filter((p) => p.y < innerHeight + 40);
    for (const p of pieces) {
      p.wobble += 0.08;
      p.x += p.vx + Math.sin(p.wobble) * 0.8;
      p.y += p.vy;
      p.vy = Math.min(p.vy + 0.04, 7);
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.wobble)));
      ctx.restore();
    }
    raf = pieces.length || now < spawnUntil ? requestAnimationFrame(frame) : 0;
  }

  window.Confetti = {
    burst(seconds) {
      canvas = canvas || document.getElementById('confetti');
      if (!canvas) return;
      ctx = ctx || canvas.getContext('2d');
      resize();
      spawn(160);
      spawnUntil = performance.now() + (seconds || 5) * 1000;
      if (!raf) raf = requestAnimationFrame(frame);
    },
    stop() {
      spawnUntil = 0;
      pieces = [];
      if (ctx) ctx.clearRect(0, 0, innerWidth, innerHeight);
    },
  };

  window.addEventListener('resize', () => canvas && ctx && resize());
})();
