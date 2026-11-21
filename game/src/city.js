// city.js: Palmetto map generation, districts, roads, buildings, beach and drawing.
(function () {
  var W = 3200;
  var H = 2400;
  var ROAD = 96;
  var BLOCK = 400;

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var rnd = mulberry32(20261121);
  function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }

  var DISTRICTS = [
    { name: 'Docks', x0: 0, y0: 0, x1: 640, y1: 2400, color: '#8a7f6a' },
    { name: 'Downtown', x0: 640, y0: 0, x1: 1920, y1: 1200, color: '#7d8aa0' },
    { name: 'Market', x0: 640, y0: 1200, x1: 1920, y1: 2400, color: '#a08a6a' },
    { name: 'Suburbs', x0: 1920, y0: 1200, x1: 2720, y1: 2400, color: '#7fa06a' },
    { name: 'Beachfront', x0: 2720, y0: 0, x1: 3200, y1: 2400, color: '#e8d29a' }
  ];

  var PALETTES = {
    Docks: ['#7a6a55', '#8c7a5e', '#6b5d4a', '#9a8a70'],
    Downtown: ['#5a6b84', '#7488a6', '#4a5a70', '#8a9ab5', '#3e4a5e', '#a67c52'],
    Market: ['#b5764a', '#c98a5a', '#a86a3e', '#d0a06a', '#8a5a3a'],
    Suburbs: ['#c98f7a', '#a8b878', '#d0b078', '#98a8c8', '#c8a898'],
    Beachfront: ['#f0e0b0', '#e8c898', '#d8b888', '#f5e8c0']
  };

  var buildings = [];
  var palms = [];
  var parks = [];
  var crates = [];
  var staticCanvas = null;

  function districtAt(x, y) {
    for (var i = 0; i < DISTRICTS.length; i++) {
      var d = DISTRICTS[i];
      if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d.name;
    }
    return 'Beachfront';
  }

  function isRoad(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    if (x >= 2720) return (y % BLOCK) < ROAD || (x % BLOCK) < ROAD;
    var rx = x % BLOCK;
    var ry = y % BLOCK;
    return rx < ROAD || ry < ROAD;
  }

  function buildCity() {
    buildings = [];
    palms = [];
    parks = [];
    crates = [];
    for (var bx = 0; bx < 8; bx++) {
      for (var by = 0; by < 6; by++) {
        var x0 = bx * BLOCK + ROAD + 14;
        var y0 = by * BLOCK + ROAD + 14;
        var bw = BLOCK - ROAD - 28;
        var bh = BLOCK - ROAD - 28;
        if (x0 >= 2720) continue;
        var dist = districtAt(x0 + bw / 2, y0 + bh / 2);
        if (dist === 'Docks' && rnd() < 0.45) {
          crates.push({ x: x0 + 20, y: y0 + 20, w: 60, h: 40, c: pick(['#b5763a', '#4a7a8a', '#8a4a3a']) });
          crates.push({ x: x0 + 110, y: y0 + 90, w: 50, h: 50, c: pick(['#b5763a', '#4a7a8a', '#8a4a3a']) });
          continue;
        }
        if ((dist === 'Suburbs' || dist === 'Market') && rnd() < 0.3) {
          parks.push({ x: x0, y: y0, w: bw, h: bh });
          for (var p = 0; p < 7; p++) palms.push({ x: x0 + 20 + rnd() * (bw - 40), y: y0 + 20 + rnd() * (bh - 40) });
          continue;
        }
        var cols = dist === 'Downtown' ? 2 : 1;
        for (var c = 0; c < cols; c++) {
          var w2 = cols === 2 ? bw / 2 - 12 : bw;
          var h2 = cols === 2 ? bh : bh;
          var tall = dist === 'Downtown';
          buildings.push({
            x: x0 + (cols === 2 ? c * (bw / 2 + 6) : 0),
            y: y0,
            w: w2,
            h: h2,
            color: pick(PALETTES[dist] || PALETTES.Downtown),
            roof: pick(['#3a3a3a', '#555', '#6a5a4a', '#2e4a3a']),
            tall: tall,
            windows: tall ? 6 : 3
          });
        }
      }
    }
    for (var i = 0; i < 46; i++) {
      palms.push({ x: 2760 + rnd() * 380, y: 60 + rnd() * 2280 });
    }
    for (var j = 0; j < 30; j++) {
      palms.push({ x: 100 + rnd() * 3000, y: 100 + rnd() * 2200, skip: true });
    }
    palms = palms.filter(function (p) { return !p.skip || isRoad(p.x, p.y) === false; });
  }

  function collideCircle(x, y, r) {
    if (x < r || y < r || x > W - r || y > H - r) return true;
    for (var i = 0; i < buildings.length; i++) {
      var b = buildings[i];
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
    }
    return false;
  }

  function drawPalm(ctx, x, y) {
    ctx.strokeStyle = '#7a5a34';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y - 16); ctx.stroke();
    ctx.fillStyle = '#3f8a4a';
    for (var i = 0; i < 6; i++) {
      var a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(x + 3 + Math.cos(a) * 9, y - 16 + Math.sin(a) * 6, 11, 4, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw(ctx, cam) {
    var x0 = Math.max(0, cam.x - 40), y0 = Math.max(0, cam.y - 40);
    var x1 = Math.min(W, cam.x + cam.w + 40), y1 = Math.min(H, cam.y + cam.h + 40);
    // The city never changes, so draw it once to an offscreen canvas and
    // blit the camera crop each frame. When there is no real canvas (a
    // headless harness), fall through to the per-frame draw below.
    if (staticCanvas) {
      ctx.drawImage(staticCanvas, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
      return;
    }
    ctx.fillStyle = '#8fbf6a';
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = '#3a7a9e';
    ctx.fillRect(Math.max(x0, 2960), y0, x1 - Math.max(x0, 2960), y1 - y0);
    ctx.fillStyle = '#f0dc9e';
    ctx.fillRect(Math.max(x0, 2720), y0, Math.min(x1, 2960) - Math.max(x0, 2720), y1 - y0);
    ctx.fillStyle = '#4a4a4a';
    for (var gx = 0; gx < 8; gx++) {
      for (var gy = 0; gy < 6; gy++) {
        var rx = gx * BLOCK, ry = gy * BLOCK;
        if (rx + ROAD < x0 || rx > x1 || ry + ROAD < y0 || ry > y1) continue;
        ctx.fillRect(rx, ry, ROAD, BLOCK);
        ctx.fillRect(rx, ry, BLOCK, ROAD);
      }
    }
    ctx.fillStyle = '#5a5a5a';
    for (var vx = 0; vx < 8; vx++) ctx.fillRect(vx * BLOCK, 0, ROAD, H);
    for (var vy = 0; vy < 6; vy++) ctx.fillRect(0, vy * BLOCK, W, ROAD);
    ctx.strokeStyle = '#e8c83a';
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 22]);
    ctx.beginPath();
    for (var dx = 0; dx < 8; dx++) { ctx.moveTo(dx * BLOCK + ROAD / 2, 0); ctx.lineTo(dx * BLOCK + ROAD / 2, H); }
    for (var dy = 0; dy < 6; dy++) { ctx.moveTo(0, dy * BLOCK + ROAD / 2); ctx.lineTo(W, dy * BLOCK + ROAD / 2); }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#5a9a4a';
    for (var pi = 0; pi < parks.length; pi++) {
      var pk = parks[pi];
      ctx.fillRect(pk.x, pk.y, pk.w, pk.h);
    }
    for (var bi = 0; bi < buildings.length; bi++) {
      var b = buildings[bi];
      if (b.x + b.w < x0 || b.x > x1 || b.y + b.h < y0 || b.y > y1) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, 14);
      ctx.fillStyle = 'rgba(255,240,180,0.85)';
      var rows = b.tall ? 5 : 2;
      for (var wy = 0; wy < rows; wy++) {
        for (var wx = 0; wx < b.windows; wx++) {
          ctx.fillRect(b.x + 12 + wx * ((b.w - 24) / b.windows), b.y + 30 + wy * 26, 10, 12);
        }
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    }
    for (var ci = 0; ci < crates.length; ci++) {
      var cr = crates[ci];
      ctx.fillStyle = cr.c;
      ctx.fillRect(cr.x, cr.y, cr.w, cr.h);
      ctx.strokeStyle = '#333';
      ctx.strokeRect(cr.x, cr.y, cr.w, cr.h);
    }
    for (var pli = 0; pli < palms.length; pli++) {
      var pl = palms[pli];
      if (pl.x < x0 || pl.x > x1 || pl.y < y0 || pl.y > y1) continue;
      drawPalm(ctx, pl.x, pl.y);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (var wi = 0; wi < 24; wi++) {
      var wx2 = 2970 + ((wi * 37) % 210);
      var wy2 = ((wi * 89) % 2300) + 20;
      ctx.fillRect(wx2, wy2, 26, 3);
    }
    ctx.fillStyle = '#222';
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'left';
    for (var di = 0; di < DISTRICTS.length; di++) {
      var d = DISTRICTS[di];
      var lx = (d.x0 + d.x1) / 2 - 40, ly = (d.y0 + d.y1) / 2;
      if (lx < x0 || lx > x1 || ly < y0 || ly > y1) continue;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText(d.name.toUpperCase(), lx, ly);
    }
  }

  // Render the whole static city once. Guarded: any environment without a
  // working canvas leaves staticCanvas null and draw() falls back.
  function buildStatic() {
    staticCanvas = null;
    try {
      if (typeof document === 'undefined' || !document.createElement) return;
      var c = document.createElement('canvas');
      if (!c || typeof c.getContext !== 'function') return;
      c.width = W; c.height = H;
      var sctx = c.getContext('2d');
      if (!sctx) return;
      draw(sctx, { x: 0, y: 0, w: W, h: H });
      staticCanvas = c;
    } catch (e) {
      staticCanvas = null;
    }
  }

  buildCity();
  buildStatic();

  window.City = {
    W: W, H: H, ROAD: ROAD, BLOCK: BLOCK,
    buildings: buildings, palms: palms, parks: parks,
    districtAt: districtAt, isRoad: isRoad, collideCircle: collideCircle,
    staticReady: function () { return !!staticCanvas; },
    safehouse: { x: 2080, y: 2100 },
    sprayShop: { x: 1500, y: 500 },
    draw: draw
  };
})();
