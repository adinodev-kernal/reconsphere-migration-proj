// ═══════════════════════════════════════════════════════
// grid.js — Interactive background grid that responds to mouse
// ═══════════════════════════════════════════════════════
(function(){
  const canvas = document.getElementById('grid-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, dpr;
  let mx = -9999, my = -9999;   // mouse position
  const CELL = 48;               // base grid cell size
  const RADIUS = 220;            // influence radius around cursor
  const MAX_WARP = 0.45;         // max scale factor (0.45 = 45% larger)
  const FADE_TOP = 0.55;         // how far down the fade reaches (0-1)
  const LINE_ALPHA = 0.06;       // base line opacity
  const GLOW_ALPHA = 0.12;       // boosted opacity near cursor

  // Smoothed mouse for organic feel
  let smx = -9999, smy = -9999;
  const SMOOTH = 0.08;

  function resize(){
    dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(){
    // Smooth mouse interpolation
    if(smx < -5000){ smx = mx; smy = my; }
    smx += (mx - smx) * SMOOTH;
    smy += (my - smy) * SMOOTH;

    ctx.clearRect(0, 0, W, H);

    const cols = Math.ceil(W / CELL) + 2;
    const rows = Math.ceil(H / CELL) + 2;

    // Draw vertical lines
    for(let i = 0; i <= cols; i++){
      const baseX = i * CELL;
      ctx.beginPath();
      for(let j = 0; j <= rows * 2; j++){
        const y = j * (CELL / 2);
        const x = warpX(baseX, y);
        const alpha = getAlpha(baseX, y);
        if(j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      // Use gradient along each line isn't practical, so we draw segments
      ctx.stroke();
    }

    // Actually, let's draw individual segments for proper alpha control
    ctx.clearRect(0, 0, W, H);

    // Horizontal lines
    for(let j = 0; j <= rows; j++){
      const baseY = j * CELL;
      for(let i = 0; i < cols; i++){
        const x1 = i * CELL;
        const x2 = (i + 1) * CELL;
        const wx1 = warpX(x1, baseY);
        const wy1 = warpY(x1, baseY);
        const wx2 = warpX(x2, baseY);
        const wy2 = warpY(x2, baseY);
        const midX = (x1 + x2) / 2;
        const a = getAlpha(midX, baseY);
        if(a < 0.003) continue;
        ctx.beginPath();
        ctx.moveTo(wx1, wy1);
        ctx.lineTo(wx2, wy2);
        ctx.strokeStyle = 'rgba(255,255,255,' + a.toFixed(4) + ')';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    // Vertical lines
    for(let i = 0; i <= cols; i++){
      const baseX = i * CELL;
      for(let j = 0; j < rows; j++){
        const y1 = j * CELL;
        const y2 = (j + 1) * CELL;
        const wx1 = warpX(baseX, y1);
        const wy1 = warpY(baseX, y1);
        const wx2 = warpX(baseX, y2);
        const wy2 = warpY(baseX, y2);
        const midY = (y1 + y2) / 2;
        const a = getAlpha(baseX, midY);
        if(a < 0.003) continue;
        ctx.beginPath();
        ctx.moveTo(wx1, wy1);
        ctx.lineTo(wx2, wy2);
        ctx.strokeStyle = 'rgba(255,255,255,' + a.toFixed(4) + ')';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    requestAnimationFrame(draw);
  }

  function warpX(x, y){
    const dx = x - smx;
    const dy = y - smy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if(dist > RADIUS || dist < 1) return x;
    const factor = 1 - dist / RADIUS;
    const strength = factor * factor * MAX_WARP;
    return x + dx * strength;
  }

  function warpY(x, y){
    const dx = x - smx;
    const dy = y - smy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if(dist > RADIUS || dist < 1) return y;
    const factor = 1 - dist / RADIUS;
    const strength = factor * factor * MAX_WARP;
    return y + dy * strength;
  }

  function getAlpha(x, y){
    // Vertical fade — strongest at top, fading out
    const vFade = 1 - Math.min(y / (H * FADE_TOP), 1);
    const vAlpha = vFade * vFade;

    // Mouse proximity glow
    const dx = x - smx;
    const dy = y - smy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const mFactor = dist < RADIUS ? (1 - dist / RADIUS) : 0;
    const mGlow = mFactor * mFactor * GLOW_ALPHA;

    return vAlpha * LINE_ALPHA + mGlow;
  }

  // Events
  window.addEventListener('resize', resize);

  // Desktop: mouse tracking
  document.addEventListener('mousemove', function(e){
    mx = e.clientX;
    my = e.clientY;
  });
  document.addEventListener('mouseleave', function(){
    mx = -9999;
    my = -9999;
  });

  // Mobile: touch tracking — finger drag animates the grid
  document.addEventListener('touchstart', function(e){
    const t = e.touches[0];
    if(t){ mx = t.clientX; my = t.clientY; }
  }, { passive: true });

  document.addEventListener('touchmove', function(e){
    const t = e.touches[0];
    if(t){ mx = t.clientX; my = t.clientY; }
  }, { passive: true });

  document.addEventListener('touchend', function(){
    // Smoothly fade the effect out instead of snapping
    mx = -9999;
    my = -9999;
  });

  resize();
  draw();
})();
