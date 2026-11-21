// pedestrians.js: sidewalk walkers who flee when scared.
(function () {
  var peds = [];
  var SHIRTS = ['#c84a6a', '#4a8ac8', '#e8a83a', '#6ac84a', '#8a5ac8', '#e8e8e8', '#3a3a3a'];
  var SKINS = ['#f0c090', '#c89060', '#8a5a30', '#e8b890'];

  function placeSpot(x, y) {
    for (var t = 0; t < 20; t++) {
      var cx = x + Math.random() * 60, cy = y + Math.random() * 60;
      if (City.isRoad(cx, cy) && !City.collideCircle(cx, cy, 10)) return { x: cx, y: cy };
    }
    for (var r = 12; r <= 120; r += 12) {
      for (var k = 0; k < 12; k++) {
        var a = (k / 12) * Math.PI * 2;
        var px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        if (px < 24 || py < 24 || px > City.W - 24 || py > City.H - 24) continue;
        if (City.isRoad(px, py) && !City.collideCircle(px, py, 10)) return { x: px, y: py };
      }
    }
    return { x: x, y: y };
  }

  function spawnWorld() {
    peds = [];
    var spots = [
      [500, 300], [900, 300], [1300, 300], [1700, 300], [2100, 300], [2500, 300],
      [500, 700], [900, 700], [1500, 700], [2100, 700], [500, 1100], [1100, 1100],
      [1700, 1100], [2300, 1100], [500, 1500], [1000, 1500], [1600, 1500], [2200, 1500],
      [700, 1900], [1300, 1900], [1900, 1900], [2600, 1900], [2800, 700], [2800, 1500]
    ];
    for (var i = 0; i < spots.length; i++) {
      var at = placeSpot(spots[i][0], spots[i][1]);
      peds.push({
        x: at.x, y: at.y,
        angle: Math.random() * Math.PI * 2, speed: 45 + Math.random() * 30,
        shirt: SHIRTS[i % SHIRTS.length], skin: SKINS[i % SKINS.length],
        flee: 0, phase: Math.random() * 6, dirTimer: 2 + Math.random() * 3, alive: true
      });
    }
  }

  function scare(x, y, radius) {
    for (var i = 0; i < peds.length; i++) {
      var p = peds[i];
      if (Math.hypot(p.x - x, p.y - y) < radius) {
        p.flee = 2.5;
        p.angle = Math.atan2(p.y - y, p.x - x);
      }
    }
  }

  function update(dt, playerX, playerY, playerSpeed) {
    for (var i = 0; i < peds.length; i++) {
      var p = peds[i];
      if (!p.alive) continue;
      p.flee = Math.max(0, p.flee - dt);
      p.dirTimer -= dt;
      if (p.dirTimer <= 0 && p.flee <= 0) {
        p.dirTimer = 2 + Math.random() * 3;
        var opts = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
        p.angle = opts[Math.floor(Math.random() * opts.length)];
      }
      var sp = p.flee > 0 ? 190 : p.speed;
      var nx = p.x + Math.cos(p.angle) * sp * dt;
      var ny = p.y + Math.sin(p.angle) * sp * dt;
      if (!City.collideCircle(nx, ny, 10) && nx > 20 && nx < City.W - 20 && ny > 20 && ny < City.H - 20) {
        p.x = nx; p.y = ny;
      } else if (p.flee > 0) {
        p.angle += Math.PI / 2;
      } else {
        p.angle += Math.PI;
      }
      p.phase += dt * (p.flee > 0 ? 13 : 7);
    }
  }

  function nearest(x, y, maxDist) {
    var best = null, bestD = maxDist;
    for (var i = 0; i < peds.length; i++) {
      var p = peds[i];
      if (!p.alive) continue;
      var d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  function draw(ctx) {
    for (var i = 0; i < peds.length; i++) {
      var p = peds[i];
      if (!p.alive) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      var bob = Math.sin(p.phase) * 1.5;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(0, 3, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.shirt;
      ctx.fillRect(-7, -6 + bob, 14, 12);
      ctx.fillStyle = p.skin;
      ctx.beginPath(); ctx.arc(9, 0, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(10, -1, 5.5, Math.PI, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  window.Pedestrians = {
    spawnWorld: spawnWorld, update: update, draw: draw, scare: scare, nearest: nearest,
    getPeds: function () { return peds; }
  };
})();
