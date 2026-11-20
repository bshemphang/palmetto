// police.js: wanted stars, foot cops and police cars that chase and arrest.
(function () {
  var wanted = 0;
  var heat = 0;
  var cops = [];
  var copCars = [];
  var arrestTimer = 0;

  function reset() {
    wanted = 0; heat = 0; cops = []; copCars = []; arrestTimer = 0;
  }

  function addHeat(amount) {
    heat += amount;
    var level = heat < 12 ? 0 : heat < 30 ? 1 : heat < 60 ? 2 : heat < 110 ? 3 : heat < 180 ? 4 : 5;
    if (level > wanted) {
      wanted = level;
      AudioSys.alarm();
    }
  }

  function clearWanted() {
    wanted = 0; heat = 0;
    cops = []; copCars = [];
    AudioSys.sirenSet(false);
  }

  function spawnCopNear(x, y, inCar) {
    var sx = x;
    var sy = y;
    var placed = false;
    for (var t = 0; t < 24 && !placed; t++) {
      var a = Math.random() * Math.PI * 2;
      var r = 380 + Math.random() * 80;
      var cx = x + Math.cos(a) * r;
      var cy = y + Math.sin(a) * r;
      cx = Math.max(60, Math.min(City.W - 60, cx));
      cy = Math.max(60, Math.min(City.H - 60, cy));
      if (City.isRoad(cx, cy) && !City.collideCircle(cx, cy, 12)) {
        sx = cx; sy = cy; placed = true;
      }
    }
    if (!placed) {
      var found = false;
      for (var rr = 200; rr <= 640 && !found; rr += 40) {
        for (var k = 0; k < 24 && !found; k++) {
          var ang = (k / 24) * Math.PI * 2;
          var fx = x + Math.cos(ang) * rr;
          var fy = y + Math.sin(ang) * rr;
          fx = Math.max(60, Math.min(City.W - 60, fx));
          fy = Math.max(60, Math.min(City.H - 60, fy));
          if (City.isRoad(fx, fy) && !City.collideCircle(fx, fy, 12)) {
            sx = fx; sy = fy; found = true;
          }
        }
      }
      if (!found) {
        sx = Math.max(60, Math.min(City.W - 60, sx));
        sy = Math.max(60, Math.min(City.H - 60, sy));
      }
    }
    if (inCar) {
      var car = Vehicles.makeCar('police', sx, sy, Math.atan2(y - sy, x - sx), false);
      car.traffic = false;
      car.driver = 'police';
      copCars.push(car);
    } else {
      cops.push({ x: sx, y: sy, angle: 0, speed: 165, phase: 0 });
    }
  }

  function update(dt, px, py, playerInCar, playerSpeed) {
    var wantCops = wanted === 0 ? 0 : wanted <= 2 ? 2 : wanted <= 3 ? 3 : 4;
    var wantCars = wanted >= 2 ? Math.min(3, wanted - 1) : 0;
    while (cops.length < wantCops) spawnCopNear(px, py, false);
    while (copCars.length < wantCars) spawnCopNear(px, py, true);
    if (wanted === 0) {
      cops = []; copCars = [];
      AudioSys.sirenSet(false);
      return;
    }
    AudioSys.sirenSet(true);
    AudioSys.sirenTick(dt);
    var seen = false;
    for (var i = 0; i < cops.length; i++) {
      var c = cops[i];
      var d = Math.hypot(px - c.x, py - c.y);
      if (d < 700) seen = true;
      c.angle = Math.atan2(py - c.y, px - c.x);
      var sp = d < 60 ? c.speed * 1.2 : c.speed;
      var dx = Math.cos(c.angle) * sp * dt;
      var dy = Math.sin(c.angle) * sp * dt;
      var movedX = false;
      var movedY = false;
      if (!City.collideCircle(c.x + dx, c.y, 12)) { c.x += dx; movedX = true; }
      if (!City.collideCircle(c.x, c.y + dy, 12)) { c.y += dy; movedY = true; }
      if (!movedX) {
        var sy = sp * dt;
        var northFree = !City.collideCircle(c.x, c.y - sy, 12);
        var southFree = !City.collideCircle(c.x, c.y + sy, 12);
        var pickY = 0;
        if (northFree && !City.collideCircle(c.x + dx, c.y - sy, 12)) pickY = -1;
        else if (southFree && !City.collideCircle(c.x + dx, c.y + sy, 12)) pickY = 1;
        else if (dy < 0 && northFree) pickY = -1;
        else if (dy > 0 && southFree) pickY = 1;
        else if (northFree) pickY = -1;
        else if (southFree) pickY = 1;
        if (pickY !== 0) c.y += pickY * sy;
      }
      if (!movedY) {
        var sx = sp * dt;
        var westFree = !City.collideCircle(c.x - sx, c.y, 12);
        var eastFree = !City.collideCircle(c.x + sx, c.y, 12);
        var pickX = 0;
        if (westFree && !City.collideCircle(c.x - sx, c.y + dy, 12)) pickX = -1;
        else if (eastFree && !City.collideCircle(c.x + sx, c.y + dy, 12)) pickX = 1;
        else if (dx < 0 && westFree) pickX = -1;
        else if (dx > 0 && eastFree) pickX = 1;
        else if (westFree) pickX = -1;
        else if (eastFree) pickX = 1;
        if (pickX !== 0) c.x += pickX * sx;
      }
      c.phase += dt * 10;
      if (d < 26 && !playerInCar) {
        arrestTimer += dt;
        if (arrestTimer > 1.2) {
          arrestTimer = 0;
          window.GameEvents.busted();
        }
      }
    }
    for (var j = 0; j < copCars.length; j++) {
      var car = copCars[j];
      var d2 = Math.hypot(px - car.x, py - car.y);
      if (d2 < 700) seen = true;
      var wantAngle = Math.atan2(py - car.y, px - car.x);
      var diff = wantAngle - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      var steer = Math.max(-1, Math.min(1, diff * 2));
      var hit = Vehicles.steerCar(car, dt, d2 > 90 ? 1 : 0.3, steer);
      if (hit) car.angle += 0.6;
      if (d2 < 55) {
        window.GameEvents.rammed(Math.abs(car.speed));
        car.speed *= -0.4;
      }
    }
    if (!seen) {
      heat = Math.max(0, heat - dt * 7);
      var lvl = heat < 12 ? 0 : heat < 30 ? 1 : heat < 60 ? 2 : heat < 110 ? 3 : heat < 180 ? 4 : 5;
      if (lvl < wanted) {
        wanted = lvl;
        if (wanted === 0) { cops = []; copCars = []; AudioSys.sirenSet(false); }
      }
    } else {
      heat = Math.max(heat, wanted * 12);
    }
  }

  function draw(ctx) {
    for (var i = 0; i < cops.length; i++) {
      var c = cops[i];
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angle);
      var bob = Math.sin(c.phase) * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(0, 4, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a2a4a';
      ctx.fillRect(-9, -8 + bob, 18, 16);
      ctx.fillStyle = '#f0c090';
      ctx.beginPath(); ctx.arc(11, 0, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a2a4a';
      ctx.beginPath(); ctx.arc(12, -2, 7, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8c83a';
      ctx.fillRect(4, -3, 6, 6);
      ctx.restore();
    }
  }

  window.Police = {
    reset: reset, addHeat: addHeat, clearWanted: clearWanted, update: update, draw: draw,
    getWanted: function () { return wanted; },
    setWanted: function (n) { wanted = n; heat = n * 25; },
    getCops: function () { return cops; },
    getCopCars: function () { return copCars; }
  };
})();
